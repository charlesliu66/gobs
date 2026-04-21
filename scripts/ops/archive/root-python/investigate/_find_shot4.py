"""详细打印"力量觉醒"submit_id 的完整 prompt + 读 production.json 做镜号对齐"""
import paramiko, sys, json, os, time
sys.stdout.reconfigure(encoding='utf-8')

host = '43.134.186.196'
user = 'ubuntu'
password = 'rCp0uwvlm5BTy0UxqZ+D/O1Q'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, password=password)

def run(cmd, timeout=90):
    _, out, err = ssh.exec_command(cmd, timeout=timeout)
    return out.read().decode('utf-8', errors='replace'), err.read().decode('utf-8', errors='replace')

# 1) 先列最近编辑的 production.json 项目，锁定"当前项目"
print('=== 最近编辑的 production 项目（按 mtime 倒序） ===')
o, _ = run("ls -lat /home/ubuntu/qas-h5/api/data/production/*/production.json 2>/dev/null | head -5")
print(o)

# 2) 拿到第一个（最新的）project.json
o, _ = run("ls -t /home/ubuntu/qas-h5/api/data/production/*/production.json 2>/dev/null | head -1")
prod_path = o.strip()
print(f'\n当前锁定项目文件: {prod_path}')

# 3) 读 production.json 里的所有 shot.storyboard 或 shot.scene
if prod_path:
    cmd = f"cat '{prod_path}' | python3 -c 'import sys,json; d=json.load(sys.stdin); shots=d.get(\"shots\",[]); print(f\"project name: {{d.get(\\\"meta\\\",{{}}).get(\\\"name\\\", d.get(\\\"name\\\",\\\"\\\"))}}  id={{d.get(\\\"id\\\",\\\"\\\")}} user={{d.get(\\\"meta\\\",{{}}).get(\\\"username\\\",\\\"\\\")}}  shots={{len(shots)}}\"); [print(f\"\\n[镜{{s.get(\\\"shotIndex\\\")}}] hasVideo={{bool(s.get(\\\"previewVideoUrl\\\") or s.get(\\\"previewVideoPath\\\") or s.get(\\\"previewVideoVersions\\\"))}}  pending={{s.get(\\\"pendingVideoSubmitId\\\") or None}}  prompt: {{(s.get(\\\"storyboard\\\") or s.get(\\\"scene\\\") or s.get(\\\"description\\\") or \\\"\\\")[:160]}}\") for s in shots]'"
    o, e = run(cmd, timeout=30)
    print(o)
    if e.strip():
        print('[stderr]', e[:300])

# 4) 单独打印 "力量觉醒" submit_id 的完整 prompt
print('\n\n=== c65c6c38a5ffbe33（力量觉醒）完整 prompt + 所有 querying 摘要 ===')
cmd = (
    "cd /home/ubuntu/qas-h5/.cursor/skills/dreamina-cli-skill/scripts && "
    "/usr/bin/python3 list_task.py --dreamina-bin /home/ubuntu/.local/bin/dreamina --limit 100 2>&1"
)
o, _ = run(cmd, timeout=120)
t = o.strip()
start = min(
    t.find('{') if t.find('{') >= 0 else 10**9,
    t.find('[') if t.find('[') >= 0 else 10**9,
)
payload = json.loads(t[start:])
data = payload.get('data') if isinstance(payload, dict) else payload
tasks = []
if isinstance(data, list):
    tasks = data
elif isinstance(data, dict):
    for k in ('list', 'tasks', 'data', 'items', 'result'):
        v = data.get(k)
        if isinstance(v, list):
            tasks = v
            break

TARGET_IDS = {
    '91753d1517769e7c': '镜4 候选（冰封荒原击退冰狼）',
    'c65c6c38a5ffbe33': '力量觉醒 候选',
    '8031c5a6879fa8c8': '冰窟绝望 候选（最早）',
    'd5bfc8cb3b69d3dc': '冰窟绝望 候选（重复）',
}

for t in tasks:
    if not isinstance(t, dict):
        continue
    sid = t.get('submit_id') or t.get('submitId') or ''
    if sid not in TARGET_IDS:
        continue
    print(f'\n── submit_id = {sid}  ({TARGET_IDS[sid]})')
    print(f'  gen_status = {t.get("gen_status")}')
    for k in ('gen_task_type', 'create_time', 'update_time', 'finish_time', 'queue_info', 'fail_reason', 'model_name'):
        if k in t:
            print(f'  {k} = {t[k]}')
    prompt = t.get('prompt') or t.get('text_prompt') or ''
    print(f'  prompt (完整):\n{prompt}')

ssh.close()
