import paramiko, sys, json
sys.stdout.reconfigure(encoding='utf-8')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('43.134.186.196', username='ubuntu', password='rCp0uwvlm5BTy0UxqZ+D/O1Q')

def run(cmd):
    _, out, err = ssh.exec_command(cmd)
    return out.read().decode('utf-8', errors='replace'), err.read().decode('utf-8', errors='replace')

out, _ = run('''curl -s -X POST http://127.0.0.1:3001/api/auth/login -H 'Content-Type: application/json' -d '{"username":"admin","password":"admin123"}' ''')
body = json.loads(out)
fat = body['data']['fileAccessToken']
token = body['data']['token']
print(f'token ({len(token)}): {token}')
print()
print(f'fat ({len(fat)}): {fat}')
print(f'  contains dot? {"." in fat}')
print(f'  parts: {fat.split(".")}')

# 直接用 fat 去请求（完整输出）
print('\n-- full curl output with ?fat=... --')
out, err = run(f'curl -sv "http://127.0.0.1:3001/api/batch-jobs/video/bj_1776392840819_025ade?fat={fat}" 2>&1 | head -40')
print(out)
print('\n-- full curl output with ?token=... --')
out, err = run(f'curl -sv "http://127.0.0.1:3001/api/batch-jobs/video/bj_1776392840819_025ade?token={token}" 2>&1 | head -40')
print(out)

ssh.close()
