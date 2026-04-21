import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFallbackFromPrompt,
  normalizeHashtags,
} from '../src/services/promptPolish.ts';

test('normalizeHashtags keeps a focused TikTok-sized set of tags', () => {
  assert.equal(
    normalizeHashtags('#fyp#viral#samurai#ronin#anime#edit#blade'),
    '#fyp #viral #samurai #ronin #anime #edit',
  );
});

test('buildFallbackFromPrompt produces hook-first TikTok copy without shorts tags', () => {
  const result = buildFallbackFromPrompt('dark samurai battle in bamboo forest 8s 9:16 4k');
  const tags = result.hashtags.split(/\s+/).filter(Boolean);

  assert.match(result.caption, /POV:|Wait for it:|You need to see this:/);
  assert.doesNotMatch(result.caption, /4k|9:16|8s/i);
  assert.ok(tags.length <= 6);
  assert.ok(tags.includes('#fyp'));
  assert.ok(!tags.includes('#shorts'));
});
