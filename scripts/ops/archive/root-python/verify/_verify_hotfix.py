"""用 admin 账号登录后，测试 /api/batch-jobs/video 是否恢复访问"""
import sys, urllib.request, json
sys.stdout.reconfigure(encoding='utf-8')

BASE = 'http://43.134.186.196:3001/api'

# 1. 登录获取 token + fat
req = urllib.request.Request(
    f'{BASE}/auth/login',
    data=json.dumps({'username': 'admin', 'password': 'admin123'}).encode(),
    headers={'Content-Type': 'application/json'},
)
try:
    resp = urllib.request.urlopen(req, timeout=10).read()
    body = json.loads(resp)
    token = body['data']['token']
    fat = body['data']['fileAccessToken']
    print(f'[login] OK, token={token[:20]}..., fat={fat[:20]}...')
except Exception as e:
    print(f'[login] FAIL: {e}')
    sys.exit(1)

# 2. 测试 /api/batch-jobs/video/xxx with Authorization header (JWT)
VID = 'bj_1776392840819_025ade'
def test(label, url, headers=None):
    req = urllib.request.Request(url, headers=headers or {})
    req.method = 'HEAD'
    try:
        resp = urllib.request.urlopen(req, timeout=10)
        print(f'  {label}: HTTP {resp.status}')
    except urllib.error.HTTPError as e:
        print(f'  {label}: HTTP {e.code} ({e.reason})')
    except Exception as e:
        print(f'  {label}: ERR {e}')

print('\n-- /api/batch-jobs/video --')
test('no auth', f'{BASE}/batch-jobs/video/{VID}')
test('Authorization Bearer JWT', f'{BASE}/batch-jobs/video/{VID}', {'Authorization': f'Bearer {token}'})
test('?fat=...', f'{BASE}/batch-jobs/video/{VID}?fat={fat}')
test('?token=<jwt> (compat旁路)', f'{BASE}/batch-jobs/video/{VID}?token={token}')

print('\n-- /api/video/file --')
# 测试一个历史 user 文件路径
test('no auth', f'{BASE}/video/file?path=admin/foo.mp4')
test('?token=<jwt>', f'{BASE}/video/file?path=admin/foo.mp4&token={token}')
