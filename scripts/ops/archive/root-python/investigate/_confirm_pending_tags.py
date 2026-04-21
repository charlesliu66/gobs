import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8')

host = '43.134.186.196'
user = 'ubuntu'
password = 'rCp0uwvlm5BTy0UxqZ+D/O1Q'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, password=password)

JS_SCRIPT = """
const path = require('path');
const Database = require('better-sqlite3');
const dbPath = path.join('/home/ubuntu/qas-h5/api', 'db', 'assets.db');
const db = new Database(dbPath);

const pending = db.prepare("SELECT asset_id, key, value, source FROM asset_tags WHERE status = 'pending'").all();
console.log('Pending tags: ' + pending.length);
for (const t of pending) {
  console.log('  ' + t.asset_id.substring(0,8) + '... ' + t.key + ' = ' + t.value + ' (source: ' + t.source + ')');
}

if (pending.length > 0) {
  const result = db.prepare("UPDATE asset_tags SET status = 'confirmed' WHERE status = 'pending'").run();
  console.log('Updated ' + result.changes + ' tags from pending to confirmed');
} else {
  console.log('No pending tags to update');
}

const remaining = db.prepare("SELECT COUNT(*) as cnt FROM asset_tags WHERE status = 'pending'").get();
console.log('Remaining pending: ' + remaining.cnt);

db.close();
"""

sftp = ssh.open_sftp()
remote_script = '/home/ubuntu/qas-h5/api/_confirm_tags.cjs'
with sftp.open(remote_script, 'w') as f:
    f.write(JS_SCRIPT)
sftp.close()

print('=== Running confirm script on server ===')
stdin, stdout, stderr = ssh.exec_command(f'cd /home/ubuntu/qas-h5/api && node _confirm_tags.cjs')
print(stdout.read().decode('utf-8'))
err = stderr.read().decode('utf-8')
if err:
    print('STDERR:', err)

ssh.exec_command(f'rm {remote_script}')
ssh.close()
print('Done!')
