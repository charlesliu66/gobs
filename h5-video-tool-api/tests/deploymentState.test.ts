import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {
  getAppEnvironmentName,
  normalizeDeploymentStateInput,
  readDeploymentState,
} from '../src/services/deploymentState.ts';

test('missing deployment-state file returns safe defaults', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'qas-deploy-state-'));
  const filePath = path.join(tempDir, 'deployment-state.json');

  const state = await readDeploymentState(filePath);

  assert.equal(state.active, false);
  assert.equal(state.phase, 'idle');
  assert.equal(state.level, 'info');
  assert.equal(state.allowWrites, true);
  assert.equal(state.messageZh, '');
  assert.equal(state.messageEn, '');
  assert.match(state.updatedAt, /^\d{4}-\d{2}-\d{2}T/);
});

test('invalid deployment-state file falls back to defaults', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'qas-deploy-state-'));
  const filePath = path.join(tempDir, 'deployment-state.json');
  await writeFile(filePath, '{"active": true,', 'utf-8');

  const state = await readDeploymentState(filePath);

  assert.equal(state.active, false);
  assert.equal(state.phase, 'idle');
  assert.equal(state.allowWrites, true);
});

test('normalizes partial deployment-state input and stamps operator metadata', () => {
  const now = new Date('2026-04-23T12:34:56.000Z');

  const state = normalizeDeploymentStateInput(
    {
      active: true,
      phase: 'deploying',
      messageZh: '正式环境正在发布更新，请先保存。',
    },
    { now, updatedBy: 'admin' },
  );

  assert.equal(state.active, true);
  assert.equal(state.phase, 'deploying');
  assert.equal(state.level, 'critical');
  assert.equal(state.allowWrites, false);
  assert.equal(state.messageZh, '正式环境正在发布更新，请先保存。');
  assert.equal(state.messageEn, '');
  assert.equal(state.updatedAt, now.toISOString());
  assert.equal(state.updatedBy, 'admin');
});

test('runtime environment falls back to unknown when unset', () => {
  const previous = process.env.APP_ENVIRONMENT;
  delete process.env.APP_ENVIRONMENT;

  try {
    assert.equal(getAppEnvironmentName(), 'unknown');
  } finally {
    if (previous) process.env.APP_ENVIRONMENT = previous;
  }
});

test('runtime environment returns normalized uppercase-friendly source value', () => {
  const previous = process.env.APP_ENVIRONMENT;
  process.env.APP_ENVIRONMENT = '  staging  ';

  try {
    assert.equal(getAppEnvironmentName(), 'staging');
  } finally {
    if (previous) process.env.APP_ENVIRONMENT = previous;
    else delete process.env.APP_ENVIRONMENT;
  }
});
