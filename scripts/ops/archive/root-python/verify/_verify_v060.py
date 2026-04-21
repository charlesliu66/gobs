import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('43.134.186.196', username='ubuntu', password='rCp0uwvlm5BTy0UxqZ+D/O1Q')

print('=== /api/system/version ===')
_, out, _ = ssh.exec_command('curl -s http://127.0.0.1:3001/api/system/version')
print(out.read().decode('utf-8', errors='replace'))

print('\n=== pm2 logs (last 20 lines) ===')
_, out, _ = ssh.exec_command('pm2 logs qas-api --lines 20 --nostream 2>&1')
print(out.read().decode('utf-8', errors='replace'))

print('\n=== build-info ===')
_, out, _ = ssh.exec_command('cat /home/ubuntu/qas-h5/api/build-info.json 2>/dev/null')
print(out.read().decode('utf-8', errors='replace'))

ssh.close()
