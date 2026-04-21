import paramiko, sys, json
sys.stdout.reconfigure(encoding='utf-8')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('43.134.186.196', username='ubuntu', password='rCp0uwvlm5BTy0UxqZ+D/O1Q')
# 写 json 文件再 curl -d @file 绕开 quoting
run = lambda c: ssh.exec_command(c)[1].read().decode('utf-8','replace')
run(r"""printf '%s' '{"username":"admin","password":"admin"}' > /tmp/login.json""")
print(run("cat /tmp/login.json"))
print('---')
print(run("curl -s -X POST http://127.0.0.1:3001/api/auth/login -H 'Content-Type: application/json' -d @/tmp/login.json")[:500])
ssh.close()
