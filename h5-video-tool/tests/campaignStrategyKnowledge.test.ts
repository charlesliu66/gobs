import test from 'node:test';
import assert from 'node:assert/strict';
import type { DerivedCampaignKnowledgeContext } from '../src/api/campaignKnowledge.ts';
import {
  buildBriefFromForm,
  buildDefaultStrategyTuning,
  buildStrategyFromBrief,
  buildVariantPackFromStrategy,
} from '../src/components/campaign/strategy.ts';

function createKnowledgeContext(): DerivedCampaignKnowledgeContext {
  return {
    selectedPackIds: ['pack-brand', 'pack-market', 'pack-persona'],
    marketTruth: ['Event-driven players respond to limited-time raid boosts.'],
    audienceTension: ['Players want fast payoff without losing the feeling of mastery.'],
    toneRules: ['High-energy, premium, and never sarcastic.'],
    forbiddenClaims: ['Avoid promising guaranteed wins.'],
    approvedAngles: ['Lead with the event reward loop before widening into lore.'],
    hookCandidates: [
      'Lead with the event payoff before the scroll.',
      'Call out the pain of missing the limited-time raid bonus.',
      'Drop viewers into a POV reveal, then widen into the reward loop.',
    ],
    visualCues: ['Blue-white energy bursts with premium UI overlays.'],
    rationaleNotes: ['Imported from fastpublish core template.'],
  };
}

test('buildStrategyFromBrief merges derived knowledge into the base strategy', () => {
  const brief = buildBriefFromForm({
    mode: 'tiktok_ua',
    objective: 'Drive event installs',
    audience: 'mid-core RPG players',
    sellingPointsText: 'Limited-time raid bonus\nNew frost queen skill\nOne-tap team boost',
    cta: '',
    referenceStyle: 'high pressure payoff',
    region: 'US',
    forbiddenClaimsText: 'No guaranteed SSR',
  });

  const tuning = {
    ...buildDefaultStrategyTuning(brief),
    hookApproach: 'benefit_first' as const,
  };
  const strategy = buildStrategyFromBrief(brief, {
    strategyId: 'strategy_knowledge',
    tuning,
    knowledgeContext: createKnowledgeContext(),
  });

  assert.deepEqual(strategy.knowledgePackIds, ['pack-brand', 'pack-market', 'pack-persona']);
  assert.deepEqual(strategy.marketTruth, ['Event-driven players respond to limited-time raid boosts.']);
  assert.deepEqual(strategy.audienceTension, [
    'Players want fast payoff without losing the feeling of mastery.',
  ]);
  assert.deepEqual(strategy.toneRules, ['High-energy, premium, and never sarcastic.']);
  assert.deepEqual(strategy.forbiddenClaims, ['No guaranteed SSR', 'Avoid promising guaranteed wins.']);
  assert.deepEqual(strategy.visualCues, ['Blue-white energy bursts with premium UI overlays.']);
  assert.deepEqual(strategy.approvedAngles, [
    'Lead with the event reward loop before widening into lore.',
  ]);
  assert.deepEqual(strategy.hookCandidates, [
    'Lead with the event payoff before the scroll.',
    'Call out the pain of missing the limited-time raid bonus.',
    'Drop viewers into a POV reveal, then widen into the reward loop.',
  ]);
  assert.equal(strategy.recommendedHook, 'Lead with the event payoff before the scroll.');
  assert.equal(strategy.hookOptions[0], 'Lead with the event payoff before the scroll.');
  assert.match(strategy.angle, /Lead with the event reward loop before widening into lore\./);
  assert.match(strategy.tone ?? '', /High-energy, premium, and never sarcastic\./);
  assert.ok(
    strategy.riskNotes.some((note) => note.includes('Avoid claim: Avoid promising guaranteed wins.')),
  );
});

test('buildStrategyFromBrief keeps knowledge arrays empty when no context is supplied', () => {
  const brief = buildBriefFromForm({
    mode: 'tiktok_content',
    objective: 'Grow brand memory',
    audience: 'fantasy fans',
    sellingPointsText: 'Frost queen reveal\nWorld building moment',
    cta: '',
    referenceStyle: 'story-led reveal',
    region: '',
    forbiddenClaimsText: '',
  });

  const strategy = buildStrategyFromBrief(brief, {
    tuning: buildDefaultStrategyTuning(brief),
  });

  assert.deepEqual(strategy.knowledgePackIds, []);
  assert.deepEqual(strategy.marketTruth, []);
  assert.deepEqual(strategy.audienceTension, []);
  assert.deepEqual(strategy.toneRules, []);
  assert.deepEqual(strategy.forbiddenClaims, []);
  assert.deepEqual(strategy.visualCues, []);
  assert.deepEqual(strategy.approvedAngles, []);
  assert.deepEqual(strategy.hookCandidates, []);
  assert.ok(strategy.recommendedHook.length > 0);
});

test('buildVariantPackFromStrategy reuses knowledge hooks across differentiated variants', () => {
  const brief = buildBriefFromForm({
    mode: 'tiktok_content',
    objective: 'Grow event awareness',
    audience: 'fantasy RPG fans',
    sellingPointsText: 'Raid bonus\nFrost queen reveal\nGuild buff',
    cta: '',
    referenceStyle: 'story-led reveal',
    region: 'SEA',
    forbiddenClaimsText: '',
  });

  const strategy = buildStrategyFromBrief(brief, {
    strategyId: 'strategy_variant_knowledge',
    tuning: buildDefaultStrategyTuning(brief),
    knowledgeContext: createKnowledgeContext(),
  });

  const pack = buildVariantPackFromStrategy(brief, strategy);

  assert.equal(pack.variantPackId, 'variant_pack_strategy_variant_knowledge');
  assert.equal(pack.variants.length, 3);
  assert.deepEqual(
    pack.variants.map((variant) => variant.hook),
    [
      'Drop viewers into a POV reveal, then widen into the reward loop.',
      'Lead with the event payoff before the scroll.',
      'Call out the pain of missing the limited-time raid bonus.',
    ],
  );
});
