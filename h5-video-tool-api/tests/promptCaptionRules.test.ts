import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assembleTikTokHashtags,
  buildFallbackFromPrompt,
  isLowQualityCaption,
  normalizeHashtags,
  pickBestCaptionResult,
  scoreCaptionQuality,
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

test('isLowQualityCaption flags mixed-language template fallback copy', () => {
  assert.equal(
    isLowQualityCaption('POV: 高级制片 座头市 and it gets better every second 🔥', 'EN'),
    true,
  );
  assert.equal(
    isLowQualityCaption('He turns once and the pressure instantly spikes.', 'EN'),
    false,
  );
});

test('scoreCaptionQuality prefers hook-first social copy over prompt-like text', () => {
  const good = scoreCaptionQuality('He turns once and the whole scene changes.', 'EN');
  const bad = scoreCaptionQuality('samurai bamboo forest cinematic 4k 9:16 slow motion', 'EN');
  assert.ok(good > bad);
});

test('assembleTikTokHashtags builds a compact traffic plus topic mix', () => {
  const result = assembleTikTokHashtags({
    contentTags: ['samurai cinema', 'ronin', 'black and white'],
    styleTags: ['movieedit'],
    rawHashtags: '#fyp #viral #samurai #jxj #blackandwhite #movieedit #extra',
  });

  const tags = result.split(/\s+/);
  assert.ok(tags.includes('#fyp'));
  assert.ok(tags.includes('#viral'));
  assert.ok(tags.includes('#samurai'));
  assert.ok(tags.includes('#movieedit'));
  assert.ok(!tags.includes('#jxj'));
  assert.ok(tags.length <= 6);
});

test('pickBestCaptionResult rejects low-quality template copy and picks the stronger candidate', () => {
  const picked = pickBestCaptionResult(
    [
      {
        caption: 'POV: 高级制片 座头市 and it gets better every second 🔥',
        hashtags: '#fyp #viral #samurai',
      },
      {
        caption: 'He turns once and the pressure instantly spikes.',
        hashtags: '#fyp #viral #samurai #movieedit',
      },
    ],
    buildFallbackFromPrompt('samurai battle in bamboo forest'),
    'EN',
  );

  assert.equal(picked.caption, 'He turns once and the pressure instantly spikes.');
  assert.equal(picked.hashtags, '#fyp #viral #samurai #movieedit');
});
