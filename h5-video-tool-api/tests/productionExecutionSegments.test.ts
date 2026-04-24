import test from 'node:test';
import assert from 'node:assert/strict';

import {
  appendJobId,
  mergeExecutionSegmentsForSave,
  resolveExecutionTarget,
} from '../src/services/productionExecutionSegments.ts';

test('resolveExecutionTarget returns the matching segment and all related shots', () => {
  const data = {
    project: {
      shots: [
        { shotIndex: 1, subject: 'hero' },
        { shotIndex: 2, subject: 'hero' },
        { shotIndex: 3, subject: 'guard' },
      ],
      executionSegments: [
        {
          id: 'seg-hero-open',
          primaryShotIndex: 1,
          sourceShotIndexes: [1, 2],
        },
      ],
    },
  } satisfies Record<string, unknown>;

  const resolved = resolveExecutionTarget(data, {
    segmentId: ' seg-hero-open ',
    shotIndex: 1,
  });

  assert.ok(resolved);
  assert.equal(resolved?.targetSegment?.id, 'seg-hero-open');
  assert.equal(resolved?.targetShot?.shotIndex, 1);
  assert.deepEqual(resolved?.sourceShotIndexes, [1, 2]);
  assert.deepEqual(resolved?.relatedShots.map((shot) => shot.shotIndex), [1, 2]);
});

test('mergeExecutionSegmentsForSave preserves existing fields and unions job ids', () => {
  const merged = mergeExecutionSegmentsForSave(
    {
      executionSegments: [
        {
          id: 'seg-1',
          segmentLabel: 'updated label',
          jobIds: ['job-2'],
        },
      ],
    },
    {
      executionSegments: [
        {
          id: 'seg-1',
          videoUrl: '/api/batch-jobs/video/job-1',
          jobIds: ['job-1'],
        },
        {
          id: 'seg-2',
          segmentLabel: 'keep me',
        },
      ],
    },
  );

  assert.ok(merged);
  const seg1 = merged?.find((segment) => segment.id === 'seg-1');
  const seg2 = merged?.find((segment) => segment.id === 'seg-2');
  assert.equal(seg1?.videoUrl, '/api/batch-jobs/video/job-1');
  assert.deepEqual([...(seg1?.jobIds as string[] ?? [])].sort(), ['job-1', 'job-2']);
  assert.equal(seg2?.segmentLabel, 'keep me');
});

test('appendJobId deduplicates job ids and ignores blanks', () => {
  assert.deepEqual(
    appendJobId(['job-1', ' ', 'job-1'], ' job-2 '),
    ['job-1', 'job-2'],
  );
});
