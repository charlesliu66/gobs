import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildProductionItemCoverageMap,
  mapCapabilityToReadiness,
  summarizeCampaignOutputCoverage,
} from '../src/components/campaign/outputCoverageViewModel.ts';
import type { CampaignOutputPlan } from '../src/components/campaign/outputPlan.ts';

function createPlan(): CampaignOutputPlan {
  return {
    id: 'plan_coverage',
    gameId: 'gold_and_glory',
    mission: 'Test coverage summary',
    briefId: 'brief_coverage',
    status: 'draft',
    items: [
      {
        id: 'item_caption',
        type: 'caption_set',
        quantity: 1,
        platform: 'cross_platform',
        title: 'Caption set',
        contentBrief: 'Write caption variants',
        requiredSourceAssetIds: [],
        productionCapability: 'supported',
        status: 'ready_to_produce',
        gobsCanProduce: true,
        outputAssetIds: [],
        distributionPackageIds: [],
      },
      {
        id: 'item_banner',
        type: 'banner',
        quantity: 4,
        platform: 'cross_platform',
        title: 'Banner set',
        contentBrief: 'Create banner prompts',
        requiredSourceAssetIds: ['req_key_art'],
        productionCapability: 'supported_with_source_assets',
        status: 'ready_to_produce',
        gobsCanProduce: true,
        outputAssetIds: [],
        distributionPackageIds: [],
      },
      {
        id: 'item_video_brief',
        type: 'short_video',
        quantity: 2,
        platform: 'tiktok',
        title: 'Video brief',
        contentBrief: 'Need manual creative help',
        requiredSourceAssetIds: [],
        productionCapability: 'manual_recommended',
        status: 'planned',
        gobsCanProduce: false,
        outputAssetIds: [],
        distributionPackageIds: [],
      },
      {
        id: 'item_gameplay_video',
        type: 'tiktok_video',
        quantity: 3,
        platform: 'tiktok',
        title: 'Gameplay video',
        contentBrief: 'Needs gameplay source',
        requiredSourceAssetIds: ['req_gameplay'],
        productionCapability: 'supported_with_source_assets',
        status: 'blocked',
        gobsCanProduce: false,
        outputAssetIds: [],
        distributionPackageIds: [],
      },
      {
        id: 'item_future_asset',
        type: 'fb_post',
        quantity: 1,
        platform: 'facebook',
        title: 'Future format',
        contentBrief: 'No safe route yet',
        requiredSourceAssetIds: [],
        productionCapability: 'unsupported',
        status: 'planned',
        gobsCanProduce: false,
        outputAssetIds: [],
        distributionPackageIds: [],
      },
    ],
    sourceAssetRequirements: [
      {
        id: 'req_key_art',
        assetType: 'key_art',
        label: 'Key art',
        neededForProductionItemIds: ['item_banner'],
        status: 'available',
        matchedAssetIds: ['asset_key_art'],
        guidance: 'Pick key art',
      },
      {
        id: 'req_gameplay',
        assetType: 'gameplay_recording',
        label: 'Gameplay recording',
        neededForProductionItemIds: ['item_gameplay_video'],
        status: 'missing',
        matchedAssetIds: [],
        guidance: 'Upload gameplay footage',
      },
    ],
    capabilityGaps: [],
    createdAt: '2026-05-11T00:00:00.000Z',
    updatedAt: '2026-05-11T00:00:00.000Z',
  };
}

test('mapCapabilityToReadiness keeps readiness as a UI-only compatibility layer', () => {
  assert.equal(mapCapabilityToReadiness('supported', 'caption_set', true), 'auto_ready');
  assert.equal(mapCapabilityToReadiness('supported', 'banner', true), 'template_ready');
  assert.equal(mapCapabilityToReadiness('supported_with_source_assets', 'banner', true), 'template_ready');
  assert.equal(mapCapabilityToReadiness('supported_with_source_assets', 'banner', false), 'needs_source_asset');
  assert.equal(mapCapabilityToReadiness('manual_recommended', 'short_video', true), 'brief_ready');
  assert.equal(mapCapabilityToReadiness('unsupported', 'fb_post', true), 'unsupported');
});

test('summarizeCampaignOutputCoverage uses item quantity and excludes brief-ready items from true coverage', () => {
  const summary = summarizeCampaignOutputCoverage(createPlan());

  assert.equal(summary.total, 11);
  assert.equal(summary.autoReady, 1);
  assert.equal(summary.templateReady, 4);
  assert.equal(summary.briefReady, 2);
  assert.equal(summary.needsSourceAsset, 3);
  assert.equal(summary.unsupported, 1);
  assert.equal(summary.trueProductionCoverage, 5 / 11);
  assert.equal(summary.directProductionCoverage, 1 / 11);
  assert.equal(summary.templateProductionCoverage, 4 / 11);
  assert.equal(summary.assistiveCoverage, 2 / 11);
  assert.equal(summary.blockedRate, 4 / 11);
});

test('buildProductionItemCoverageMap lists missing requirements for blocked items', () => {
  const coverage = buildProductionItemCoverageMap(createPlan());

  assert.equal(coverage.item_gameplay_video.readiness, 'needs_source_asset');
  assert.deepEqual(coverage.item_gameplay_video.missingRequirementLabels, ['Gameplay recording']);
  assert.equal(coverage.item_video_brief.readiness, 'brief_ready');
  assert.equal(coverage.item_future_asset.readiness, 'unsupported');
});
