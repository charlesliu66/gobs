"""v0.64.2 patch: 前端改动（ProductionWizard/ShotStrip/Workspace/GenerateActions）
只改前端，直接上传整个 h5-video-tool/dist/，不重启 pm2（前端是 Nginx 静态文件）。
"""
import os, posixpath, sys, paramiko
sys.stdout.reconfigure(encoding='utf-8')

HOST='43.134.186.196'; USER='ubuntu'; PWD='rCp0uwvlm5BTy0UxqZ+D/O1Q'
LOCAL = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'h5-video-tool', 'dist')
REMOTE = '/home/ubuntu/qas-h5/frontend'

ssh = paramiko.SSHClient(); ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PWD)
sftp = ssh.open_sftp()

def run(c, t=60):
    _, o, e = ssh.exec_command(c, timeout=t)
    return o.read().decode('utf-8','replace') + e.read().decode('utf-8','replace')

def ensure_remote_dir(p):
    try: sftp.stat(p); return
    except IOError: pass
    parent = posixpath.dirname(p)
    if parent and parent != '/':
        ensure_remote_dir(parent)
    try: sftp.mkdir(p)
    except IOError: pass

print('=== upload frontend dist -> /home/ubuntu/qas-h5/frontend ===')
uploaded = 0
for root, dirs, files in os.walk(LOCAL):
    rel = os.path.relpath(root, LOCAL).replace('\\', '/')
    rdir = REMOTE if rel == '.' else posixpath.join(REMOTE, rel)
    ensure_remote_dir(rdir)
    for f in files:
        local_path = os.path.join(root, f)
        remote_path = posixpath.join(rdir, f)
        sftp.put(local_path, remote_path)
        uploaded += 1
print(f'uploaded {uploaded} files')

# 清一下 CDN/Nginx 缓存（软）—— 打印个提示即可，不强制
print('\n=== nginx frontend root listing (trim) ===')
print(run(f'ls -la {REMOTE}/assets/ | head -10'))

sftp.close(); ssh.close()
print('\nDONE. 前端已更新，用户刷新页面即可看到 v0.64.2 修复。')
