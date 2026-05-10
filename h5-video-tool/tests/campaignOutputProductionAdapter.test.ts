import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCampaignOutputPlan,
  markProducedOutputQuality,
  produceSupportedCampaignOutputs,
} from '../src/components/campaign/outputPlan.ts';
import type {
  CampaignCreativeBrief,
  CampaignCreativeStrategy,
} from '../src/components/campaign/model.ts';

function createBrief(patch: Partial<CampaignCreativeBrief> = {}): CampaignCreativeBrief {
  return {
    briefId: 'brief_production',
    platform: 'tiktok',
    mode: 'tiktok_content',
    objective: 'Launch the new hero to returning players',
    audience: 'Gold and Glory fans who follow hero updates',
    sellingPoints: ['New hero enters the arena', 'Skill combo is easy to understand'],
    cta: 'Try the new hero today',
    referenceStyle: 'premium game social launch',
    region: 'Global',
    forbiddenClaims: ['No guaranteed rewards'],
    ...patch,
  };
}

function createStrategy(patch: Partial<CampaignCreativeStrategy> = {}): CampaignCreativeStrategy {
  return {
    strategyId: 'strategy_production',
    briefId: 'brief_production',
    platform: 'tiktok',
    mode: 'tiktok_content',
    objective: 'Launch the new hero to returning players',
    targetAudience: 'Gold and Glory fans who follow hero updates',
    sellingPointFocus: 'The new hero skill combo',
    hookApproach: 'benefit_first',
    hookOptions: ['One skill combo changes the whole fight'],
    recommendedHook: 'One skill combo changes the whole fight',
    cta: 'Try the new hero today',
    ctaType: 'direct_response',
    rationale: 'Lead with the visible payoff.',
    angle: 'New hero launch for returning squads',
    tone: 'Premium and energetic',
    assetNeeds: ['hero character art', 'skill gameplay clip'],
    riskNotes: ['Avoid unsupported reward claims'],
    knowledgePackIds: ['gold-market'],
    marketTruth: ['Returning players respond to visible combat payoff.'],
    audienceTension: ['They need proof the hero feels different.'],
    toneRules: ['Keep the copy concrete.'],
    forbiddenClaims: ['No guaranteed rewards'],
    visualCues: ['hero skill burst'],
    approvedAngles: ['lead with gameplay proof'],
    hookCandidates: ['watch the skill land'],
    ...patch,
  };
}

test('produceSupportedCampaignOutputs produces supported copy and post items with visible draft content', () => {
  const draft = buildCampaignOutputPlan({
    mission: 'Promote the new hero launch',
    brief: createBrief(),
    strategy: createStrategy(),
    requestedPlatforms: ['tiktok', 'facebook'],
    availableSourceAssets: [
      { assetId: 'asset_gameplay', assetType: 'gameplay_recording' },
      { assetId: 'asset_logo', assetType: 'game_logo' },
      { assetId: 'asset_character', assetType: 'character_art' },
    ],
  });

  const produced = produceSupportedCampaignOutputs({
    plan: draft,
    mission: 'Promote the new hero launch',
    brief: createBrief(),
    strategy: createStrategy(),
    selectedVariantTitle: 'Hero skill reveal',
  });

  const producedTextItems = produced.items.filter((item) =>
    ['caption_set', 'headline_set', 'hashtag_set', 'fb_post'].includes(item.type),
  );

  assert.ok(producedTextItems.length >= 4);
  assert.equal(produced.status, 'ready_for_distribution');
  assert.equal(producedTextItems.every((item) => item.status === 'produced'), true);
  assert.equal(producedTextItems.every((item) => (item.producedOutputs ?? []).length > 0), true);
  assert.match(producedTextItems[0].producedOutputs?.[0]?.body ?? '', /hero/i);
  assert.equal(
    producedTextItems.every((item) => item.outputAssetIds.every((assetId) =>
      item.producedOutputs?.some((output) => output.id === assetId),
    )),
    true,
  );
});

test('produceSupportedCampaignOutputs leaves blocked visual and video outputs untouched', () => {
  const draft = buildCampaignOutputPlan({
    mission: 'Promote the new hero launch with a skill video and banner',
    brief: createBrief(),
    strategy: createStrategy({
      assetNeeds: ['hero character art', 'skill gameplay clip', 'event banner'],
      visualCues: ['hero skill burst', 'campaign banner'],
    }),
    requestedPlatforms: ['tiktok', 'facebook'],
  });

  const produced = produceSupportedCampaignOutputs({
    plan: draft,
    mission: 'Promote the new hero launch with a skill video and banner',
    brief: createBrief(),
    strategy: createStrategy(),
  });

  const blockedVisualItems = produced.items.filter((item) =>
    ['short_video', 'tiktok_video', 'banner'].includes(item.type),
  );

  assert.ok(blockedVisualItems.length > 0);
  assert.equal(blockedVisualItems.every((item) => item.status !== 'produced'), true);
  assert.equal(blockedVisualItems.every((item) => (item.producedOutputs ?? []).length === 0), true);
  assert.equal(
    blockedVisualItems.some((item) => item.humanAction?.type === 'provide_source_asset' || item.humanAction?.type === 'external_production'),
    true,
  );
});

test('produceSupportedCampaignOutputs produces Banner prompt placeholders when source assets are ready', () => {
  const draft = buildCampaignOutputPlan({
    mission: 'Create static banner ads for the new hero launch',
    brief: createBrief({
      platform: 'facebook',
      objective: 'Launch static banner ads for the new hero',
      referenceStyle: 'premium static banner',
    }),
    strategy: createStrategy({
      assetNeeds: ['banner key art', 'game logo'],
      visualCues: ['hero key visual', 'campaign banner'],
    }),
    requestedPlatforms: ['facebook'],
    availableSourceAssets: [
      { assetId: 'asset_key_art', assetType: 'key_art' },
      { assetId: 'asset_logo', assetType: 'game_logo' },
    ],
  });

  const produced = produceSupportedCampaignOutputs({
    plan: draft,
    mission: 'Create static banner ads for the new hero launch',
    brief: createBrief({ platform: 'facebook' }),
    strategy: createStrategy(),
    selectedVariantTitle: 'Hero key visual launch',
  });

  const bannerItem = produced.items.find((item) => item.type === 'banner');
  assert.ok(bannerItem);
  const bannerOutput = bannerItem.producedOutputs?.find((output) => output.kind === 'banner_prompt');

  assert.equal(bannerItem.status, 'produced');
  assert.ok(bannerOutput);
  assert.match(bannerOutput.body, /Formats:/);
  assert.match(bannerOutput.body, /asset_key_art/);
  assert.deepEqual(bannerOutput.sourceAssetIds, ['asset_key_art', 'asset_logo']);
  assert.equal(bannerItem.outputAssetIds.includes(bannerOutput.id), true);

  const marked = markProducedOutputQuality(produced, bannerItem.id, bannerOutput.id, 'usable');
  const markedBannerOutput = marked.items
    .find((item) => item.id === bannerItem.id)
    ?.producedOutputs?.find((output) => output.id === bannerOutput.id);
  assert.equal(markedBannerOutput?.qualityStatus, 'usable');
  assert.equal(markedBannerOutput?.status, 'approved');
});

test('produceSupportedCampaignOutputs is idempotent for already produced items', () => {
  const draft = buildCampaignOutputPlan({
    mission: 'Produce copy once',
    brief: createBrief(),
    strategy: createStrategy(),
    requestedPlatforms: ['facebook'],
  });

  const first = produceSupportedCampaignOutputs({
    plan: draft,
    mission: 'Produce copy once',
    brief: createBrief(),
    strategy: createStrategy(),
  });
  const second = produceSupportedCampaignOutputs({
    plan: first,
    mission: 'Produce copy once',
    brief: createBrief(),
    strategy: createStrategy(),
  });

  const firstCaption = first.items.find((item) => item.type === 'caption_set');
  const secondCaption = second.items.find((item) => item.type === 'caption_set');

  assert.deepEqual(secondCaption?.producedOutputs, firstCaption?.producedOutputs);
  assert.deepEqual(secondCaption?.outputAssetIds, firstCaption?.outputAssetIds);
});
