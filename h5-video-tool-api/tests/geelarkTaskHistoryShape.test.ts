import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildTaskHistoryResponse,
  normalizeTaskHistoryEntry,
} from '../src/routes/geelark.ts';

test('normalizeTaskHistoryEntry compresses GeeLark history records into a stable publish summary', () => {
  const summary = normalizeTaskHistoryEntry({
    id: 'task-123',
    planName: 'launch-batch',
    status: 4,
    createTime: 1_714_972_800,
    updateTime: 1_714_973_160,
    resultImages: ['https://img.example/cover.jpg', 42],
    shareUrl: 'https://share.example/post/1',
    failDesc: 'One account needs attention',
    successAmount: 1,
    failAmount: 1,
    accountList: [
      {
        id: 'acc-1',
        username: 'brand_id_tt',
        platform: 'TikTok',
        region: 'ID',
        status: 3,
        shareLink: 'https://share.example/post/1',
      },
      {
        id: 'acc-2',
        userName: 'brand_th_tt',
        platform: 'TikTok',
        region: 'TH',
        status: 4,
        failReason: 'Login expired',
      },
    ],
  });

  assert.deepEqual(summary, {
    id: 'task-123',
    planName: 'launch-batch',
    status: 4,
    statusText: 'failed',
    createdAt: 1_714_972_800,
    updatedAt: 1_714_973_160,
    accountCount: 2,
    accounts: [
      { id: 'acc-1', username: 'brand_id_tt', platform: 'TikTok', region: 'ID' },
      { id: 'acc-2', username: 'brand_th_tt', platform: 'TikTok', region: 'TH' },
    ],
    successCount: 1,
    failedCount: 1,
    resultImages: ['https://img.example/cover.jpg'],
    shareLinks: ['https://share.example/post/1'],
    failReasons: ['One account needs attention', 'Login expired'],
  });
});

test('buildTaskHistoryResponse keeps compatibility items while adding normalized history', () => {
  const rawItems = [
    { id: 'task-1', status: 3, resultImages: ['https://img.example/1.jpg'] },
    {
      taskId: 'task-2',
      status: 2,
      accounts: [{ username: 'brand_us_ig', platform: 'Instagram', region: 'US' }],
      shareLink: 'https://share.example/post/2',
    },
  ];

  const response = buildTaskHistoryResponse(rawItems);

  assert.equal(response.items, rawItems);
  assert.deepEqual(response.history, [
    {
      id: 'task-1',
      planName: undefined,
      status: 3,
      statusText: 'success',
      createdAt: undefined,
      updatedAt: undefined,
      accountCount: 0,
      accounts: [],
      successCount: 1,
      failedCount: 0,
      resultImages: ['https://img.example/1.jpg'],
      shareLinks: [],
      failReasons: [],
    },
    {
      id: 'task-2',
      planName: undefined,
      status: 2,
      statusText: 'running',
      createdAt: undefined,
      updatedAt: undefined,
      accountCount: 1,
      accounts: [{ id: undefined, username: 'brand_us_ig', platform: 'Instagram', region: 'US' }],
      successCount: 0,
      failedCount: 0,
      resultImages: [],
      shareLinks: ['https://share.example/post/2'],
      failReasons: [],
    },
  ]);
});
