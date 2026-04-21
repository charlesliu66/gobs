"""立刻 poll-now 镜 7/8 剩下 4 条 queuing 任务"""
import paramiko, sys, json
sys.stdout.reconfigure(encoding='utf-8')

host = '43.134.186.196'
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username='ubuntu', password='rCp0uwvlm5BTy0UxqZ+D/O1Q')
def run(c): _, o, e = ssh.exec_command(c, timeout=120); return o.read().decode('utf-8', 'replace')

# 1) 登录
r = run("""curl -s -X POST http://127.0.0.1:3001/api/auth/login -H 'Content-Type: application/json' -d '{"username":"admin","password":"admin123"}'""")
token = json.loads(r).get('data', {}).get('token')
if not token:
    print('登录失败'); sys.exit(1)

# 2) 找 shot 7/8 的 queuing job id
cmd = r'''/usr/bin/python3 -c "
import json
jobs=json.load(open('/home/ubuntu/qas-h5/api/output/batch-jobs/jobs.json'))
if isinstance(jobs, dict):
    jobs = jobs.get('jobs') or list(jobs.values())
for j in jobs:
    if not isinstance(j, dict): continue
    if j.get('projectId')!='proj_1776391744549_0bb3af74': continue
    if j.get('shotIndex') not in (7,8): continue
    if j.get('status')!='queuing': continue
    print(j.get('id'), j.get('shotIndex'), j.get('submitId'))
"'''
r = run(cmd)
print('待 poke:\n', r)
targets = [ln.split() for ln in r.strip().splitlines() if ln.strip()]

# 3) 逐个 poll-now
for parts in targets:
    if len(parts) < 3: continue
    jid, idx, sub = parts
    o = run(f"curl -s -X POST http://127.0.0.1:3001/api/batch-jobs/{jid}/poll-now -H 'Authorization: Bearer {token}'")
    try:
        body = json.loads(o)
        j = body.get('job') or body
        print(f'  [镜{idx}] {sub[:12]}… → status={j.get("status")}  url={(j.get("videoUrl") or "")[:40]}  err={(j.get("failReason") or "")[:60]}')
    except Exception:
        print(f'  [镜{idx}] {sub[:12]}… raw={o[:200]}')

# 4) 再查 production.json 最新状态
print('\n=== production.json 最新镜 4/7/8 状态 ===')
cmd2 = r'''/usr/bin/python3 -c "
import json
d=json.load(open('/home/ubuntu/qas-h5/api/output/production/projects/admin/proj_1776391744549_0bb3af74.json'))
for s in d.get('project',{}).get('shots',[]):
    if s.get('shotIndex') in (4,7,8):
        print('镜', s.get('shotIndex'),
              '| pending=', (s.get('pendingVideoSubmitId') or '-')[:14],
              '| url=', (s.get('previewVideoUrl') or '-')[:50],
              '| versions=', len(s.get('previewVideoVersions') or []))
"'''
print(run(cmd2))

ssh.close()
