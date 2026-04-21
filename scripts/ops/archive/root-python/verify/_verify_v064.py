"""v0.64 验证:
1) /api/batch-jobs/sync-now 可用
2) 镜 7 的 d5bfc8cb 恢复 queuing 后会被持续轮询
3) writeBackFailedToProject 已在后端
"""
import paramiko, sys, json, time
sys.stdout.reconfigure(encoding='utf-8')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('43.134.186.196', username='ubuntu', password='rCp0uwvlm5BTy0UxqZ+D/O1Q')

def run(c, t=60):
    _, o, e = ssh.exec_command(c, timeout=t)
    return o.read().decode('utf-8','replace') + e.read().decode('utf-8','replace')

# 1) 登录
print('=== 1) admin 登录 ===')
def try_login(pwd):
    run("printf '%s' '" + json.dumps({'username':'admin','password':pwd}) + "' > /tmp/login.json")
    out = run("curl -s -X POST http://127.0.0.1:3001/api/auth/login -H 'Content-Type: application/json' -d @/tmp/login.json")
    try:
        b = json.loads(out)
        return b.get('data', {}).get('token') if b.get('success') else None
    except Exception:
        return None

token = None
for pwd in ['admin123','admin','password','123456']:
    t = try_login(pwd)
    if t:
        token = t
        print('✓ login ok')
        break
if not token:
    print('[FAIL]'); sys.exit(1)

# 2) 调 /sync-now
print('\n=== 2) POST /api/batch-jobs/sync-now ===')
cmd = (
    f'curl -s -X POST http://127.0.0.1:3001/api/batch-jobs/sync-now '
    f'-H "Authorization: Bearer {token}" '
    f'-H "Content-Type: application/json" -d "{{}}"'
)
out = run(cmd, t=120)
try:
    data = json.loads(out)
    print(f'polled={data.get("polled")}')
    print(f'scan={data.get("scan")}')
    results = data.get('results') or []
    print(f'sample results (first 10):')
    for r in results[:10]:
        print(f'  {r.get("id")} | status={r.get("status")} | fail={(r.get("failReason") or "")[:50]}')
except Exception as e:
    print('parse err:', e)
    print(out[:2000])

# 3) 检查 writeBackFailedToProject 已落地
print('\n=== 3) writeBackFailedToProject 是否部署 ===')
out = run("grep -l writeBackFailedToProject /home/ubuntu/qas-h5/api/services/batchJobsQueue.js")
print('grep hits:', out.strip())

# 4) 镜 7 的 d5bfc8cb 在新版会被轮询吗
print('\n=== 4) 等 30s 看 d5bfc8cb 是否被 poll ===')
time.sleep(30)
out = run(
    r'''/usr/bin/python3 -c "
import json
jobs=json.load(open('/home/ubuntu/qas-h5/api/output/batch-jobs/jobs.json'))
if isinstance(jobs, dict): jobs=jobs.get('jobs') or list(jobs.values())
for j in jobs:
    if isinstance(j,dict) and j.get('shotIndex') in (7,8,9) and j.get('projectId')=='proj_1776391744549_0bb3af74':
        print('shot',j.get('shotIndex'),'|',j.get('submitId'),'|',j.get('status'),'| last=',j.get('lastPolledAt'),'| upd=',j.get('updatedAt'))
"'''
)
print(out)

# 5) 再看 pm2 日志有没有 write-back-failed 的痕迹
print('\n=== 5) 最近 pm2 日志是否出现新 write-back-failed ===')
print(run("pm2 logs qas-api --nostream --lines 200 --raw 2>&1 | grep -iE 'write-back|poll.*fail|Dreamina|1310' | tail -15"))

ssh.close()
print('\nDONE')
