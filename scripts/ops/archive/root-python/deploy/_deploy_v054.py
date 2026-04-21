"""v0.54 部署：后端 API + 前端（角色状态变体优化）"""
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

REMOTE_API = '/home/ubuntu/qas-h5/api'
REMOTE_FE = '/home/ubuntu/qas-h5/frontend'

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

print('=== v0.54 部署: 角色状态变体优化 ===\n')

print('=== 上传后端 API ===')
api_count = upload_dir(API_DIST, REMOTE_API, 'api')

print('\n=== 上传前端 ===')
fe_count = upload_dir(FE_DIST, REMOTE_FE, 'frontend')

sftp.close()

print('\n=== pm2 restart qas-api ===')
stdin, stdout, stderr = ssh.exec_command('pm2 restart qas-api')
print(stdout.read().decode('utf-8'))
err = stderr.read().decode('utf-8')
if err:
    print(f'stderr: {err}')

print('=== 验证 API 状态 ===')
stdin, stdout, stderr = ssh.exec_command('pm2 list')
print(stdout.read().decode('utf-8'))

ssh.close()
print(f'\n✅ v0.54 部署完成: api={api_count}, frontend={fe_count}')
