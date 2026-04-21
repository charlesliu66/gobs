import paramiko
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

host = '43.134.186.196'
user = 'ubuntu'
password = 'rCp0uwvlm5BTy0UxqZ+D/O1Q'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, password=password)

DREAMINA = '/home/ubuntu/.local/bin/dreamina'

# Search tasks.db for tasks around 14:29 on April 15
search_script = r"""
import sqlite3, json, datetime
conn = sqlite3.connect("/home/ubuntu/.dreamina_cli/tasks.db")
cur = conn.cursor()
cur.execute("SELECT submit_id, gen_task_type, gen_status, create_time, update_time, fail_reason, request FROM aigc_task ORDER BY create_time DESC;")
cols = [d[0] for d in cur.description]

for row in cur.fetchall():
    d = dict(zip(cols, row))
    ct = d.get('create_time', 0)
    ut = d.get('update_time', 0)
    
    # Convert to readable time
    ct_str = datetime.datetime.fromtimestamp(ct).strftime('%Y-%m-%d %H:%M:%S') if ct else '?'
    ut_str = datetime.datetime.fromtimestamp(ut).strftime('%Y-%m-%d %H:%M:%S') if ut else '?'
    
    sid = d['submit_id']
    status = d['gen_status']
    
    # Get prompt from request
    prompt = ''
    try:
        req = json.loads(d.get('request','') or '{}')
        body = json.loads(req.get('body','{}'))
        prompt = body.get('prompt','')[:120]
    except:
        pass
    
    print(f"{sid} [{status}] created={ct_str} updated={ut_str}")
    print(f"  prompt: {prompt}")
    print()

conn.close()
"""

sftp = ssh.open_sftp()
with sftp.open('/tmp/_find_time.py', 'w') as f:
    f.write(search_script)
sftp.close()

stdin, stdout, stderr = ssh.exec_command('python3 /tmp/_find_time.py')
out = stdout.read().decode('utf-8')
err = stderr.read().decode('utf-8')
if err:
    print(f'Error: {err[:300]}')
print(out)

ssh.close()
