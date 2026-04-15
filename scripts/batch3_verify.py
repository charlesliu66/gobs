"""批次 3 验收脚本"""
import paramiko
import urllib.request
import json

HOST = '43.134.186.196'
USER = 'ubuntu'
PASSWORD = 'rCp0uwvlm5BTy0UxqZ+D/O1Q'

results = []

def check(label, passed, detail=''):
    mark = '[PASS]' if passed else '[FAIL]'
    msg = f'{mark} {label}'
    if detail:
        msg += f'\n       {detail}'
    print(msg)
    results.append((label, passed))

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASSWORD, timeout=15)

def ssh(cmd):
    stdin, stdout, stderr = client.exec_command(cmd)
    stdout.channel.recv_exit_status()
    return stdout.read().decode('utf-8', errors='replace').strip()

print('\n=== 验收 3-A: 必要目录存在 ===')
dirs = {
    'output': '/home/ubuntu/qas-h5/api/output',
    'uploads': '/home/ubuntu/qas-h5/api/uploads',
    'uploads/editor': '/home/ubuntu/qas-h5/api/uploads/editor',
    'db': '/home/ubuntu/qas-h5/api/db',
}
for label, path in dirs.items():
    result = ssh(f'test -d {path} && echo EXISTS || echo MISSING')
    check(f'目录存在: {label}', result == 'EXISTS', path)

print('\n=== 验收 3-B: env.ts 已部署 ===')
env_ts = ssh('test -f /home/ubuntu/qas-h5/api/config/env.js && echo EXISTS || echo MISSING')
check('config/env.js 已部署到服务器', env_ts == 'EXISTS')

print('\n=== 验收 3-C: API 健康检查 ===')
health = ssh('curl -s http://127.0.0.1:3001/api/health 2>/dev/null')
check('API /health 正常', '"ok"' in health, health[:80])

print('\n=== 验收 3-D: 版本接口一致性 ===')
try:
    req = urllib.request.Request(
        'http://43.134.186.196/api/system/version',
        headers={'User-Agent': 'verify/1.0'}
    )
    resp = urllib.request.urlopen(req, timeout=10)
    data = json.loads(resp.read().decode())
    sha = data.get('commitShort', '')
    check('/api/system/version 返回最新版本', sha not in ('unknown', ''), f'commitShort={sha}')
except Exception as e:
    check('/api/system/version', False, str(e))

print('\n=== 验收 3-E: PM2 状态 ===')
pm2_raw = ssh('pm2 jlist 2>/dev/null')
try:
    pm2_data = json.loads(pm2_raw)
    for p in pm2_data:
        env = p.get('pm2_env', {})
        status = env.get('status', '?')
        name = env.get('name', '?')
        check(f'PM2 {name} online', status == 'online', f'status={status}')
except Exception as e:
    check('PM2 状态', False, str(e))

client.close()

# 汇总
print('\n' + '='*50)
passed = sum(1 for _, ok in results if ok)
total = len(results)
print(f'验收结果：{passed}/{total} 通过')
if passed == total:
    print('[批次 3 验收通过] 可以进入批次 4')
else:
    failed = [label for label, ok in results if not ok]
    print(f'[需要处理] {failed}')
