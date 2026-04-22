import test from 'node:test';
import assert from 'node:assert/strict';
import {
  areAllPhonesReady,
  buildTaskEnvMap,
  filterAccountsByAllowedIds,
  filterAccountIdsByAllowedIds,
  type ListedAccount,
  getEnvIdsRequiringStart,
  shouldStopPhoneForTaskStatus,
  // Added via namespace fallback until the helpers exist.
} from '../src/services/geelark.ts';
import * as geelark from '../src/services/geelark.ts';

const sampleAccounts = [
  { id: 'web-th-tt', username: 'web TH tt' },
  { id: 'th-test2', username: 'TH test2' },
  { id: 'test-3', username: 'Test 3' },
];

test('filterAccountsByAllowedIds returns all accounts when allowed ids are unrestricted', () => {
  assert.deepEqual(filterAccountsByAllowedIds(sampleAccounts, null), sampleAccounts);
});

test('filterAccountsByAllowedIds keeps only assigned accounts in config order', () => {
  assert.deepEqual(
    filterAccountsByAllowedIds(sampleAccounts, ['test-3', 'web-th-tt']),
    [
      { id: 'web-th-tt', username: 'web TH tt' },
      { id: 'test-3', username: 'Test 3' },
    ],
  );
});

test('filterAccountsByAllowedIds returns an empty list when the user has no assigned accounts', () => {
  assert.deepEqual(filterAccountsByAllowedIds(sampleAccounts, []), []);
});

test('filterAccountIdsByAllowedIds keeps only permitted ids for publish requests', () => {
  assert.deepEqual(
    filterAccountIdsByAllowedIds(['test-3', 'web-th-tt', 'missing'], ['web-th-tt', 'test-3']),
    ['test-3', 'web-th-tt'],
  );
});

test('getEnvIdsRequiringStart returns only phones that are currently powered off', () => {
  assert.deepEqual(
    getEnvIdsRequiringStart(
      ['env-a', 'env-b', 'env-c'],
      [
        { id: 'env-a', status: 0 },
        { id: 'env-b', status: 2 },
        { id: 'env-c', status: 1 },
      ],
    ),
    ['env-b'],
  );
});

test('areAllPhonesReady returns true only when every target phone is running', () => {
  assert.equal(
    areAllPhonesReady(
      ['env-a', 'env-b'],
      [
        { id: 'env-a', status: 0 },
        { id: 'env-b', status: 0 },
      ],
    ),
    true,
  );
  assert.equal(
    areAllPhonesReady(
      ['env-a', 'env-b'],
      [
        { id: 'env-a', status: 0 },
        { id: 'env-b', status: 1 },
      ],
    ),
    false,
  );
});

test('buildTaskEnvMap pairs task ids with env ids in submission order', () => {
  assert.deepEqual(
    buildTaskEnvMap(['task-1', 'task-2'], ['env-a', 'env-b']),
    {
      'task-1': 'env-a',
      'task-2': 'env-b',
    },
  );
});

test('shouldStopPhoneForTaskStatus stops only successful publish tasks', () => {
  assert.equal(shouldStopPhoneForTaskStatus(3), true);
  assert.equal(shouldStopPhoneForTaskStatus(4), false);
  assert.equal(shouldStopPhoneForTaskStatus(7), false);
});

test('buildPublishBatchItems keeps task-account rows aligned for the latest publish batch', () => {
  const buildPublishBatchItems = (geelark as Record<string, unknown>).buildPublishBatchItems as
    | ((accounts: Array<ListedAccount & { envId?: string }>, taskIds: string[]) => unknown)
    | undefined;

  assert.equal(typeof buildPublishBatchItems, 'function');
  assert.deepEqual(
    buildPublishBatchItems?.(
      [
        { id: 'acc-1', username: 'web TH tt', envId: 'env-1', region: 'TH', platform: 'tiktok', canPost: true },
        { id: 'acc-2', username: 'ID test3', envId: 'env-2', region: 'ID', platform: 'tiktok', canPost: true },
      ],
      ['task-1'],
    ),
    [
      {
        accountId: 'acc-1',
        username: 'web TH tt',
        envId: 'env-1',
        region: 'TH',
        platform: 'tiktok',
        taskId: 'task-1',
      },
      {
        accountId: 'acc-2',
        username: 'ID test3',
        envId: 'env-2',
        region: 'ID',
        platform: 'tiktok',
        submitError: 'GeeLark did not return a task id for this account',
      },
    ],
  );
});

test('normalizeTaskDetailPayload extracts status text, screenshots, share link, and logs for the UI', () => {
  const normalizeTaskDetailPayload = (geelark as Record<string, unknown>).normalizeTaskDetailPayload as
    | ((detail: Record<string, unknown>) => unknown)
    | undefined;

  assert.equal(typeof normalizeTaskDetailPayload, 'function');
  assert.deepEqual(
    normalizeTaskDetailPayload?.({
      id: 'task-1',
      status: 3,
      failDesc: '',
      resultImages: ['https://img.example/a.jpg', 'ignore-me'],
      shareLink: 'https://share.example/post/1',
      logs: ['waiting', 2, 'done'],
    }),
    {
      id: 'task-1',
      status: 3,
      statusText: 'success',
      failDesc: undefined,
      resultImages: ['https://img.example/a.jpg'],
      shareLink: 'https://share.example/post/1',
      logs: ['waiting', 'done'],
    },
  );
});

test('isRetryableProxyConnectionError detects timeout to the configured proxy host', () => {
  const isRetryableProxyConnectionError = (geelark as Record<string, unknown>).isRetryableProxyConnectionError as
    | ((error: unknown, proxyUrl?: string) => boolean)
    | undefined;

  assert.equal(typeof isRetryableProxyConnectionError, 'function');
  assert.equal(
    isRetryableProxyConnectionError?.(
      {
        code: 'ECONNABORTED',
        cause: {
          code: 'ETIMEDOUT',
          address: '10.21.100.220',
          port: 8840,
        },
      },
      'http://10.21.100.220:8840',
    ),
    true,
  );
  assert.equal(
    isRetryableProxyConnectionError?.(
      {
        code: 'ECONNABORTED',
        cause: {
          code: 'ETIMEDOUT',
          address: '8.8.8.8',
          port: 443,
        },
      },
      'http://10.21.100.220:8840',
    ),
    false,
  );
});
