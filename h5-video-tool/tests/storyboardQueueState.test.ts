import test from 'node:test';
import assert from 'node:assert/strict';

import {
  formatFriendlyEta,
  resolveEnqueueJobState,
  resolveFriendlyVideoProgress,
  resolveStoryboardQueueSnapshot,
} from '../src/studio/storyboardQueueState.ts';

test('resolveStoryboardQueueSnapshot falls back to local queued jobs when stream snapshot is still empty', () => {
  const result = resolveStoryboardQueueSnapshot(
    { totalActive: 0, totalWaiting: 0, avgSecPerJob: 120, recentSuccessAvgSec: 96, recentSuccessSampleCount: 7 },
    [
      {
        id: 'bj_waiting',
        submitId: '',
        taskId: '',
        projectId: 'proj_1',
        shotIndex: 1,
        shotDescription: 'shot',
        model: 'dreamina-text2video',
        source: 'production',
        status: 'awaiting_submit',
        createdAt: '2026-04-24T00:00:00.000Z',
        updatedAt: '2026-04-24T00:00:00.000Z',
      },
    ],
  );

  assert.equal(result.source, 'local_fallback');
  assert.deepEqual(result.snapshot, {
    totalActive: 0,
    totalWaiting: 1,
    avgSecPerJob: 120,
    recentSuccessAvgSec: 96,
    recentSuccessSampleCount: 7,
    maxConcurrent: 3,
    availableSlots: 3,
  });
});

test('resolveStoryboardQueueSnapshot keeps the stream snapshot once it has real platform data', () => {
  const result = resolveStoryboardQueueSnapshot(
    {
      totalActive: 2,
      totalWaiting: 3,
      avgSecPerJob: 95,
      recentSuccessAvgSec: 88,
      recentSuccessSampleCount: 10,
      maxConcurrent: 3,
      availableSlots: 1,
    },
    [
      {
        id: 'bj_waiting',
        submitId: '',
        taskId: '',
        projectId: 'proj_1',
        shotIndex: 1,
        shotDescription: 'shot',
        model: 'dreamina-text2video',
        source: 'production',
        status: 'awaiting_submit',
        createdAt: '2026-04-24T00:00:00.000Z',
        updatedAt: '2026-04-24T00:00:00.000Z',
      },
    ],
  );

  assert.equal(result.source, 'stream');
  assert.deepEqual(result.snapshot, {
    totalActive: 2,
    totalWaiting: 3,
    avgSecPerJob: 95,
    recentSuccessAvgSec: 88,
    recentSuccessSampleCount: 10,
    maxConcurrent: 3,
    availableSlots: 1,
  });
});

test('resolveEnqueueJobState treats failed enqueue writeback as an error instead of queued success', () => {
  const result = resolveEnqueueJobState({
    status: 'failed',
    failReason: 'submit failed immediately',
  });

  assert.equal(result.kind, 'failed');
  assert.equal(result.isError, true);
  assert.equal(result.message, 'submit failed immediately');
});

test('resolveEnqueueJobState preserves successful queued states', () => {
  assert.deepEqual(
    resolveEnqueueJobState({ status: 'awaiting_submit' }),
    { kind: 'queued', isError: false, message: null },
  );
  assert.deepEqual(
    resolveEnqueueJobState({ status: 'pending' }),
    { kind: 'submitted', isError: false, message: null },
  );
  assert.deepEqual(
    resolveEnqueueJobState({ status: 'processing' }),
    { kind: 'processing', isError: false, message: null },
  );
});

test('formatFriendlyEta uses user-friendly time wording', () => {
  assert.equal(formatFriendlyEta(25, 'zh-CN'), '不到 1 分钟');
  assert.equal(formatFriendlyEta(25, 'en'), 'less than 1 min');
  assert.equal(formatFriendlyEta(180, 'zh-CN'), '约 3 分钟');
});

test('resolveFriendlyVideoProgress describes platform queue in business wording', () => {
  const result = resolveFriendlyVideoProgress({
    job: {
      status: 'awaiting_submit',
      globalQueuePos: 2,
      etaSec: 180,
      createdAt: '2026-05-06T00:00:00.000Z',
    },
    snapshot: {
      avgSecPerJob: 120,
      recentSuccessAvgSec: 96,
      recentSuccessSampleCount: 10,
    },
    nowMs: new Date('2026-05-06T00:00:30.000Z').getTime(),
  });

  assert.equal(result.stage, 'queued');
  assert.equal(result.shortLabelZh, '排队中');
  assert.match(result.detailZh, /前面还有 2 条/);
  assert.match(result.detailZh, /约 3 分钟后开始/);
});

test('resolveFriendlyVideoProgress describes active rendering with remaining time and finishing state', () => {
  const generating = resolveFriendlyVideoProgress({
    job: {
      status: 'processing',
      createdAt: '2026-05-06T00:00:00.000Z',
      submittedAt: '2026-05-06T00:00:00.000Z',
    },
    snapshot: {
      avgSecPerJob: 120,
      recentSuccessAvgSec: 120,
      recentSuccessSampleCount: 10,
    },
    nowMs: new Date('2026-05-06T00:00:40.000Z').getTime(),
  });
  assert.equal(generating.stage, 'generating');
  assert.equal(generating.shortLabelZh, '正在生成');
  assert.match(generating.detailZh, /通常还需/);

  const finishing = resolveFriendlyVideoProgress({
    job: {
      status: 'processing',
      createdAt: '2026-05-06T00:00:00.000Z',
      submittedAt: '2026-05-06T00:00:00.000Z',
    },
    snapshot: {
      avgSecPerJob: 120,
      recentSuccessAvgSec: 120,
      recentSuccessSampleCount: 10,
    },
    nowMs: new Date('2026-05-06T00:01:45.000Z').getTime(),
  });
  assert.equal(finishing.stage, 'finishing');
  assert.equal(finishing.shortLabelZh, '即将完成');
});
