import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('43.134.186.196', username='ubuntu', password='rCp0uwvlm5BTy0UxqZ+D/O1Q')
def run(c):
    _, o, e = ssh.exec_command(c, timeout=60)
    return o.read().decode('utf-8', 'replace') + '--- STDERR ---\n' + e.read().decode('utf-8', 'replace')

for cmd in [
    "ls /home/ubuntu/qas-h5/.cursor/skills/dreamina-cli-skill/scripts/",
    "which dreamina",
    "ls -la /home/ubuntu/.local/bin/dreamina 2>&1",
    "pm2 info qas-api 2>&1 | head -40",
    "grep -E 'DREAMINA|PYTHON_EXE|DREAMINA_SCRIPTS_DIR' /home/ubuntu/qas-h5/api/.env 2>&1 | head",
    "pm2 logs qas-api --nostream --lines 2000 --raw 2>&1 | grep -E 'query_task|list_task|pollDreaminaTask|Dreamina executable' | tail -30",
    "pm2 logs qas-api --nostream --lines 300 --raw 2>&1 | tail -80",
]:
    print('\n$', cmd)
    print(run(cmd)[:2000])

ssh.close()
