"""
上传后端编译产物到服务器
上传 h5-video-tool-api/dist/ → /home/ubuntu/qas-h5/api/
重启 PM2 qas-api
"""
import paramiko
import os
import stat
from pathlib import Path

HOST = '43.134.186.196'
USER = 'ubuntu'
PASSWORD = 'rCp0uwvlm5BTy0UxqZ+D/O1Q'
LOCAL_DIST = Path(__file__).parent.parent / 'h5-video-tool-api' / 'dist'
REMOTE_BASE = '/home/ubuntu/qas-h5/api'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASSWORD, timeout=30)
sftp = client.open_sftp()

def remote_mkdir(path):
    try:
        sftp.stat(path)
    except FileNotFoundError:
        sftp.mkdir(path)

def upload_dir(local_dir: Path, remote_dir: str):
    remote_mkdir(remote_dir)
    for item in local_dir.iterdir():
        remote_path = f'{remote_dir}/{item.name}'
        if item.is_dir():
            upload_dir(item, remote_path)
        else:
            sftp.put(str(item), remote_path)

print(f'正在上传 {LOCAL_DIST} → {REMOTE_BASE}')
upload_dir(LOCAL_DIST, REMOTE_BASE)
print('上传完成')

sftp.close()

# 重启 PM2
def ssh(cmd):
    stdin, stdout, stderr = client.exec_command(cmd)
    stdout.channel.recv_exit_status()
    return stdout.read().decode('utf-8', errors='replace').strip()

print('重启 qas-api...')
ssh('pm2 restart qas-api')

import time
time.sleep(3)

import json
raw = ssh('pm2 jlist')
data = json.loads(raw)
for p in data:
    env = p.get('pm2_env', {})
    print(f"PM2 {env.get('name')} = {env.get('status')} (restarts={env.get('restart_time')})")

client.close()
print('部署完成')
