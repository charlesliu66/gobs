import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCampaignOutputPlan } from '../src/components/campaign/outputPlan.ts';
import type {
  CampaignCreativeBrief,
  CampaignCreativeStrategy,
} from '../src/components/campaign/model.ts';

function createBrief(patch: Partial<CampaignCreativeBrief> = {}): CampaignCreativeBrief {
  return {
    briefId: 'brief_hero',
    platform: 'tiktok',
    mode: 'tiktok_content',
    objective: 'Build awareness for the new hero',
    audience: 'Gold and Glory players',
    sellingPoints: ['New hero joins the arena', 'High-impact skill reveal'],
    cta: 'Try the new hero today',
    referenceStyle: 'premium game launch',
    region: 'Global',
    forbiddenClaims: ['No guaranteed rewards'],
    ...patch,
  };
}

function createStrategy(patch: Partial<CampaignCreativeStrategy> = {}): CampaignCreativeStrategy {
  return {
    strategyId: 'strategy_hero',
    briefId: 'brief_hero',
    platform: 'tiktok',
    mode: 'tiktok_content',
    objective: 'Build awareness for the new hero',
    targetAudience: 'Gold and Glory players',
    sellingPointFocus: 'High-impact skill reveal',
    hookApproach: 'benefit_first',
    hookOptions: ['Open with the new hero skill'],
    recommendedHook: 'Open with the new hero skill',
    cta: 'Try the new hero today',
    ctaType: 'direct_response',
    rationale: 'Show output, not planning.',
    angle: 'New hero launch',
    tone: 'Premium and urgent',
    assetNeeds: ['hero character art', 'skill gameplay clip'],
    riskNotes: ['Avoid unsupported reward claims'],
    knowledgePackIds: ['gold-market'],
    marketTruth: ['Players react to visible power spikes.'],
    audienceTension: ['They need proof the hero feels strong.'],
    toneRules: ['Keep claims concrete.'],
    forbiddenClaims: ['No guaranteed rewards'],
    visualCues: ['hero skill burst'],
    approvedAngles: ['lead with gameplay proof'],
    hookCandidates: ['watch the skill land'],
    ...patch,
  };
}

test('buildCampaignOutputPlan creates visible deliverables with source asset requirements', () => {
  const plan = buildCampaignOutputPlan({
    mission: 'Promote the new hero launch',
    brief: createBrief(),
    strategy: createStrategy(),
    selectedVariantId: 'variant_hero',
  });

  assert.equal(plan.items.some((item) => item.type === 'short_video'), true);
  assert.equal(plan.items.some((item) => item.type === 'fb_post'), true);
  assert.equal(plan.items.some((item) => item.type === 'caption_set'), true);
  assert.equal(plan.sourceAssetRequirements.some((asset) => asset.assetType === 'character_art'), true);
  assert.equal(plan.capabilityGaps.some((gap) => gap.gapType === 'source_asset_missing'), true);
});

test('buildCampaignOutputPlan falls back without strategy and asks for review', () => {
  const plan = buildCampaignOutputPlan({
    mission: 'Launch a lightweight campaign from a reviewed brief',
    brief: createBrief({
      objective: 'Drive awareness from the reviewed brief only',
      sellingPoints: ['Simple launch message'],
    }),
    strategy: null,
  });

  assert.equal(plan.items.some((item) => item.type === 'caption_set'), true);
  assert.equal(plan.items.some((item) => item.humanAction?.type === 'review_risk'), true);
  assert.equal(plan.capabilityGaps.some((gap) => /review/i.test(gap.title)), false);
});

test('buildCampaignOutputPlan supports multi-platform TikTok and Facebook requests', () => {
  const plan = buildCampaignOutputPlan({
    mission: 'Run one hero launch across TikTok and Facebook',
    brief: createBrief(),
    strategy: createStrategy(),
    requestedPlatforms: ['tiktok', 'facebook'],
  });

  assert.equal(plan.items.some((item) => item.platform === 'tiktok' && item.type === 'short_video'), true);
  assert.equal(plan.items.some((item) => item.platform === 'facebook' && item.type === 'fb_post'), true);
});

test('buildCampaignOutputPlan uses output defaults when assetNeeds is empty', () => {
  const plan = buildCampaignOutputPlan({
    mission: 'Create a content campaign without explicit asset asks',
    brief: createBrief(),
    strategy: createStrategy({ assetNeeds: [], visualCues: [] }),
  });

  assert.equal(plan.sourceAssetRequirements.some((asset) => asset.assetType === 'game_logo'), true);
  assert.equal(plan.sourceAssetRequirements.some((asset) => /generic|unknown|asset/i.test(asset.assetType)), false);
});

test('buildCampaignOutputPlan clears source-asset gaps when all requirements are available', () => {
  const plan = buildCampaignOutputPlan({
    mission: 'Produce the hero launch with matched game assets',
    brief: createBrief(),
    strategy: createStrategy(),
    availableSourceAssets: [
      { assetId: 'asset_gameplay', assetType: 'gameplay_recording' },
      { assetId: 'asset_logo', assetType: 'game_logo' },
      { assetId: 'asset_character', assetType: 'character_art' },
      { assetId: 'asset_key_art', assetType: 'key_art' },
    ],
  });

  assert.equal(plan.sourceAssetRequirements.every((asset) => asset.status === 'available'), true);
  assert.equal(plan.items.filter((item) => item.requiredSourceAssetIds.length > 0).every((item) => item.status === 'ready_to_produce'), true);
  assert.equal(plan.capabilityGaps.some((gap) => gap.gapType === 'source_asset_missing'), false);
});
