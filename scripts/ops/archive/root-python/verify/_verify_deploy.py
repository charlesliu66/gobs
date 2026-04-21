import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('43.134.186.196', username='ubuntu', password='rCp0uwvlm5BTy0UxqZ+D/O1Q')

stdin, stdout, stderr = ssh.exec_command('cat /home/ubuntu/qas-h5/frontend/index.html')
print('=== index.html ===')
print(stdout.read().decode('utf-8'))

for target in ['暂无生成任务', '版本时间线', '生成队列']:
    stdin, stdout, stderr = ssh.exec_command(f'grep -rl "{target}" /home/ubuntu/qas-h5/frontend/assets/*.js 2>/dev/null || echo "NOT FOUND"')
    result = stdout.read().decode('utf-8').strip()
    print(f'"{target}": {result}')

ssh.close()
print('\nDone!')
