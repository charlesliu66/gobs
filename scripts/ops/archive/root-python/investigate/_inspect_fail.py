import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('43.134.186.196', username='ubuntu', password='rCp0uwvlm5BTy0UxqZ+D/O1Q')
code = r'''/usr/bin/python3 -c "
import json
jobs=json.load(open('/home/ubuntu/qas-h5/api/output/batch-jobs/jobs.json'))
if isinstance(jobs, dict): jobs=jobs.get('jobs') or list(jobs.values())
for j in jobs:
    if isinstance(j,dict) and j.get('submitId') in ('8031c5a6879fa8c8','d5bfc8cb3b69d3dc','c65c6c38a5ffbe33'):
        print(j.get('submitId'),'|',j.get('status'),'|',(j.get('failReason') or '')[:300])
"
'''
_,o,e = ssh.exec_command(code)
print(o.read().decode('utf-8','replace'))
print('ERR:', e.read().decode('utf-8','replace'))
ssh.close()
