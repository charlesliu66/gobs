"""v0.60.1 hotfix 部署"""
import paramiko, os, sys
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

def ensure_dir(d):
    parts = d.split('/')
    for i in range(1, len(parts) + 1):
        p = '/'.join(parts[:i])
        if not p:
            continue
        try:
            sftp.stat(p)
        except (FileNotFoundError, IOError):
            try:
                sftp.mkdir(p)
            except (IOError, OSError):
                pass

def upload_dir(local_root, remote_root, label):
    count = 0
    for root, _, files in os.walk(local_root):
        for fname in files:
            local = os.path.join(root, fname)
            rel = os.path.relpath(local, local_root).replace('\\', '/')
            remote = f'{remote_root}/{rel}'
            ensure_dir(os.path.dirname(remote))
            sftp.put(local, remote)
            count += 1
    print(f'  [{label}] {count} files')
    return count

print('=== v0.60.1 hotfix 部署 ===')
print('-- API --')
api = upload_dir(API_DIST, REMOTE_API, 'api')
print('-- Frontend --')
fe = upload_dir(FE_DIST, REMOTE_FE, 'frontend')
sftp.close()

print('\n-- pm2 restart --')
_, out, _ = ssh.exec_command('pm2 restart qas-api && sleep 3 && curl -s http://127.0.0.1:3001/api/system/version')
print(out.read().decode('utf-8', errors='replace'))

ssh.close()
print(f'\n[OK] v0.60.1 deployed: api={api}, frontend={fe}')
