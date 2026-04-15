"""批次 0 补丁：修复 /home/ubuntu 目录权限，让 nginx 可穿越"""
import paramiko
import urllib.request
import time

HOST = '43.134.186.196'
USER = 'ubuntu'
PASSWORD = 'rCp0uwvlm5BTy0UxqZ+D/O1Q'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASSWORD, timeout=15)

def ssh(cmd):
    stdin, stdout, stderr = client.exec_command(cmd)
    stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    return out, err

# 给 /home/ubuntu 加 o+x（仅允许穿越，不暴露目录列表）
out, err = ssh('chmod o+x /home/ubuntu')
print(f'chmod o+x /home/ubuntu: {"OK" if not err else err}')

# 确认权限
out, err = ssh('ls -la /home/ | grep ubuntu')
print(f'权限确认: {out}')

# 验证 www-data 能访问
out, err = ssh('sudo -u www-data ls /home/ubuntu/qas-h5/frontend/ 2>&1')
if 'Permission denied' in out or 'Permission denied' in err:
    print(f'[FAIL] www-data 仍无法访问: {out or err}')
else:
    print(f'[PASS] www-data 可访问 frontend/: {out[:80]}')

client.close()

# HTTP 验收
time.sleep(1)
print('\n=== HTTP 访问验收 ===')
try:
    req = urllib.request.Request('http://43.134.186.196/', headers={'User-Agent': 'Mozilla/5.0'})
    resp = urllib.request.urlopen(req, timeout=10)
    body = resp.read().decode('utf-8', errors='replace')
    if '<!DOCTYPE' in body or '<html' in body.lower():
        print(f'[PASS] 前端页面正常，HTTP {resp.getcode()}')
        print(f'       前 200 字符: {body[:200]}')
    else:
        print(f'[WARN] 返回内容: {body[:200]}')
except urllib.error.HTTPError as e:
    body = e.read().decode('utf-8', errors='replace')
    print(f'[FAIL] HTTP {e.code}: {body[:200]}')
except Exception as e:
    print(f'[FAIL] {e}')
