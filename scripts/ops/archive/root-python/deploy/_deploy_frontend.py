import paramiko
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

host = '43.134.186.196'
user = 'ubuntu'
password = 'rCp0uwvlm5BTy0UxqZ+D/O1Q'

LOCAL_DIST = r'C:\Users\wei.liu\Desktop\cursor_try\QAS\h5-video-tool\dist'
REMOTE_DIR = '/home/ubuntu/qas-h5/frontend'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, password=password)
sftp = ssh.open_sftp()

uploaded = 0
for root, dirs, files in os.walk(LOCAL_DIST):
    for fname in files:
        local_path = os.path.join(root, fname)
        rel = os.path.relpath(local_path, LOCAL_DIST).replace('\\', '/')
        remote_path = f'{REMOTE_DIR}/{rel}'
        
        remote_dir = os.path.dirname(remote_path).replace('\\', '/')
        try:
            sftp.stat(remote_dir)
        except FileNotFoundError:
            parts = remote_dir.split('/')
            for i in range(1, len(parts) + 1):
                d = '/'.join(parts[:i])
                try:
                    sftp.stat(d)
                except FileNotFoundError:
                    sftp.mkdir(d)
        
        sftp.put(local_path, remote_path)
        uploaded += 1
        print(f'  {rel}')

print(f'\nUploaded {uploaded} files to {REMOTE_DIR}')

sftp.close()

print('\n=== pm2 restart qas-api ===')
stdin, stdout, stderr = ssh.exec_command('pm2 restart qas-api')
print(stdout.read().decode('utf-8'))

ssh.close()
print('Done!')
