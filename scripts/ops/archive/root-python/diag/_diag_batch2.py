import paramiko, sys, json
sys.stdout.reconfigure(encoding='utf-8')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('43.134.186.196', username='ubuntu', password='rCp0uwvlm5BTy0UxqZ+D/O1Q')

def run(cmd):
    _, out, _ = ssh.exec_command(cmd)
    return out.read().decode('utf-8', errors='replace')

print('=== 所有 jobs (recent 30) ===')
out = run('cat /home/ubuntu/qas-h5/api/output/batch-jobs/jobs.json 2>/dev/null')
arr = json.loads(out)
arr.sort(key=lambda j: j.get('createdAt', ''))
for j in arr[-30:]:
    print(f"  {j.get('createdAt','')} | {j.get('status','?'):10s} | shot={j.get('shotIndex','?')} | user={j.get('username','') or 'None':8s} | proj={j.get('projectId','')[:30]} | id={j['id']} | videoUrl={'Y' if j.get('videoUrl') else 'N'}")

print()
print('=== project admin/proj_1776391744549_0bb3af74.json 分镜状态 ===')
out = run('cat /home/ubuntu/qas-h5/api/output/production/projects/admin/proj_1776391744549_0bb3af74.json 2>/dev/null')
data = json.loads(out)
proj = data.get('project') or {}
shots = proj.get('shots') or []
print(f'Project id: {proj.get("id")}  title={proj.get("title")}')
print(f'Total shots: {len(shots)}')
for s in shots:
    idx = s.get('shotIndex')
    pvu = s.get('previewVideoUrl') or ''
    pvp = s.get('previewVideoPath') or ''
    pvv = s.get('previewVideoVersions') or []
    pending = s.get('pendingVideoSubmitId')
    print(f"  #{idx}: pending={pending!r} previewVideoUrl={pvu[:60]!r} previewVideoPath={pvp[:50]!r} versions={len(pvv)}")

print()
print('=== 视频文件目录 ===')
out = run('ls -lt /home/ubuntu/qas-h5/api/output/batch-jobs/videos/ | head -20')
print(out)

ssh.close()
