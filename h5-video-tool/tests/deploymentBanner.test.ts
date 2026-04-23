import test from 'node:test';
import assert from 'node:assert/strict';

import {
  formatRuntimeVersionLabel,
  resolveDeploymentBanner,
} from '../src/utils/deploymentBanner.ts';

test('idle deployment state hides the banner', () => {
  const banner = resolveDeploymentBanner(
    {
      active: false,
      phase: 'idle',
      level: 'info',
      messageZh: '',
      messageEn: '',
      allowWrites: true,
      updatedAt: '2026-04-23T10:00:00.000Z',
      updatedBy: 'admin',
    },
    'zh-CN',
  );

  assert.equal(banner.visible, false);
});

test('deploying state maps to critical banner and write lock intent', () => {
  const banner = resolveDeploymentBanner(
    {
      active: true,
      phase: 'deploying',
      level: 'critical',
      messageZh: '正式环境正在发布更新，请勿重复提交任务。',
      messageEn: 'Production is being updated. Please avoid duplicate submissions.',
      allowWrites: false,
      updatedAt: '2026-04-23T10:00:00.000Z',
      updatedBy: 'admin',
    },
    'zh-CN',
  );

  assert.equal(banner.visible, true);
  assert.equal(banner.tone, 'critical');
  assert.equal(banner.allowWrites, false);
  assert.equal(banner.message, '正式环境正在发布更新，请勿重复提交任务。');
});

test('preparing state falls back to locale-aware default copy when message is missing', () => {
  const zhBanner = resolveDeploymentBanner(
    {
      active: true,
      phase: 'preparing',
      level: 'warning',
      messageZh: '',
      messageEn: '',
      allowWrites: true,
      updatedAt: '2026-04-23T10:00:00.000Z',
      updatedBy: 'admin',
    },
    'zh-CN',
  );
  const enBanner = resolveDeploymentBanner(
    {
      active: true,
      phase: 'preparing',
      level: 'warning',
      messageZh: '',
      messageEn: '',
      allowWrites: true,
      updatedAt: '2026-04-23T10:00:00.000Z',
      updatedBy: 'admin',
    },
    'en',
  );

  assert.match(zhBanner.message, /保存|更新/);
  assert.match(enBanner.message, /save|update/i);
});

test('runtime version label includes environment tag when present', () => {
  assert.equal(
    formatRuntimeVersionLabel({
      productName: 'GOBS',
      environment: 'prod',
      branch: 'main',
      commit: 'abc1234',
    }),
    'GOBS [PROD] main@abc1234',
  );
});

test('runtime version label falls back cleanly when environment is unknown', () => {
  assert.equal(
    formatRuntimeVersionLabel({
      productName: 'GOBS',
      environment: 'unknown',
      branch: 'main',
      commit: 'abc1234',
    }),
    'GOBS main@abc1234',
  );
});
