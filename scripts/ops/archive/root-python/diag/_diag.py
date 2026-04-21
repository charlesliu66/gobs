"""诊断分镜5注入是否生效 + 分镜8提交状态"""
import paramiko, json, sys, io, urllib.request
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

env = {}
with open('h5-video-tool-api/.env', 'r', encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if '=' in line and not line.startswith('#'):
            k, v = line.split('=', 1)
            env[k.strip()] = v.strip()

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('43.134.186.196', username='ubuntu', password=env.get('SERVER_PASSWORD', ''))
sftp = ssh.open_sftp()

PROJECT_ID = 'proj_1776134802962_3d86d452'
PROJ_FILE = f'/home/ubuntu/qas-h5/api/output/production/projects/admin/{PROJECT_ID}.json'

# 1. 检查项目 JSON 中分镜5的状态
print('=== 项目 JSON 中各分镜状态 ===')
with sftp.open(PROJ_FILE, 'r') as f:
    data = json.loads(f.read().decode('utf-8'))
proj = data.get('project', {})
shots = proj.get('shots', [])
for s in shots:
    si = s.get('shotIndex', '?')
    versions = s.get('previewVideoVersions', []) or []
    pending = s.get('pendingVideoSubmitId')
    url = s.get('previewVideoUrl')
    path = s.get('previewVideoPath')
    sel = s.get('selectedPreviewVideoVersionId')
    print(f'  Shot {si}: versions={len(versions)}, pending={pending}, url={url}, path={path}, selected={sel}')
    if si == 4 and versions:
        print(f'    → version detail: {json.dumps(versions[0], ensure_ascii=False)[:200]}')

# 2. 检查分镜5的视频文件是否在服务器上
print('\n=== 分镜5视频文件检查 ===')
stdin, stdout, stderr = ssh.exec_command('ls -la /home/ubuntu/qas-h5/api/output/admin/dreamina_shot5_*.mp4 2>/dev/null')
print(stdout.read().decode('utf-8', errors='replace') or '(not found)')

# 3. 验证视频文件能否通过 API 访问
print('=== 验证视频 API 可访问性 ===')
try:
    # 先找到 shot 5 的 videoPath
    shot5 = next((s for s in shots if s.get('shotIndex') == 4), None)
    if shot5 and shot5.get('previewVideoPath'):
        vpath = shot5['previewVideoPath']
        test_url = f'http://43.134.186.196/api/video/file?path={vpath}'
        req = urllib.request.Request(test_url, method='HEAD')
        resp = urllib.request.urlopen(req, timeout=10)
        print(f'  HEAD {test_url} → {resp.status}')
    else:
        print('  shot5 has no videoPath')
except Exception as e:
    print(f'  ERROR: {e}')

# 4. 检查 batch-jobs
print('\n=== Batch jobs ===')
stdin, stdout, stderr = ssh.exec_command('cat /home/ubuntu/qas-h5/api/output/batch-jobs/jobs.json 2>/dev/null || echo NO_BATCH_JOBS')
bj = stdout.read().decode('utf-8', errors='replace').strip()
if bj != 'NO_BATCH_JOBS':
    jobs = json.loads(bj)
    print(f'Total: {len(jobs)}')
    for j in jobs:
        print(f"  {j['id']} | shot={j.get('shotIndex')} | status={j['status']} | source={j.get('source')} | submitId={j.get('submitId','?')[:24]}")
else:
    print('No batch jobs file found')

# 5. 检查 PM2 最近日志（看有没有 shot 8 的提交）
print('\n=== 最近 PM2 日志 (last 40 lines) ===')
stdin, stdout, stderr = ssh.exec_command('tail -40 /home/ubuntu/.pm2/logs/qas-api-out.log 2>/dev/null')
print(stdout.read().decode('utf-8', errors='replace'))

# 6. 检查 PM2 error 日志
print('\n=== PM2 错误日志 (last 20 lines) ===')
stdin, stdout, stderr = ssh.exec_command('tail -20 /home/ubuntu/.pm2/logs/qas-api-error.log 2>/dev/null')
errlog = stdout.read().decode('utf-8', errors='replace')
# filter out emoji that might break console
print(errlog.encode('ascii', 'replace').decode('ascii'))

sftp.close()
ssh.close()
