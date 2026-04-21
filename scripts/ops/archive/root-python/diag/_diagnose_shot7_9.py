"""诊断镜 7 为什么卡、镜 9 为什么没开始"""
import paramiko, sys, json
sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('43.134.186.196', username='ubuntu', password='rCp0uwvlm5BTy0UxqZ+D/O1Q')
def run(c, t=120):
    _, o, e = ssh.exec_command(c, timeout=t)
    return o.read().decode('utf-8', 'replace'), e.read().decode('utf-8', 'replace')

# 1) 镜 7 的 submit_id 在即梦侧真实状态
print('=== 1) 即梦侧 query_task 实时状态 ===')
for sid in ['8031c5a6879fa8c8', 'd5bfc8cb3b69d3dc']:
    cmd = (
        f"cd /home/ubuntu/qas-h5/.cursor/skills/dreamina-cli-skill/scripts && "
        f"/usr/bin/python3 query_task.py --submit-id {sid} 2>&1 | head -50"
    )
    o, _ = run(cmd, t=90)
    print(f'--- submit_id={sid} ---')
    print(o[:2500])
    print()

# 2) list_task 最近 30 条看镜 7/8/9 的所有任务
print('=== 2) list_task 最近 30 条 ===')
o, _ = run(
    "cd /home/ubuntu/qas-h5/.cursor/skills/dreamina-cli-skill/scripts && "
    "/usr/bin/python3 list_task.py --limit 30 2>&1 | tail -200"
)
print(o[:4000])

# 3) pm2 日志找 8031c5a6 + recovery
print('\n=== 3) pm2 日志：8031c5a6 相关 + recover 相关 ===')
o, _ = run("pm2 logs qas-api --nostream --lines 500 --raw 2>&1 | grep -iE '8031c5a6|recover|scanner|intent' | tail -60")
print(o if o.strip() else '(无匹配)')

# 4) pm2 日志找 "镜 9 提交"/ 最近一次 dreamina submit
print('\n=== 4) pm2 日志：最近 submit 活动 ===')
o, _ = run("pm2 logs qas-api --nostream --lines 500 --raw 2>&1 | grep -iE 'submit|dreamina|1310|ExceedConcurrency|slot' | tail -60")
print(o if o.strip() else '(无匹配)')

# 5) dreamina-intents.json 当前内容
print('\n=== 5) dreamina-intents.json ===')
o, _ = run("cat /home/ubuntu/qas-h5/api/output/batch-jobs/dreamina-intents.json 2>/dev/null | /usr/bin/python3 -m json.tool 2>&1 | head -80")
print(o)

# 6) production.json 里镜 9 状态
print('\n=== 6) production.json 镜 9 最新状态 ===')
cmd = r'''/usr/bin/python3 -c "
import json
d=json.load(open('/home/ubuntu/qas-h5/api/output/production/projects/admin/proj_1776391744549_0bb3af74.json'))
for s in d.get('project',{}).get('shots',[]):
    if s.get('shotIndex') in (7,8,9,10,11):
        print('镜', s.get('shotIndex'),
              '| pending=', (s.get('pendingVideoSubmitId') or '-')[:14],
              '| url=', (s.get('previewVideoUrl') or '-')[:50],
              '| versions=', len(s.get('previewVideoVersions') or []))
print('shots total =', len(d.get('project',{}).get('shots',[])))
print('updatedAt =', d.get('updatedAt'))
"'''
o, _ = run(cmd)
print(o)

# 7) 所有 shotIndex=9 的 batch-job
print('\n=== 7) jobs.json 中所有 shot=9 ===')
cmd = r'''/usr/bin/python3 -c "
import json
jobs=json.load(open('/home/ubuntu/qas-h5/api/output/batch-jobs/jobs.json'))
if isinstance(jobs, dict):
    jobs = jobs.get('jobs') or list(jobs.values())
hit=[j for j in jobs if isinstance(j,dict) and j.get('shotIndex')==9 and j.get('projectId')=='proj_1776391744549_0bb3af74']
hit.sort(key=lambda x:x.get('updatedAt') or '')
for j in hit:
    print(j.get('updatedAt'),'|',j.get('status'),'|',j.get('submitId'),'|',(j.get('failReason') or '')[:80])
print('total=',len(hit))
"'''
o, _ = run(cmd)
print(o)

ssh.close()
