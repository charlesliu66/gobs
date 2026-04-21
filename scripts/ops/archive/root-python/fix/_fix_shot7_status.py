"""
d5bfc8cb3b69d3dc 在我们 jobs.json 里是 failed,但即梦 list_task 显示 querying。
把它改回 queuing,让 poller 继续跟进(即梦若最终成功就回填镜 7)。
"""
import paramiko, sys, json
sys.stdout.reconfigure(encoding='utf-8')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('43.134.186.196', username='ubuntu', password='rCp0uwvlm5BTy0UxqZ+D/O1Q')

def run(c, t=60):
    _, o, e = ssh.exec_command(c, timeout=t)
    return o.read().decode('utf-8', 'replace'), e.read().decode('utf-8', 'replace')

# 读 jobs.json
JOBS = '/home/ubuntu/qas-h5/api/output/batch-jobs/jobs.json'
raw, _ = run(f"cat {JOBS}")
jobs = json.loads(raw)
if isinstance(jobs, dict):
    arr = jobs.get('jobs') or list(jobs.values())
else:
    arr = jobs

fixed = 0
for j in arr:
    if not isinstance(j, dict):
        continue
    if j.get('submitId') == 'd5bfc8cb3b69d3dc' and j.get('status') == 'failed':
        j['status'] = 'queuing'
        j['failReason'] = ''
        j['updatedAt'] = '2026-04-20T11:30:00.000Z'
        fixed += 1

if fixed == 0:
    print('no change needed'); ssh.close(); sys.exit(0)

# 备份后写回
import base64
new_json = json.dumps(arr, ensure_ascii=False, indent=2)
encoded = base64.b64encode(new_json.encode('utf-8')).decode('ascii')
out, err = run(f"cp {JOBS} {JOBS}.bak_$(date +%s) && echo '{encoded}' | base64 -d > {JOBS} && echo OK", t=30)
print('backup & write:', out, err)

# 验证
out, _ = run(
    r'''/usr/bin/python3 -c "import json; a=json.load(open('/home/ubuntu/qas-h5/api/output/batch-jobs/jobs.json')); '''
    r'''print([j for j in a if isinstance(j,dict) and j.get('submitId')=='d5bfc8cb3b69d3dc'])"'''
)
print('after fix:', out[:400])

print(f'\n[OK] fixed {fixed} job(s)')
ssh.close()
