import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test('collectOutputRecentEntriesForUser falls back to legacy api output when shared-data output is empty', async () => {
  const previousCwd = process.cwd();
  const previousApiDataDir = process.env.API_DATA_DIR;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'qas-output-gallery-'));
  const apiDir = path.join(tmp, 'prod', 'api');
  const sharedDataDir = path.join(tmp, 'prod', 'shared-data');
  const legacyFile = path.join(apiDir, 'output', 'admin', 'dreamina_aaaabbbbcccc_1777000000000.mp4');

  fs.mkdirSync(path.dirname(legacyFile), { recursive: true });
  fs.mkdirSync(path.join(sharedDataDir, 'output', 'admin'), { recursive: true });
  fs.writeFileSync(legacyFile, 'video');

  process.env.API_DATA_DIR = sharedDataDir;
  process.chdir(apiDir);

  try {
    const { collectOutputRecentEntriesForUser, resolveExistingOutputPathForUser } = await import('../src/services/outputGalleryService.ts');
    const items = await collectOutputRecentEntriesForUser('admin', { onlyDreamina: false });
    const resolved = await resolveExistingOutputPathForUser(
      'admin',
      'output/admin/dreamina_aaaabbbbcccc_1777000000000.mp4',
    );

    assert.equal(items.length, 1);
    assert.equal(items[0]?.path, 'output/admin/dreamina_aaaabbbbcccc_1777000000000.mp4');
    assert.equal(resolved, legacyFile);
  } finally {
    process.chdir(previousCwd);
    if (previousApiDataDir === undefined) {
      delete process.env.API_DATA_DIR;
    } else {
      process.env.API_DATA_DIR = previousApiDataDir;
    }
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
