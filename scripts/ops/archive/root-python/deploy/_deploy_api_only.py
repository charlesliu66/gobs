import paramiko
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

host = '43.134.186.196'
user = 'ubuntu'
password = 'rCp0uwvlm5BTy0UxqZ+D/O1Q'

LOCAL_DIST = r'C:\Users\wei.liu\Desktop\cursor_try\QAS\h5-video-tool-api\dist'
REMOTE_DIR = '/home/ubuntu/qas-h5/api'

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

count = 0
for root, dirs, files in os.walk(LOCAL_DIST):
    for fname in files:
        local_path = os.path.join(root, fname)
        rel = os.path.relpath(local_path, LOCAL_DIST).replace('\\', '/')
        remote_path = f'{REMOTE_DIR}/{rel}'
        remote_dir = os.path.dirname(remote_path).replace('\\', '/')
        ensure_remote_dir(sftp, remote_dir)
        sftp.put(local_path, remote_path)
        count += 1
        print(f'  {rel}')

sftp.close()
print(f'\nUploaded {count} files to {REMOTE_DIR}')

print('\n=== pm2 restart qas-api ===')
stdin, stdout, stderr = ssh.exec_command('pm2 restart qas-api')
print(stdout.read().decode('utf-8'))

ssh.close()
print('Done!')
