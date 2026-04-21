import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DREAMINA_RECENT_WINDOW_MS,
  dedupeOutputRecentVideoItems,
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

test('dedupeOutputRecentVideoItems collapses repeated dreamina files by submit key and keeps the best copy', () => {
  const { items, collapsedCount } = dedupeOutputRecentVideoItems([
    {
      path: 'output/admin/dreamina_65ed730260b2_1776760243547.mp4',
      mtimeMs: 1776760243547,
      size: 7463958,
    },
    {
      path: 'output/admin/dreamina_65ed730260b2_1776760249379.mp4',
      mtimeMs: 1776760249379,
      size: 7463958,
    },
    {
      path: 'output/admin/dreamina_90e37db2eaa4_1776760242919.mp4',
      mtimeMs: 1776760242919,
      size: 5035422,
    },
    {
      path: 'output/admin/uploaded_manual_clip.mp4',
      mtimeMs: 1776760249999,
      size: 100,
    },
  ]);

  assert.equal(collapsedCount, 1);
  assert.deepEqual(
    items.map((item) => item.path),
    [
      'output/admin/uploaded_manual_clip.mp4',
      'output/admin/dreamina_65ed730260b2_1776760249379.mp4',
      'output/admin/dreamina_90e37db2eaa4_1776760242919.mp4',
    ],
  );
});
