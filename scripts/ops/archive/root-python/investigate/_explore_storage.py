"""摸清服务器上 production 项目存在哪里"""
import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8')

host = '43.134.186.196'
user = 'ubuntu'
password = 'rCp0uwvlm5BTy0UxqZ+D/O1Q'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, password=password)

def run(cmd):
    _, out, err = ssh.exec_command(cmd, timeout=90)
    return out.read().decode('utf-8', errors='replace'), err.read().decode('utf-8', errors='replace')

print('=== 1. .env 里的 API_DATA_DIR ===')
o, _ = run("grep -E 'API_DATA_DIR|VIDEO_OUTPUT_DIR' /home/ubuntu/qas-h5/api/.env 2>/dev/null")
print(o if o.strip() else '(未设置，默认用 cwd)')

print('\n=== 2. API 进程 cwd ===')
o, _ = run("ls -la /proc/$(pgrep -f 'qas-api' | head -1)/cwd 2>&1")
print(o)

print('\n=== 3. 查找任何包含击退一只冰雪生物 的文件 ===')
o, _ = run(r"grep -rl '击退一只冰雪生物' /home/ubuntu/qas-h5 2>/dev/null | head -10")
print(o if o.strip() else '(grep 没命中，可能是 base64 或文件太大)')

print('\n=== 4. 查找所有 project JSON / shots 相关文件 ===')
o, _ = run("find /home/ubuntu/qas-h5 -maxdepth 6 -type f \\( -name '*.json' -path '*production*' -o -name 'production.json' \\) 2>/dev/null | head -30")
print(o if o.strip() else '(无)')

print('\n=== 5. api 目录树（前 3 层） ===')
o, _ = run("ls -la /home/ubuntu/qas-h5/api/ 2>/dev/null; echo '---'; ls -la /home/ubuntu/qas-h5/api/data 2>/dev/null | head -30")
print(o)

print('\n=== 6. output/data/projects 探测 ===')
o, _ = run("ls -la /home/ubuntu/qas-h5/api/output 2>/dev/null | head -15; echo '---'; ls -la /home/ubuntu/qas-h5/api/data/projects 2>/dev/null | head -15")
print(o)

print('\n=== 7. 找所有可能的 shot 索引 JSON（包含 shotIndex） ===')
o, _ = run("find /home/ubuntu/qas-h5 -maxdepth 6 -type f -name '*.json' 2>/dev/null | xargs -I{} grep -l 'shotIndex' {} 2>/dev/null | head -20")
print(o if o.strip() else '(无)')

ssh.close()
