"""v0.49 部署：后端 + 前端（性能优化：缩略图 + ReviewQueue 分页）"""
import paramiko
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

host = '43.134.186.196'
user = 'ubuntu'
password = 'rCp0uwvlm5BTy0UxqZ+D/O1Q'

BASE = r'C:\Users\wei.liu\Desktop\cursor_try\QAS'
API_DIST = os.path.join(BASE, 'h5-video-tool-api', 'dist')
FE_DIST = os.path.join(BASE, 'h5-video-tool', 'dist')

REMOTE_API = '/home/ubuntu/qas-h5/api'
REMOTE_FE = '/home/ubuntu/qas-h5/frontend'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, password=password)
sftp = ssh.open_sftp()

def ensure_remote_dir(remote_dir):
    parts = remote_dir.split('/')
    for i in range(1, len(parts) + 1):
        d = '/'.join(parts[:i])
        if not d:
            continue
        try:
            sftp.stat(d)
        except (FileNotFoundError, IOError):
            try:
                sftp.mkdir(d)
            except (IOError, OSError):
                pass

def upload_dir(local_root, remote_root, label):
    count = 0
    for root, dirs, files in os.walk(local_root):
        for fname in files:
            local_path = os.path.join(root, fname)
            rel = os.path.relpath(local_path, local_root).replace('\\', '/')
            remote_path = f'{remote_root}/{rel}'
            ensure_remote_dir(os.path.dirname(remote_path).replace('\\', '/'))
            sftp.put(local_path, remote_path)
            count += 1
    print(f'  [{label}] {count} files -> {remote_root}')
    return count

print('=== 上传后端 API ===')
api_count = upload_dir(API_DIST, REMOTE_API, 'api')

print('\n=== 上传前端 ===')
fe_count = upload_dir(FE_DIST, REMOTE_FE, 'frontend')

sftp.close()

print('\n=== pm2 restart qas-api ===')
stdin, stdout, stderr = ssh.exec_command('pm2 restart qas-api')
print(stdout.read().decode('utf-8'))
err = stderr.read().decode('utf-8')
if err:
    print(f'stderr: {err}')

# 批量为存量素材生成缩略图
print('\n=== 生成存量素材缩略图 ===')

THUMB_SCRIPT = r"""
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const sharp = require('sharp');
const { execFileSync } = require('child_process');

const dbPath = path.join('/home/ubuntu/qas-h5/api', 'db', 'assets.db');
const db = new Database(dbPath);
const assets = db.prepare("SELECT id, filepath, mimetype FROM assets").all();
console.log('Total assets:', assets.length);

let gen = 0, skip = 0, fail = 0;

async function run() {
  for (const a of assets) {
    if (!a.filepath || !fs.existsSync(a.filepath)) { fail++; continue; }
    const dir = path.dirname(a.filepath);
    const base = path.basename(a.filepath, path.extname(a.filepath));
    const thumbDir = path.join(dir, '.thumbs');
    const thumbPath = path.join(thumbDir, base + '.thumb.jpg');

    if (fs.existsSync(thumbPath)) { skip++; continue; }
    fs.mkdirSync(thumbDir, { recursive: true });

    try {
      if (a.mimetype && a.mimetype.startsWith('image/')) {
        await sharp(a.filepath)
          .resize(300, 300, { fit: 'cover', position: 'centre' })
          .jpeg({ quality: 75 })
          .toFile(thumbPath);
        gen++;
      } else if (a.mimetype && a.mimetype.startsWith('video/')) {
        try {
          execFileSync('ffmpeg', [
            '-i', a.filepath, '-ss', '1', '-frames:v', '1',
            '-vf', 'scale=300:300:force_original_aspect_ratio=increase,crop=300:300',
            '-q:v', '5', '-y', thumbPath
          ], { timeout: 15000 });
          if (fs.existsSync(thumbPath)) gen++;
          else fail++;
        } catch { fail++; }
      } else {
        skip++;
      }
    } catch (e) { console.warn('Failed:', a.filepath, e.message); fail++; }
  }
  console.log('Generated:', gen, 'Skipped:', skip, 'Failed:', fail);
  db.close();
}

run().catch(console.error);
"""

remote_thumb_script = '/home/ubuntu/qas-h5/api/_gen_thumbs.cjs'
sftp2 = ssh.open_sftp()
with sftp2.open(remote_thumb_script, 'w') as f:
    f.write(THUMB_SCRIPT)
sftp2.close()

import time
time.sleep(2)
stdin, stdout, stderr = ssh.exec_command(f'cd /home/ubuntu/qas-h5/api && node _gen_thumbs.cjs')
print(stdout.read().decode('utf-8'))
thumb_err = stderr.read().decode('utf-8')
if thumb_err:
    print(f'stderr: {thumb_err[:500]}')
ssh.exec_command(f'rm {remote_thumb_script}')

ssh.close()
print(f'\n✅ 部署完成: api={api_count}, frontend={fe_count}')
