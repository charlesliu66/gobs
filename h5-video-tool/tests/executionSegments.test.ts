import test from 'node:test';
import assert from 'node:assert/strict';

import type { ProductionShot } from '../src/studio/productionTypes.ts';
import { buildExecutionSegmentsFromShots } from '../src/studio/executionSegments.ts';
import { resolveShotAggregateStatus } from '../src/studio/executionSegmentStatus.ts';

function makeShot(overrides: Partial<ProductionShot> = {}): ProductionShot {
  return {
    shotIndex: overrides.shotIndex ?? 1,
    durationSec: overrides.durationSec ?? 6,
    sceneRef: overrides.sceneRef ?? 'scene-1',
    shotScale: overrides.shotScale ?? 'medium',
    cameraMove: overrides.cameraMove ?? 'static',
    lensFeel: overrides.lensFeel ?? '35mm',
    subject: overrides.subject ?? 'Hero',
    action: overrides.action ?? 'walks forward',
    composition: overrides.composition ?? 'center frame',
    lighting: overrides.lighting ?? 'moonlight',
    emotion: overrides.emotion ?? 'focused',
    continuity: overrides.continuity ?? '',
    dialogue: overrides.dialogue ?? '',
    audioCue: overrides.audioCue ?? '',
    notes: overrides.notes ?? '',
    structuredStill: overrides.structuredStill ?? {
      sp_subject: '',
      sp_environment: '',
      sp_style: '',
      sp_lighting: '',
      sp_camera: '',
      sp_composition: '',
      sp_continuity: '',
      sp_negative: '',
    },
    structuredMotion: overrides.structuredMotion ?? {
      mp_motion: '',
      mp_camera: '',
      mp_tempo: '',
      mp_transition: '',
      mp_audio: '',
    },
    ...overrides,
  };
}

test('buildExecutionSegmentsFromShots merges consecutive short shots into one executable segment', () => {
  const shots = [
    makeShot({ shotIndex: 1, durationSec: 1, sceneRef: 'market', subject: 'Ronin' }),
    makeShot({ shotIndex: 2, durationSec: 1, sceneRef: 'market', subject: 'Ronin' }),
    makeShot({ shotIndex: 3, durationSec: 2, sceneRef: 'market', subject: 'Ronin' }),
  ];

  const segments = buildExecutionSegmentsFromShots(shots);

  assert.equal(segments.length, 1);
  assert.equal(segments[0]?.mode, 'merged_short');
  assert.deepEqual(segments[0]?.sourceShotIndexes, [1, 2, 3]);
  assert.equal(segments[0]?.durationSec, 4);
});

test('buildExecutionSegmentsFromShots splits long shots to stay within the 15s execution limit', () => {
  const segments = buildExecutionSegmentsFromShots([
    makeShot({ shotIndex: 8, durationSec: 18, sceneRef: 'roof' }),
  ]);

  assert.equal(segments.length, 2);
  assert.deepEqual(segments.map((segment) => segment.mode), ['split_long', 'split_long']);
  assert.ok(segments.every((segment) => segment.durationSec <= 15));
  assert.deepEqual(segments.map((segment) => segment.sourceShotIndexes), [[8], [8]]);
});

test('resolveShotAggregateStatus marks a shot completed when its execution segment job finished', () => {
  const shot = makeShot({ shotIndex: 12, durationSec: 18, sceneRef: 'temple' });
  const [segment] = buildExecutionSegmentsFromShots([makeShot({ ...shot, durationSec: 6 })]);

  const aggregate = resolveShotAggregateStatus(shot, [segment!], {
    segmentJobsMap: {
      [segment!.id]: [
        {
          id: 'bj_done',
          submitId: 'submit_1',
          taskId: 'task_1',
          projectId: 'proj_1',
          shotIndex: 12,
          primaryShotIndex: 12,
          segmentId: segment!.id,
          sourceShotIndexes: [12],
          shotDescription: 'shot 12',
          model: 'dreamina-text2video',
          source: 'production',
          status: 'done',
          createdAt: '2026-04-24T00:00:00.000Z',
          updatedAt: '2026-04-24T00:01:00.000Z',
          videoUrl: 'https://example.com/seg12.mp4',
        },
      ],
    },
  });

  assert.equal(aggregate.userStatus, 'completed');
  assert.equal(aggregate.summary.completedSegments, 1);
  assert.equal(aggregate.providerStatus, 'done');
});
