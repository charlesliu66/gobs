import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildCaptionGenerationSeed,
  buildCopyCardKeys,
  buildDistributeStepViewModel,
  buildDraftsFromPlatformResult,
  buildPublishFailureGuidance,
  buildPlatformAccountCounts,
  groupAccountsByPlatform,
  resolveDraftForPlatform,
} from '../src/components/distribute/distributePageViewModel.ts';
import type { GeelarkAccount } from '../src/api/geelark.ts';

const accounts: GeelarkAccount[] = [
  { id: 'acc_tiktok_1', username: 'brand_tt', platform: 'TikTok' },
  { id: 'acc_tiktok_2', username: 'brand_tt_2', platform: 'TikTok' },
  { id: 'acc_fb_1', username: 'brand_fb', platform: 'Facebook' },
];

test('distribution page view model builds stable copy card keys and account counts', () => {
  const keys = buildCopyCardKeys(['tiktok'], ['facebook'], 'default');
  const counts = buildPlatformAccountCounts(accounts, keys, 'default');

  assert.deepEqual(keys, ['tiktok', 'facebook']);
  assert.equal(counts.tiktok, 2);
  assert.equal(counts.facebook, 1);
});

test('distribution page view model groups publish accounts and resolves draft fallback', () => {
  const grouped = groupAccountsByPlatform(accounts, 'default');
  const drafts = buildDraftsFromPlatformResult({
    TikTok: { caption: 'TikTok caption', hashtags: '#tt' },
  }, 'default', { caption: '', hashtags: '' });

  assert.equal(grouped.get('tiktok')?.length, 2);
  assert.equal(grouped.get('facebook')?.length, 1);
  assert.deepEqual(resolveDraftForPlatform('tiktok', drafts, 'default', { caption: '', hashtags: '' }), {
    caption: 'TikTok caption',
    hashtags: '#tt',
  });
  assert.deepEqual(resolveDraftForPlatform('facebook', drafts, 'default', { caption: '', hashtags: '' }), {
    caption: '',
    hashtags: '',
  });
});

test('distribution page view model builds publish preflight and readiness without page state', () => {
  const model = buildDistributeStepViewModel({
    selectedAsset: { title: 'launch-cut.mp4' },
    selectedAccountCount: 3,
    hasAnyCopy: false,
    pushing: false,
    pushError: null,
    labels: {
      none: 'None',
      assetTitle: 'Asset',
      videoAndCaption: 'Copy',
      targetAccounts: 'Accounts',
      preflightAsset: 'Publish asset',
      preflightAccounts: 'Target accounts',
      preflightCopy: 'Copy',
      selectedCountValue: '{count} selected',
      preflightReady: 'Ready',
      preflightOptional: 'Optional',
      stepReadinessCopyAttention: 'Add copy when needed',
      stepReadinessPublish: 'Publish',
      stepReadinessPublishError: 'Fix publish error',
      stepReadinessPublishBlocked: 'Select asset and accounts',
      stepReadinessPublishReady: 'Ready to publish',
    },
  });

  assert.equal(model.publishDisabled, false);
  assert.equal(model.preflightItems[0]?.value, 'launch-cut.mp4');
  assert.equal(model.preflightItems[1]?.value, '3 selected');
  assert.equal(model.readinessItems.map((item) => item.status).join(','), 'ready,attention,ready,ready');
});

test('caption generation seed keeps operator hints separated from prompt seed', () => {
  assert.equal(
    buildCaptionGenerationSeed('Hero reveal', 'avoid spoilers'),
    'Hero reveal\n\nOperator hint: avoid spoilers',
  );
});

test('publish failure guidance separates missing input, auth, provider, and generic next steps', () => {
  const labels = {
    noAsset: 'choose asset',
    noAccount: 'choose account',
    auth: 'check auth',
    provider: 'refresh provider batch',
    generic: 'check setup',
  };

  assert.equal(buildPublishFailureGuidance({
    message: 'Cannot publish',
    hasSelectedAsset: false,
    selectedAccountCount: 1,
    labels,
  }), 'choose asset');
  assert.equal(buildPublishFailureGuidance({
    message: 'Cannot publish',
    hasSelectedAsset: true,
    selectedAccountCount: 0,
    labels,
  }), 'choose account');
  assert.equal(buildPublishFailureGuidance({
    message: '401 token expired',
    hasSelectedAsset: true,
    selectedAccountCount: 1,
    labels,
  }), 'check auth');
  assert.equal(buildPublishFailureGuidance({
    message: 'GeeLark API timeout',
    hasSelectedAsset: true,
    selectedAccountCount: 1,
    labels,
  }), 'refresh provider batch');
  assert.equal(buildPublishFailureGuidance({
    message: 'caption rejected',
    hasSelectedAsset: true,
    selectedAccountCount: 1,
    labels,
  }), 'check setup');
});
