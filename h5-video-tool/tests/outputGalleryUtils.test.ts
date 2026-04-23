import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildOutputGalleryQuery,
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
  assert.equal(inferOutputSourceLabel('dreamina'), '即梦回补');
  assert.equal(inferOutputSourceLabel('other'), '服务端成片');
});
