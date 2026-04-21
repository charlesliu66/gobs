"""v0.64 部署：后端 batchJobsQueue/dreaminaRecovery/batchJobs 路由 + 前端 ProductionWizard bundle"""
import paramiko, os, sys, hashlib, time
sys.stdout.reconfigure(encoding='utf-8')

HOST = '43.134.186.196'
USER = 'ubuntu'
PWD  = 'rCp0uwvlm5BTy0UxqZ+D/O1Q'

API_LOCAL = 'h5-video-tool-api/dist'
API_REMOTE = '/home/ubuntu/qas-h5/api'
WEB_LOCAL = 'h5-video-tool/dist'
WEB_REMOTE = '/home/ubuntu/qas-h5/frontend'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PWD)
sftp = ssh.open_sftp()

def run(c, t=60):
    _, o, e = ssh.exec_command(c, timeout=t)
    return o.read().decode('utf-8','replace') + e.read().decode('utf-8','replace')

def sha256(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for chunk in iter(lambda: f.read(1<<16), b''):
            h.update(chunk)
    return h.hexdigest()

def remote_sha256(p):
    out = run(f"sha256sum {p} 2>/dev/null | awk '{{print $1}}'").strip()
    return out if len(out) == 64 else ''

def upload_if_diff(local, remote):
    if not os.path.exists(local): return False
    if sha256(local) == remote_sha256(remote):
        return False
    d = os.path.dirname(remote)
    run(f'mkdir -p {d}')
    sftp.put(local, remote)
    return True

# 1) 上传改动的后端 JS：batchJobsQueue + dreaminaRecovery + routes/batchJobs + build-info
backend_files = [
    'services/batchJobsQueue.js',
    'services/dreaminaRecovery.js',
    'routes/batchJobs.js',
    'build-info.json',
]
print('=== 上传后端 dist ===')
changed_api = []
for f in backend_files:
    l = os.path.join(API_LOCAL, f.replace('/', os.sep))
    r = f'{API_REMOTE}/{f}'
    if upload_if_diff(l, r):
        print(f'  UPLOAD {f}')
        changed_api.append(f)
    else:
        print(f'  skip   {f}')

# 2) 上传整个前端 dist
print('\n=== 上传前端 dist ===')
changed_web = 0
for root, dirs, files in os.walk(WEB_LOCAL):
    for fn in files:
        local = os.path.join(root, fn)
        rel = os.path.relpath(local, WEB_LOCAL).replace(os.sep, '/')
        remote = f'{WEB_REMOTE}/{rel}'
        if upload_if_diff(local, remote):
            changed_web += 1
            if changed_web <= 15:
                print(f'  UPLOAD {rel}')
print(f'  frontend changed files: {changed_web}')

# 3) pm2 重启
print('\n=== pm2 restart ===')
print(run('pm2 restart qas-api && sleep 2 && pm2 list | head -10'))

# 4) 健康检查 + 启动日志
time.sleep(3)
print('\n=== 启动日志（关键字）===')
print(run("pm2 logs qas-api --nostream --lines 120 --raw 2>&1 | grep -iE 'listening|server|recovery|scanner|error' | tail -20"))

print('\n=== /api/system/version ===')
print(run("curl -s http://127.0.0.1:3001/api/system/version | head -200"))

sftp.close(); ssh.close()
print('\nDONE.')
