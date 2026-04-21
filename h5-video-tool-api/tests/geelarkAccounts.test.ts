import test from 'node:test';
import assert from 'node:assert/strict';
import {
  areAllPhonesReady,
  buildTaskEnvMap,
  filterAccountIdsByAllowedIds,
  filterAccountsByAllowedIds,
  getEnvIdsRequiringStart,
  shouldStopPhoneForTaskStatus,
} from '../src/services/geelark.ts';

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
