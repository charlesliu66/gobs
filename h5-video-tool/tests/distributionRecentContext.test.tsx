import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { DistributeRecentContextPanel } from '../src/components/distribute/DistributeRecentContextPanel.tsx';
import {
  buildDistributionRecentContext,
  loadDistributionRecentContexts,
  saveDistributionRecentContext,
  type DistributionRecentContext,
} from '../src/components/distribute/distributionRecentContext.ts';

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

test('distribution recent contexts save, dedupe, cap, and tolerate malformed storage', () => {
  const storage = new MemoryStorage();
  const base = buildDistributionRecentContext({
    packageId: 'pkg-1',
    packageTitle: 'Gold launch',
    selectedAsset: { id: 'asset-1', title: 'Launch video', source: 'package' },
    selectedAccounts: [
      { id: 'acc-1', platform: 'TikTok' },
      { id: 'acc-2', platform: 'TikTok' },
    ],
    platformDrafts: { tiktok: { caption: 'Watch till the end', hashtags: '#fyp' } },
    activeDraftKey: 'tiktok',
    needShareLink: true,
    markAI: false,
    now: 1710000000000,
  });

  assert.equal(base.id, 'package:pkg-1');
  assert.deepEqual(base.accountIds, ['acc-1', 'acc-2']);
  assert.deepEqual(base.platforms, ['TikTok']);

  saveDistributionRecentContext(base, storage);
  saveDistributionRecentContext({ ...base, savedAt: 1710000001000, markAI: true }, storage);
  saveDistributionRecentContext({ ...base, id: 'asset:2', savedAt: 1710000002000 }, storage);
  saveDistributionRecentContext({ ...base, id: 'asset:3', savedAt: 1710000003000 }, storage);
  saveDistributionRecentContext({ ...base, id: 'asset:4', savedAt: 1710000004000 }, storage);

  const loaded = loadDistributionRecentContexts(storage);
  assert.equal(loaded.length, 3);
  assert.deepEqual(loaded.map((item) => item.id), ['asset:4', 'asset:3', 'asset:2']);

  const malformed = new MemoryStorage();
  malformed.setItem('gobs:distribute:recent-contexts', '{bad json');
  assert.deepEqual(loadDistributionRecentContexts(malformed), []);
});

test('DistributeRecentContextPanel renders restore-ready package and publish option clues', () => {
  const context: DistributionRecentContext = {
    id: 'package:pkg-1',
    savedAt: 1710000000000,
    packageId: 'pkg-1',
    packageTitle: 'Gold launch',
    assetId: 'asset-1',
    assetTitle: 'Launch video',
    assetSource: 'package',
    accountIds: ['acc-1'],
    accountCount: 1,
    platforms: ['TikTok'],
    activeDraftKey: 'tiktok',
    platformDrafts: { tiktok: { caption: 'Watch', hashtags: '#gold' } },
    needShareLink: true,
    markAI: true,
  };

  const html = renderToStaticMarkup(
    React.createElement(DistributeRecentContextPanel, {
      contexts: [context],
      formatTime: () => '2026-05-09 10:00',
      labels: {
        title: 'Recently Used Publish Configs',
        subtitle: 'Saved locally',
        packageLabel: 'Package',
        assetLabel: 'Asset',
        accountCount: 'Accounts',
        platforms: 'Platforms',
        needShareLink: 'Generate share link',
        markAI: 'Mark AI',
        updatedAt: 'Saved',
        useAgain: 'Use this config',
      },
      onRestore: () => undefined,
    }),
  );

  assert.match(html, /Recently Used Publish Configs/);
  assert.match(html, /Gold launch/);
  assert.match(html, /Launch video/);
  assert.match(html, /TikTok/);
  assert.match(html, /Generate share link/);
  assert.match(html, /Use this config/);
});
