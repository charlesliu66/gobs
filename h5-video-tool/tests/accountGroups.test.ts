import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildAccountGroups,
  saveCustomAccountGroup,
  summarizeAccountGroupMembers,
  updateCustomAccountGroup,
  type AccountGroupAccount,
} from '../src/utils/accountGroups.ts';

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

function withWindowStorage<T>(storage: MemoryStorage, fn: () => T): T {
  const originalWindow = (globalThis as typeof globalThis & { window?: unknown }).window;
  (globalThis as typeof globalThis & { window?: unknown }).window = { localStorage: storage };
  try {
    return fn();
  } finally {
    (globalThis as typeof globalThis & { window?: unknown }).window = originalWindow;
  }
}

const accounts: AccountGroupAccount[] = [
  { id: 'acc-1', username: 'gold_tt', platform: 'TikTok', remark: 'group:Launch' },
  { id: 'acc-2', username: 'gold_fb', platform: 'Facebook', remark: 'group:Launch' },
  { id: 'acc-3', username: 'gold_ig', platform: 'Instagram' },
];

test('account groups preview members with platform clues', () => {
  const group = buildAccountGroups(accounts).find((item) => item.id === 'config:launch');

  assert.equal(group?.name, 'Launch');
  assert.equal(summarizeAccountGroupMembers(group!, accounts), 'gold_tt (TikTok), gold_fb (Facebook)');
});

test('custom account groups can be updated from the current selection', () => {
  const storage = new MemoryStorage();

  withWindowStorage(storage, () => {
    let customGroups = saveCustomAccountGroup(accounts, 'Weekend Boost', ['acc-1', 'acc-2']);
    assert.deepEqual(customGroups[0]?.accountIds, ['acc-1', 'acc-2']);

    customGroups = updateCustomAccountGroup(accounts, customGroups[0]!.id, ['acc-3', 'missing']);
    assert.deepEqual(customGroups[0]?.accountIds, ['acc-3']);
    assert.equal(summarizeAccountGroupMembers(customGroups[0]!, accounts), 'gold_ig (Instagram)');
  });
});
