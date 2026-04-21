import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('43.134.186.196', username='ubuntu', password='rCp0uwvlm5BTy0UxqZ+D/O1Q')
sftp = ssh.open_sftp()
sftp.put(r'C:\Users\wei.liu\Desktop\cursor_try\QAS\h5-video-tool-api\dist\build-info.json',
         '/home/ubuntu/qas-h5/api/build-info.json')
sftp.close()
print('build-info.json uploaded')

_, out, _ = ssh.exec_command('pm2 restart qas-api && sleep 3 && curl -s http://127.0.0.1:3001/api/system/version')
print(out.read().decode('utf-8', errors='replace'))
ssh.close()
