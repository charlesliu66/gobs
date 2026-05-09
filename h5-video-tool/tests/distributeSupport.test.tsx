import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

test('mergeDistributionAssets dedupes equivalent assets and keeps the richer metadata', async () => {
  const support = await import('../src/components/distribute/distributeSupport.ts');

  const buildDistributionAssetFromServerOutput = (support as Record<string, unknown>).buildDistributionAssetFromServerOutput as
    | ((item: unknown, options?: unknown) => Record<string, unknown>)
    | undefined;
  const mergeDistributionAssets = (support as Record<string, unknown>).mergeDistributionAssets as
    | ((lists: Array<Array<Record<string, unknown>> | null | undefined>) => Array<Record<string, unknown>>)
    | undefined;

  assert.equal(typeof buildDistributionAssetFromServerOutput, 'function');
  assert.equal(typeof mergeDistributionAssets, 'function');

  const serverAsset = buildDistributionAssetFromServerOutput?.({
    path: 'output/admin/demo.mp4',
    mtimeMs: 1710000000000,
    size: 1024,
    source: 'dreamina',
    promptSummary: 'Server prompt summary',
  }, {
    buildPlaybackUrl: (path: string) => `/api/video/file?path=${encodeURIComponent(path)}`,
  });

  const merged = mergeDistributionAssets?.([
    [
      {
        id: 'create-flow:demo',
        source: 'create-flow',
        title: 'Fresh studio render',
        createdAt: 1710000001000,
        videoPath: 'output/admin/demo.mp4',
        videoUrl: '/preview/demo.mp4',
        previewUrl: '/preview/demo.mp4',
      },
    ],
    [
      {
        id: 'history:task-1',
        source: 'history',
        title: 'Saved publish asset',
        createdAt: 1710000000500,
        taskId: 'task-1',
        prompt: 'Local history prompt',
        videoPath: 'output/admin/demo.mp4',
        previewUrl: '/api/video/file?path=output/admin/demo.mp4',
      },
    ],
    serverAsset ? [serverAsset] : [],
  ]);

  assert.equal(merged?.length, 1);
  assert.equal(merged?.[0]?.source, 'create-flow');
  assert.equal(merged?.[0]?.title, 'Fresh studio render');
  assert.equal(merged?.[0]?.prompt, 'Local history prompt');
  assert.equal(merged?.[0]?.videoUrl, '/preview/demo.mp4');
});

test('normalizeTaskHistoryItems reads tolerant GeeLark history payloads and preserves publish clues', async () => {
  const support = await import('../src/components/distribute/distributeSupport.ts');

  const normalizeTaskHistoryItems = (support as Record<string, unknown>).normalizeTaskHistoryItems as
    | ((items: unknown[]) => Array<Record<string, unknown>>)
    | undefined;
  const summarizeTaskHistory = (support as Record<string, unknown>).summarizeTaskHistory as
    | ((items: Array<Record<string, unknown>>) => Record<string, number>)
    | undefined;

  assert.equal(typeof normalizeTaskHistoryItems, 'function');
  assert.equal(typeof summarizeTaskHistory, 'function');

  const items = normalizeTaskHistoryItems?.([
    {
      taskId: 'task-1',
      planName: 'Morning Launch',
      status: 3,
      serial_name: 'Pixel Farm 01',
      accounts: [
        { id: 'acc-1', username: 'gold-th', platform: 'TikTok', region: 'TH' },
      ],
      shareUrl: 'https://example.com/share/task-1',
      resultImages: ['https://example.com/result-1.jpg'],
      schedule_at: 1710000000,
    },
    {
      id: 'task-2',
      statusText: 'failed',
      fail_desc: 'GeeLark login expired',
      createdAt: 1710000300000,
    },
  ]);

  assert.deepEqual(items?.[0], {
    id: 'task-1',
    taskId: 'task-1',
    planName: 'Morning Launch',
    status: 3,
    statusText: 'success',
    serialName: 'Pixel Farm 01',
    platform: undefined,
    platforms: [],
    accounts: [
      { id: 'acc-1', username: 'gold-th', platform: 'TikTok', region: 'TH' },
    ],
    accountCount: undefined,
    successCount: undefined,
    failedCount: undefined,
    shareLink: 'https://example.com/share/task-1',
    shareLinks: [],
    resultImages: ['https://example.com/result-1.jpg'],
    failDesc: undefined,
    failReasons: [],
    createdAt: 1710000000000,
  });
  assert.equal(items?.[1]?.statusText, 'failed');
  assert.equal(items?.[1]?.failDesc, 'GeeLark login expired');
  assert.deepEqual(summarizeTaskHistory?.(items ?? []), {
    total: 2,
    success: 1,
    failed: 1,
    pending: 0,
  });
});

test('task history filters by status, platform, and search then groups by date', async () => {
  const support = await import('../src/components/distribute/distributeSupport.ts');

  const filterTaskHistoryItems = (support as Record<string, unknown>).filterTaskHistoryItems as
    | ((items: Array<Record<string, unknown>>, filters: Record<string, unknown>) => Array<Record<string, unknown>>)
    | undefined;
  const getTaskHistoryPlatformOptions = (support as Record<string, unknown>).getTaskHistoryPlatformOptions as
    | ((items: Array<Record<string, unknown>>) => string[])
    | undefined;
  const groupTaskHistoryItemsByDate = (support as Record<string, unknown>).groupTaskHistoryItemsByDate as
    | ((items: Array<Record<string, unknown>>, format?: (timestamp: number) => string) => Array<Record<string, unknown>>)
    | undefined;

  assert.equal(typeof filterTaskHistoryItems, 'function');
  assert.equal(typeof getTaskHistoryPlatformOptions, 'function');
  assert.equal(typeof groupTaskHistoryItemsByDate, 'function');

  const items = [
    {
      id: 'task-1',
      taskId: 'task-1',
      planName: 'TH Morning Launch',
      status: 3,
      statusText: 'success',
      accounts: [{ username: 'gold-th', platform: 'TikTok', region: 'TH' }],
      resultImages: [],
      createdAt: Date.UTC(2026, 4, 9, 2, 0, 0),
    },
    {
      id: 'task-2',
      taskId: 'task-2',
      planName: 'ID Recovery',
      status: 4,
      statusText: 'failed',
      accounts: [{ username: 'gold-id', platform: 'Instagram', region: 'ID' }],
      resultImages: [],
      createdAt: Date.UTC(2026, 4, 8, 2, 0, 0),
    },
    {
      id: 'task-3',
      taskId: 'task-3',
      planName: 'No platform clue',
      status: 2,
      statusText: 'running',
      resultImages: [],
      createdAt: Date.UTC(2026, 4, 9, 3, 0, 0),
    },
  ];

  assert.deepEqual(getTaskHistoryPlatformOptions?.(items), ['Instagram', 'TikTok']);
  assert.deepEqual(filterTaskHistoryItems?.(items, { status: 'success' }).map((item) => item.id), ['task-1']);
  assert.deepEqual(filterTaskHistoryItems?.(items, { platform: 'Instagram' }).map((item) => item.id), ['task-2']);
  assert.deepEqual(filterTaskHistoryItems?.(items, { query: 'gold-th' }).map((item) => item.id), ['task-1']);
  assert.deepEqual(filterTaskHistoryItems?.(items, { status: 'pending' }).map((item) => item.id), ['task-3']);

  const groups = groupTaskHistoryItemsByDate?.(items, (timestamp) => `date:${new Date(timestamp).toISOString().slice(0, 10)}`);
  assert.equal(groups?.length, 2);
  assert.deepEqual(groups?.[0], {
    id: '2026-05-09',
    label: 'date:2026-05-09',
    items: [items[0], items[2]],
  });
});

test('buildGenerateCaptionRequestBody carries optional campaign framing alongside legacy caption fields', async () => {
  const promptApi = await import('../src/api/promptPolish.ts');

  const buildGenerateCaptionRequestBody = (promptApi as Record<string, unknown>).buildGenerateCaptionRequestBody as
    | ((prompt: string, platforms?: string[], opts?: Record<string, unknown>) => Record<string, unknown>)
    | undefined;

  assert.equal(typeof buildGenerateCaptionRequestBody, 'function');
  assert.deepEqual(
    buildGenerateCaptionRequestBody?.('samurai battle', ['tiktok', 'instagram'], {
      existingCaption: 'draft caption',
      existingHashtags: '#ronin',
      language: 'EN',
      videoPath: 'output/admin/demo.mp4',
      campaignContext: {
        campaignObjective: 'Drive profile visits',
        targetAudience: 'anime fans',
        callToAction: 'Watch till the end',
        targetMarket: 'TH',
        complianceNotes: 'Avoid guaranteed-result language',
        bannedPhrases: ['guaranteed', 'risk free'],
      },
    }),
    {
      prompt: 'samurai battle',
      platforms: ['tiktok', 'instagram'],
      existingCaption: 'draft caption',
      existingHashtags: '#ronin',
      language: 'EN',
      videoPath: 'output/admin/demo.mp4',
      campaignObjective: 'Drive profile visits',
      targetAudience: 'anime fans',
      callToAction: 'Watch till the end',
      targetMarket: 'TH',
      complianceNotes: 'Avoid guaranteed-result language',
      bannedPhrases: ['guaranteed', 'risk free'],
    },
  );
});

test('DistributeAssetPicker renders selected asset and source badges for asset-first publish flows', async () => {
  const pickerModule = await import('../src/components/distribute/DistributeAssetPicker.tsx');
  const picker = (pickerModule as Record<string, unknown>).DistributeAssetPicker as
    | ((props: Record<string, unknown>) => React.JSX.Element)
    | undefined;

  assert.equal(typeof picker, 'function');

  const html = renderToStaticMarkup(
    React.createElement(picker as NonNullable<typeof picker>, {
      title: 'Publish Asset',
      assets: [
        {
          id: 'asset-1',
          source: 'create-flow',
          sourceLabel: 'Studio suggestion',
          title: 'Fresh studio render',
          createdAt: 1710000001000,
          previewUrl: '/preview/demo.mp4',
          videoPath: 'output/admin/demo.mp4',
        },
      ],
      selectedAssetId: 'asset-1',
      labels: {
        selected: 'Selected',
      },
    }),
  );

  assert.match(html, /Fresh studio render/);
  assert.match(html, /Studio suggestion/);
  assert.match(html, /Selected/);
});

test('DistributePublishHistory renders publish summaries and task links from persistent history', async () => {
  const historyModule = await import('../src/components/distribute/DistributePublishHistory.tsx');
  const history = (historyModule as Record<string, unknown>).DistributePublishHistory as
    | ((props: Record<string, unknown>) => React.JSX.Element)
    | undefined;

  assert.equal(typeof history, 'function');

  const html = renderToStaticMarkup(
    React.createElement(history as NonNullable<typeof history>, {
      title: 'Recent publishes',
      items: [
        {
          id: 'task-1',
          taskId: 'task-1',
          planName: 'Morning Launch',
          status: 3,
          statusText: 'success',
          accounts: [{ username: 'gold-th', platform: 'TikTok', region: 'TH' }],
          accountCount: 1,
          createdAt: 1710000000000,
          shareLinks: ['https://example.com/share/task-1'],
        },
        {
          id: 'task-2',
          taskId: 'task-2',
          planName: 'Evening Recovery',
          status: 4,
          statusText: 'failed',
          createdAt: 1709913600000,
          failDesc: 'GeeLark login expired',
        },
      ],
      formatTime: () => '2026-05-06 10:00',
      labels: {
        statusSuccess: 'Success',
        statusFailed: 'Failed',
        filteredSummary: 'Showing {visible} of {total}',
      },
    }),
  );

  assert.match(html, /Morning Launch/);
  assert.match(html, /Evening Recovery/);
  assert.match(html, /Success/);
  assert.match(html, /Failed/);
  assert.match(html, /TikTok/);
  assert.match(html, /Showing 2 of 2/);
  assert.match(html, /task-1/);
  assert.match(html, /example.com\/share\/task-1/);
  assert.match(html, /GeeLark login expired/);
});

test('DistributePreflightChecklist highlights blocked publish prerequisites and reviewed options', async () => {
  const checklistModule = await import('../src/components/distribute/DistributePreflightChecklist.tsx');
  const checklist = (checklistModule as Record<string, unknown>).DistributePreflightChecklist as
    | ((props: Record<string, unknown>) => React.JSX.Element)
    | undefined;
  const buildDistributionPreflightItems = (checklistModule as Record<string, unknown>).buildDistributionPreflightItems as
    | ((state: Record<string, unknown>) => Array<Record<string, unknown>>)
    | undefined;

  assert.equal(typeof checklist, 'function');
  assert.equal(typeof buildDistributionPreflightItems, 'function');

  const items = buildDistributionPreflightItems?.({
    selectedAccountCount: 0,
    selectedPlatformCount: 2,
    platformCopyCount: 1,
    reviewedPublishOptions: true,
    targetMarket: 'TH',
    selectedRegions: ['ID'],
  });

  const html = renderToStaticMarkup(
    React.createElement(checklist as NonNullable<typeof checklist>, {
      title: 'Preflight',
      items,
    }),
  );

  assert.match(html, /Preflight/);
  assert.match(html, /No publish asset selected/);
  assert.match(html, /Need attention/);
  assert.match(html, /Publish options reviewed/);
});
