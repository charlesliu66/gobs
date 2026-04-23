import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test('resolveReadableImagePath falls back to legacy prod api image directory', async () => {
  const previousCwd = process.cwd();
  const previousApiDataDir = process.env.API_DATA_DIR;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'qas-production-image-'));
  const apiDir = path.join(tmp, 'prod', 'api');
  const sharedDataDir = path.join(tmp, 'prod', 'shared-data');
  const legacyDir = path.join(apiDir, 'output', 'production', 'images', 'admin');
  const legacyFile = path.join(legacyDir, 'hero.png');

  fs.mkdirSync(legacyDir, { recursive: true });
  fs.writeFileSync(legacyFile, 'png');
  fs.mkdirSync(path.join(sharedDataDir, 'output', 'production', 'images', 'admin'), { recursive: true });

  process.env.API_DATA_DIR = sharedDataDir;
  process.chdir(apiDir);

  try {
    const { resolveReadableImagePath } = await import('../src/routes/productionPersist.ts');
    const resolved = resolveReadableImagePath('output/production/images/admin/hero.png', 'admin');

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
