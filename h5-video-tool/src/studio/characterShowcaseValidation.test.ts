import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHARACTER_SHOWCASE_CHARACTER_TARGET,
  CHARACTER_SHOWCASE_MIN_USABLE_FOR_CONTINUE,
  CHARACTER_SHOWCASE_RECOMMENDED_PRESET_IDS,
  CHARACTER_SHOWCASE_SAMPLE_TARGET,
  CHARACTER_SHOWCASE_VALIDATION_SAMPLES,
  decideCharacterShowcaseValidation,
  getCharacterShowcaseValidationNotice,
  summarizeCharacterShowcaseValidation,
  type CharacterShowcaseValidationSample,
} from './characterShowcaseValidation.ts';

test('Character Showcase validation ledger covers five characters with reveal and skill directions', () => {
  assert.equal(CHARACTER_SHOWCASE_VALIDATION_SAMPLES.length, CHARACTER_SHOWCASE_SAMPLE_TARGET);
  const characters = new Set(CHARACTER_SHOWCASE_VALIDATION_SAMPLES.map((sample) => sample.characterName));
  assert.equal(characters.size, CHARACTER_SHOWCASE_CHARACTER_TARGET);

  for (const character of characters) {
    const directions = CHARACTER_SHOWCASE_VALIDATION_SAMPLES
      .filter((sample) => sample.characterName === character)
      .map((sample) => sample.direction)
      .sort();
    assert.deepEqual(directions, ['character_reveal', 'skill_or_selling_point']);
  }
});

test('Character Showcase current fixture evaluates to continue with constrained directions', () => {
  const summary = summarizeCharacterShowcaseValidation();

  assert.equal(summary.sampleCount, 10);
  assert.equal(summary.characterCount, 5);
  assert.equal(summary.usableCount, 5);
  assert.equal(summary.usableRate, 0.5);
  assert.equal(summary.decision, 'continue');
  assert.ok(summary.usableCount >= CHARACTER_SHOWCASE_MIN_USABLE_FOR_CONTINUE);
  assert.ok(summary.recommendedDirections.includes('single-character reveal'));
  assert.ok(summary.notRecommendedDirections.includes('multi-character group shots'));
  assert.ok(summary.highRiskCases.some((item) => item.includes('Dragon Rider')));
  assert.equal(summary.videoFitCount, 5);
  assert.equal(summary.bannerFitCount, 3);
});

test('Character Showcase exit decision enforces continue, experimental, and pause outcomes', () => {
  assert.equal(decideCharacterShowcaseValidation(3), 'continue');
  assert.equal(decideCharacterShowcaseValidation(2), 'experimental');
  assert.equal(decideCharacterShowcaseValidation(0), 'pause');
});

test('Character Showcase synthetic low-usable set cannot continue', () => {
  const base = CHARACTER_SHOWCASE_VALIDATION_SAMPLES[0];
  const unusable = CHARACTER_SHOWCASE_VALIDATION_SAMPLES[8];
  const syntheticSamples: CharacterShowcaseValidationSample[] = [
    { ...base, id: 'usable_1', usableForAds: true },
    { ...unusable, id: 'bad_1', characterName: 'Bad One', usableForAds: false },
    { ...unusable, id: 'bad_2', characterName: 'Bad Two', usableForAds: false },
  ];

  const summary = summarizeCharacterShowcaseValidation(syntheticSamples);

  assert.equal(summary.usableCount, 1);
  assert.equal(summary.decision, 'experimental');
});

test('Character Showcase validation notice and recommended preset ids stay explicit', () => {
  const notice = getCharacterShowcaseValidationNotice();

  assert.match(notice, /continue/);
  assert.match(notice, /5\/10 usable/);
  assert.match(notice, /single-character reveal or skill payoff/);
  assert.deepEqual(CHARACTER_SHOWCASE_RECOMMENDED_PRESET_IDS, [
    'boss-reveal',
    'skill-flex',
    'reward-payoff',
  ]);
});
