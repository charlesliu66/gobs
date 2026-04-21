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

# Try list_task with submit_id to get full detail
print("=== list_task for 193a2b4f5a8b661d ===")
stdin, stdout, stderr = ssh.exec_command(f'{DREAMINA} list_task --submit_id 193a2b4f5a8b661d 2>&1')
out = stdout.read().decode('utf-8')
print(out[:3000])

# Also try the query_result with verbose/debug
print("\n=== query_result verbose ===")
stdin, stdout, stderr = ssh.exec_command(f'{DREAMINA} query_result --submit_id 193a2b4f5a8b661d 2>&1')
out2 = stdout.read().decode('utf-8')
print(out2[:3000])

# Check the result_json more carefully in DB - it was empty, but maybe there's something
db_script = """
import sqlite3, json
conn = sqlite3.connect("/home/ubuntu/.dreamina_cli/tasks.db")
cur = conn.cursor()

# Check all columns
cur.execute("SELECT * FROM aigc_task WHERE submit_id='193a2b4f5a8b661d';")
cols = [d[0] for d in cur.description]
row = cur.fetchone()
d = dict(zip(cols, row))

# Print result_json raw 
print("result_json:", repr(d.get('result_json', '')))

# Print request to see if there's a callback URL or reference ID
req = d.get('request', '')
if req:
    try:
        req_obj = json.loads(req)
        body_str = req_obj.get('body', '{}')
        body = json.loads(body_str)
        # Print all keys in body
        for k, v in body.items():
            if isinstance(v, str) and len(v) > 200:
                print(f"body.{k}: {v[:200]}...")
            elif isinstance(v, list) and len(v) > 3:
                print(f"body.{k}: [{len(v)} items]")
            else:
                print(f"body.{k}: {v}")
    except Exception as e:
        print(f"parse err: {e}")

conn.close()
"""
sftp = ssh.open_sftp()
with sftp.open('/tmp/_db_check.py', 'w') as f:
    f.write(db_script)
sftp.close()

print("\n=== DB request details ===")
stdin, stdout, stderr = ssh.exec_command('python3 /tmp/_db_check.py')
print(stdout.read().decode('utf-8'))
err = stderr.read().decode('utf-8')
if err:
    print(f"Err: {err[:300]}")

# Also check: maybe the video was downloaded to a different path like /tmp or dreamina default
print("\n=== Check for any videos with 193a in name ===")
stdin, stdout, stderr = ssh.exec_command('find / -name "*193a*" -type f 2>/dev/null')
out3 = stdout.read().decode('utf-8')
print(out3 or "(none found)")

# Check dreamina default download dir
print("\n=== Dreamina default download locations ===")
for p in ['/home/ubuntu/.dreamina_cli/', '/home/ubuntu/Downloads/', '/tmp/']:
    stdin, stdout, stderr = ssh.exec_command(f'ls -la {p}*.mp4 2>/dev/null; find {p} -name "*.mp4" 2>/dev/null | head -10')
    out4 = stdout.read().decode('utf-8')
    if out4.strip():
        print(f"{p}: {out4}")

ssh.close()
