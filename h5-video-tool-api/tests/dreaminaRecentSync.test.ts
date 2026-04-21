import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DREAMINA_RECENT_WINDOW_MS,
  extractDreaminaSubmitKeyFromPath,
  selectDreaminaTasksForBackfill,
} from '../src/services/dreaminaRecentSync.ts';

test('extractDreaminaSubmitKeyFromPath reads the persisted submit prefix from output path', () => {
  assert.equal(
    extractDreaminaSubmitKeyFromPath('output/admin/dreamina_c426c0cd2dfb_1776229192704.mp4'),
    'c426c0cd2dfb',
  );
  assert.equal(
    extractDreaminaSubmitKeyFromPath('output/admin/not-dreamina.mp4'),
    undefined,
  );
});

test('selectDreaminaTasksForBackfill keeps only recent completed tasks that are not already persisted', () => {
  const nowMs = Date.UTC(2026, 3, 21, 12, 0, 0);
  const selected = selectDreaminaTasksForBackfill(
    [
      {
        submitId: 'AAAA1111BBBB',
        genStatus: 'success',
        createMs: nowMs - 60_000,
        raw: {},
      },
      {
        submitId: 'cccc2222dddd',
        genStatus: 'success',
        createMs: nowMs - 90_000,
        raw: {},
      },
      {
        submitId: 'EEEE3333FFFF',
        genStatus: 'querying',
        createMs: nowMs - 120_000,
        raw: {},
      },
      {
        submitId: 'GGGG4444HHHH',
        genStatus: 'success',
        createMs: nowMs - DREAMINA_RECENT_WINDOW_MS - 1,
        raw: {},
      },
      {
        submitId: 'aaaa1111bbbb',
        genStatus: 'success',
        createMs: nowMs - 30_000,
        raw: {},
      },
    ],
    ['output/admin/dreamina_cccc2222dddd_1776229192704.mp4'],
    { nowMs, maxTasks: 5 },
  );

  assert.deepEqual(
    selected.map((task) => task.submitId),
    ['AAAA1111BBBB'],
  );
});

test('selectDreaminaTasksForBackfill respects the maxTasks cap', () => {
  const nowMs = Date.UTC(2026, 3, 21, 12, 0, 0);
  const selected = selectDreaminaTasksForBackfill(
    [
      { submitId: 'task001', genStatus: 'success', createMs: nowMs - 1_000, raw: {} },
      { submitId: 'task002', genStatus: 'success', createMs: nowMs - 2_000, raw: {} },
      { submitId: 'task003', genStatus: 'success', createMs: nowMs - 3_000, raw: {} },
    ],
    [],
    { nowMs, maxTasks: 2 },
  );

  assert.deepEqual(
    selected.map((task) => task.submitId),
    ['task001', 'task002'],
  );
});
