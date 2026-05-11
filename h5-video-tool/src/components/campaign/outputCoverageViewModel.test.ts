import test from 'node:test';
import assert from 'node:assert/strict';
import {
  readinessForProductionItem,
  summarizeCampaignOutputCoverage,
} from './outputCoverageViewModel.ts';
import type { ProductionItem } from './outputPlan.ts';

function item(patch: Partial<ProductionItem>): ProductionItem {
  return {
    id: 'item',
    type: 'caption_set',
    quantity: 1,
    platform: 'cross_platform',
    title: 'Item',
    contentBrief: 'Brief',
    requiredSourceAssetIds: [],
    productionCapability: 'supported',
    status: 'ready_to_produce',
    gobsCanProduce: true,
    outputAssetIds: [],
    distributionPackageIds: [],
    producedOutputs: [],
    ...patch,
  };
}

test('readinessForProductionItem maps prompt-only Banner to template_ready instead of auto_ready', () => {
  const banner = item({
    type: 'banner',
    quantity: 4,
    requiredSourceAssetIds: ['src_key_art', 'src_logo'],
    productionCapability: 'supported_with_source_assets',
  });

  assert.equal(readinessForProductionItem(banner), 'template_ready');
});

test('summarizeCampaignOutputCoverage separates direct text coverage from template coverage', () => {
  const summary = summarizeCampaignOutputCoverage([
    item({ type: 'caption_set', quantity: 1 }),
    item({
      type: 'banner',
      quantity: 4,
      requiredSourceAssetIds: ['src_key_art', 'src_logo'],
      productionCapability: 'supported_with_source_assets',
    }),
    item({
      type: 'short_video',
      quantity: 2,
      requiredSourceAssetIds: ['src_gameplay'],
      productionCapability: 'supported_with_source_assets',
      status: 'blocked',
      gobsCanProduce: false,
    }),
  ]);

  assert.equal(summary.total, 7);
  assert.equal(summary.directReady, 1);
  assert.equal(summary.templateReady, 4);
  assert.equal(summary.trueReady, 5);
  assert.equal(summary.needsSourceAsset, 2);
});
