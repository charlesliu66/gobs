"""在服务器本地通过 curl 测试"""
import paramiko, sys, json
sys.stdout.reconfigure(encoding='utf-8')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('43.134.186.196', username='ubuntu', password='rCp0uwvlm5BTy0UxqZ+D/O1Q')

def run(cmd):
    _, out, err = ssh.exec_command(cmd)
    return out.read().decode('utf-8', errors='replace'), err.read().decode('utf-8', errors='replace')

print('-- login --')
out, _ = run('''curl -s -X POST http://127.0.0.1:3001/api/auth/login -H 'Content-Type: application/json' -d '{"username":"admin","password":"admin123"}' ''')
body = json.loads(out)
token = body['data']['token']
fat = body['data']['fileAccessToken']
print(f'token={token[:20]}... fat={fat[:20]}...')

VID = 'bj_1776392840819_025ade'
def test(label, extra):
    o, _ = run(f'curl -s -o /dev/null -w "%{{http_code}}" -I {extra} http://127.0.0.1:3001/api/batch-jobs/video/{VID}')
    print(f'  {label}: HTTP {o.strip()}')

print('\n-- /api/batch-jobs/video/<vid> --')
test('no auth',                      '')
test('Authorization Bearer JWT',     f'-H "Authorization: Bearer {token}"')
test('?fat=<FAT>',                   f'-G --data-urlencode "fat={fat}"')
test('?token=<JWT>  (compat 旁路)',  f'-G --data-urlencode "token={token}"')

print('\n-- /api/video/file --')
def testf(label, extra):
    o, _ = run(f'curl -s -o /dev/null -w "%{{http_code}}" -I {extra} "http://127.0.0.1:3001/api/video/file?path=admin/foo.mp4"')
    print(f'  {label}: HTTP {o.strip()}')
testf('no auth',            '')
testf('?fat=<FAT>',         f'-H "" -G --data-urlencode "fat={fat}"')
testf('?token=<JWT>',       f'-H "" -G --data-urlencode "token={token}"')

ssh.close()
