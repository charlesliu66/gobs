"""诊断线上 batch-jobs 与 production 项目状态"""
import paramiko, sys, json
sys.stdout.reconfigure(encoding='utf-8')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('43.134.186.196', username='ubuntu', password='rCp0uwvlm5BTy0UxqZ+D/O1Q')

def run(cmd):
    _, out, err = ssh.exec_command(cmd)
    return out.read().decode('utf-8', errors='replace'), err.read().decode('utf-8', errors='replace')

print('=== jobs.json 概览 ===')
out, _ = run('cat /home/ubuntu/qas-h5/api/output/batch-jobs/jobs.json 2>/dev/null')
try:
    arr = json.loads(out)
    print(f'Total jobs: {len(arr)}')
    # 只看最近 20 分钟内的
    from datetime import datetime, timezone, timedelta
    cutoff = datetime.now(timezone.utc) - timedelta(hours=2)
    recent = []
    for j in arr:
        try:
            c = datetime.fromisoformat(j['createdAt'].replace('Z', '+00:00'))
            if c >= cutoff:
                recent.append(j)
        except Exception:
            pass
    print(f'Recent (<=2h): {len(recent)}')
    for j in recent[-30:]:
        print(f"  {j.get('createdAt','')} | {j.get('status','?'):10s} | shot={j.get('shotIndex','?')} | user={j.get('username','') or 'None'} | proj={j.get('projectId','')[:30]} | id={j['id']}")
except Exception as e:
    print('Parse error:', e)
    print(out[:500])

print()
print('=== production 项目目录 ===')
out, _ = run("ls -lt /home/ubuntu/qas-h5/api/output/production/projects/ 2>/dev/null")
print(out)

print()
print('=== 最近被修改的项目 JSON ===')
out, _ = run("find /home/ubuntu/qas-h5/api/output/production/projects -name '*.json' -not -name '*.meta.json' -mmin -120 -printf '%T@ %p\n' | sort -rn | head -5")
print(out)

ssh.close()
