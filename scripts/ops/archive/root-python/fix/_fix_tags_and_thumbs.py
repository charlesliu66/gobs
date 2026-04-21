import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8')

host = '43.134.186.196'
user = 'ubuntu'
password = 'rCp0uwvlm5BTy0UxqZ+D/O1Q'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, password=password)

JS_SCRIPT = r"""
const path = require('path');
const Database = require('better-sqlite3');
const dbPath = path.join('/home/ubuntu/qas-h5/api', 'db', 'assets.db');
const db = new Database(dbPath);

// 1. Count and delete all ai_tag_error tags
const errorTags = db.prepare("SELECT COUNT(*) as cnt FROM asset_tags WHERE key = 'ai_tag_error'").get();
console.log('ai_tag_error tags found:', errorTags.cnt);

if (errorTags.cnt > 0) {
  // Try to parse the error values to extract category info before deleting
  const errors = db.prepare("SELECT asset_id, value FROM asset_tags WHERE key = 'ai_tag_error'").all();
  const catMap = new Map();
  for (const e of errors) {
    const m = e.value.match(/"category":\s*"([^"]+)"/);
    if (m) catMap.set(e.asset_id, m[1]);
  }
  console.log('Recoverable categories from errors:', catMap.size);

  // Update ai_category for assets where we can recover
  const updateCat = db.prepare("UPDATE assets SET ai_category = ?, updated_at = datetime('now') WHERE id = ? AND (ai_category IS NULL OR ai_category = '未分类')");
  let recovered = 0;
  for (const [assetId, category] of catMap) {
    const valid = ['角色', '武器道具', '场景', 'UI素材', '宣传图', '视频片段'];
    if (valid.includes(category)) {
      updateCat.run(category, assetId);
      recovered++;
    }
  }
  console.log('Recovered categories:', recovered);

  // Also try to recover descriptions
  const descErrors = db.prepare("SELECT asset_id, value FROM asset_tags WHERE key = 'ai_tag_error'").all();
  const updateDesc = db.prepare("UPDATE assets SET ai_description = ?, updated_at = datetime('now') WHERE id = ? AND ai_description IS NULL");
  let descRecovered = 0;
  for (const e of descErrors) {
    const m = e.value.match(/"description":\s*"([^"]*)/);
    if (m && m[1].length > 2) {
      updateDesc.run(m[1].trim(), e.asset_id);
      descRecovered++;
    }
  }
  console.log('Recovered descriptions:', descRecovered);

  // Delete all ai_tag_error tags
  const delResult = db.prepare("DELETE FROM asset_tags WHERE key = 'ai_tag_error'").run();
  console.log('Deleted ai_tag_error tags:', delResult.changes);
}

// 2. Delete duplicate ai_category/ai_description tags (keep only latest)
const dupes = db.prepare(`
  SELECT asset_id, key, COUNT(*) as cnt FROM asset_tags
  WHERE key IN ('ai_category', 'ai_description')
  GROUP BY asset_id, key HAVING cnt > 1
`).all();
console.log('Duplicate ai tag entries:', dupes.length);

if (dupes.length > 0) {
  for (const d of dupes) {
    const rows = db.prepare("SELECT id FROM asset_tags WHERE asset_id = ? AND key = ? ORDER BY created_at DESC").all(d.asset_id, d.key);
    // Keep first (latest), delete rest
    for (let i = 1; i < rows.length; i++) {
      db.prepare("DELETE FROM asset_tags WHERE id = ?").run(rows[i].id);
    }
  }
  console.log('Cleaned up duplicate tags');
}

// 3. Stats
const remaining = db.prepare("SELECT COUNT(*) as cnt FROM asset_tags WHERE status = 'pending'").get();
const totalAssets = db.prepare("SELECT COUNT(*) as cnt FROM assets").get();
const uncategorized = db.prepare("SELECT COUNT(*) as cnt FROM assets WHERE ai_category IS NULL OR ai_category = '未分类'").get();
console.log('Remaining pending tags:', remaining.cnt);
console.log('Total assets:', totalAssets.cnt);
console.log('Still uncategorized:', uncategorized.cnt);

db.close();
"""

sftp = ssh.open_sftp()
remote_script = '/home/ubuntu/qas-h5/api/_fix_tags.cjs'
with sftp.open(remote_script, 'w') as f:
    f.write(JS_SCRIPT)
sftp.close()

print('=== Fixing tags on server ===')
stdin, stdout, stderr = ssh.exec_command(f'cd /home/ubuntu/qas-h5/api && node _fix_tags.cjs')
print(stdout.read().decode('utf-8'))
err = stderr.read().decode('utf-8')
if err:
    print('STDERR:', err)

ssh.exec_command(f'rm {remote_script}')
ssh.close()
print('Done!')
