import paramiko
import json
import sys
import time

sys.stdout.reconfigure(encoding='utf-8')

host = '43.134.186.196'
user = 'ubuntu'
password = 'rCp0uwvlm5BTy0UxqZ+D/O1Q'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, password=password)

DREAMINA = '/home/ubuntu/.local/bin/dreamina'
OUTPUT_DIR = '/home/ubuntu/qas-h5/api/output/admin'
PROJECT_FILE = '/home/ubuntu/qas-h5/api/output/production/projects/admin/proj_1776134802962_3d86d452.json'

# Also check 4d817ff707b7f2cb (分镜5) since it's been a while
tasks_to_poll = [
    ('6d8c19572e8d8811', 3, '分镜4'),  # Shot[3], 庭院激战
    ('4d817ff707b7f2cb', 4, '分镜5'),  # Shot[4], 苦战精英武士
]

for sid, shot_idx, label in tasks_to_poll:
    print(f"\n=== Polling {sid} ({label}) ===")
    for attempt in range(8):
        stdin, stdout, stderr = ssh.exec_command(f'{DREAMINA} query_result --submit_id {sid} --download_dir {OUTPUT_DIR} 2>&1')
        out = stdout.read().decode('utf-8')
        start = out.find('{')
        end = out.rfind('}')
        if start >= 0 and end > start:
            data = json.loads(out[start:end+1])
            status = data.get('gen_status', '')
            queue = data.get('queue_info', {}).get('queue_status', '')
            print(f"  [{attempt+1}] status={status} queue={queue}")
            
            if status == 'success':
                videos = data.get('result_json', {}).get('videos', [])
                for v in videos:
                    vpath = v.get('path', '')
                    print(f"  VIDEO: {vpath}")
                    print(f"  {v.get('width','')}x{v.get('height','')} dur={v.get('duration','')}")
                    
                    # Link to project
                    if vpath.startswith('/home/ubuntu/qas-h5/api/'):
                        rel = vpath.replace('/home/ubuntu/qas-h5/api/', '')
                    else:
                        rel = f'output/admin/{sid}_video_1.mp4'
                    
                    enc = rel.replace('/', '%2F')
                    url = f'/api/video/file?path={enc}'
                    tid = f'dreamina-{sid}'
                    now = int(time.time() * 1000)
                    vid = f'{tid}-{now}'
                    
                    stdin2, stdout2, stderr2 = ssh.exec_command(f'cat "{PROJECT_FILE}"')
                    pdata = json.loads(stdout2.read().decode('utf-8'))
                    shots = pdata.get('project', pdata).get('shots', [])
                    shot = shots[shot_idx]
                    
                    shot['previewVideoPath'] = rel
                    shot['previewVideoUrl'] = url
                    shot['selectedPreviewVideoVersionId'] = vid
                    vv = shot.get('previewVideoVersions', [])
                    vv.append({'id': vid, 'taskId': tid, 'createdAt': now, 'videoPath': rel, 'videoUrl': url})
                    shot['previewVideoVersions'] = vv
                    pdata['updatedAt'] = f"{time.strftime('%Y-%m-%dT%H:%M:%S')}.000Z"
                    
                    sftp = ssh.open_sftp()
                    with sftp.open(PROJECT_FILE, 'w') as f:
                        f.write(json.dumps(pdata, ensure_ascii=False, indent=2))
                    sftp.close()
                    print(f"  Linked to Shot[{shot_idx}] ({label})!")
                break
            elif status == 'fail':
                print(f"  FAILED: {data.get('fail_reason','')[:150]}")
                break
        
        if attempt < 7:
            time.sleep(20)

# Final check
print("\n=== Final status ===")
stdin, stdout, stderr = ssh.exec_command(f'cat "{PROJECT_FILE}"')
v = json.loads(stdout.read().decode('utf-8'))
for i, s in enumerate(v.get('project', v).get('shots', [])):
    idx = s.get('shotIndex', '?')
    has = bool(s.get('previewVideoPath',''))
    mark = '✅' if has else '❌'
    subj = s.get('subject','')[:30]
    print(f"  分镜{idx}: {mark} {subj}")

ssh.close()
