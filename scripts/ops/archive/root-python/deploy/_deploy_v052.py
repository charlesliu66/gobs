"""v0.52 部署：后端 + 前端 + Loading 资产（图片+音频）"""
import paramiko
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

host = '43.134.186.196'
user = 'ubuntu'
password = 'rCp0uwvlm5BTy0UxqZ+D/O1Q'

BASE = r'C:\Users\wei.liu\Desktop\cursor_try\QAS'
API_DIST = os.path.join(BASE, 'h5-video-tool-api', 'dist')
FE_DIST = os.path.join(BASE, 'h5-video-tool', 'dist')
ASSETS_DIR = os.path.join(BASE, 'output', 'loading-assets')

REMOTE_API = '/home/ubuntu/qas-h5/api'
REMOTE_FE = '/home/ubuntu/qas-h5/frontend'
REMOTE_ASSETS = '/home/ubuntu/qas-h5/frontend/loading-assets'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, password=password)
sftp = ssh.open_sftp()

def ensure_remote_dir(remote_dir):
    parts = remote_dir.split('/')
    for i in range(1, len(parts) + 1):
        d = '/'.join(parts[:i])
        if not d:
            continue
        try:
            sftp.stat(d)
        except (FileNotFoundError, IOError):
            try:
                sftp.mkdir(d)
            except (IOError, OSError):
                pass

def upload_dir(local_root, remote_root, label):
    count = 0
    for root, dirs, files in os.walk(local_root):
        for fname in files:
            local_path = os.path.join(root, fname)
            rel = os.path.relpath(local_path, local_root).replace('\\', '/')
            remote_path = f'{remote_root}/{rel}'
            ensure_remote_dir(os.path.dirname(remote_path).replace('\\', '/'))
            sftp.put(local_path, remote_path)
            count += 1
    print(f'  [{label}] {count} files -> {remote_root}')
    return count

# ── 1. 后端 API ──
print('=== 上传后端 API ===')
api_count = upload_dir(API_DIST, REMOTE_API, 'api')

# ── 2. 前端 ──
print('\n=== 上传前端 ===')
fe_count = upload_dir(FE_DIST, REMOTE_FE, 'frontend')

# ── 3. Loading 资产（仅图片+音频，跳过 references/） ──
print('\n=== 上传 Loading 资产 ===')
asset_count = 0
for subdir in ['images', 'audio']:
    local_sub = os.path.join(ASSETS_DIR, subdir)
    if not os.path.isdir(local_sub):
        continue
    remote_sub = f'{REMOTE_ASSETS}/{subdir}'
    ensure_remote_dir(remote_sub)
    for fname in os.listdir(local_sub):
        local_path = os.path.join(local_sub, fname)
        if not os.path.isfile(local_path):
            continue
        remote_path = f'{remote_sub}/{fname}'
        sftp.put(local_path, remote_path)
        asset_count += 1
        print(f'  {subdir}/{fname} ({os.path.getsize(local_path) // 1024}KB)')

# manifest.json
manifest_local = os.path.join(ASSETS_DIR, 'manifest.json')
if os.path.isfile(manifest_local):
    sftp.put(manifest_local, f'{REMOTE_ASSETS}/manifest.json')
    asset_count += 1
    print(f'  manifest.json')

print(f'\n  [assets] {asset_count} files -> {REMOTE_ASSETS}')

sftp.close()

# ── 4. pm2 重启 ──
print('\n=== pm2 restart qas-api ===')
stdin, stdout, stderr = ssh.exec_command('pm2 restart qas-api')
print(stdout.read().decode('utf-8'))
err = stderr.read().decode('utf-8')
if err:
    print(f'stderr: {err}')

# ── 5. 验证 ──
print('=== 验证资产目录 ===')
stdin, stdout, stderr = ssh.exec_command(f'ls -la {REMOTE_ASSETS}/images/ && echo "---" && ls -la {REMOTE_ASSETS}/audio/')
print(stdout.read().decode('utf-8'))

ssh.close()
print(f'\n✅ 部署完成: api={api_count}, frontend={fe_count}, assets={asset_count}')
