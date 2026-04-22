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

test('assembleTikTokHashtags hard-filters internal system words and path residue', () => {
  const result = assembleTikTokHashtags({
    rawHashtags: '#fyp #viral #服务端成片 #output #admin #dreamina #fantasy',
    contentTags: ['Ancient Wisdom', 'Dreamina render', 'output/admin/final.mp4'],
    styleTags: ['Epic CGI'],
  });

  const tags = result.split(/\s+/);
  assert.ok(tags.includes('#fyp'));
  assert.ok(tags.includes('#viral'));
  assert.ok(tags.includes('#fantasy'));
  assert.ok(tags.includes('#EpicCGI'));
  assert.ok(!tags.includes('#output'));
  assert.ok(!tags.includes('#admin'));
  assert.ok(!tags.includes('#dreamina'));
  assert.ok(!tags.includes('#服务端成片'));
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

test('pickBestCaptionResult strips inline hashtags and internal terms from publish output', () => {
  const picked = pickBestCaptionResult(
    [
      {
        caption: 'Ancient wisdom or a prophecy of war? Her journey begins. #Fantasy #Warrior #AncientWisdom #Dreamina',
        hashtags: '#fyp #viral #服务端成片 #output #admin #dreamina',
      },
    ],
    buildFallbackFromPrompt('fantasy warrior prophecy'),
    'EN',
    { contentTags: ['fantasy', 'warrior'], styleTags: ['epic storytelling'] },
  );

  assert.equal(picked.caption, 'Ancient wisdom or a prophecy of war? Her journey begins.');
  assert.match(picked.hashtags, /#fantasy/i);
  assert.match(picked.hashtags, /#warrior/i);
  assert.doesNotMatch(picked.hashtags, /#output|#admin|#dreamina|#服务端成片/i);
});
