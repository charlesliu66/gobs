"""v0.64 patch: CLI transient 错误不再标 failed + TTL 12h + 重置被误伤 job"""
import paramiko, os, sys, hashlib, json, time
sys.stdout.reconfigure(encoding='utf-8')

HOST='43.134.186.196'; USER='ubuntu'; PWD='rCp0uwvlm5BTy0UxqZ+D/O1Q'
ssh=paramiko.SSHClient(); ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PWD)
sftp=ssh.open_sftp()
def run(c,t=60):
    _,o,e=ssh.exec_command(c,timeout=t); return o.read().decode('utf-8','replace')+e.read().decode('utf-8','replace')

# 1) 上传 patch 后的 2 个后端 JS
files = [
    ('h5-video-tool-api/dist/services/batchJobsQueue.js', '/home/ubuntu/qas-h5/api/services/batchJobsQueue.js'),
    ('h5-video-tool-api/dist/services/dreaminaVideo.js', '/home/ubuntu/qas-h5/api/services/dreaminaVideo.js'),
    ('h5-video-tool-api/dist/build-info.json', '/home/ubuntu/qas-h5/api/build-info.json'),
]
print('=== upload patched backend ===')
for l, r in files:
    sftp.put(l, r)
    print('UPLOAD', os.path.basename(r))

# 2) 重置被 CLI 瞬时错误/4h TTL 误伤的 job：把 failed 且 failReason 属于这些类别的改回 queuing
print('\n=== reset误伤 jobs ===')
JOBS = '/home/ubuntu/qas-h5/api/output/batch-jobs/jobs.json'
raw = run(f'cat {JOBS}')
arr = json.loads(raw)
if isinstance(arr, dict): arr = arr.get('jobs') or list(arr.values())
TRANSIENT_PREFIXES = [
    'Dreamina CLI did not return parseable JSON',
    'Dreamina CLI failed with exit code',
    '即梦未返回任务数据',
    '生成超时（超过 4 小时未完成）',
    '下载成片失败',
]
# 只针对还"可能在 12 小时窗口内"的任务
now_ms = int(time.time() * 1000)
window = 12 * 3600_000
reset = []
for j in arr:
    if not isinstance(j, dict): continue
    if j.get('status') != 'failed': continue
    reason = (j.get('failReason') or '')
    if not any(reason.startswith(p) for p in TRANSIENT_PREFIXES):
        continue
    created = j.get('createdAt')
    try:
        import datetime as dt
        c_ms = int(dt.datetime.strptime(created[:19], '%Y-%m-%dT%H:%M:%S').replace(tzinfo=dt.timezone.utc).timestamp() * 1000)
    except Exception:
        c_ms = now_ms
    if now_ms - c_ms > window:
        continue  # 真超过 12h 就算了
    j['status'] = 'queuing'
    j['failReason'] = ''
    j['updatedAt'] = '2026-04-20T11:41:00.000Z'
    reset.append(j.get('submitId'))

print(f'reset {len(reset)} jobs:', reset)

if reset:
    import base64
    new = json.dumps(arr, ensure_ascii=False, indent=2)
    enc = base64.b64encode(new.encode('utf-8')).decode('ascii')
    out = run(f"cp {JOBS} {JOBS}.bak_v064patch_$(date +%s) && echo '{enc}' | base64 -d > {JOBS} && echo OK")
    print('jobs.json rewritten:', out[:50])

# 3) pm2 重启
print('\n=== pm2 restart ===')
print(run('pm2 restart qas-api && sleep 2 && pm2 list | head -8'))

# 4) 验证
time.sleep(3)
print('\n=== startup log ===')
print(run("pm2 logs qas-api --nostream --lines 50 --raw 2>&1 | grep -iE 'listening|server running|scanner|poller started' | tail -10"))

print('\n=== /api/system/version ===')
print(run("curl -s http://127.0.0.1:3001/api/system/version"))

# 5) 观察 20s 看之前被重置的 job 现在变成啥
time.sleep(25)
print('\n=== 被重置 job 轮询后状态 ===')
out = run(
    r'''/usr/bin/python3 -c "
import json
jobs=json.load(open('/home/ubuntu/qas-h5/api/output/batch-jobs/jobs.json'))
if isinstance(jobs, dict): jobs=jobs.get('jobs') or list(jobs.values())
tgt=('8031c5a6879fa8c8','d5bfc8cb3b69d3dc','c65c6c38a5ffbe33')
for j in jobs:
    if isinstance(j,dict) and j.get('submitId') in tgt:
        print(j.get('submitId'),'|',j.get('status'),'|','last=',j.get('lastPolledAt'),'|','err=',(j.get('failReason') or '')[:100])
"'''
)
print(out)

sftp.close(); ssh.close()
print('\nDONE.')
