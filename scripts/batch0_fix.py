"""批次 0：服务器紧急修复脚本"""
import paramiko
import sys

HOST = '43.134.186.196'
USER = 'ubuntu'
PASSWORD = 'rCp0uwvlm5BTy0UxqZ+D/O1Q'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASSWORD, timeout=15)

def run(cmd, show=True):
    stdin, stdout, stderr = client.exec_command(cmd)
    rc = stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    if show:
        if out.strip():
            print(out.strip())
        if err.strip():
            print('ERR:', err.strip()[:300])
    return rc, out, err

# ─── 0-A: 修复 Nginx 路径 ─────────────────────────────────────────
print('\n' + '='*50)
print('0-A: 修复 Nginx root 路径')
print('='*50)

run('sudo cp /etc/nginx/sites-enabled/qas-h5 /etc/nginx/sites-enabled/qas-h5.bak.20260415')
print('[OK] Nginx 配置已备份 → qas-h5.bak.20260415')

run("sudo sed -i 's|root /var/www/qas-h5;|root /home/ubuntu/qas-h5/frontend;|g' /etc/nginx/sites-enabled/qas-h5")

rc, out, _ = run('grep "root " /etc/nginx/sites-enabled/qas-h5', show=False)
print(f'[确认新配置] {out.strip()}')

rc, out, err = run('sudo nginx -t 2>&1', show=False)
combined = (out + err).strip()
print(f'[nginx -t] {combined}')

if 'successful' in combined or ('syntax is ok' in combined):
    run('sudo systemctl reload nginx')
    print('[OK] Nginx 已成功 reload')
else:
    print('[ERROR] nginx -t 失败，执行回滚')
    run('sudo cp /etc/nginx/sites-enabled/qas-h5.bak.20260415 /etc/nginx/sites-enabled/qas-h5')
    run('sudo systemctl reload nginx')
    sys.exit(1)

# ─── 0-B: 迁移 assets.db ──────────────────────────────────────────
print('\n' + '='*50)
print('0-B: 迁移 assets.db')
print('='*50)

rc, out, _ = run('ls -la /home/ubuntu/qas-h5/output/assets.db* 2>/dev/null', show=False)
if 'assets.db' in out:
    print(f'[发现] {out.strip()}')

    # 确保目标 db/ 目录存在
    run('mkdir -p /home/ubuntu/qas-h5/api/db/')

    # 检查目标是否已有 db（避免覆盖）
    rc2, out2, _ = run('ls /home/ubuntu/qas-h5/api/db/ 2>/dev/null', show=False)
    print(f'[api/db/ 现有文件] {out2.strip() or "(空)"}')

    # 复制（不删除原文件，先确认服务正常再删）
    run('cp /home/ubuntu/qas-h5/output/assets.db /home/ubuntu/qas-h5/api/db/assets.db')
    for ext in ['assets.db-shm', 'assets.db-wal']:
        run(f'cp /home/ubuntu/qas-h5/output/{ext} /home/ubuntu/qas-h5/api/db/{ext} 2>/dev/null || true', show=False)

    rc3, out3, _ = run('ls -la /home/ubuntu/qas-h5/api/db/', show=False)
    print(f'[迁移后 api/db/]\n{out3.strip()}')
    print('[OK] assets.db 已复制到 api/db/（原文件暂保留，验收通过后手动删除）')
else:
    print('[跳过] output/ 中未发现 assets.db，可能已迁移')

# ─── 0-C: 清除服务器 .env 中的 SERVER_PASSWORD ────────────────────
print('\n' + '='*50)
print('0-C: 清除服务器 .env 中的 SERVER_ 字段')
print('='*50)

run('cp /home/ubuntu/qas-h5/.env /home/ubuntu/qas-h5/.env.bak.20260415')
print('[OK] .env 已备份 → .env.bak.20260415')

# 删除 SERVER_HOST/USER/AUTH/PASSWORD 四行
run("sed -i '/^SERVER_HOST/d;/^SERVER_USER/d;/^SERVER_AUTH/d;/^SERVER_PASSWORD/d' /home/ubuntu/qas-h5/.env")

rc, out, _ = run('grep SERVER /home/ubuntu/qas-h5/.env', show=False)
if out.strip():
    print(f'[警告] 仍有 SERVER_ 字段残留：{out.strip()}')
else:
    print('[OK] SERVER_ 字段已全部清除')

# ─── 重启 API，让 db 路径变更生效 ─────────────────────────────────
print('\n' + '='*50)
print('重启 PM2 进程')
print('='*50)
run('pm2 restart qas-api')
print('[OK] pm2 restart 已执行')

print('\n' + '='*50)
print('批次 0 操作完成，开始验收...')
print('='*50)

client.close()
