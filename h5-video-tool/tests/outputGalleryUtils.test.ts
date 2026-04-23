import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildOutputGalleryQuery,
  buildOutputHistoryPrompt,
  filterOutputItemsBySavedState,
  inferOutputSourceLabel,
  type OutputGallerySavedFilter,
} from '../src/components/outputGalleryUtils.ts';

test('buildOutputGalleryQuery serializes supported filters', () => {
  const query = buildOutputGalleryQuery({
    q: 'dreamina',
    source: 'dreamina',
    days: '7',
    view: 'hidden',
  });

  assert.equal(query, '?q=dreamina&source=dreamina&days=7&view=hidden');
});

test('filterOutputItemsBySavedState keeps only saved items when requested', () => {
  const result = filterOutputItemsBySavedState(
    [
      { path: 'output/admin/a.mp4' },
      { path: 'output/admin/b.mp4' },
    ],
    new Set(['output/admin/b.mp4']),
    'saved' satisfies OutputGallerySavedFilter,
  );

  assert.deepEqual(result.map((item) => item.path), ['output/admin/b.mp4']);
});

test('inferOutputSourceLabel returns readable labels', () => {
  assert.ok(inferOutputSourceLabel('dreamina').length > 0);
  assert.ok(inferOutputSourceLabel('other').length > 0);
  assert.notEqual(inferOutputSourceLabel('dreamina'), inferOutputSourceLabel('other'));
});

test('buildOutputHistoryPrompt prefers prompt summary over generic server placeholder', () => {
  assert.equal(
    buildOutputHistoryPrompt({
      path: 'output/admin/dreamina_aaaabbbbcccc_1777000000000.mp4',
      promptSummary: 'A ronin walks toward the exit of a dim chamber while the camera slowly pushes in.',
    }),
    'A ronin walks toward the exit of a dim chamber while the camera slowly pushes in.',
  );

  const fallback = buildOutputHistoryPrompt({
    path: 'output/admin/dreamina_aaaabbbbcccc_1777000000000.mp4',
  });

  assert.match(fallback, /output\/admin\/dreamina_aaaabbbbcccc_1777000000000\.mp4/);
  assert.notEqual(fallback, 'output/admin/dreamina_aaaabbbbcccc_1777000000000.mp4');
});
