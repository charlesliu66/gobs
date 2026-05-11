import test from 'node:test';
import assert from 'node:assert/strict';
import { buildStructuredBannerPrompt } from './bannerPrompt.ts';

const specs = [
  {
    id: 'square_1_1',
    label: 'Square 1:1',
    aspectRatio: '1:1',
    width: 1080,
    height: 1080,
    platformHint: 'Facebook / Instagram feed',
  },
  {
    id: 'story_9_16',
    label: 'Story 9:16',
    aspectRatio: '9:16',
    width: 1080,
    height: 1920,
    platformHint: 'Story / Reels placement',
  },
];

test('buildStructuredBannerPrompt creates a template-ready prompt with asset and copy guardrails', () => {
  const prompt = buildStructuredBannerPrompt({
    angle: 'Reward-first hero launch',
    objective: 'Drive installs from returning squads',
    audience: 'mid-core RPG players',
    proof: 'A visible skill combo payoff',
    specs,
    mainVisualAssetId: 'asset_key_art',
    logoAssetId: 'asset_logo',
    shortCopy: 'New hero. One decisive combo.',
    cta: 'Play today',
    visualDirection: 'Hero key art, gold burst UI, premium tactical fantasy tone.',
    forbiddenClaims: ['No guaranteed SSR.'],
    knowledgeCitations: ['Market / approvedAngles: Lead with gameplay proof.'],
  });

  assert.equal(prompt.context.readiness, 'template_ready');
  assert.deepEqual(prompt.context.specIds, ['square_1_1', 'story_9_16']);
  assert.deepEqual(prompt.context.sourceAssetIds, ['asset_key_art', 'asset_logo']);
  assert.equal(prompt.context.copy.cta, 'Play today');
  assert.match(prompt.body, /## Objective/);
  assert.match(prompt.body, /## Formats/);
  assert.match(prompt.body, /Main visual assetId: asset_key_art/);
  assert.match(prompt.body, /## Copy Lock/);
  assert.match(prompt.body, /No guaranteed SSR/);
  assert.match(prompt.body, /template-ready prompt context/i);
});

test('buildStructuredBannerPrompt downgrades readiness when the main visual is missing', () => {
  const prompt = buildStructuredBannerPrompt({
    angle: 'Reward-first hero launch',
    objective: 'Drive installs from returning squads',
    audience: 'mid-core RPG players',
    proof: 'A visible skill combo payoff',
    specs,
    shortCopy: 'New hero. One decisive combo.',
    cta: 'Play today',
    visualDirection: 'Hero key art, gold burst UI, premium tactical fantasy tone.',
  });

  assert.equal(prompt.context.readiness, 'needs_source_asset');
  assert.match(prompt.body, /NEEDS_MAIN_VISUAL/);
  assert.equal(
    prompt.context.assetFitWarnings.some((warning) => /Main visual asset is missing/i.test(warning)),
    true,
  );
});
