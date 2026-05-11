import test from 'node:test';
import assert from 'node:assert/strict';
import type { CampaignOutputPlan, ProductionItem } from '../outputPlan.ts';
import {
  appendNextVersionDraftToPlan,
  buildCreativeQualityPanelSummary,
  buildNextVersionDraft,
  canCreateNextVersionDraft,
  creativeFeedbackTagsForOutput,
  normalizeCreativeFeedbackTags,
} from './creativeFeedbackActions.ts';

function createBannerItem(): ProductionItem {
  return {
    id: 'item_banner',
    type: 'banner',
    quantity: 4,
    platform: 'cross_platform',
    title: 'Campaign banner set',
    contentBrief: 'Static banner prompt placeholder.',
    requiredSourceAssetIds: ['asset_key_art', 'asset_logo'],
    productionCapability: 'supported_with_source_assets',
    status: 'produced',
    gobsCanProduce: true,
    outputAssetIds: ['banner_prompt_item_banner_1'],
    distributionPackageIds: [],
    producedOutputs: [
      {
        id: 'banner_prompt_item_banner_1',
        kind: 'banner_prompt',
        title: 'Banner prompt placeholder',
        body: 'Create static campaign banner variants.',
        variants: ['Square 1:1'],
        platform: 'cross_platform',
        status: 'needs_review',
        qualityStatus: 'needs_fix',
        bannerSpecIds: ['square_1_1', 'story_9_16'],
        sourceAssetIds: ['asset_key_art'],
        createdAt: '2026-05-10T00:00:00.000Z',
      },
    ],
  };
}

function createCopyItem(): ProductionItem {
  return {
    id: 'item_copy',
    type: 'fb_post',
    quantity: 1,
    platform: 'facebook',
    title: 'Facebook post pack',
    contentBrief: 'Reward reveal copy.',
    requiredSourceAssetIds: [],
    productionCapability: 'supported',
    status: 'produced',
    gobsCanProduce: true,
    outputAssetIds: ['post_copy_item_copy_1'],
    distributionPackageIds: [],
    producedOutputs: [
      {
        id: 'post_copy_item_copy_1',
        kind: 'post_copy',
        title: 'Facebook post 1',
        body: 'Start the season with a stronger squad.',
        variants: ['Start the season with a stronger squad.'],
        platform: 'facebook',
        status: 'draft',
        createdAt: '2026-05-10T00:00:00.000Z',
      },
    ],
  };
}

function createPlan(items: ProductionItem[] = [createBannerItem()]): CampaignOutputPlan {
  return {
    id: 'output_plan_quality_loop',
    campaignId: 'campaign_quality_loop',
    gameId: 'gold_and_glory',
    ownerId: 'owner',
    createdBy: 'owner',
    updatedBy: 'owner',
    mission: 'Create campaign outputs and revise weak first versions',
    briefId: 'brief_quality_loop',
    status: 'ready_for_distribution',
    items,
    sourceAssetRequirements: [],
    capabilityGaps: [],
    createdAt: '2026-05-10T00:00:00.000Z',
    updatedAt: '2026-05-10T00:00:00.000Z',
  };
}

test('buildNextVersionDraft preserves parent output, campaign, brief, feedback, and source assets', () => {
  const plan = createPlan();
  const item = plan.items[0];
  const parent = item.producedOutputs?.[0];
  assert.ok(parent);

  const draft = buildNextVersionDraft(plan, item, parent, {
    feedbackTagIds: ['selling_point_not_prominent', 'copy_not_strong_enough'],
    feedbackNote: 'Make the reward payoff visible before the CTA.',
    reviewerId: 'campaign_operator',
    createdAt: '2026-05-11T01:00:00.000Z',
  });

  assert.equal(draft.parentOutputId, parent.id);
  assert.equal(draft.campaignId, 'campaign_quality_loop');
  assert.equal(draft.briefId, 'brief_quality_loop');
  assert.deepEqual(draft.feedbackTagIds, ['selling_point_not_prominent', 'copy_not_strong_enough']);
  assert.deepEqual(draft.feedbackIssueTags, ['unclear_selling_point', 'copy_not_strong_enough']);
  assert.equal(draft.feedbackNote, 'Make the reward payoff visible before the CTA.');
  assert.equal(draft.reviewerId, 'campaign_operator');
  assert.deepEqual(draft.sourceAssetIds, ['asset_key_art', 'asset_logo']);
  assert.deepEqual(draft.bannerSpecIds, ['square_1_1', 'story_9_16']);
  assert.match(draft.body, /Parent output: banner_prompt_item_banner_1/);
  assert.match(draft.body, /Make the core selling point visible/);
});

test('appendNextVersionDraftToPlan creates unique child drafts without mutating the parent output', () => {
  const plan = createPlan();
  const first = appendNextVersionDraftToPlan(plan, 'item_banner', 'banner_prompt_item_banner_1', {
    feedbackTagIds: ['selling_point_not_prominent'],
    createdAt: '2026-05-11T01:00:00.000Z',
  });
  const second = appendNextVersionDraftToPlan(first, 'item_banner', 'banner_prompt_item_banner_1', {
    feedbackTagIds: ['copy_not_strong_enough'],
    createdAt: '2026-05-11T01:01:00.000Z',
  });
  const outputs = second.items[0].producedOutputs ?? [];

  assert.equal(outputs.length, 3);
  assert.equal(outputs[0].id, 'banner_prompt_item_banner_1');
  assert.equal(outputs[1].parentOutputId, 'banner_prompt_item_banner_1');
  assert.equal(outputs[2].parentOutputId, 'banner_prompt_item_banner_1');
  assert.notEqual(outputs[1].id, outputs[2].id);
  assert.deepEqual(second.items[0].outputAssetIds, [
    'banner_prompt_item_banner_1',
    outputs[1].id,
    outputs[2].id,
  ]);
});

test('copy outputs can create next-version rewrite drafts while video-like outputs stay unsupported', () => {
  const plan = createPlan([createCopyItem()]);
  const item = plan.items[0];
  const output = item.producedOutputs?.[0];
  assert.ok(output);

  assert.equal(canCreateNextVersionDraft(output), true);
  const draft = buildNextVersionDraft(plan, item, output, {
    feedbackTagIds: ['better_for_facebook', 'copy_not_strong_enough'],
    createdAt: '2026-05-11T01:00:00.000Z',
  });

  assert.equal(draft.kind, 'post_copy');
  assert.equal(draft.platform, 'facebook');
  assert.match(draft.body, /Create the next version of this campaign copy draft/);
  assert.match(draft.body, /Facebook feed readability/);

  assert.equal(canCreateNextVersionDraft({
    ...output,
    id: 'video_task_output',
    kind: 'video_task' as never,
    body: 'Video task placeholder.',
  }), false);
});

test('quality panel helpers expose fixed tags and static human-signal recommendations', () => {
  const plan = createPlan();
  const item = plan.items[0];
  const output = item.producedOutputs?.[0];
  assert.ok(output);

  const definitions = creativeFeedbackTagsForOutput(item, output);
  assert.ok(definitions.some((definition) => definition.id === 'selling_point_not_prominent'));
  assert.ok(definitions.some((definition) => definition.id === 'copy_not_strong_enough'));
  assert.equal(definitions.some((definition) => definition.id === 'reference_motion_mismatch'), false);

  const summary = buildCreativeQualityPanelSummary(item, {
    ...output,
    feedbackTagIds: ['selling_point_not_prominent'],
  });
  assert.match(summary.sourceSummary, /human marks/);
  assert.match(summary.issueSummary, /Selling point not prominent/);
  assert.match(summary.recommendation, /next-version draft/);

  assert.deepEqual(
    normalizeCreativeFeedbackTags([
      'selling_point_not_prominent',
      'unsupported_tag',
      'selling_point_not_prominent',
    ] as never),
    ['selling_point_not_prominent'],
  );
});
