import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applySourceAssetSelectionOverrides,
  BANNER_OUTPUT_SPECS,
  buildAvailableSourceAssetsFromLibraryAssets,
  buildCampaignOutputPlan,
  inferSourceAssetTypesForLibraryAsset,
  markProducedOutputQuality,
  produceSupportedCampaignOutputs,
  sourceAssetFilterType,
  updateSourceAssetRequirementMatches,
} from '../src/components/campaign/outputPlan.ts';
import type {
  CampaignCreativeBrief,
  CampaignCreativeStrategy,
} from '../src/components/campaign/model.ts';
import type { DerivedCampaignKnowledgeContext } from '../src/api/campaignKnowledge.ts';

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

function createKnowledgeContext(): DerivedCampaignKnowledgeContext {
  return {
    selectedPackIds: ['gold-market'],
    marketTruth: ['Players react to visible power spikes.'],
    audienceTension: ['They need proof the hero feels strong.'],
    toneRules: ['Keep claims concrete.'],
    forbiddenClaims: ['No guaranteed rewards'],
    approvedAngles: ['lead with gameplay proof'],
    hookCandidates: ['watch the skill land'],
    visualCues: ['hero skill burst'],
    rationaleNotes: [],
    citations: [
      {
        citationId: 'kref_aa_1',
        packId: 'gold-market',
        packTitle: 'Market',
        section: 'approvedAngles',
        sourceField: 'facts',
        value: 'lead with gameplay proof',
      },
      {
        citationId: 'kref_hc_1',
        packId: 'gold-market',
        packTitle: 'Market',
        section: 'hookCandidates',
        sourceField: 'hookSeeds',
        value: 'watch the skill land',
      },
      {
        citationId: 'kref_mt_1',
        packId: 'gold-market',
        packTitle: 'Market',
        section: 'marketTruth',
        sourceField: 'facts',
        value: 'Players react to visible power spikes.',
      },
    ],
  };
}

test('buildCampaignOutputPlan creates visible deliverables with source asset requirements', () => {
  const plan = buildCampaignOutputPlan({
    campaignId: 'campaign_hero_launch',
    mission: 'Promote the new hero launch',
    brief: createBrief(),
    strategy: createStrategy(),
    selectedVariantId: 'variant_hero',
  });

  assert.equal(plan.items.some((item) => item.type === 'short_video'), true);
  assert.equal(plan.campaignId, 'campaign_hero_launch');
  assert.equal(plan.items.some((item) => item.type === 'fb_post'), true);
  assert.equal(plan.items.some((item) => item.type === 'caption_set'), true);
  assert.equal(plan.sourceAssetRequirements.some((asset) => asset.assetType === 'character_art'), true);
  assert.equal(plan.capabilityGaps.some((gap) => gap.gapType === 'source_asset_missing'), true);
});

test('produced outputs inherit campaign, brief, and parent output lineage', () => {
  const plan = buildCampaignOutputPlan({
    campaignId: 'campaign_hero_launch',
    mission: 'Promote the new hero launch',
    brief: createBrief(),
    strategy: createStrategy(),
    requestedPlatforms: ['facebook'],
    availableSourceAssets: [
      { assetId: 'asset_key_art', assetType: 'key_art' },
      { assetId: 'asset_logo', assetType: 'game_logo' },
      { assetId: 'asset_character', assetType: 'character_art' },
    ],
  });

  const produced = produceSupportedCampaignOutputs({
    plan,
    mission: 'Promote the new hero launch',
    brief: createBrief(),
    strategy: createStrategy(),
  });
  const producedOutput = produced.items
    .flatMap((item) => item.producedOutputs?.map((output) => ({ item, output })) ?? [])
    .find(({ output }) => output.kind === 'post_copy' || output.kind === 'banner_prompt');

  assert.ok(producedOutput);
  assert.equal(producedOutput.output.campaignId, 'campaign_hero_launch');
  assert.equal(producedOutput.output.briefId, 'brief_hero');
  assert.equal(producedOutput.output.parentOutputId, producedOutput.item.id);
});

test('buildCampaignOutputPlan marks outputs with knowledge references', () => {
  const plan = buildCampaignOutputPlan({
    mission: 'Promote the new hero launch',
    brief: createBrief(),
    strategy: createStrategy(),
    selectedVariantId: 'variant_hero',
    knowledgeContext: createKnowledgeContext(),
  });

  const caption = plan.items.find((item) => item.type === 'caption_set');
  assert.equal((caption?.knowledgeReferences ?? []).length >= 3, true);
  assert.equal(caption?.knowledgeReferences?.[0]?.citationId, 'kref_aa_1');

  const availablePlan = applySourceAssetSelectionOverrides(plan, {
    src_gameplay_recording: ['asset_gameplay'],
    src_game_logo: ['asset_logo'],
    src_character_art: ['asset_character'],
    src_key_art: ['asset_key_art'],
  });
  const produced = produceSupportedCampaignOutputs({
    plan: availablePlan,
    mission: 'Promote the new hero launch',
    brief: createBrief(),
    strategy: createStrategy(),
    knowledgeContext: createKnowledgeContext(),
  });
  const producedCaption = produced.items.find((item) => item.type === 'caption_set')?.producedOutputs?.[0];
  assert.equal(producedCaption?.knowledgeReferences?.some((reference) => reference.citationId === 'kref_aa_1'), true);
});

test('buildCampaignOutputPlan includes Banner specs and resolves Run 1 Asset Library categories', () => {
  const plan = buildCampaignOutputPlan({
    mission: 'Create static launch banner ads for Facebook and story placements',
    brief: createBrief({
      platform: 'facebook',
      objective: 'Launch static banner ads for the new hero',
      referenceStyle: 'premium campaign banner',
    }),
    strategy: createStrategy({
      assetNeeds: ['finished banner key art', 'game logo'],
      visualCues: ['hero key visual', 'campaign banner'],
    }),
    requestedPlatforms: ['facebook'],
    availableSourceAssets: buildAvailableSourceAssetsFromLibraryAssets([
      {
        id: 'asset_finished_banner',
        filename: 'hero-launch-visual.png',
        mimetype: 'image/png',
        team_category: 'finished_banner',
      },
      {
        id: 'asset_logo',
        filename: 'gold-glory-logo.png',
        mimetype: 'image/png',
        team_category: 'logo',
      },
    ]),
  });

  const bannerItem = plan.items.find((item) => item.type === 'banner');
  assert.ok(bannerItem);
  assert.deepEqual(bannerItem.bannerDetails?.specs, BANNER_OUTPUT_SPECS.map((spec) => spec.id));
  assert.equal(plan.sourceAssetRequirements.some((asset) => asset.assetType === 'key_art' && asset.status === 'needs_selection'), true);
  assert.equal(plan.sourceAssetRequirements.some((asset) => asset.assetType === 'game_logo' && asset.status === 'needs_selection'), true);

  const selectedPlan = applySourceAssetSelectionOverrides(plan, {
    src_key_art: ['asset_finished_banner'],
    src_game_logo: ['asset_logo'],
  });
  const selectedBanner = selectedPlan.items.find((item) => item.type === 'banner');
  assert.equal(selectedBanner?.status, 'ready_to_produce');
  assert.equal(selectedBanner?.bannerDetails?.selectedMainVisualAssetId, 'asset_finished_banner');
  assert.equal(selectedBanner?.bannerDetails?.selectedLogoAssetId, 'asset_logo');
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

test('buildAvailableSourceAssetsFromLibraryAssets maps Asset Library records into source asset candidates', () => {
  const mapped = buildAvailableSourceAssetsFromLibraryAssets([
    {
      id: 'asset_logo',
      filename: 'gold-and-glory-logo.png',
      mimetype: 'image/png',
      ai_category: 'UI素材',
      ai_description: 'approved game logo',
      tags: [{ key: 'purpose', value: 'logo' }],
    },
    {
      id: 'asset_gameplay',
      filename: 'battle-gameplay-recording.mp4',
      mimetype: 'video/mp4',
      ai_category: '视频片段',
      ai_description: 'combat gameplay recording',
      tags: [{ key: 'platform', value: 'TikTok' }],
    },
  ]);

  assert.equal(mapped.some((asset) => asset.assetId === 'asset_logo' && asset.assetType === 'game_logo'), true);
  assert.equal(mapped.some((asset) => asset.assetId === 'asset_gameplay' && asset.assetType === 'gameplay_recording'), true);
  assert.equal(mapped.every((asset) => asset.matchStrength === 'candidate'), true);
  assert.deepEqual(inferSourceAssetTypesForLibraryAsset({ id: 'asset_banner', filename: 'upload.png', mimetype: 'image/png', team_category: 'finished_banner' }), ['key_art', 'event_banner']);
  assert.deepEqual(inferSourceAssetTypesForLibraryAsset({ id: 'asset_reward', filename: 'reward-chest-icon.png', mimetype: 'image/png' }), ['reward_icon']);
  assert.equal(sourceAssetFilterType('gameplay_recording'), 'video');
  assert.equal(sourceAssetFilterType('game_logo'), 'image');
});

test('Asset Library candidates require selection before source-blocked items are unblocked', () => {
  const plan = buildCampaignOutputPlan({
    mission: 'Produce the hero launch with candidate game assets',
    brief: createBrief(),
    strategy: createStrategy(),
    availableSourceAssets: buildAvailableSourceAssetsFromLibraryAssets([
      { id: 'asset_gameplay', filename: 'battle-gameplay-recording.mp4', mimetype: 'video/mp4' },
      { id: 'asset_logo', filename: 'gold-and-glory-logo.png', mimetype: 'image/png' },
      { id: 'asset_character', filename: 'hero-character-art.png', mimetype: 'image/png' },
    ]),
  });

  assert.equal(plan.sourceAssetRequirements.some((asset) => asset.status === 'needs_selection'), true);
  assert.equal(plan.items.some((item) => item.requiredSourceAssetIds.length > 0 && item.status === 'blocked'), true);

  const selectedPlan = applySourceAssetSelectionOverrides(plan, {
    src_gameplay_recording: ['asset_gameplay'],
    src_game_logo: ['asset_logo'],
    src_character_art: ['asset_character'],
  });

  assert.equal(selectedPlan.sourceAssetRequirements.every((asset) => asset.status === 'available'), true);
  assert.equal(selectedPlan.items.find((item) => item.type === 'short_video')?.status, 'ready_to_produce');
  assert.equal(selectedPlan.items.find((item) => item.type === 'caption_set')?.status, 'ready_to_produce');
  assert.equal(selectedPlan.capabilityGaps.some((gap) => gap.gapType === 'source_asset_missing'), false);
});

test('updateSourceAssetRequirementMatches only unblocks items affected by that requirement', () => {
  const plan = buildCampaignOutputPlan({
    mission: 'Produce a UA launch with missing source assets',
    brief: createBrief({ mode: 'tiktok_ua' }),
    strategy: createStrategy({ mode: 'tiktok_ua' }),
  });

  const withLogo = updateSourceAssetRequirementMatches(plan, 'src_game_logo', ['asset_logo']);

  assert.equal(withLogo.sourceAssetRequirements.find((asset) => asset.id === 'src_game_logo')?.status, 'available');
  assert.equal(withLogo.items.find((item) => item.type === 'caption_set')?.status, 'ready_to_produce');
  assert.equal(withLogo.items.find((item) => item.type === 'tiktok_video')?.status, 'blocked');
  assert.equal(withLogo.capabilityGaps.some((gap) => gap.id === 'gap_missing_game_logo'), false);
  assert.equal(withLogo.capabilityGaps.some((gap) => gap.id === 'gap_missing_gameplay_recording'), true);
});

test('markProducedOutputQuality updates a produced Banner output with shared quality states', () => {
  const plan = buildCampaignOutputPlan({
    mission: 'Create banner ads with available assets',
    brief: createBrief({ platform: 'facebook' }),
    strategy: createStrategy({ assetNeeds: ['banner key art', 'game logo'] }),
    requestedPlatforms: ['facebook'],
    availableSourceAssets: [
      { assetId: 'asset_key_art', assetType: 'key_art' },
      { assetId: 'asset_logo', assetType: 'game_logo' },
    ],
  });

  const banner = plan.items.find((item) => item.type === 'banner');
  assert.ok(banner);
  const producedPlan = {
    ...plan,
    items: plan.items.map((item) =>
      item.id === banner.id
        ? {
            ...item,
            status: 'produced' as const,
            producedOutputs: [
              {
                id: 'banner_prompt_item_banner_1',
                kind: 'banner_prompt' as const,
                title: 'Banner prompt placeholder',
                body: 'Create static campaign banner variants.',
                variants: ['Square 1:1'],
                platform: 'cross_platform',
                status: 'draft' as const,
                createdAt: '2026-05-10T00:00:00.000Z',
              },
            ],
          }
        : item,
    ),
  };

  const marked = markProducedOutputQuality(producedPlan, banner.id, 'banner_prompt_item_banner_1', 'needs_fix');
  const markedOutput = marked.items
    .find((item) => item.id === banner.id)
    ?.producedOutputs?.[0];
  assert.equal(markedOutput?.qualityStatus, 'needs_fix');
  assert.equal(markedOutput?.status, 'needs_review');
});
