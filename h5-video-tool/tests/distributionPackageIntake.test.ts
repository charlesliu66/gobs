import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDistributeDraftFromPackage,
} from '../src/components/distribution/packageToDistributeDraft.ts';

function createPackage(state: 'publishable' | 'needs_asset') {
  return {
    id: 'pkg_reward',
    campaignId: 'campaign_reward',
    title: 'Reward-first UA package',
    source: {
      type: 'campaign_variant',
      sourceId: 'item_tiktok_video',
      outputPlanId: 'plan_reward',
      productionItemId: 'item_tiktok_video',
      outputIds: ['asset_reward'],
      sourceAssetIds: ['asset_gameplay'],
      createdFromRoute: '/campaign-creative',
    },
    campaign: {
      mission: 'Turn the reward-first variant into a distribution draft.',
      briefId: 'brief_reward',
      objective: 'Drive installs',
      warnings: [],
    },
    variant: {
      id: 'variant_reward',
      title: 'Reward reveal',
      angle: 'Reward-first UA opener',
      hook: 'Open on the gold reward before the logo.',
      cta: 'Download Gold and Glory now',
      riskNotes: ['No guaranteed SSR.'],
    },
    assets: [
      {
        assetId: 'asset_reward',
        type: 'video',
        status: state === 'publishable' ? 'ready' : 'missing',
        path: state === 'publishable' ? 'output/tester/reward-cut.mp4' : undefined,
      },
    ],
    assetReadiness: {
      state,
      publishableAsset: state === 'publishable'
        ? {
            type: 'video',
            source: 'server_path',
            path: 'output/tester/reward-cut.mp4',
          }
        : undefined,
      reason: state === 'publishable' ? undefined : 'Variant still needs a real render.',
    },
    copy: {
      headline: 'Reward reveal',
      caption: 'Open on the gold reward before the logo.',
      hashtags: ['#GoldAndGlory', '#MobileRPG'],
      language: 'en',
    },
    publishIntent: {
      platforms: ['tiktok'],
      markets: ['Global'],
    },
    knowledgeContext: {
      packIds: ['gold-market', 'gold-persona'],
      marketTruth: ['Players need the reward payoff in the first 3 seconds.'],
      audienceTension: ['New players want proof before they install.'],
      toneRules: ['Keep the momentum premium and direct.'],
      forbiddenClaims: ['No guaranteed SSR.'],
      visualCues: ['Gold burst UI and sharp hit flashes.'],
      approvedAngles: ['Lead with the payoff before the CTA.'],
      hookCandidates: ['Open on the gold reward before the logo.'],
    },
    review: {
      status: 'draft',
      updatedAt: '2026-05-07T12:00:00.000Z',
    },
  };
}

test('buildDistributeDraftFromPackage prefills distribution fields without auto-selecting accounts', () => {
  const intake = buildDistributeDraftFromPackage(createPackage('publishable'));

  assert.equal(intake.selectedAsset?.videoPath, 'output/tester/reward-cut.mp4');
  assert.deepEqual(intake.selectedPlatformKeys, ['tiktok']);
  assert.deepEqual(intake.platformDrafts, {
    tiktok: {
      caption: 'Open on the gold reward before the logo.',
      hashtags: '#GoldAndGlory #MobileRPG',
    },
  });
  assert.equal(intake.captionContext.campaignObjective, 'Drive installs');
  assert.equal(intake.captionContext.targetAudience, 'New players want proof before they install.');
  assert.equal(intake.captionContext.callToAction, 'Download Gold and Glory now');
  assert.equal(intake.captionContext.targetMarket, 'Global');
  assert.equal(intake.captionContext.avoidTerms, 'No guaranteed SSR.');
  assert.equal(intake.lineage.campaignId, 'campaign_reward');
  assert.equal(intake.lineage.briefId, 'brief_reward');
  assert.equal(intake.lineage.outputPlanId, 'plan_reward');
  assert.deepEqual(intake.lineage.outputIds, ['asset_reward']);
  assert.equal(intake.publishSafety.canPublishDirectly, true);
  assert.equal(intake.publishSafety.keepAccountsExplicit, true);
});

test('buildDistributeDraftFromPackage keeps publish blocked and surfaces next actions when the package needs an asset', () => {
  const intake = buildDistributeDraftFromPackage(createPackage('needs_asset'));

  assert.equal(intake.selectedAsset, null);
  assert.equal(intake.publishSafety.canPublishDirectly, false);
  assert.deepEqual(intake.publishSafety.nextActionKeys, [
    'asset_library',
    'quick_film',
    'editor_fine_tune',
  ]);
  assert.match(intake.publishSafety.reason ?? '', /needs a real render/i);
});
