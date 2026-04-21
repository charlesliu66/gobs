import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('43.134.186.196', username='ubuntu', password='rCp0uwvlm5BTy0UxqZ+D/O1Q')
def run(c):
    _, o, e = ssh.exec_command(c, timeout=120)
    return o.read().decode('utf-8', 'replace')

print('=== jobs.json 里 579c2992ef820141 ===')
print(run("grep -A5 '579c2992ef820141' /home/ubuntu/qas-h5/api/output/batch-jobs/jobs.json | head -40"))

print('\n=== 找 list_task.py ===')
print(run("find /home/ubuntu -name 'list_task.py' 2>/dev/null; find / -path /proc -prune -o -name 'list_task.py' -print 2>/dev/null | head -5"))

print('\n=== 看 jobs.json 里所有 shotIndex=7 和 8 的 job，按 updatedAt 排 ===')
cmd = r'''/usr/bin/python3 -c "
import json
jobs = json.load(open('/home/ubuntu/qas-h5/api/output/batch-jobs/jobs.json'))
if isinstance(jobs, dict):
    jobs = jobs.get('jobs') or list(jobs.values())
hit = [j for j in jobs if isinstance(j, dict) and j.get('shotIndex') in (7,8) and j.get('projectId')=='proj_1776391744549_0bb3af74']
hit.sort(key=lambda x: x.get('updatedAt') or '')
for j in hit:
    print(j.get('updatedAt'), '| idx=', j.get('shotIndex'),
          '| sub=', (j.get('submitId') or '')[:16],
          '| status=', j.get('status'),
          '| url=', (j.get('videoUrl') or '')[:40],
          '| err=', (j.get('error') or '')[:60])
"'''
print(run(cmd))
ssh.close()
