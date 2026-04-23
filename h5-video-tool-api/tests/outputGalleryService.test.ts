import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyOutputGalleryFilters,
  inferOutputGallerySource,
  toOutputGalleryHiddenKey,
  type OutputGalleryFilterOptions,
  type OutputGalleryItem,
} from '../src/services/outputGalleryService.ts';

const sampleItems: OutputGalleryItem[] = [
  {
    path: 'output/admin/dreamina_aaaabbbbcccc_1777000000000.mp4',
    mtimeMs: Date.UTC(2026, 3, 23, 12, 0, 0),
    size: 10,
    source: 'dreamina',
    hiddenKey: toOutputGalleryHiddenKey('output/admin/dreamina_aaaabbbbcccc_1777000000000.mp4'),
  },
  {
    path: 'output/admin/final_campaign_cut.mp4',
    mtimeMs: Date.UTC(2026, 3, 20, 12, 0, 0),
    size: 20,
    source: 'other',
    hiddenKey: toOutputGalleryHiddenKey('output/admin/final_campaign_cut.mp4'),
  },
];

test('inferOutputGallerySource marks dreamina paths as dreamina', () => {
  assert.equal(inferOutputGallerySource('output/admin/dreamina_xxx.mp4'), 'dreamina');
  assert.equal(inferOutputGallerySource('output/admin/final_cut.mp4'), 'other');
});

test('applyOutputGalleryFilters excludes hidden items from visible view', () => {
  const result = applyOutputGalleryFilters(sampleItems, {
    view: 'visible',
    hiddenPaths: new Set([toOutputGalleryHiddenKey('output/admin/final_campaign_cut.mp4')]),
  });

  assert.deepEqual(result.map((item) => item.path), ['output/admin/dreamina_aaaabbbbcccc_1777000000000.mp4']);
});

test('applyOutputGalleryFilters keeps only hidden items in hidden view', () => {
  const result = applyOutputGalleryFilters(sampleItems, {
    view: 'hidden',
    hiddenPaths: new Set([toOutputGalleryHiddenKey('output/admin/final_campaign_cut.mp4')]),
  });

  assert.deepEqual(result.map((item) => item.path), ['output/admin/final_campaign_cut.mp4']);
});

test('applyOutputGalleryFilters supports source, keyword, and date filters together', () => {
  const options: OutputGalleryFilterOptions = {
    view: 'visible',
    hiddenPaths: new Set<string>(),
    source: 'dreamina',
    q: 'aaaa',
    minMtimeMs: Date.UTC(2026, 3, 22, 0, 0, 0),
  };

  const result = applyOutputGalleryFilters(sampleItems, options);
  assert.deepEqual(result.map((item) => item.path), ['output/admin/dreamina_aaaabbbbcccc_1777000000000.mp4']);
});
