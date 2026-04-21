import paramiko
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

host = '43.134.186.196'
user = 'ubuntu'
password = 'rCp0uwvlm5BTy0UxqZ+D/O1Q'

LOCAL_API_DIST = r'C:\Users\wei.liu\Desktop\cursor_try\QAS\h5-video-tool-api\dist'
REMOTE_API_DIR = '/home/ubuntu/qas-h5/api'
LOCAL_FE_DIST = r'C:\Users\wei.liu\Desktop\cursor_try\QAS\h5-video-tool\dist'
REMOTE_FE_DIR = '/home/ubuntu/qas-h5/frontend'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, password=password)
sftp = ssh.open_sftp()

def ensure_remote_dir(sftp, remote_dir):
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

def upload_tree(local_root, remote_root, label):
    count = 0
    for root, dirs, files in os.walk(local_root):
        for fname in files:
            local_path = os.path.join(root, fname)
            rel = os.path.relpath(local_path, local_root).replace('\\', '/')
            remote_path = f'{remote_root}/{rel}'
            remote_dir = os.path.dirname(remote_path).replace('\\', '/')
            ensure_remote_dir(sftp, remote_dir)
            sftp.put(local_path, remote_path)
            count += 1
    print(f'[{label}] Uploaded {count} files to {remote_root}')
    return count

print('=== Uploading API dist ===')
upload_tree(LOCAL_API_DIST, REMOTE_API_DIR, 'api')

print('\n=== Uploading Frontend dist ===')
upload_tree(LOCAL_FE_DIST, REMOTE_FE_DIR, 'frontend')

sftp.close()

print('\n=== pm2 restart qas-api ===')
stdin, stdout, stderr = ssh.exec_command('pm2 restart qas-api')
print(stdout.read().decode('utf-8'))
err = stderr.read().decode('utf-8')
if err:
    print(f'STDERR: {err}')

ssh.close()
print('Deploy v0.47 complete!')
