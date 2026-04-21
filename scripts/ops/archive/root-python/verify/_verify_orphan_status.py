"""验证 4 条孤儿 submitId 的 batch-job 状态 + 是否已回填到 production.json"""
import paramiko, sys, json
sys.stdout.reconfigure(encoding='utf-8')

host = '43.134.186.196'
user = 'ubuntu'
password = 'rCp0uwvlm5BTy0UxqZ+D/O1Q'

SUBMITS = {
    '91753d1517769e7c': '镜4 冰封荒原击退冰狼',
    '8031c5a6879fa8c8': '镜7 冰窟绝望（最早）',
    'd5bfc8cb3b69d3dc': '镜7 冰窟绝望（重复）',
    'c65c6c38a5ffbe33': '镜8 力量觉醒',
}
PROJECT_JSON = '/home/ubuntu/qas-h5/api/output/production/projects/admin/proj_1776391744549_0bb3af74.json'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, password=password)

def run(cmd, timeout=60):
    _, out, err = ssh.exec_command(cmd, timeout=timeout)
    return out.read().decode('utf-8', errors='replace'), err.read().decode('utf-8', errors='replace')

# 1) jobs.json 中这 4 条 submitId 的状态
print('=== batch-jobs 状态 ===')
o, _ = run("cat /home/ubuntu/qas-h5/api/output/batch-jobs/jobs.json")
try:
    jobs = json.loads(o)
    if isinstance(jobs, dict):
        jobs = jobs.get('jobs') or list(jobs.values())
    for j in jobs:
        if not isinstance(j, dict):
            continue
        sid = j.get('submitId')
        if sid not in SUBMITS:
            continue
        print(f'\n[{SUBMITS[sid]}]')
        print(f'  id         : {j.get("id")}')
        print(f'  status     : {j.get("status")}')
        print(f'  shotIndex  : {j.get("shotIndex")}')
        print(f'  projectId  : {j.get("projectId")}')
        print(f'  videoPath  : {(j.get("videoPath") or "")[:80]}')
        print(f'  videoUrl   : {(j.get("videoUrl") or "")[:80]}')
        print(f'  versions   : {len(j.get("videoVersions", []) or [])}')
        print(f'  error      : {(j.get("error") or "")[:120]}')
        print(f'  updatedAt  : {j.get("updatedAt")}')
except Exception as ex:
    print(f'解析失败: {ex}')

# 2) production.json 里 shot 4/7/8 的 previewVideoPath/Url/Versions 状态
print('\n=== production.json 里 镜4/7/8 的视频回填情况 ===')
cmd = (
    f"/usr/bin/python3 -c \"import json; "
    f"d=json.load(open('{PROJECT_JSON}')); "
    "shots=d.get('shots',[]); "
    "print('shots total:',len(shots));"
    "[print('  idx=%d name=%s  pendingSubmit=%s  previewVideoUrl=%s  previewVideoPath=%s  versions=%s' % "
    "(s.get('shotIndex'), (s.get('description') or s.get('storyboardText') or '')[:30], "
    "(s.get('pendingVideoSubmitId') or '')[:16], "
    "(s.get('previewVideoUrl') or '')[:60], "
    "(s.get('previewVideoPath') or '')[:60], "
    "len(s.get('previewVideoVersions') or []))) for s in shots if s.get('shotIndex') in (4,7,8)]\""
)
o, err = run(cmd)
print(o)
if err.strip():
    print('stderr:', err[:300])

# 3) pm2 日志看 scanner 有没有捞到 / 回填事件
print('\n=== pm2 日志尾部（看 scanner 活动）===')
o, _ = run("pm2 logs qas-api --nostream --lines 200 --raw 2>&1 | grep -iE 'recover|scanner|intent|91753d15|8031c5a6|d5bfc8cb|c65c6c38' | tail -40")
print(o if o.strip() else '(日志里没匹配关键词)')

ssh.close()
