import test from 'node:test';
import assert from 'node:assert/strict';

import type { BatchJob } from '../src/services/batchJobsQueue.js';
import { computeSnapshotFromJobs, deriveQueuePositionPatches } from '../src/services/queueSnapshot.js';

function makeJob(overrides: Partial<BatchJob>): BatchJob {
  return {
    id: overrides.id ?? 'job',
    submitId: overrides.submitId ?? '',
    taskId: overrides.taskId ?? '',
    projectId: overrides.projectId ?? 'proj',
    shotIndex: overrides.shotIndex ?? 1,
    shotDescription: overrides.shotDescription ?? 'shot',
    model: overrides.model ?? 'dreamina-text2video',
    status: overrides.status ?? 'awaiting_submit',
    createdAt: overrides.createdAt ?? '2026-05-06T00:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2026-05-06T00:00:00.000Z',
    ...overrides,
  };
}

test('computeSnapshotFromJobs uses submittedAt service time and Ark concurrency defaults to 3', () => {
  const prevKey = process.env.ARK_API_KEY;
  const prevConcurrent = process.env.ARK_SEEDANCE_MAX_CONCURRENT;
  process.env.ARK_API_KEY = 'test-key';
  process.env.ARK_SEEDANCE_MAX_CONCURRENT = '3';

  try {
    const snapshot = computeSnapshotFromJobs([
      makeJob({
        id: 'done_1',
        status: 'done',
        createdAt: '2026-05-06T00:00:00.000Z',
        submittedAt: '2026-05-06T00:05:00.000Z',
        updatedAt: '2026-05-06T00:06:30.000Z',
      }),
      makeJob({
        id: 'done_2',
        status: 'done',
        createdAt: '2026-05-06T00:10:00.000Z',
        submittedAt: '2026-05-06T00:11:00.000Z',
        updatedAt: '2026-05-06T00:12:30.000Z',
      }),
      makeJob({ id: 'active_1', status: 'pending' }),
      makeJob({ id: 'active_2', status: 'queuing' }),
    ]);

    assert.deepEqual(snapshot, {
      totalActive: 2,
      totalWaiting: 0,
      avgSecPerJob: 90,
      recentSuccessAvgSec: 90,
      recentSuccessSampleCount: 2,
      maxConcurrent: 3,
      availableSlots: 1,
    });
  } finally {
    if (prevKey == null) delete process.env.ARK_API_KEY;
    else process.env.ARK_API_KEY = prevKey;
    if (prevConcurrent == null) delete process.env.ARK_SEEDANCE_MAX_CONCURRENT;
    else process.env.ARK_SEEDANCE_MAX_CONCURRENT = prevConcurrent;
  }
});

test('computeSnapshotFromJobs only uses the latest 10 successful jobs for recent actual averages', () => {
  const prevKey = process.env.ARK_API_KEY;
  const prevConcurrent = process.env.ARK_SEEDANCE_MAX_CONCURRENT;
  process.env.ARK_API_KEY = 'test-key';
  process.env.ARK_SEEDANCE_MAX_CONCURRENT = '3';

  try {
    const jobs: BatchJob[] = Array.from({ length: 12 }, (_, index) => {
      const durationSec = index < 2 ? 30 : 60;
      const minute = String(index).padStart(2, '0');
      return makeJob({
        id: `done_${index}`,
        status: 'done',
        submittedAt: `2026-05-06T00:${minute}:00.000Z`,
        completedAt: `2026-05-06T00:${minute}:${String(durationSec).padStart(2, '0')}.000Z`,
        updatedAt: `2026-05-06T00:${minute}:${String(durationSec).padStart(2, '0')}.000Z`,
        actualDurationSec: durationSec,
      });
    });

    const snapshot = computeSnapshotFromJobs(jobs);

    assert.equal(snapshot.avgSecPerJob, 60);
    assert.equal(snapshot.recentSuccessAvgSec, 60);
    assert.equal(snapshot.recentSuccessSampleCount, 10);
  } finally {
    if (prevKey == null) delete process.env.ARK_API_KEY;
    else process.env.ARK_API_KEY = prevKey;
    if (prevConcurrent == null) delete process.env.ARK_SEEDANCE_MAX_CONCURRENT;
    else process.env.ARK_SEEDANCE_MAX_CONCURRENT = prevConcurrent;
  }
});

test('deriveQueuePositionPatches uses waiting-only queue position and concurrency-aware eta', () => {
  const prevKey = process.env.ARK_API_KEY;
  const prevConcurrent = process.env.ARK_SEEDANCE_MAX_CONCURRENT;
  process.env.ARK_API_KEY = 'test-key';
  process.env.ARK_SEEDANCE_MAX_CONCURRENT = '3';

  try {
    const jobs: BatchJob[] = [
      makeJob({
        id: 'done_1',
        status: 'done',
        submittedAt: '2026-05-06T00:00:00.000Z',
        updatedAt: '2026-05-06T00:01:30.000Z',
      }),
      makeJob({ id: 'active_1', status: 'pending' }),
      makeJob({ id: 'active_2', status: 'queuing' }),
      makeJob({ id: 'active_3', status: 'processing' }),
      makeJob({ id: 'wait_1', status: 'awaiting_submit', createdAt: '2026-05-06T00:02:00.000Z' }),
      makeJob({ id: 'wait_2', status: 'awaiting_submit', createdAt: '2026-05-06T00:03:00.000Z' }),
    ];

    const patches = deriveQueuePositionPatches(jobs);

    assert.deepEqual(patches.get('wait_1'), { globalQueuePos: 0, etaSec: 30 });
    assert.deepEqual(patches.get('wait_2'), { globalQueuePos: 1, etaSec: 60 });
  } finally {
    if (prevKey == null) delete process.env.ARK_API_KEY;
    else process.env.ARK_API_KEY = prevKey;
    if (prevConcurrent == null) delete process.env.ARK_SEEDANCE_MAX_CONCURRENT;
    else process.env.ARK_SEEDANCE_MAX_CONCURRENT = prevConcurrent;
  }
});
