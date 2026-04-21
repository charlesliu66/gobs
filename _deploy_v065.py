import hashlib
import os
import posixpath
import sys
import time

import paramiko

sys.stdout.reconfigure(encoding='utf-8')

HOST = '43.134.186.196'
USER = 'ubuntu'
API_LOCAL = os.path.join('h5-video-tool-api', 'dist')
API_REMOTE = '/home/ubuntu/qas-h5/api'
WEB_LOCAL = os.path.join('h5-video-tool', 'dist')
WEB_REMOTE = '/home/ubuntu/qas-h5/frontend'
ENV_PATH = os.path.join('h5-video-tool-api', '.env')


def load_server_password() -> str:
    if not os.path.exists(ENV_PATH):
        raise RuntimeError(f'missing env file: {ENV_PATH}')
    with open(ENV_PATH, 'r', encoding='utf-8') as fh:
        for raw in fh:
            line = raw.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            key, value = line.split('=', 1)
            if key.strip() == 'SERVER_PASSWORD':
                value = value.strip().strip('"').strip("'")
                if not value:
                    break
                return value
    raise RuntimeError('SERVER_PASSWORD not found in h5-video-tool-api/.env')


PWD = load_server_password()

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PWD)
sftp = ssh.open_sftp()


def run(command: str, timeout: int = 120) -> str:
    _, stdout, stderr = ssh.exec_command(command, timeout=timeout)
    return stdout.read().decode('utf-8', 'replace') + stderr.read().decode('utf-8', 'replace')


def ensure_remote_dir(path: str) -> None:
    try:
        sftp.stat(path)
        return
    except IOError:
        pass
    parent = posixpath.dirname(path)
    if parent and parent != '/':
        ensure_remote_dir(parent)
    try:
        sftp.mkdir(path)
    except IOError:
        pass


def sha256_file(path: str) -> str:
    digest = hashlib.sha256()
    with open(path, 'rb') as fh:
        for chunk in iter(lambda: fh.read(1 << 16), b''):
            digest.update(chunk)
    return digest.hexdigest()


def remote_sha256(path: str) -> str:
    out = run(f"sha256sum {path} 2>/dev/null | awk '{{print $1}}'").strip()
    return out if len(out) == 64 else ''


def upload_tree(local_root: str, remote_root: str) -> int:
    changed = 0
    for root, _dirs, files in os.walk(local_root):
        rel_root = os.path.relpath(root, local_root).replace('\\', '/')
        remote_dir = remote_root if rel_root == '.' else posixpath.join(remote_root, rel_root)
        ensure_remote_dir(remote_dir)
        for filename in files:
            local_path = os.path.join(root, filename)
            remote_path = posixpath.join(remote_dir, filename)
            if sha256_file(local_path) == remote_sha256(remote_path):
                continue
            sftp.put(local_path, remote_path)
            changed += 1
            print(f'UPLOAD {remote_path}')
    return changed


print('=== upload api dist ===')
api_changed = upload_tree(API_LOCAL, API_REMOTE)
print(f'api changed files: {api_changed}')

print('\n=== upload frontend dist ===')
web_changed = upload_tree(WEB_LOCAL, WEB_REMOTE)
print(f'frontend changed files: {web_changed}')

print('\n=== pm2 restart qas-api ===')
print(run('pm2 restart qas-api && sleep 2 && pm2 list | head -20'))

time.sleep(3)
print('\n=== /api/system/version ===')
print(run('curl -s http://127.0.0.1:3001/api/system/version | head -200'))

sftp.close()
ssh.close()
print('\nDONE')
