import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildOutputHistoryPrompt,
  formatOutputGalleryFilename,
  inferOutputSourceLabel,
} from './outputGalleryUtils.ts';

test('inferOutputSourceLabel uses provided localized labels', () => {
  assert.equal(
    inferOutputSourceLabel('dreamina', {
      dreamina: 'Dreamina Sync',
      other: 'Server Output',
    }),
    'Dreamina Sync',
  );
  assert.equal(
    inferOutputSourceLabel('other', {
      dreamina: 'Dreamina Sync',
      other: 'Server Output',
    }),
    'Server Output',
  );
});

test('formatOutputGalleryFilename uses locale-aware dreamina prefix', () => {
  const videoPath = '/output/dreamina_abcd1234_1713861000000.mp4';

  assert.match(
    formatOutputGalleryFilename(videoPath, {
      locale: 'en',
      fallbackPrefix: 'Dreamina Output',
    }),
    /^Dreamina Output · /,
  );
  assert.match(
    formatOutputGalleryFilename(videoPath, {
      locale: 'zh-CN',
      fallbackPrefix: '即梦成片',
    }),
    /^即梦成片 · /,
  );
});

test('buildOutputHistoryPrompt falls back to localized source label', () => {
  assert.equal(
    buildOutputHistoryPrompt(
      { path: '/output/test.mp4' },
      { sourceLabel: 'Server Output' },
    ),
    '[Server Output] /output/test.mp4',
  );
});
