"""用正确 env 跑 query_result + list_task，看镜 7/8/9 真实状态"""
import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('43.134.186.196', username='ubuntu', password='rCp0uwvlm5BTy0UxqZ+D/O1Q')

def run(c, t=120):
    _, o, e = ssh.exec_command(c, timeout=t)
    return o.read().decode('utf-8', 'replace') + ('--- STDERR ---\n' + e.read().decode('utf-8', 'replace') if e else '')

# 加 DREAMINA_BIN 到 PATH 再跑
env_prefix = 'export PATH=/home/ubuntu/.local/bin:$PATH && cd /home/ubuntu/qas-h5/.cursor/skills/dreamina-cli-skill/scripts && '

# 1) 镜 7 真实 gen_status
print('=== 1) 镜 7  8031c5a6879fa8c8 ===')
print(run(env_prefix + '/usr/bin/python3 query_result.py --submit-id 8031c5a6879fa8c8 2>&1 | head -30')[:2500])

# 2) list_task 最近 50 条 —— 找所有 querying / success
print('\n=== 2) list_task --limit 50 ===')
o = run(env_prefix + '/usr/bin/python3 list_task.py --limit 50 2>&1')
# 只打前 5000 字
print(o[:6000])

ssh.close()
