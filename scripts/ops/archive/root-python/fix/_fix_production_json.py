"""清理 production 项目 JSON 里的残留 pendingVideoSubmitId（已有 previewVideo 但 pending 未清）"""
import paramiko, sys, json, os, tempfile
sys.stdout.reconfigure(encoding='utf-8')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('43.134.186.196', username='ubuntu', password='rCp0uwvlm5BTy0UxqZ+D/O1Q')
sftp = ssh.open_sftp()

remote_dir = '/home/ubuntu/qas-h5/api/output/production/projects'

def run(cmd):
    _, out, _ = ssh.exec_command(cmd)
    return out.read().decode('utf-8', errors='replace')

print('=== 扫描所有项目 JSON ===')
listing = run(f"find {remote_dir} -name '*.json' -not -name '*.meta.json'").strip().splitlines()
print(f'found {len(listing)} project files')

fixed_total = 0
for remote_path in listing:
    remote_path = remote_path.strip()
    if not remote_path:
        continue
    # 下载 → 扫描 → 修改 → 上传（仅当有改动）
    with tempfile.NamedTemporaryFile(suffix='.json', delete=False) as tmp:
        local_path = tmp.name
    try:
        sftp.get(remote_path, local_path)
        with open(local_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        proj = data.get('project') or {}
        shots = proj.get('shots') or []
        changed = []
        for s in shots:
            pending = s.get('pendingVideoSubmitId')
            has_video = bool(s.get('previewVideoUrl') or s.get('previewVideoPath') or s.get('previewVideoVersions'))
            if pending and has_video:
                changed.append(s.get('shotIndex'))
                s['pendingVideoSubmitId'] = None
        if changed:
            data['updatedAt'] = __import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat().replace('+00:00', 'Z')
            with open(local_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            sftp.put(local_path, remote_path)
            print(f'  fixed {remote_path}: shots {changed}')
            fixed_total += len(changed)
    except Exception as e:
        print(f'  skip {remote_path}: {e}')
    finally:
        try: os.unlink(local_path)
        except: pass

sftp.close()
ssh.close()
print(f'\n[OK] cleared {fixed_total} stale pendingVideoSubmitId entries')
