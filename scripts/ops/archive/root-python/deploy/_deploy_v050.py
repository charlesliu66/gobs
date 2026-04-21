"""三端一统：SFTP 上传 v0.50 的构建产物 + pm2 restart qas-api."""
import os
import sys
import paramiko
import posixpath
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

HOST = '43.134.186.196'
USER = 'ubuntu'

def load_password() -> str:
    env_path = Path('h5-video-tool-api/.env')
    for line in env_path.read_text(encoding='utf-8').splitlines():
        line = line.strip()
        if line.startswith('SERVER_PASSWORD='):
            return line.split('=', 1)[1].strip().strip('"').strip("'")
    raise RuntimeError('SERVER_PASSWORD not found in .env')

PASS = load_password()

# 本轮改动文件（build 后对应的 dist/ 路径）
API_FILES = [
    'routes/editorProjects.js',
    'routes/editorExport.js',
    'routes/editorAssets.js',
    'services/editorAgentService.js',
    'services/ffmpegExport.js',
]

def sftp_upload_file(sftp, local: Path, remote: str):
    # 远端路径目录确保存在
    rdir = posixpath.dirname(remote)
    try:
        sftp.stat(rdir)
    except IOError:
        parts = rdir.split('/')
        cur = ''
        for p in parts:
            if not p:
                cur += '/'
                continue
            cur = posixpath.join(cur, p) if cur else '/' + p
            try:
                sftp.stat(cur)
            except IOError:
                sftp.mkdir(cur)
    sftp.put(str(local), remote)
    print(f'  ✓ {local.name} -> {remote}')

def sftp_upload_dir(sftp, local_dir: Path, remote_dir: str):
    for root, dirs, files in os.walk(local_dir):
        rel = os.path.relpath(root, local_dir).replace('\\', '/')
        rdir = remote_dir if rel == '.' else posixpath.join(remote_dir, rel)
        try:
            sftp.stat(rdir)
        except IOError:
            sftp.mkdir(rdir)
        for f in files:
            local = Path(root) / f
            remote = posixpath.join(rdir, f)
            sftp.put(str(local), remote)
    print(f'  ✓ uploaded {local_dir} -> {remote_dir}')

def main() -> None:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f'connecting to {USER}@{HOST} ...')
    client.connect(HOST, username=USER, password=PASS, timeout=30)
    sftp = client.open_sftp()

    print('\n[1/3] 上传 API dist/ 变动文件')
    api_local = Path('h5-video-tool-api/dist')
    for rel in API_FILES:
        local = api_local / rel
        remote = f'/home/ubuntu/qas-h5/api/{rel}'
        if not local.exists():
            print(f'  ✗ MISSING {local}')
            continue
        sftp_upload_file(sftp, local, remote)

    print('\n[2/3] 上传前端 dist/')
    sftp_upload_dir(sftp, Path('h5-video-tool/dist'), '/home/ubuntu/qas-h5/frontend')

    print('\n[3/3] pm2 restart qas-api')
    stdin, stdout, stderr = client.exec_command('pm2 restart qas-api && sleep 2 && pm2 status')
    print(stdout.read().decode('utf-8', errors='replace'))
    err = stderr.read().decode('utf-8', errors='replace')
    if err.strip():
        print('STDERR:', err)

    sftp.close()
    client.close()
    print('\n✅ 部署完成')


if __name__ == '__main__':
    main()
