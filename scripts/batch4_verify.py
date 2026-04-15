"""批次 4 验收脚本 — storageResolver 路径抽象层"""
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

print('\n=== 验收 4-A: resolver.ts 已部署 ===')
r = ssh('test -f /home/ubuntu/qas-h5/api/infra/storage/resolver.js && echo EXISTS || echo MISSING')
check('resolver.js 已部署', r == 'EXISTS')

print('\n=== 验收 4-B: 无 process.cwd() 旁路（业务代码）===')
# 检查修复过的文件中是否仍有 process.cwd() 
files_to_check = [
    '/home/ubuntu/qas-h5/api/db/assetDb.js',
    '/home/ubuntu/qas-h5/api/routes/localUpload.js',
    '/home/ubuntu/qas-h5/api/routes/characterLibrary.js',
    '/home/ubuntu/qas-h5/api/routes/projects.js',
    '/home/ubuntu/qas-h5/api/services/assetIngestService.js',
    '/home/ubuntu/qas-h5/api/gobs/gobsAuthStore.js',
    '/home/ubuntu/qas-h5/api/services/riskSentimentService.js',
]
for f in files_to_check:
    # 排除 config/ 路径引用（配置文件，非数据存储）
    result = ssh(f'grep "process.cwd()" {f} 2>/dev/null | grep -v "config/" | wc -l')
    count = int(result.strip()) if result.strip().isdigit() else 0
    short = f.split('/')[-1]
    check(f'{short} 无 process.cwd() 旁路', count == 0,
          f'仍有 {count} 处' if count > 0 else '已清除')

print('\n=== 验收 4-C: resolver.js 引用正常 ===')
resolver_refs = ssh('grep -r "resolver.js" /home/ubuntu/qas-h5/api/ --include="*.js" -l 2>/dev/null')
file_list = [f.split('/')[-1] for f in resolver_refs.split('\n') if f.strip()]
check('resolver.js 被正确引用', len(file_list) > 0, f'引用文件: {file_list}')

print('\n=== 验收 4-D: API 健康检查 ===')
health = ssh('curl -s http://127.0.0.1:3001/api/health 2>/dev/null')
check('API 健康', '"ok"' in health, health[:60])

print('\n=== 验收 4-E: 版本一致性 ===')
try:
    req = urllib.request.Request('http://43.134.186.196/api/system/version', headers={'User-Agent': 'verify/1.0'})
    resp = urllib.request.urlopen(req, timeout=10)
    data = json.loads(resp.read().decode())
    sha = data.get('commitShort', '')
    check('服务器运行最新版本', sha.startswith('066cdc6') or '066cdc6'.startswith(sha), f'sha={sha}')
except Exception as e:
    check('/api/system/version', False, str(e))

print('\n=== 验收 4-F: PM2 状态 ===')
pm2_raw = ssh('pm2 jlist 2>/dev/null')
try:
    pm2_data = json.loads(pm2_raw)
    for p in pm2_data:
        env = p.get('pm2_env', {})
        check(f'PM2 {env.get("name")} online', env.get('status') == 'online', f'status={env.get("status")}')
except Exception as e:
    check('PM2 状态', False, str(e))

client.close()

print('\n' + '='*50)
passed = sum(1 for _, ok in results if ok)
total = len(results)
print(f'验收结果：{passed}/{total} 通过')
if passed == total:
    print('[批次 4 验收通过] 可以进入批次 5')
else:
    failed = [label for label, ok in results if not ok]
    print(f'[需要处理] {failed}')
