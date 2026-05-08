import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterVisibleStudioTemplates,
  getStudioTemplateAspectRatioOptions,
  getStudioTemplateDisplayMeta,
  getStudioTemplateDurationOptions,
  isValidStudioAspectRatio,
  isValidStudioDuration,
} from '../src/config/studioTemplateOptions.ts';

test('filterVisibleStudioTemplates keeps only Phase 1 Studio templates', () => {
  const visible = filterVisibleStudioTemplates([
    { id: 'viral-dance' },
    { id: 'cg-trailer' },
    { id: 'short-drama' },
    { id: 'cat-harem' },
    { id: 'boss-showcase' },
    { id: 'future-template' },
  ]);

  assert.deepEqual(visible.map((template) => template.id), ['viral-dance', 'boss-showcase']);
});

test('template duration options match the Advanced Studio Phase 1 plan', () => {
  assert.deepEqual(getStudioTemplateDurationOptions('custom', false), [4, 6, 8, 10]);
  assert.deepEqual(getStudioTemplateDurationOptions('viral-dance'), [5, 8, 10]);
  assert.deepEqual(getStudioTemplateDurationOptions('boss-showcase'), [15]);
  assert.equal(isValidStudioDuration('viral-dance', 10), true);
  assert.equal(isValidStudioDuration('viral-dance', 15), false);
});

test('template aspect ratio options preserve flexible user choices', () => {
  assert.deepEqual(getStudioTemplateAspectRatioOptions('custom', false), ['9:16', '16:9', '1:1']);
  assert.deepEqual(getStudioTemplateAspectRatioOptions('boss-showcase'), ['9:16', '16:9']);
  assert.equal(isValidStudioAspectRatio('boss-showcase', '16:9'), true);
  assert.equal(isValidStudioAspectRatio('viral-dance', '16:9'), false);
});

test('template display meta communicates marketer-facing capabilities', () => {
  assert.equal(getStudioTemplateDisplayMeta({ id: 'custom' }), '4-10s · 9:16 / 16:9 / 1:1');
  assert.equal(getStudioTemplateDisplayMeta({ id: 'viral-dance' }), '5-10s · 9:16');
  assert.equal(getStudioTemplateDisplayMeta({ id: 'boss-showcase' }), '15s · 9:16 / 16:9');
});
