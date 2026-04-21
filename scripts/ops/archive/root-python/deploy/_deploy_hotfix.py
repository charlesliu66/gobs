import paramiko
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

host = '43.134.186.196'
user = 'ubuntu'
password = 'rCp0uwvlm5BTy0UxqZ+D/O1Q'

BASE = r'C:\Users\wei.liu\Desktop\cursor_try\QAS'

files = [
    ('h5-video-tool-api/dist/routes/editorExport.js', '/home/ubuntu/qas-h5/api/routes/editorExport.js'),
    ('h5-video-tool-api/dist/services/ffmpegExport.js', '/home/ubuntu/qas-h5/api/services/ffmpegExport.js'),
]

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, password=password)
sftp = ssh.open_sftp()

for local_rel, remote_path in files:
    local_path = os.path.join(BASE, local_rel)
    print(f'  {local_rel} → {remote_path}')
    sftp.put(local_path, remote_path)

sftp.close()
print(f'\n{len(files)} files uploaded')

print('\n=== pm2 restart qas-api ===')
stdin, stdout, stderr = ssh.exec_command('pm2 restart qas-api')
print(stdout.read().decode('utf-8'))
err = stderr.read().decode('utf-8')
if err:
    print(f'STDERR: {err}')

ssh.close()
print('Done!')
