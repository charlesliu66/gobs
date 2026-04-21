import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('43.134.186.196', username='ubuntu', password='rCp0uwvlm5BTy0UxqZ+D/O1Q')

cmds = [
    ('index.html mod time', 'ls -la /home/ubuntu/qas-h5/frontend/index.html'),
    ('index JS chunks', 'ls /home/ubuntu/qas-h5/frontend/assets/ | grep index'),
    ('GlobalJobs in JS', 'grep -l "GlobalJobs" /home/ubuntu/qas-h5/frontend/assets/*.js 2>/dev/null || echo "NOT FOUND"'),
    ('VersionTimeline in JS', 'grep -l "VersionTimeline" /home/ubuntu/qas-h5/frontend/assets/*.js 2>/dev/null || echo "NOT FOUND"'),
    ('nginx qas config', 'cat /etc/nginx/sites-enabled/default 2>/dev/null | head -60'),
]

for label, cmd in cmds:
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode('utf-8').strip()
    err = stderr.read().decode('utf-8').strip()
    print(f'\n=== {label} ===')
    print(out or err or '(empty)')

ssh.close()
