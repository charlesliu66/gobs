import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildExportStoryboardShotStatuses,
  summarizeExportStoryboardStatus,
} from '../src/studio/exportStoryboardStatus.ts';
import type { ProductionShot } from '../src/studio/productionTypes.ts';

function shot(shotIndex: number, patch: Partial<ProductionShot> = {}): ProductionShot {
  return {
    shotIndex,
    durationSec: 6,
    sceneRef: 'scene-1',
    shotScale: '',
    cameraMove: '',
    lensFeel: '',
    subject: '',
    action: '',
    composition: '',
    lighting: '',
    emotion: '',
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
    ...patch,
  };
}

test('export storyboard status summary uses the same shot status model', () => {
  const items = buildExportStoryboardShotStatuses(
    [
      shot(1, { previewVideoUrl: '/api/batch-jobs/video/bj_done' }),
      shot(2),
      shot(3, { lastVideoError: { reason: 'failed', at: '2026-04-23T00:00:00.000Z' } }),
      shot(4),
    ],
    {
      2: {
        id: 'bj_2',
        submitId: '',
        taskId: '',
        projectId: 'proj_a',
        shotIndex: 2,
        shotDescription: '',
        model: 'dreamina',
        source: 'production',
        status: 'awaiting_submit',
        createdAt: '2026-04-23T00:00:00.000Z',
        updatedAt: '2026-04-23T00:00:00.000Z',
        globalQueuePos: 3,
        etaSec: 360,
      },
    },
    {
      3: 'failed',
      4: 'cancelled',
    },
  );

  const summary = summarizeExportStoryboardStatus(items);
  assert.equal(summary.completed, 1);
  assert.equal(summary.queued, 1);
  assert.equal(summary.needsAction, 2);
  assert.equal(items[1]?.platformQueuePosition, 4);
  assert.equal(items[2]?.userStatus, 'failed');
  assert.equal(items[3]?.userStatus, 'cancelled');
});
