import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test('getDreaminaScriptsDir falls back to repo-root .cursor skill scripts for deployed prod/api layout', async () => {
  const previousCwd = process.cwd();
  const previousEnv = process.env.DREAMINA_SCRIPTS_DIR;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'qas-dreamina-script-'));
  const apiDir = path.join(tmp, 'prod', 'api');
  const repoScript = path.join(tmp, '.cursor', 'skills', 'dreamina-cli-skill', 'scripts', 'multimodal2video.py');

  fs.mkdirSync(apiDir, { recursive: true });
  fs.mkdirSync(path.dirname(repoScript), { recursive: true });
  fs.writeFileSync(repoScript, '#!/usr/bin/env python3\n');

  delete process.env.DREAMINA_SCRIPTS_DIR;
  process.chdir(apiDir);

  try {
    const { getDreaminaScriptsDir } = await import('../src/services/dreaminaVideo.ts');
    const resolved = getDreaminaScriptsDir('multimodal2video.py');

    assert.equal(resolved, path.dirname(repoScript));
  } finally {
    if (previousEnv == null) delete process.env.DREAMINA_SCRIPTS_DIR;
    else process.env.DREAMINA_SCRIPTS_DIR = previousEnv;
    process.chdir(previousCwd);
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('getDreaminaScriptsDir ignores invalid DREAMINA_SCRIPTS_DIR and falls back to detected repo-root scripts', async () => {
  const previousCwd = process.cwd();
  const previousEnv = process.env.DREAMINA_SCRIPTS_DIR;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'qas-dreamina-invalid-env-'));
  const apiDir = path.join(tmp, 'prod', 'api');
  const wrongDir = path.join(tmp, 'prod', '.cursor', 'skills', 'dreamina-cli-skill', 'scripts');
  const repoScript = path.join(tmp, '.cursor', 'skills', 'dreamina-cli-skill', 'scripts', 'multimodal2video.py');

  fs.mkdirSync(apiDir, { recursive: true });
  fs.mkdirSync(wrongDir, { recursive: true });
  fs.mkdirSync(path.dirname(repoScript), { recursive: true });
  fs.writeFileSync(repoScript, '#!/usr/bin/env python3\n');

  process.env.DREAMINA_SCRIPTS_DIR = wrongDir;
  process.chdir(apiDir);

  try {
    const { getDreaminaScriptsDir } = await import('../src/services/dreaminaVideo.ts');
    const resolved = getDreaminaScriptsDir('multimodal2video.py');

    assert.equal(resolved, path.dirname(repoScript));
  } finally {
    if (previousEnv == null) delete process.env.DREAMINA_SCRIPTS_DIR;
    else process.env.DREAMINA_SCRIPTS_DIR = previousEnv;
    process.chdir(previousCwd);
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
