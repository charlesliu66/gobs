import test from 'node:test';
import assert from 'node:assert/strict';

import {
  resolveEnqueueJobState,
  resolveStoryboardQueueSnapshot,
} from '../src/studio/storyboardQueueState.ts';

test('resolveStoryboardQueueSnapshot falls back to local queued jobs when stream snapshot is still empty', () => {
  const result = resolveStoryboardQueueSnapshot(
    { totalActive: 0, totalWaiting: 0, avgSecPerJob: 120 },
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
  });
});

test('resolveStoryboardQueueSnapshot keeps the stream snapshot once it has real platform data', () => {
  const result = resolveStoryboardQueueSnapshot(
    { totalActive: 2, totalWaiting: 3, avgSecPerJob: 95 },
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
