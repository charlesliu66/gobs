"""检查 production.json 的真实结构"""
import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8')

host = '43.134.186.196'
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username='ubuntu', password='rCp0uwvlm5BTy0UxqZ+D/O1Q')

def run(c): _, o, e = ssh.exec_command(c, timeout=60); return o.read().decode('utf-8', 'replace')

cmd = r'''/usr/bin/python3 -c "
import json
d = json.load(open('/home/ubuntu/qas-h5/api/output/production/projects/admin/proj_1776391744549_0bb3af74.json'))
def keys(o, prefix='', depth=0):
    if depth>3: return
    if isinstance(o, dict):
        for k,v in o.items():
            t = type(v).__name__
            extra = ''
            if isinstance(v, list): extra = f' (len={len(v)})'
            elif isinstance(v, str): extra = f' (len={len(v)})'
            print(prefix+k+' :: '+t+extra)
            if isinstance(v, dict) and len(v) < 30:
                keys(v, prefix+'  ', depth+1)
            elif isinstance(v, list) and v and isinstance(v[0], dict):
                print(prefix+'  [0] sample keys:', list(v[0].keys())[:20])
keys(d)
"
'''
print(run(cmd))

# 找 shots 位置（按字段扫描）
print('\n=== 找 shots 字段位置 ===')
cmd2 = r'''/usr/bin/python3 -c "
import json
d = json.load(open('/home/ubuntu/qas-h5/api/output/production/projects/admin/proj_1776391744549_0bb3af74.json'))
def walk(o, path=''):
    if isinstance(o, dict):
        for k,v in o.items():
            p=path+'/'+k
            if k=='shots' and isinstance(v, list):
                print('found', p, 'len=', len(v))
                if v and isinstance(v[0], dict):
                    print('  sample shot keys:', list(v[0].keys())[:30])
                    for s in v:
                        if not isinstance(s, dict): continue
                        if s.get('shotIndex') in (4,7,8):
                            print('  idx=', s.get('shotIndex'),
                                  'pending=', (s.get('pendingVideoSubmitId') or '')[:16],
                                  'previewVideoUrl=', (s.get('previewVideoUrl') or '')[:50],
                                  'previewVideoPath=', (s.get('previewVideoPath') or '')[:50],
                                  'versions=', len(s.get('previewVideoVersions') or []))
            walk(v, p)
    elif isinstance(o, list):
        for i,x in enumerate(o):
            walk(x, path+f'[{i}]')
walk(d)
"
'''
print(run(cmd2))
ssh.close()
