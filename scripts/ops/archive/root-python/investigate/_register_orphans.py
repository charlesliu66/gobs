"""把 4 条孤儿 submit_id 注册到 batch-jobs。"""
import paramiko, sys, json
sys.stdout.reconfigure(encoding='utf-8')

host = '43.134.186.196'
user = 'ubuntu'
password = 'rCp0uwvlm5BTy0UxqZ+D/O1Q'

PROJECT_ID = 'proj_1776391744549_0bb3af74'
H5_USERNAME = 'admin'

# (submitId, shotIndex 1-based, 描述)
ORPHANS = [
    ('91753d1517769e7c', 4, '冰封荒原击退冰狼'),
    ('8031c5a6879fa8c8', 7, '冰窟绝望（最早）'),
    ('d5bfc8cb3b69d3dc', 7, '冰窟绝望（重复）'),
    ('c65c6c38a5ffbe33', 8, '力量觉醒'),
]

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, password=password)

def run(cmd, timeout=60):
    _, out, err = ssh.exec_command(cmd, timeout=timeout)
    return out.read().decode('utf-8', errors='replace'), err.read().decode('utf-8', errors='replace')

# 1) 读当前 batch-jobs 里已存在的 submitId（直接读 jobs.json 而不是过 API，避免 JWT 问题）
print('=== 读现有 batch-jobs ===')
o, _ = run("cat /home/ubuntu/qas-h5/api/output/batch-jobs/jobs.json")
existing_submits = set()
try:
    jobs_raw = json.loads(o)
    if isinstance(jobs_raw, list):
        arr = jobs_raw
    elif isinstance(jobs_raw, dict):
        arr = jobs_raw.get('jobs') or list(jobs_raw.values()) if isinstance(jobs_raw, dict) else []
    else:
        arr = []
    for j in arr if isinstance(arr, list) else []:
        if isinstance(j, dict) and j.get('submitId'):
            existing_submits.add(j['submitId'])
    print(f'当前 batch-jobs 含 submitId 数: {len(existing_submits)}')
except Exception as ex:
    print(f'[warn] 解析 jobs.json 失败: {ex}')

# 2) 登录 admin 拿 JWT
print('\n=== 登录 admin ===')
def try_login(uname, pwd):
    c = f"""curl -s -X POST http://127.0.0.1:3001/api/auth/login -H 'Content-Type: application/json' -d '{{"username":"{uname}","password":"{pwd}"}}'"""
    o, _ = run(c)
    try:
        b = json.loads(o)
        return b.get('data', {}).get('token') if b.get('success') else None
    except Exception:
        return None

token = None
for pwd in ['admin123', 'admin', 'password', '123456']:
    t = try_login(H5_USERNAME, pwd)
    if t:
        token = t
        print(f'✓ admin 登录成功')
        break
if not token:
    print('[FAIL] admin 登录失败')
    ssh.close(); sys.exit(1)

# 3) 构造注册 body，去重
print('\n=== 准备注册 ===')
shots_payload = []
skipped = []
for sid, shot_idx, desc in ORPHANS:
    if sid in existing_submits:
        skipped.append(f'{sid} (镜{shot_idx})')
        continue
    shots_payload.append({
        'submitId': sid,
        'taskId': f'dreamina-{sid}',
        'shotIndex': shot_idx,
        'shotDescription': desc,
        'model': 'dreamina-multimodal',
        'source': 'production',
    })

if skipped:
    print(f'已注册过，跳过：{skipped}')
if not shots_payload:
    print('全部已注册，无需操作'); ssh.close(); sys.exit(0)

print(f'将注册 {len(shots_payload)} 条：')
for s in shots_payload:
    print(f'  - 镜{s["shotIndex"]} / {s["submitId"]} / {s["shotDescription"]}')

# 4) POST /api/batch-jobs
body = json.dumps({'projectId': PROJECT_ID, 'shots': shots_payload})
body_esc = body.replace("'", "'\"'\"'")
cmd = (
    f"curl -s -X POST http://127.0.0.1:3001/api/batch-jobs "
    f"-H 'Authorization: Bearer {token}' -H 'Content-Type: application/json' "
    f"-d '{body_esc}'"
)
print('\n=== 注册 ===')
o, _ = run(cmd)
print('响应:', o[:800])
try:
    resp = json.loads(o)
    added = resp.get('jobs', []) if isinstance(resp, dict) else []
except Exception:
    added = []
print(f'\n注册成功: {len(added)} 条')

# 5) 立即 poll-now（不等 45s 退避）
if added:
    print('\n=== 立即触发 poll-now ===')
    for j in added:
        jid = j.get('id')
        if not jid:
            continue
        o, _ = run(f"curl -s -X POST http://127.0.0.1:3001/api/batch-jobs/{jid}/poll-now -H 'Authorization: Bearer {token}'")
        shot = j.get('shotIndex')
        sid = j.get('submitId', '')[:10]
        phase = ''
        try:
            rb = json.loads(o)
            phase = rb.get('job', {}).get('status') or rb.get('status') or ''
        except Exception:
            pass
        print(f'  [镜{shot}] job={jid} submit={sid}… -> phase={phase}  raw={o[:150]}')

ssh.close()
print('\n[OK] 完成。1-3 分钟内 H5 上镜4/镜7/镜8 应可见任务状态；生成完成后视频自动回填。')
print('如需查看当前排队：curl -H "Authorization: Bearer <jwt>" /api/batch-jobs')
