import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test('resolveExistingEditorProjectFile rehomes legacy editor projects into shared-data', async () => {
  const previousCwd = process.cwd();
  const previousApiDataDir = process.env.API_DATA_DIR;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'qas-editor-projects-'));
  const apiDir = path.join(tmp, 'prod', 'api');
  const sharedDataDir = path.join(tmp, 'prod', 'shared-data');
  const legacyFile = path.join(apiDir, 'editor-projects', 'admin', 'proj_legacy.json');

  fs.mkdirSync(path.dirname(legacyFile), { recursive: true });
  fs.mkdirSync(path.join(sharedDataDir, 'editor-projects', 'admin'), { recursive: true });
  fs.writeFileSync(legacyFile, JSON.stringify({ id: 'proj_legacy', name: 'legacy' }, null, 2));

  process.env.API_DATA_DIR = sharedDataDir;
  process.chdir(apiDir);

  try {
    const { resolveExistingEditorProjectFile } = await import('../src/services/editorProjectStorage.ts');
    const resolved = await resolveExistingEditorProjectFile('admin', 'proj_legacy');

    assert.equal(
      resolved,
      path.join(sharedDataDir, 'editor-projects', 'admin', 'proj_legacy.json'),
    );
    assert.equal(fs.existsSync(resolved), true);
    assert.equal(
      JSON.parse(fs.readFileSync(resolved, 'utf8')).name,
      'legacy',
    );
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
