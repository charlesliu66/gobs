import paramiko
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

host = '43.134.186.196'
user = 'ubuntu'
password = 'rCp0uwvlm5BTy0UxqZ+D/O1Q'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, password=password)

# List ALL mp4 files on the server with full timestamps
print("=== All MP4 files on server ===")
for d in ['/home/ubuntu/qas-h5/api/output', '/home/ubuntu/gobs-data/output']:
    stdin, stdout, stderr = ssh.exec_command(f'find {d} -name "*.mp4" -exec ls -la --time-style=full-iso {{}} \\; 2>/dev/null')
    out = stdout.read().decode('utf-8')
    if out.strip():
        print(f"\n--- {d} ---")
        print(out)

# Also check the project JSON to see what's currently linked to Shot 3
print("\n=== Current Shot[3] (分镜4) state ===")
PROJECT_FILE = '/home/ubuntu/qas-h5/api/output/production/projects/admin/proj_1776134802962_3d86d452.json'
stdin, stdout, stderr = ssh.exec_command(f'cat "{PROJECT_FILE}"')
pdata = json.loads(stdout.read().decode('utf-8'))
shots = pdata.get('project', pdata).get('shots', [])
s3 = shots[3]
print(f"  previewVideoPath: {s3.get('previewVideoPath','(none)')}")
print(f"  previewVideoUrl: {s3.get('previewVideoUrl','(none)')}")
print(f"  selectedId: {s3.get('selectedPreviewVideoVersionId','(none)')}")
print(f"  dreaminaSubmitId: {s3.get('dreaminaSubmitId','(none)')}")
versions = s3.get('previewVideoVersions', [])
print(f"  versions ({len(versions)}):")
for v in versions:
    print(f"    id={v.get('id','?')} taskId={v.get('taskId','?')} path={v.get('videoPath','?')} at={v.get('createdAt','?')}")

# Check if there's a video_history.json or any log that shows what happened at 14:29
print("\n=== Looking for history/log files ===")
for d in ['/home/ubuntu/qas-h5/api/output', '/home/ubuntu/qas-h5/api/data']:
    stdin, stdout, stderr = ssh.exec_command(f'find {d} -name "*.json" -newer /dev/null -mmin -600 -exec ls -la --time-style=full-iso {{}} \\; 2>/dev/null | head -30')
    out = stdout.read().decode('utf-8')
    if out.strip():
        print(f"\n--- {d} ---")
        print(out)

# Check the dreaminaSubmitId for all shots to see the original submit IDs
print("\n=== All shot dreaminaSubmitIds ===")
for i, s in enumerate(shots):
    dsid = s.get('dreaminaSubmitId', '(none)')
    prompt = s.get('videoPrompt','')[:80]
    print(f"  Shot[{i}] dreaminaSubmitId={dsid} prompt={prompt}")

ssh.close()
