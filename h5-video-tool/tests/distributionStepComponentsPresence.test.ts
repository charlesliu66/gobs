import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const __dirname = dirname(fileURLToPath(import.meta.url));

test('TabDistribute composes the four operator step components', () => {
  const source = readFileSync(resolve(__dirname, '../src/pages/TabDistribute.tsx'), 'utf-8');
  const viewModelSource = readFileSync(resolve(__dirname, '../src/components/distribute/distributePageViewModel.ts'), 'utf-8');

  assert.match(source, /DistributeStepAsset/);
  assert.match(source, /DistributeStepCopy/);
  assert.match(source, /DistributeStepAccounts/);
  assert.match(source, /DistributeStepPublish/);
  assert.match(source, /DistributeStepReadinessNav/);
  assert.match(source, /DEFAULT_DISTRIBUTE_STEP_SECTION_IDS as DISTRIBUTE_STEP_SECTION_IDS/);
  assert.match(source, /DISTRIBUTE_STEP_SECTION_IDS/);
  assert.match(viewModelSource, /distribute-step-asset/);
  assert.match(viewModelSource, /distribute-step-copy/);
  assert.match(viewModelSource, /distribute-step-accounts/);
  assert.match(viewModelSource, /distribute-step-publish/);
  assert.match(viewModelSource, /distribute-step-history/);
  assert.match(source, /DistributeRecentContextPanel/);
  assert.match(source, /buildDistributeStepViewModel/);
  assert.match(source, /step: '01'/);
  assert.match(source, /step: '02'/);
  assert.match(source, /step: '03'/);
  assert.match(source, /step: '04'/);
});

test('distribution readiness nav renders step anchors and statuses', async () => {
  const navModule = await import('../src/components/distribute/DistributeStepReadinessNav.tsx');

  const html = renderToStaticMarkup(
    React.createElement(navModule.DistributeStepReadinessNav, {
      items: [
        {
          id: 'asset',
          href: '#distribute-step-asset',
          step: '01',
          title: 'Publish Asset',
          detail: 'Package video',
          status: 'ready',
        },
        {
          id: 'copy',
          href: '#distribute-step-copy',
          step: '02',
          title: 'Video & Copy',
          detail: 'No copy yet (can continue)',
          status: 'attention',
        },
        {
          id: 'accounts',
          href: '#distribute-step-accounts',
          step: '03',
          title: 'Target Accounts',
          detail: '0 accounts',
          status: 'blocked',
        },
        {
          id: 'publish',
          href: '#distribute-step-publish',
          step: '04',
          title: 'Publish',
          detail: 'Complete required steps first',
          status: 'blocked',
        },
      ],
      labels: {
        title: 'Distribution Progress',
        completedSummary: '{ready}/{total} ready',
        ready: 'Ready',
        attention: 'Can continue',
        blocked: 'Needs action',
      },
    }),
  );

  assert.match(html, /Distribution Progress/);
  assert.match(html, /1\/4 ready/);
  assert.match(html, /href="#distribute-step-asset"/);
  assert.match(html, /href="#distribute-step-copy"/);
  assert.match(html, /href="#distribute-step-accounts"/);
  assert.match(html, /href="#distribute-step-publish"/);
  assert.match(html, /Ready/);
  assert.match(html, /Can continue/);
  assert.match(html, /Needs action/);
});

test('distribution step components render the core operator landmarks', async () => {
  const [
    assetModule,
    copyModule,
    accountsModule,
    publishModule,
  ] = await Promise.all([
    import('../src/components/distribute/DistributeStepAsset.tsx'),
    import('../src/components/distribute/DistributeStepCopy.tsx'),
    import('../src/components/distribute/DistributeStepAccounts.tsx'),
    import('../src/components/distribute/DistributeStepPublish.tsx'),
  ]);

  const assetHtml = renderToStaticMarkup(
    React.createElement(assetModule.DistributeStepAsset, {
      assets: [{
        id: 'asset-1',
        source: 'package',
        title: 'Package video',
        subtitle: 'Campaign draft',
        prompt: 'gold prompt',
        videoUrl: '/demo.mp4',
        taskId: 'task-1',
      }],
      selectedAsset: {
        id: 'asset-1',
        source: 'package',
        title: 'Package video',
        videoUrl: '/demo.mp4',
      },
      selectedAssetId: 'asset-1',
      loading: false,
      error: null,
      emptyAction: React.createElement('a', { href: '/studio' }, 'Go Studio'),
      labels: {
        step: '01',
        title: 'Choose asset',
        subtitle: 'Pick a package or quick asset',
        loading: 'Loading',
        noVideo: 'No video',
        selected: 'Selected',
        previewTitle: 'Preview',
        previewUnavailable: 'No preview',
        promptSeed: 'Prompt seed',
      },
      getAssetSourceLabel: () => 'Package',
      onSelectAsset: () => undefined,
    }),
  );

  const copyHtml = renderToStaticMarkup(
    React.createElement(copyModule.DistributeStepCopy, {
      hasSelectedAsset: true,
      captionHintValue: 'soft launch',
      captionLanguages: ['DEFAULT', 'EN'],
      activeCaptionLanguage: 'DEFAULT',
      captionGenLoading: false,
      captionGenError: null,
      hasAnyCopy: true,
      canGenerateCaption: true,
      pendingPackageDraft: null,
      draftKeys: ['default'],
      defaultDraftKey: 'default',
      drafts: { default: { caption: 'Launch copy', hashtags: '#gold' } },
      activeDraftKey: 'default',
      accountCounts: { default: 1 },
      noVideoAction: React.createElement('a', { href: '/studio' }, 'Go Studio'),
      statusIndicator: null,
      labels: {
        step: '02',
        title: 'Copy',
        noVideo: 'No video',
        captionHintInput: 'Caption hint',
        captionHintPlaceholder: 'Add hint',
        captionByPlatform: 'Copy by platform',
        captionHint: 'Tune copy per platform',
        generatingCaption: 'Generating',
        polishCaption: 'Polish',
        generateCaption: 'Generate',
        captionLanguageLabel: (language: string) => language,
        campaignContext: {
          title: 'Campaign context',
          subtitle: 'Inherited',
          objective: 'Objective',
          audience: 'Audience',
          cta: 'CTA',
          market: 'Market',
          tone: 'Tone',
          sellingPoints: 'Selling points',
          avoidTerms: 'Avoid',
          empty: 'None',
        },
        platformCopy: {
          defaultDraft: 'Default',
          activeDraft: 'Active',
          accountCount: '{count} account',
          noAccounts: 'No accounts',
          caption: 'Caption',
          captionPlaceholder: 'Caption...',
          hashtags: 'Hashtags',
          hashtagsPlaceholder: '#tag',
          inheritedFallback: 'Using default',
        },
      },
      onCaptionHintChange: () => undefined,
      onLanguageChange: () => undefined,
      onGenerateCaption: () => undefined,
      onSetActiveDraft: () => undefined,
      onUpdateDraft: () => undefined,
    }),
  );

  const accountsHtml = renderToStaticMarkup(
    React.createElement(accountsModule.DistributeStepAccounts, {
      accounts: [{ id: 'acc-1', username: 'gold-th', platform: 'TikTok', region: 'TH', remark: 'group:TH' }],
      accountsForPermission: [{ id: 'acc-1', username: 'gold-th', platform: 'TikTok', region: 'TH', remark: 'group:TH' }],
      filteredAccounts: [{ id: 'acc-1', username: 'gold-th', platform: 'TikTok', region: 'TH', remark: 'group:TH' }],
      selectedIds: new Set(['acc-1']),
      loading: false,
      error: null,
      regions: ['TH'],
      platforms: ['TikTok'],
      filterRegion: '',
      filterPlatform: '',
      labels: {
        step: '03',
        title: 'Accounts',
        loadingAccounts: 'Loading accounts',
        noAccountsTitle: 'No accounts',
        noAccountsHintLine1: 'Connect GeeLark',
        noAccountsHintLine2: 'Then retry',
        learnGeelark: 'Learn GeeLark',
        noPermissionTitle: 'No permission',
        noPermissionHint: 'Ask admin',
        selectedCountLabel: 'Selected',
        selectVisible: 'Select visible',
        clearSelection: 'Clear',
        region: 'Region',
        platform: 'Platform',
        all: 'All',
        noMatchedAccounts: 'No matched accounts',
        profileLink: 'Profile',
        accountGroups: {
          title: 'Account groups',
          empty: 'No groups',
          config: 'Config',
          custom: 'Custom',
          selected: 'Selected',
          save: 'Save',
          savePlaceholder: 'Group name',
          cancel: 'Cancel',
          delete: 'Delete',
          selectedCount: '{count} selected',
        },
      },
      onSelectVisible: () => undefined,
      onClearSelection: () => undefined,
      onFilterRegionChange: () => undefined,
      onFilterPlatformChange: () => undefined,
      onApplyAccountGroup: () => undefined,
      onToggleAccount: () => undefined,
    }),
  );

  const publishHtml = renderToStaticMarkup(
    React.createElement(publishModule.DistributeStepPublish, {
      preflightItems: [
        { key: 'asset', label: 'Asset', ready: true, value: 'Package video' },
        { key: 'accounts', label: 'Accounts', ready: true, value: '1 selected' },
        { key: 'copy', label: 'Copy', ready: true, value: 'Ready' },
      ],
      needShareLink: true,
      markAI: false,
      pushing: false,
      publishDisabled: false,
      pushError: null,
      pushErrorGuidance: null,
      showGroupedHint: true,
      latestBatch: {
        createdAt: 1710000000000,
        phase: 'tracking',
        planName: 'Launch',
        items: [{
          accountId: 'acc-1',
          username: 'gold-th',
          platform: 'TikTok',
          statusText: 'submitted',
          taskId: 'task-1',
          detailLoading: false,
        }],
      },
      batchRefreshing: false,
      formatTime: () => '2026-05-09 10:00',
      labels: {
        step: '04',
        title: 'Confirm & publish',
        subtitle: 'Review before publish',
        ready: 'Ready',
        missing: 'Missing',
        publishOptions: 'Publish options',
        needShareLink: 'Need share link',
        markAI: 'Mark AI',
        publish: 'Publish',
        publishing: 'Publishing',
        groupedByPlatform: 'Grouped by platform',
        latestBatch: {
          title: 'Latest batch',
          meta: 'Created',
          summaryTotal: 'Total',
          summarySuccess: 'Success',
          summaryFailed: 'Failed',
          summaryPending: 'Pending',
          statusSubmitting: 'Submitting',
          statusSubmitFailed: 'Submit failed',
          statusSubmitted: 'Submitted',
          hintSubmitting: 'Submitting',
          hintRunning: 'Running',
          hintDone: 'Done',
          nextActions: 'Next',
          reviewCurrentBatch: 'Review current batch',
          viewHistory: 'View history',
          refresh: 'Refresh',
          refreshing: 'Refreshing',
          close: 'Close',
          unknown: 'Unknown',
          profileLink: 'Profile',
          reportPlanName: 'Plan',
          taskId: 'Task',
          logs: 'Logs',
          shareLink: 'Share link',
        },
      },
      onNeedShareLinkChange: () => undefined,
      onMarkAIChange: () => undefined,
      onPublish: () => undefined,
      onRefreshBatch: () => undefined,
      onClearBatch: () => undefined,
      onReviewCurrentBatch: () => undefined,
      onViewHistory: () => undefined,
    }),
  );

  assert.match(assetHtml, /Choose asset/);
  assert.match(assetHtml, /Package video/);
  assert.match(copyHtml, /Copy by platform/);
  assert.match(copyHtml, /Launch copy/);
  assert.match(accountsHtml, /Account groups/);
  assert.match(accountsHtml, /gold-th/);
  assert.match(publishHtml, /Confirm &amp; publish/);
  assert.match(publishHtml, /Latest batch/);
  assert.match(publishHtml, /View history/);
  assert.match(publishHtml, /Submitted/);
});
