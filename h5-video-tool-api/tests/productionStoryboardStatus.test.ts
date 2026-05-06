import test from 'node:test';
import assert from 'node:assert/strict';

import {
  resolveShotAggregateProviderStatus,
  resolveShotAggregateStatus,
} from '../../h5-video-tool/src/studio/executionSegmentStatus.ts';
import type {
  ProductionExecutionSegment,
  ProductionShot,
} from '../../h5-video-tool/src/studio/productionTypes.ts';

function buildShot(overrides: Partial<ProductionShot> = {}): ProductionShot {
  return {
    shotIndex: 1,
    durationSec: 6,
    sceneRef: 'scene-1',
    shotScale: 'medium',
    cameraMove: 'static',
    lensFeel: 'normal',
    subject: 'hero',
    action: 'looks up',
    composition: 'center',
    lighting: 'moody',
    emotion: 'tense',
    continuity: '',
    dialogue: '',
    audioCue: '',
    notes: '',
    structuredStill: {
      sp_subject: '',
      sp_environment: '',
      sp_style: '',
      sp_lighting: '',
      sp_camera: '',
      sp_composition: '',
      sp_continuity: '',
      sp_negative: '',
    },
    structuredMotion: {
      mp_motion: '',
      mp_camera: '',
      mp_tempo: '',
      mp_transition: '',
      mp_audio: '',
    },
    ...overrides,
  };
}

function buildSegment(overrides: Partial<ProductionExecutionSegment> = {}): ProductionExecutionSegment {
  return {
    id: 'seg-1',
    segmentOrder: 0,
    sourceShotIndexes: [1],
    primaryShotIndex: 1,
    mode: 'direct',
    durationSec: 6,
    storyboardText: 'hero looks up',
    segmentLabel: '#1',
    status: 'failed',
    ...overrides,
  };
}

test('resolveShotAggregateProviderStatus prefers completed when shot already has a playable version', () => {
  const shot = buildShot({
    previewVideoVersions: [
      {
        id: 'v1',
        taskId: 'task-1',
        createdAt: Date.now(),
        videoUrl: '/api/video/file?path=done.mp4',
      },
    ],
    lastVideoError: {
      reason: 'latest retry failed',
      at: new Date().toISOString(),
    },
  });
  const segments = [buildSegment({ status: 'failed' })];

  const status = resolveShotAggregateProviderStatus(shot, segments);

  assert.equal(status, 'done');
});

test('resolveShotAggregateStatus keeps the shot completed when a playable version exists', () => {
  const shot = buildShot({
    previewVideoVersions: [
      {
        id: 'v1',
        taskId: 'task-1',
        createdAt: Date.now(),
        videoUrl: '/api/video/file?path=done.mp4',
      },
    ],
    lastVideoError: {
      reason: 'latest retry failed',
      at: new Date().toISOString(),
    },
  });
  const segments = [buildSegment({ status: 'failed' })];

  const aggregate = resolveShotAggregateStatus(shot, segments);

  assert.equal(aggregate.userStatus, 'completed');
  assert.equal(aggregate.labelKey, 'productionWizard.status.completed');
  assert.equal(aggregate.hasVideo, true);
});
