import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test('resolveImagenScriptPath falls back to repo-level scripts directory for deployed prod/api layout', async () => {
  const previousCwd = process.cwd();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'qas-imagen-script-'));
  const apiDir = path.join(tmp, 'prod', 'api');
  const servicesDir = path.join(apiDir, 'services');
  const repoScript = path.join(tmp, 'scripts', 'imagen_generate.py');

  fs.mkdirSync(servicesDir, { recursive: true });
  fs.mkdirSync(path.dirname(repoScript), { recursive: true });
  fs.writeFileSync(repoScript, '#!/usr/bin/env python3\n');

  process.chdir(apiDir);

  try {
    const { resolveImagenScriptPath } = await import('../src/services/imagenPython.ts');
    const resolved = resolveImagenScriptPath(servicesDir);

    assert.equal(resolved, repoScript);
  } finally {
    process.chdir(previousCwd);
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
