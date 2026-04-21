import paramiko, sys, json
sys.stdout.reconfigure(encoding='utf-8')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('43.134.186.196', username='ubuntu', password='rCp0uwvlm5BTy0UxqZ+D/O1Q')

def run(cmd):
    _, out, _ = ssh.exec_command(cmd)
    return out.read().decode('utf-8', errors='replace')

out = run('''curl -s -X POST http://127.0.0.1:3001/api/auth/login -H 'Content-Type: application/json' -d '{"username":"admin","password":"admin123"}' ''')
b = json.loads(out)
token = b['data']['token']
fat = b['data']['fileAccessToken']

VID = 'bj_1776392840819_025ade'

# 只看状态码，GET 请求，不要用 -I
def test(label, qs):
    code = run(f'curl -s -o /dev/null -w "%{{http_code}}" "http://127.0.0.1:3001/api/batch-jobs/video/{VID}{qs}"')
    print(f'  {label}: {code.strip()}')

print('-- batch-jobs/video --')
test('no auth',         '')
test('?fat=<FAT>',      f'?fat={fat}')
test('?token=<JWT>',    f'?token={token}')

print('\n-- video/file (admin path) --')
# 找一个 admin user 目录下的已有视频
out = run("ls /home/ubuntu/qas-h5/api/output/admin/video/*.mp4 2>/dev/null | head -1")
video_file = out.strip().replace('/home/ubuntu/qas-h5/api/', '') if out.strip() else None
if video_file:
    print(f'path={video_file}')
    def testf(label, extra):
        url = f'"http://127.0.0.1:3001/api/video/file?path={video_file}{extra}"'
        code = run(f'curl -s -o /dev/null -w "%{{http_code}}" {url}')
        print(f'  {label}: {code.strip()}')
    testf('no auth', '')
    testf('?fat',    f'&fat={fat}')
    testf('?token',  f'&token={token}')
else:
    print('(no admin mp4 found; try production videos)')
    out = run("find /home/ubuntu/qas-h5/api/output/production -name '*.mp4' 2>/dev/null | head -1")
    p = out.strip()
    if p:
        print(f'found: {p}')

ssh.close()
