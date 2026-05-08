import test from 'node:test';
import assert from 'node:assert/strict';
import type { DerivedCampaignKnowledgeContext } from '../src/api/campaignKnowledge.ts';
import {
  buildCampaignDistributionCreateInput,
  buildCampaignDistributionCreateInputFromProductionItem,
} from '../src/components/campaign/distributionPackage.ts';
import type {
  CampaignCreativeBrief,
  CampaignCreativeStrategy,
  CampaignCreativeVariantPack,
} from '../src/components/campaign/model.ts';

function createKnowledgeContext(): DerivedCampaignKnowledgeContext {
  return {
    selectedPackIds: ['gold-market', 'gold-persona'],
    marketTruth: ['Players need the reward payoff in the first 3 seconds.'],
    audienceTension: ['New players want proof before they install.'],
    toneRules: ['Keep the momentum premium and direct.'],
    forbiddenClaims: ['No guaranteed SSR.'],
    approvedAngles: ['Lead with the payoff before the CTA.'],
    hookCandidates: ['Open on the gold reward before the logo.'],
    visualCues: ['Gold burst UI and sharp hit flashes.'],
    rationaleNotes: ['Routed by Gold and Glory backend context.'],
  };
}

function createBrief(): CampaignCreativeBrief {
  return {
    briefId: 'brief_gold',
    platform: 'tiktok',
    mode: 'tiktok_ua',
    objective: 'Drive Gold and Glory installs',
    audience: 'mid-core RPG players',
    sellingPoints: ['Fast gold payoff', 'Low-friction onboarding'],
    cta: 'Download Gold and Glory now',
    referenceStyle: 'reward-first UA',
    region: 'Global',
    forbiddenClaims: ['No guaranteed SSR.'],
  };
}

function createStrategy(): CampaignCreativeStrategy {
  return {
    strategyId: 'strategy_gold',
    briefId: 'brief_gold',
    platform: 'tiktok',
    mode: 'tiktok_ua',
    objective: 'Drive Gold and Glory installs',
    targetAudience: 'mid-core RPG players',
    sellingPointFocus: 'Fast gold payoff',
    hookApproach: 'benefit_first',
    hookOptions: ['Open on the gold reward before the logo.'],
    recommendedHook: 'Open on the gold reward before the logo.',
    cta: 'Download Gold and Glory now',
    ctaType: 'direct_response',
    rationale: 'Show the payoff before asking for the install.',
    angle: 'Reward-first UA opener',
    tone: 'Premium and direct',
    assetNeeds: ['Reward splash frame', 'In-game gold burst clip'],
    riskNotes: ['Avoid fake urgency', 'No guaranteed SSR'],
    knowledgePackIds: ['gold-market', 'gold-persona'],
    marketTruth: ['Players need the reward payoff in the first 3 seconds.'],
    audienceTension: ['New players want proof before they install.'],
    toneRules: ['Keep the momentum premium and direct.'],
    forbiddenClaims: ['No guaranteed SSR.'],
    visualCues: ['Gold burst UI and sharp hit flashes.'],
    approvedAngles: ['Lead with the payoff before the CTA.'],
    hookCandidates: ['Open on the gold reward before the logo.'],
  };
}

function createVariantPack(): CampaignCreativeVariantPack {
  return {
    variantPackId: 'pack_gold',
    briefId: 'brief_gold',
    strategyId: 'strategy_gold',
    mode: 'tiktok_ua',
    summary: 'Three reward-first options for the handoff.',
    comparisonAxes: ['Hook', 'CTA'],
    selectedVariantId: 'variant_reward',
    variants: [
      {
        variantId: 'variant_reward',
        variantPackId: 'pack_gold',
        briefId: 'brief_gold',
        strategyId: 'strategy_gold',
        emphasis: 'hook_focus',
        title: 'Reward reveal',
        hook: 'Open on the gold reward before the logo.',
        openingBeat: 'Gold burst, then gameplay proof.',
        sellingPointFocus: 'Fast gold payoff',
        cta: 'Download Gold and Glory now',
        ctaType: 'direct_response',
        editingDirection: 'Cut hard in the first two seconds.',
        assetSuggestion: 'Use a real gold reward payout clip.',
        differenceSummary: 'Most aggressive reward-led opener.',
        isRecommended: true,
      },
    ],
  };
}

test('buildCampaignDistributionCreateInput preserves mission snapshot and routed knowledge while staying honest about missing assets', () => {
  const draft = buildCampaignDistributionCreateInput({
    mission: 'Create a TikTok UA clip that proves the new-player gold payoff fast.',
    brief: createBrief(),
    strategy: createStrategy(),
    variantPack: createVariantPack(),
    selectedVariantId: 'variant_reward',
    knowledgeContext: createKnowledgeContext(),
    routedKnowledgePackIds: ['gold-market', 'gold-persona'],
    generationSource: 'fallback',
    warnings: ['Used fallback brief generation because the LLM timed out.'],
  });

  assert.equal(draft.campaign.mission, 'Create a TikTok UA clip that proves the new-player gold payoff fast.');
  assert.equal(draft.gameId, 'gold_and_glory');
  assert.equal(draft.campaign.generationSource, 'fallback');
  assert.equal(draft.review.status, 'draft');
  assert.equal(draft.assetReadiness.state, 'needs_asset');
  assert.equal(draft.variant.id, 'variant_reward');
  assert.match(draft.copy.caption, /gold reward/i);
  assert.deepEqual(draft.knowledgeContext.packIds, ['gold-market', 'gold-persona']);
  assert.deepEqual(draft.knowledgeContext.marketTruth, [
    'Players need the reward payoff in the first 3 seconds.',
  ]);
  assert.deepEqual(draft.campaign.warnings, [
    'Used fallback brief generation because the LLM timed out.',
  ]);
});

test('buildCampaignDistributionCreateInput marks the package publishable when a verified asset is present', () => {
  const draft = buildCampaignDistributionCreateInput({
    mission: 'Push a ready-to-publish reward-first UA clip.',
    brief: createBrief(),
    strategy: createStrategy(),
    variantPack: createVariantPack(),
    selectedVariantId: 'variant_reward',
    knowledgeContext: createKnowledgeContext(),
    routedKnowledgePackIds: ['gold-market', 'gold-persona'],
    generationSource: 'llm',
    warnings: [],
    primaryAsset: {
      type: 'video',
      status: 'ready',
      path: 'output/tester/reward-cut.mp4',
      source: 'server_path',
    },
  });

  assert.equal(draft.assetReadiness.state, 'publishable');
  assert.equal(draft.assetReadiness.publishableAsset?.path, 'output/tester/reward-cut.mp4');
  assert.equal(draft.assetReadiness.publishableAsset?.source, 'server_path');
  assert.equal(draft.assets[0]?.status, 'ready');
});

test('buildCampaignDistributionCreateInputFromProductionItem maps produced output items to publishable packages', () => {
  const draft = buildCampaignDistributionCreateInputFromProductionItem({
    mission: 'Turn the produced hero clip into distribution prep.',
    brief: createBrief(),
    strategy: createStrategy(),
    variantPack: createVariantPack(),
    selectedVariantId: 'variant_reward',
    knowledgeContext: createKnowledgeContext(),
    routedKnowledgePackIds: ['gold-market', 'gold-persona'],
    generationSource: 'llm',
    warnings: [],
    productionItem: {
      id: 'item_tiktok_short_video',
      type: 'short_video',
      quantity: 1,
      platform: 'tiktok',
      title: 'Produced hero clip',
      contentBrief: 'Hero skill reveal with CTA.',
      requiredSourceAssetIds: ['src_gameplay'],
      productionCapability: 'supported_with_source_assets',
      status: 'produced',
      gobsCanProduce: true,
      outputAssetIds: ['asset_hero_clip'],
      distributionPackageIds: [],
    },
    outputAssets: [
      {
        assetId: 'asset_hero_clip',
        type: 'video',
        path: 'output/campaign/hero-clip.mp4',
        source: 'server_path',
      },
    ],
    sourceAssetRequirements: [],
  });

  assert.equal(draft.assetReadiness.state, 'publishable');
  assert.equal(draft.assetReadiness.publishableAsset?.path, 'output/campaign/hero-clip.mp4');
  assert.equal(draft.source.sourceId, 'item_tiktok_short_video');
  assert.deepEqual(draft.publishIntent.platforms, ['tiktok']);
});

test('buildCampaignDistributionCreateInputFromProductionItem keeps blocked output items non-publishable with source guidance', () => {
  const draft = buildCampaignDistributionCreateInputFromProductionItem({
    mission: 'Prepare a blocked hero clip honestly.',
    brief: createBrief(),
    strategy: createStrategy(),
    variantPack: createVariantPack(),
    selectedVariantId: 'variant_reward',
    knowledgeContext: createKnowledgeContext(),
    routedKnowledgePackIds: ['gold-market', 'gold-persona'],
    generationSource: 'llm',
    warnings: [],
    productionItem: {
      id: 'item_tiktok_short_video',
      type: 'short_video',
      quantity: 1,
      platform: 'tiktok',
      title: 'Blocked hero clip',
      contentBrief: 'Hero skill reveal with CTA.',
      requiredSourceAssetIds: ['src_gameplay'],
      productionCapability: 'supported_with_source_assets',
      status: 'blocked',
      gobsCanProduce: false,
      outputAssetIds: [],
      distributionPackageIds: [],
    },
    outputAssets: [],
    sourceAssetRequirements: [
      {
        id: 'src_gameplay',
        assetType: 'gameplay_recording',
        label: 'Gameplay recording',
        neededForProductionItemIds: ['item_tiktok_short_video'],
        status: 'missing',
        matchedAssetIds: [],
        guidance: 'Provide real gameplay footage before production.',
      },
    ],
  });

  assert.equal(draft.assetReadiness.state, 'needs_asset');
  assert.match(draft.assetReadiness.reason ?? '', /gameplay footage/i);
  assert.equal(draft.review.status, 'draft');
});

test('buildCampaignDistributionCreateInputFromProductionItem uses produced text outputs for package copy', () => {
  const draft = buildCampaignDistributionCreateInputFromProductionItem({
    mission: 'Prepare produced Facebook copy for distribution.',
    brief: createBrief(),
    strategy: createStrategy(),
    variantPack: createVariantPack(),
    selectedVariantId: 'variant_reward',
    knowledgeContext: createKnowledgeContext(),
    routedKnowledgePackIds: ['gold-market', 'gold-persona'],
    generationSource: 'llm',
    warnings: [],
    productionItem: {
      id: 'item_facebook_fb_post',
      type: 'fb_post',
      quantity: 1,
      platform: 'facebook',
      title: 'Facebook post pack',
      contentBrief: 'Post the reward reveal for returning players.',
      requiredSourceAssetIds: [],
      productionCapability: 'supported',
      status: 'produced',
      gobsCanProduce: true,
      outputAssetIds: ['copy_item_facebook_fb_post_1'],
      distributionPackageIds: [],
      producedOutputs: [
        {
          id: 'copy_item_facebook_fb_post_1',
          kind: 'post_copy',
          title: 'Reward reveal post',
          body: 'One run, one mistake, one reward reveal your squad will not forget. Download Gold and Glory now.',
          variants: [
            'One run, one mistake, one reward reveal your squad will not forget. Download Gold and Glory now.',
          ],
          platform: 'facebook',
          status: 'draft',
          createdAt: '2026-05-08T00:00:00.000Z',
        },
      ],
    },
    outputAssets: [],
    sourceAssetRequirements: [],
  });

  assert.equal(draft.copy.caption, 'One run, one mistake, one reward reveal your squad will not forget. Download Gold and Glory now.');
  assert.equal(draft.source.sourceId, 'item_facebook_fb_post');
  assert.deepEqual(draft.publishIntent.platforms, ['facebook']);
  assert.equal(draft.review.status, 'needs_review');
});
