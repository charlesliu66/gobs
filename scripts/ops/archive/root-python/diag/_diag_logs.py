import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('43.134.186.196', username='ubuntu', password='rCp0uwvlm5BTy0UxqZ+D/O1Q')

def run(cmd):
    _, out, _ = ssh.exec_command(cmd)
    return out.read().decode('utf-8', errors='replace')

print('=== 最近 150 行 out log ===')
print(run('tail -n 150 /home/ubuntu/.pm2/logs/qas-api-out.log'))
print()
print('=== 最近 150 行 err log ===')
print(run('tail -n 150 /home/ubuntu/.pm2/logs/qas-api-error.log'))
ssh.close()
