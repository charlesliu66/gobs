import paramiko
import json
import sys
import time
import os

sys.stdout.reconfigure(encoding='utf-8')

host = '43.134.186.196'
user = 'ubuntu'
password = 'rCp0uwvlm5BTy0UxqZ+D/O1Q'

LOCAL_VIDEO = r"C:\Users\wei.liu\Downloads\jimeng-2026-04-15-9936-盲眼浪人，手持武士刀，在日式宅邸庭院或走廊中，与多名戴面具的家族成员激战。_日式....mp4"
REMOTE_DIR = '/home/ubuntu/qas-h5/api/output/admin'
REMOTE_NAME = 'dreamina_193a2b4f5a8b661d_shot3.mp4'
REMOTE_PATH = f'{REMOTE_DIR}/{REMOTE_NAME}'
PROJECT_FILE = '/home/ubuntu/qas-h5/api/output/production/projects/admin/proj_1776134802962_3d86d452.json'

if not os.path.exists(LOCAL_VIDEO):
    print(f"ERROR: Local file not found: {LOCAL_VIDEO}")
    sys.exit(1)

fsize = os.path.getsize(LOCAL_VIDEO)
print(f"Local video: {fsize} bytes")

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, password=password)

# 1. Upload video
print(f"\n=== Uploading to {REMOTE_PATH} ===")
sftp = ssh.open_sftp()
sftp.put(LOCAL_VIDEO, REMOTE_PATH)
stat = sftp.stat(REMOTE_PATH)
print(f"  Uploaded: {stat.st_size} bytes")

# 2. Read project JSON
print("\n=== Updating project JSON ===")
with sftp.open(PROJECT_FILE, 'r') as f:
    pdata = json.loads(f.read())

shots = pdata.get('project', pdata).get('shots', [])
shot3 = shots[3]

# Remove the old wrong video link
rel_path = f'output/admin/{REMOTE_NAME}'
encoded = rel_path.replace('/', '%2F')
url = f'/api/video/file?path={encoded}'
now_ms = int(time.time() * 1000)
task_id = 'dreamina-193a2b4f5a8b661d'
version_id = f'{task_id}-{now_ms}'

shot3['previewVideoPath'] = rel_path
shot3['previewVideoUrl'] = url
shot3['selectedPreviewVideoVersionId'] = version_id

# Replace versions list with only the correct one
shot3['previewVideoVersions'] = [{
    'id': version_id,
    'taskId': task_id,
    'createdAt': now_ms,
    'videoPath': rel_path,
    'videoUrl': url,
}]

pdata['updatedAt'] = f"{time.strftime('%Y-%m-%dT%H:%M:%S')}.000Z"

# 3. Write back
with sftp.open(PROJECT_FILE, 'w') as f:
    f.write(json.dumps(pdata, ensure_ascii=False, indent=2))
sftp.close()

print(f"  Shot[3] linked to: {rel_path}")

# 4. Verify
print("\n=== Final status ===")
stdin, stdout, stderr = ssh.exec_command(f'ls -la {REMOTE_PATH}')
print(f"  Server file: {stdout.read().decode().strip()}")

stdin, stdout, stderr = ssh.exec_command(f'cat "{PROJECT_FILE}"')
v = json.loads(stdout.read().decode('utf-8'))
for i, s in enumerate(v.get('project', v).get('shots', [])):
    has = bool(s.get('previewVideoPath', ''))
    mark = '\u2705' if has else '\u274c'
    subj = s.get('subject', '')[:30]
    path = s.get('previewVideoPath', '')
    print(f"  \u5206\u955c{i+1} (Shot[{i}]): {mark} {subj}")
    if path:
        print(f"    \u2192 {path}")

ssh.close()
print("\nDone!")
