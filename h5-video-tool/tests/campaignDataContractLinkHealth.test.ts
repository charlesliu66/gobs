import test from 'node:test';
import assert from 'node:assert/strict';

import {
  summarizeOutputPlanLinkHealth,
  summarizePackageLinkHealth,
} from '../src/components/campaign/dataContractLinkHealth.ts';
import type { CampaignDistributionPackage } from '../src/components/campaign/distributionPackage.ts';
import type { CampaignOutputPlan } from '../src/components/campaign/outputPlan.ts';

const plan: CampaignOutputPlan = {
  id: 'plan_gold',
  campaignId: 'campaign_gold',
  gameId: 'gold_and_glory',
  mission: 'Launch a reward campaign',
  briefId: 'brief_gold',
  status: 'ready_for_distribution',
  items: [
    {
      id: 'item_facebook_fb_post',
      type: 'fb_post',
      quantity: 1,
      platform: 'facebook',
      title: 'Facebook post',
      contentBrief: 'Reward copy',
      requiredSourceAssetIds: [],
      productionCapability: 'supported',
      status: 'produced',
      gobsCanProduce: true,
      outputAssetIds: ['copy_item_facebook_fb_post_1'],
      distributionPackageIds: ['pkg_gold'],
      producedOutputs: [
        {
          id: 'copy_item_facebook_fb_post_1',
          kind: 'post_copy',
          title: 'Reward post',
          body: 'Open on the reward.',
          variants: ['Open on the reward.'],
          platform: 'facebook',
          status: 'draft',
          campaignId: 'campaign_gold',
          briefId: 'brief_gold',
          parentOutputId: 'item_facebook_fb_post',
          createdAt: '2026-05-11T00:00:00.000Z',
        },
      ],
    },
  ],
  sourceAssetRequirements: [],
  capabilityGaps: [],
  createdAt: '2026-05-11T00:00:00.000Z',
  updatedAt: '2026-05-11T00:00:00.000Z',
};

function pkg(patch: Partial<CampaignDistributionPackage> = {}): CampaignDistributionPackage {
  return {
    id: 'pkg_gold',
    campaignId: 'campaign_gold',
    gameId: 'gold_and_glory',
    ownerId: 'owner',
    createdBy: 'owner',
    updatedBy: 'owner',
    createdAt: '2026-05-11T00:00:00.000Z',
    updatedAt: '2026-05-11T00:00:00.000Z',
    title: 'Reward package',
    source: {
      type: 'campaign_variant',
      sourceId: 'item_facebook_fb_post',
      outputPlanId: 'plan_gold',
      productionItemId: 'item_facebook_fb_post',
      outputIds: ['copy_item_facebook_fb_post_1'],
      sourceAssetIds: ['asset_key_art'],
      createdFromRoute: '/campaign-creative',
    },
    campaign: {
      mission: 'Launch a reward campaign',
      briefId: 'brief_gold',
      mode: 'tiktok_content',
      objective: 'Reward awareness',
      generationSource: 'llm',
      warnings: [],
    },
    variant: {
      id: 'variant_gold',
      angle: 'Reward reveal',
      hook: 'Open on the reward',
      audience: 'RPG players',
      cta: 'Play now',
      riskNotes: [],
    },
    assets: [
      {
        assetId: 'asset_key_art',
        type: 'image',
        status: 'ready',
        path: 'output/reward.png',
      },
    ],
    assetReadiness: {
      state: 'publishable',
      primaryAssetId: 'asset_key_art',
      publishableAsset: {
        type: 'image',
        source: 'server_path',
        path: 'output/reward.png',
      },
    },
    copy: {
      caption: 'Open on the reward.',
      hashtags: ['#GoldAndGlory'],
      language: 'en',
    },
    publishIntent: {
      platforms: ['facebook'],
      markets: ['US'],
    },
    knowledgeContext: {
      packIds: [],
      marketTruth: [],
      audienceTension: [],
      toneRules: [],
      forbiddenClaims: [],
      visualCues: [],
      approvedAngles: [],
      hookCandidates: [],
    },
    review: {
      status: 'needs_review',
      updatedAt: '2026-05-11T00:00:00.000Z',
    },
    ...patch,
  };
}

test('Output Plan link health reports healthy lineage for produced outputs', () => {
  const health = summarizeOutputPlanLinkHealth(plan);

  assert.equal(health.status, 'healthy');
  assert.equal(health.facts.some((fact) => fact === 'campaign:campaign_gold'), true);
  assert.equal(health.facts.some((fact) => fact === 'outputs:1'), true);
});

test('Output Plan link health reports broken and warning relationships', () => {
  const health = summarizeOutputPlanLinkHealth({
    ...plan,
    campaignId: undefined,
    items: plan.items.map((item) => ({
      ...item,
      producedOutputs: item.producedOutputs?.map((output) => ({
        ...output,
        campaignId: undefined,
        parentOutputId: undefined,
      })),
    })),
  });

  assert.equal(health.status, 'broken');
  assert.equal(health.issues.some((issue) => issue.includes('missing campaignId')), true);
  assert.equal(health.issues.some((issue) => issue.includes('parentOutputId')), true);
});

test('Package link health requires output IDs for production-linked packages', () => {
  assert.equal(summarizePackageLinkHealth(pkg()).status, 'healthy');

  const broken = summarizePackageLinkHealth(pkg({
    campaignId: undefined,
    source: {
      type: 'campaign_variant',
      sourceId: 'item_facebook_fb_post',
      productionItemId: 'item_facebook_fb_post',
      outputIds: [],
      sourceAssetIds: [],
    },
  }));

  assert.equal(broken.status, 'broken');
  assert.equal(broken.issues.some((issue) => issue.includes('missing campaignId')), true);
  assert.equal(broken.issues.some((issue) => issue.includes('no related outputIds')), true);
});
