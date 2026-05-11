import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildDistributionRecentContext,
  loadDistributionActiveContext,
  saveDistributionActiveContext,
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

test('distribution active context saves and loads a refresh-restorable publish setup', () => {
  const storage = new MemoryStorage();
  const active = buildDistributionRecentContext({
    packageId: 'pkg-active',
    packageTitle: 'Dungeon launch',
    selectedAsset: { id: 'asset-video', title: 'Dungeon video', source: 'package' },
    selectedAccounts: [
      { id: 'acc-1', platform: 'TikTok' },
      { id: 'acc-stale', platform: 'Facebook' },
    ],
    platformDrafts: {
      tiktok: { caption: 'Open with the reward', hashtags: '#gold' },
      facebook: { caption: 'Claim the chest', hashtags: '#playnow' },
    },
    activeDraftKey: 'facebook',
    needShareLink: true,
    markAI: true,
    now: 1710000005000,
  });

  saveDistributionActiveContext(active, storage);
  const restored = loadDistributionActiveContext(storage);

  assert.equal(restored?.id, 'package:pkg-active');
  assert.equal(restored?.packageId, 'pkg-active');
  assert.equal(restored?.assetId, 'asset-video');
  assert.deepEqual(restored?.accountIds, ['acc-1', 'acc-stale']);
  assert.equal(restored?.activeDraftKey, 'facebook');
  assert.equal(restored?.platformDrafts.facebook?.caption, 'Claim the chest');
  assert.equal(restored?.needShareLink, true);
  assert.equal(restored?.markAI, true);

  storage.setItem('gobs:distribute:active-context', '{bad json');
  assert.equal(loadDistributionActiveContext(storage), null);
});
