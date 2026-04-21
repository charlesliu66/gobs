import paramiko
import json
import sys
import time

sys.stdout.reconfigure(encoding='utf-8')

host = '43.134.186.196'
user = 'ubuntu'
password = 'rCp0uwvlm5BTy0UxqZ+D/O1Q'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, password=password)

DREAMINA = '/home/ubuntu/.local/bin/dreamina'
OUTPUT_DIR = '/home/ubuntu/qas-h5/api/output/admin'
PROJECT_FILE = '/home/ubuntu/qas-h5/api/output/production/projects/admin/proj_1776134802962_3d86d452.json'

# Query 193a2b4f5a8b661d via CLI - maybe it has a video despite "fail" status
print("=== Querying 193a2b4f5a8b661d via CLI ===")
stdin, stdout, stderr = ssh.exec_command(f'{DREAMINA} query_result --submit_id 193a2b4f5a8b661d --download_dir {OUTPUT_DIR} 2>&1')
out = stdout.read().decode('utf-8')
print(out[:2000])

# Also try the new task 6d8c19572e8d8811 (created 17:33, same prompt)
print("\n=== Querying 6d8c19572e8d8811 ===")
stdin, stdout, stderr = ssh.exec_command(f'{DREAMINA} query_result --submit_id 6d8c19572e8d8811 --download_dir {OUTPUT_DIR} 2>&1')
out2 = stdout.read().decode('utf-8')
print(out2[:2000])

# Also check the full result_json in DB for 193a
print("\n=== DB details for 193a2b4f5a8b661d ===")
db_script = """
import sqlite3, json
conn = sqlite3.connect("/home/ubuntu/.dreamina_cli/tasks.db")
cur = conn.cursor()
cur.execute("SELECT * FROM aigc_task WHERE submit_id='193a2b4f5a8b661d';")
cols = [d[0] for d in cur.description]
row = cur.fetchone()
if row:
    d = dict(zip(cols, row))
    for k, v in d.items():
        if v and isinstance(v, str) and len(v) > 300:
            print(f"{k}: {v[:300]}...")
        else:
            print(f"{k}: {v}")
conn.close()
"""
sftp = ssh.open_sftp()
with sftp.open('/tmp/_db193a.py', 'w') as f:
    f.write(db_script)
sftp.close()
stdin, stdout, stderr = ssh.exec_command('python3 /tmp/_db193a.py')
print(stdout.read().decode('utf-8'))

ssh.close()
