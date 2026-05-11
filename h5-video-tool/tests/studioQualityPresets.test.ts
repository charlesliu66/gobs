import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getCharacterShowcasePresetRecommendation,
  getStudioQualityPresetGroups,
  localizedPresetPrompt,
  STUDIO_BGM_MOODS,
  STUDIO_MOTION_PROMPTS,
  STUDIO_SHOWCASE_SUBTYPES,
} from '../src/config/studioQualityPresets.ts';

test('Studio quality preset groups are template-aware', () => {
  assert.deepEqual(
    getStudioQualityPresetGroups('boss-showcase', 'en').map((group) => group.id),
    ['showcase', 'bgm'],
  );
  assert.deepEqual(
    getStudioQualityPresetGroups('viral-dance', 'zh').map((group) => group.id),
    ['motion', 'bgm'],
  );
  assert.deepEqual(
    getStudioQualityPresetGroups('custom', 'en').map((group) => group.id),
    ['bgm'],
  );
});

test('Studio quality presets include marketer-facing prompt hints', () => {
  assert.ok(STUDIO_SHOWCASE_SUBTYPES.length >= 3);
  assert.ok(STUDIO_MOTION_PROMPTS.length >= 3);
  assert.ok(STUDIO_BGM_MOODS.length >= 3);
  assert.match(localizedPresetPrompt(STUDIO_SHOWCASE_SUBTYPES[0], 'en'), /boss-reveal|boss/i);
  assert.match(localizedPresetPrompt(STUDIO_MOTION_PROMPTS[0], 'zh'), /动作迁移/);
});

test('Character Showcase presets carry validation recommendation metadata', () => {
  const showcaseGroup = getStudioQualityPresetGroups('boss-showcase', 'en').find((group) => group.id === 'showcase');
  const recommendationById = new Map(showcaseGroup?.presets.map((preset) => [preset.id, preset.validationRecommendation]));

  assert.equal(recommendationById.get('boss-reveal'), 'recommended');
  assert.equal(recommendationById.get('skill-flex'), 'recommended');
  assert.equal(recommendationById.get('reward-payoff'), 'recommended');
  assert.equal(getCharacterShowcasePresetRecommendation('group-shot'), 'not_recommended');
});
