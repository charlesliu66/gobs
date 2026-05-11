import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTextOutputDraftContent,
  buildTextProductionContext,
  buildTextProductionPrompt,
} from './textProductionPrompt.ts';
import type {
  CampaignCreativeBrief,
  CampaignCreativeStrategy,
} from './model.ts';
import type { DerivedCampaignKnowledgeContext } from '../../api/campaignKnowledge.ts';

function createBrief(): CampaignCreativeBrief {
  return {
    briefId: 'brief_text',
    platform: 'tiktok',
    mode: 'tiktok_content',
    objective: 'Bring lapsed players back for the new hero',
    audience: 'lapsed Gold and Glory players',
    sellingPoints: ['New hero changes arena fights', 'Skill combo is easy to learn'],
    cta: 'Try the new hero today',
    referenceStyle: 'premium launch copy',
    forbiddenClaims: ['No guaranteed SSR'],
  };
}

function createStrategy(): CampaignCreativeStrategy {
  return {
    strategyId: 'strategy_text',
    briefId: 'brief_text',
    platform: 'tiktok',
    mode: 'tiktok_content',
    objective: 'Bring lapsed players back for the new hero',
    targetAudience: 'lapsed Gold and Glory players',
    sellingPointFocus: 'New hero changes arena fights',
    hookApproach: 'benefit_first',
    hookOptions: ['One hero changes the arena'],
    recommendedHook: 'One hero changes the arena',
    cta: 'Try the new hero today',
    ctaType: 'direct_response',
    rationale: 'The hero payoff is the clearest return trigger.',
    angle: 'Hero comeback angle',
    tone: 'Premium, direct, and energetic',
    assetNeeds: [],
    riskNotes: ['Avoid guaranteed rewards'],
    knowledgePackIds: ['pack-market'],
    marketTruth: ['Returning players need fast proof.'],
    audienceTension: ['They need a reason to reinstall.'],
    toneRules: ['Keep every line concrete.'],
    forbiddenClaims: ['No guaranteed SSR'],
    visualCues: ['hero skill burst'],
    approvedAngles: ['Lead with the hero payoff'],
    hookCandidates: ['Watch the arena flip'],
  };
}

function createKnowledgeContext(): DerivedCampaignKnowledgeContext {
  return {
    selectedPackIds: ['pack-market'],
    marketTruth: ['Returning players need fast proof.'],
    audienceTension: ['They need a reason to reinstall.'],
    toneRules: ['Keep every line concrete.'],
    forbiddenClaims: ['No guaranteed SSR'],
    approvedAngles: ['Lead with the hero payoff'],
    hookCandidates: ['Watch the arena flip'],
    visualCues: ['hero skill burst'],
    rationaleNotes: ['Routed from campaign knowledge.'],
  };
}

test('buildTextProductionContext binds platform, angle, selling points, guardrails, and citations', () => {
  const context = buildTextProductionContext({
    platform: 'facebook',
    mission: 'Create campaign copy',
    brief: createBrief(),
    strategy: createStrategy(),
    knowledgeContext: createKnowledgeContext(),
    knowledgeReferences: [
      {
        citationId: 'cite_hero',
        packId: 'pack-market',
        packTitle: 'Market truth',
        section: 'approvedAngles',
        sourceField: 'facts',
        value: 'Lead with the hero payoff',
      },
    ],
  });

  assert.equal(context.platform, 'facebook');
  assert.equal(context.angle, 'Hero comeback angle');
  assert.equal(context.audience, 'lapsed Gold and Glory players');
  assert.equal(context.tone, 'Premium, direct, and energetic');
  assert.equal(context.sellingPoints.includes('New hero changes arena fights'), true);
  assert.deepEqual(context.forbiddenClaims, ['No guaranteed SSR']);
  assert.equal(context.knowledgeCitations?.some((item) => item.includes('Market truth')), true);
});

test('buildTextProductionPrompt keeps output reviewable and JSON-shaped', () => {
  const context = buildTextProductionContext({
    platform: 'facebook',
    mission: 'Create campaign copy',
    brief: createBrief(),
    strategy: createStrategy(),
    knowledgeContext: createKnowledgeContext(),
  });
  const prompt = buildTextProductionPrompt('caption', context);

  assert.match(prompt, /Facebook campaign caption drafts/);
  assert.match(prompt, /Forbidden claims: No guaranteed SSR/);
  assert.match(prompt, /Do NOT present compliance approval/);
  assert.match(prompt, /Return JSON array entries/);
});

test('buildTextOutputDraftContent emits CTA and platform post candidates from the same context', () => {
  const context = buildTextProductionContext({
    platform: 'facebook',
    mission: 'Create campaign copy',
    brief: createBrief(),
    strategy: createStrategy(),
    knowledgeContext: createKnowledgeContext(),
  });
  const cta = buildTextOutputDraftContent('cta', context);
  const platformPost = buildTextOutputDraftContent('platform_post', context);

  assert.equal(cta.variants.includes('Try the new hero today'), true);
  assert.match(platformPost.body, /Hero comeback angle/);
  assert.match(platformPost.body, /Try the new hero today/);
  assert.match(platformPost.body, /#GoldAndGlory/);
  assert.equal(platformPost.variants.length >= 2, true);
});
