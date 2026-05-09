import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildStudioGeneratedPackageUpdate,
  sanitizeStudioGeneratedAssetId,
} from '../src/components/campaign/studioPackagePatch.ts';
import type { CampaignDistributionPackage } from '../src/components/campaign/distributionPackage.ts';
import type { CampaignStudioHandoffState } from '../src/components/campaign/studioBridge.ts';

function createPackage(): CampaignDistributionPackage {
  return {
    id: 'pkg_reward',
    gameId: 'gold_and_glory',
    ownerId: 'tester',
    createdBy: 'tester',
    createdAt: '2026-05-09T00:00:00.000Z',
    updatedAt: '2026-05-09T00:00:00.000Z',
    title: 'Reward-first UA package',
    source: {
      type: 'campaign_variant',
      sourceId: 'item_tiktok_short_video',
      createdFromRoute: '/campaign-creative',
    },
    campaign: {
      mission: 'Launch reward-first UA creative.',
      briefId: 'brief_gold',
      mode: 'tiktok_ua',
      objective: 'Drive installs',
      generationSource: 'llm',
      warnings: [],
    },
    variant: {
      id: 'variant_reward',
      title: 'Reward reveal',
      angle: 'Reward-first UA opener',
      hook: 'Open on the gold reward before the logo.',
      audience: 'Mid-core RPG players',
      cta: 'Download now',
      riskNotes: [],
    },
    assets: [
      {
        type: 'caption_only',
        status: 'missing',
      },
    ],
    assetReadiness: {
      state: 'needs_asset',
      reason: 'Package needs a real render.',
    },
    copy: {
      headline: 'Reward reveal',
      caption: 'Open on the gold reward before the logo.',
      hashtags: ['#GoldAndGlory'],
      language: 'en',
    },
    publishIntent: {
      platforms: ['tiktok'],
      markets: ['Global'],
    },
    knowledgeContext: {
      packIds: ['gold-market'],
      marketTruth: [],
      audienceTension: [],
      toneRules: [],
      forbiddenClaims: [],
      visualCues: [],
      approvedAngles: [],
      hookCandidates: [],
    },
    review: {
      status: 'draft',
      notes: 'Keep human review.',
      updatedAt: '2026-05-09T00:00:00.000Z',
    },
  };
}

const handoff: CampaignStudioHandoffState = {
  fromCampaignOutput: true,
  templateId: 'custom',
  outputPlanId: 'plan_1',
  campaignId: 'campaign_gold',
  gameId: 'gold_and_glory',
  briefId: 'brief_gold',
  productionItemId: 'item_tiktok_short_video',
  productionItemType: 'tiktok_video',
  distributionPackageId: 'pkg_reward',
  sourceAssetRequirementIds: ['src_key_art'],
  title: 'Reward clip',
  mission: 'Launch reward-first UA creative.',
  prompt: 'Campaign mission: Launch reward-first UA creative.',
  sourceAssets: [],
};

test('sanitizeStudioGeneratedAssetId keeps provider task ids backend-safe', () => {
  assert.equal(sanitizeStudioGeneratedAssetId('dreamina/task:abc 123'), 'dreamina_task_abc_123');
});

test('buildStudioGeneratedPackageUpdate marks linked package publishable with server path', () => {
  const patch = buildStudioGeneratedPackageUpdate({
    pkg: createPackage(),
    handoff,
    result: {
      taskId: 'dreamina/task:abc 123',
      videoPath: 'output/tester/reward-cut.mp4',
    },
  });

  assert.ok(patch);
  assert.equal(patch.assetReadiness?.state, 'publishable');
  assert.equal(patch.assetReadiness?.primaryAssetId, 'dreamina_task_abc_123');
  assert.equal(patch.assetReadiness?.publishableAsset?.source, 'server_path');
  assert.equal(patch.assetReadiness?.publishableAsset?.path, 'output/tester/reward-cut.mp4');
  assert.equal(patch.assets?.[0]?.assetId, 'dreamina_task_abc_123');
  assert.equal(patch.assets?.[0]?.status, 'ready');
  assert.equal(patch.review?.status, 'needs_review');
  assert.equal(patch.review?.notes, 'Keep human review.');
});

test('buildStudioGeneratedPackageUpdate uses verified url when no server path exists', () => {
  const patch = buildStudioGeneratedPackageUpdate({
    pkg: createPackage(),
    handoff,
    result: {
      taskId: 'kling-remote-1',
      videoUrl: 'https://cdn.example.com/kling.mp4',
    },
  });

  assert.equal(patch?.assetReadiness?.publishableAsset?.source, 'verified_url');
  assert.equal(patch?.assetReadiness?.publishableAsset?.url, 'https://cdn.example.com/kling.mp4');
});

test('buildStudioGeneratedPackageUpdate refuses mismatched package links', () => {
  const patch = buildStudioGeneratedPackageUpdate({
    pkg: { ...createPackage(), id: 'pkg_other' },
    handoff,
    result: {
      taskId: 'dreamina-123',
      videoPath: 'output/tester/reward-cut.mp4',
    },
  });

  assert.equal(patch, null);
});
