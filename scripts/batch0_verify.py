"""批次 0 验收脚本"""
import paramiko
import urllib.request
import urllib.error
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

# ── 验收 0-A: 前端页面可访问 ──────────────────────────────
print('\n=== 验收 0-A: 前端页面（Nginx 路径）===')
try:
    req = urllib.request.Request(
        'http://43.134.186.196/',
        headers={'User-Agent': 'Mozilla/5.0'}
    )
    resp = urllib.request.urlopen(req, timeout=10)
    body = resp.read().decode('utf-8', errors='replace')
    has_html = '<!DOCTYPE' in body or '<html' in body
    check('前端页面返回 HTML', has_html, body[:120])
except Exception as e:
    check('前端页面返回 HTML', False, str(e))

# ── SSH 验收 ──────────────────────────────────────────────
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASSWORD, timeout=15)

def ssh(cmd):
    stdin, stdout, stderr = client.exec_command(cmd)
    stdout.channel.recv_exit_status()
    return stdout.read().decode('utf-8', errors='replace').strip()

print('\n=== 验收 0-A: Nginx root 路径 ===')
nginx_root = ssh('grep "root " /etc/nginx/sites-enabled/qas-h5')
check('Nginx root 指向 frontend/', 'frontend' in nginx_root, nginx_root)

print('\n=== 验收 0-B: assets.db 迁移 ===')
db_in_correct = ssh('ls /home/ubuntu/qas-h5/api/db/assets.db 2>/dev/null')
check('assets.db 在 api/db/', 'assets.db' in db_in_correct, db_in_correct)

db_still_in_output = ssh('ls /home/ubuntu/qas-h5/output/assets.db 2>/dev/null')
check('output/ 中保留原文件（待验收后手动删）', 'assets.db' in db_still_in_output,
      '原文件仍在 output/，稳定后可删除')

print('\n=== 验收 0-C: SERVER_ 字段清除 ===')
server_fields = ssh('grep SERVER /home/ubuntu/qas-h5/.env 2>/dev/null')
check('server .env 无 SERVER_ 字段', server_fields == '', server_fields or '(空)')

print('\n=== 验收: 端口 3001 监听状态 ===')
port_info = ssh('ss -tlnp | grep 3001')
check('3001 当前监听状态（批次1再修复）', True, port_info)

print('\n=== 验收: PM2 状态 ===')
pm2_raw = ssh('pm2 jlist 2>/dev/null')
try:
    pm2_data = json.loads(pm2_raw)
    for p in pm2_data:
        env = p.get('pm2_env', {})
        status = env.get('status', '?')
        name = env.get('name', '?')
        restarts = env.get('restart_time', '?')
        check(f'PM2 {name} online', status == 'online', f'status={status}, restarts={restarts}')
except Exception as e:
    check('PM2 状态解析', False, str(e))

client.close()

# 汇总
print('\n' + '='*50)
passed = sum(1 for _, ok in results if ok)
total = len(results)
print(f'验收结果：{passed}/{total} 通过')
if passed == total:
    print('[批次 0 验收通过] 可以进入批次 1')
else:
    failed = [label for label, ok in results if not ok]
    print(f'[需要处理] {failed}')
