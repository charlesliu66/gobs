"""
上传前端编译产物到服务器
上传 h5-video-tool/dist/ → /home/ubuntu/qas-h5/frontend/
"""
import paramiko
import os
from pathlib import Path

HOST = '43.134.186.196'
USER = 'ubuntu'
PASSWORD = 'rCp0uwvlm5BTy0UxqZ+D/O1Q'
LOCAL_DIST = Path(__file__).parent.parent / 'h5-video-tool' / 'dist'
REMOTE_BASE = '/home/ubuntu/qas-h5/frontend'

def main():
    if not LOCAL_DIST.exists():
        print(f'[ERROR] 找不到前端构建产物: {LOCAL_DIST}')
        print('请先运行: cd h5-video-tool && npm run build')
        return False

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD, timeout=30)
    sftp = client.open_sftp()

    def remote_exists(path):
        try:
            sftp.stat(path)
            return True
        except FileNotFoundError:
            return False

    def remote_mkdir(path):
        if not remote_exists(path):
            sftp.mkdir(path)

    def upload_dir(local_dir: Path, remote_dir: str, depth=0):
        remote_mkdir(remote_dir)
        items = list(local_dir.iterdir())
        for item in items:
            remote_path = f'{remote_dir}/{item.name}'
            if item.is_dir():
                upload_dir(item, remote_path, depth + 1)
            else:
                sftp.put(str(item), remote_path)
                if depth == 0:
                    print(f'  {item.name}')

    print(f'正在上传前端产物 → {REMOTE_BASE}')
    upload_dir(LOCAL_DIST, REMOTE_BASE)

    # 验证 Nginx 指向是否正确
    def ssh(cmd):
        stdin, stdout, stderr = client.exec_command(cmd)
        stdout.channel.recv_exit_status()
        return stdout.read().decode('utf-8', errors='replace').strip()

    nginx_root = ssh('grep "root " /etc/nginx/sites-enabled/qas-h5 2>/dev/null')
    if 'frontend' not in nginx_root:
        print(f'[WARNING] Nginx root 不是 frontend/ 目录: {nginx_root}')
        print('  请检查 /etc/nginx/sites-enabled/qas-h5 配置')
    else:
        print(f'[OK] Nginx root 正确: {nginx_root.strip()}')

    sftp.close()
    client.close()
    print('前端部署完成')
    return True

if __name__ == '__main__':
    main()
