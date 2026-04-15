"""批次 1 验收脚本"""
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

print('\n=== 验收 1-A: 端口 3001 绑定到 127.0.0.1 ===')
port_info = ssh('ss -tlnp | grep 3001')
is_local = '127.0.0.1' in port_info
check('3001 绑定到 127.0.0.1', is_local, port_info)
if '0.0.0.0' in port_info:
    check('3001 不暴露到 0.0.0.0', False, port_info)

print('\n=== 验收 1-A: 外网无法直连 3001 ===')
# 通过服务器本地 curl 验证 127.0.0.1 可通（API 内部正常）
local_health = ssh('curl -s http://127.0.0.1:3001/api/health 2>/dev/null')
check('127.0.0.1:3001 本地可访问', 'ok' in local_health, local_health[:80])

print('\n=== 验收 1-B: /api/system/version 接口 ===')
try:
    req = urllib.request.Request(
        'http://43.134.186.196/api/system/version',
        headers={'User-Agent': 'curl/7.0'}
    )
    resp = urllib.request.urlopen(req, timeout=10)
    body = resp.read().decode('utf-8', errors='replace')
    data = json.loads(body)
    check('/api/system/version 返回 200', True, body[:120])
    check('commitSha 字段存在', 'commitSha' in data, data.get('commitSha', '(missing)'))
    check('buildTime 字段存在', 'buildTime' in data, data.get('buildTime', '(missing)'))
    sha = data.get('commitSha', '')
    check('commitSha 不是 unknown', sha not in ('unknown', ''), sha)
except Exception as e:
    check('/api/system/version 接口', False, str(e))

print('\n=== 验收: build-info.json 已生成 ===')
bi = ssh('cat /home/ubuntu/qas-h5/api/build-info.json 2>/dev/null')
check('服务器上 build-info.json 存在', 'commitSha' in bi, bi[:80])

print('\n=== 验收: PM2 状态 ===')
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
    print('[批次 1 验收通过] 可以进入批次 2')
else:
    failed = [label for label, ok in results if not ok]
    print(f'[需要处理] {failed}')
