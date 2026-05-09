import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCampaignStudioHandoff,
  canOpenProductionItemInStudio,
} from '../src/components/campaign/studioBridge.ts';
import type { CampaignOutputPlan, ProductionItem } from '../src/components/campaign/outputPlan.ts';

function productionItem(patch: Partial<ProductionItem> = {}): ProductionItem {
  return {
    id: 'item_tiktok_short_video',
    type: 'short_video',
    quantity: 1,
    platform: 'tiktok',
    title: 'Boss showcase short',
    contentBrief: 'Open with a boss reveal and end on download CTA.',
    requiredSourceAssetIds: ['src_character_art', 'src_key_art'],
    productionCapability: 'supported_with_source_assets',
    status: 'ready_to_produce',
    gobsCanProduce: true,
    outputAssetIds: [],
    distributionPackageIds: [],
    ...patch,
  };
}

const plan: CampaignOutputPlan = {
  id: 'plan_1',
  gameId: 'gold-and-glory',
  mission: 'Launch a TikTok campaign for Gold and Glory returning players.',
  briefId: 'brief_1',
  status: 'needs_confirmation',
  items: [],
  sourceAssetRequirements: [
    {
      id: 'src_character_art',
      assetType: 'character_art',
      label: 'Character art',
      neededForProductionItemIds: ['item_tiktok_short_video'],
      status: 'available',
      matchedAssetIds: ['asset_char_1'],
      guidance: 'Use approved hero art.',
    },
    {
      id: 'src_key_art',
      assetType: 'key_art',
      label: 'Key art',
      neededForProductionItemIds: ['item_tiktok_short_video'],
      status: 'available',
      matchedAssetIds: ['asset_key_1'],
      guidance: 'Use campaign key art.',
    },
  ],
  capabilityGaps: [],
  createdAt: '2026-05-09T00:00:00Z',
  updatedAt: '2026-05-09T00:00:00Z',
};

test('Campaign Studio bridge maps video production items to Studio handoff state', () => {
  const item = productionItem();
  const handoff = buildCampaignStudioHandoff({ item, plan });

  assert.equal(canOpenProductionItemInStudio(item), true);
  assert.equal(handoff?.templateId, 'boss-showcase');
  assert.equal(handoff?.productionItemId, item.id);
  assert.match(handoff?.prompt ?? '', /Campaign mission/);
  assert.deepEqual(
    handoff?.sourceAssets.map((asset) => [asset.id, asset.semanticRole]),
    [
      ['asset_char_1', 'role'],
      ['asset_key_1', 'scene'],
    ],
  );
});

test('Campaign Studio bridge excludes text-only production items', () => {
  const item = productionItem({
    id: 'item_caption_set',
    type: 'caption_set',
    title: 'Caption set',
    contentBrief: 'Write captions.',
    requiredSourceAssetIds: [],
  });

  assert.equal(canOpenProductionItemInStudio(item), false);
  assert.equal(buildCampaignStudioHandoff({ item, plan }), null);
});
