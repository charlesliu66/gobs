import test from 'node:test';
import assert from 'node:assert/strict';

import type { OutputRecentVideoItem } from '../src/api/video.ts';
import {
  assetSourceLabel,
  buildCurrentAssetOption,
  buildLocalAssetOptions,
  buildOutputAssetOptions,
  buildPackageAssetOption,
  mergeAssetOptions,
  resolvePromptSeed,
  type DistributeAssetOption,
} from '../src/components/distribute/distributeAssetOptions.ts';
import type { PendingDistributionDraft } from '../src/components/distribution/packageToDistributeDraft.ts';

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  clear(): void {
    this.values.clear();
  }
}

const storage = new MemoryStorage();

Object.defineProperty(globalThis, 'localStorage', {
  value: storage,
  configurable: true,
});

function buildDraft(selectedAsset: PendingDistributionDraft['selectedAsset']): PendingDistributionDraft {
  return {
    packageId: 'pkg_1',
    title: 'Launch Package',
    selectedAsset,
    selectedPlatformKeys: ['tiktok'],
    platformDrafts: { tiktok: { caption: 'Go now', hashtags: '#launch' } },
    captionContext: {
      campaignObjective: '',
      targetAudience: '',
      callToAction: '',
      targetMarket: '',
      toneRules: '',
      sellingPoints: '',
      avoidTerms: '',
    },
    campaignContext: {
      marketTruth: [],
      audienceTension: [],
      toneRules: [],
      forbiddenClaims: [],
      approvedAngles: [],
      hookCandidates: [],
      visualCues: [],
    },
    lineage: {
      outputIds: [],
      sourceAssetIds: [],
    },
    publishSafety: {
      canPublishDirectly: true,
      keepAccountsExplicit: true,
      nextActionKeys: [],
    },
  };
}

test('distribution asset helpers build current and package asset options without changing IDs', () => {
  storage.clear();
  const current = buildCurrentAssetOption({
    videoPath: 'output/run/video.mp4',
    taskId: 'task_1',
    prompt: 'Hero launch',
  });
  const pkg = buildPackageAssetOption(buildDraft({
    id: 'asset_1',
    title: 'Package video',
    videoPath: 'packages/pkg_1/video.mp4',
  }));

  assert.equal(current?.id, 'current:task_1');
  assert.equal(current?.source, 'current');
  assert.equal(current?.title, 'video.mp4');
  assert.match(current?.videoUrl ?? '', /\/api\/video\/file\?path=output%2Frun%2Fvideo\.mp4/);

  assert.equal(pkg?.id, 'package:pkg_1:asset_1');
  assert.equal(pkg?.source, 'package');
  assert.equal(pkg?.subtitle, 'Launch Package');
  assert.match(pkg?.videoUrl ?? '', /\/api\/video\/file\?path=packages%2Fpkg_1%2Fvideo\.mp4/);
});

test('distribution asset helpers build local and output options with stable ordering', () => {
  storage.clear();
  const local = buildLocalAssetOptions([
    { taskId: 'old', videoPath: 'output/old.mp4', prompt: 'Old', createdAt: 100 },
    { taskId: 'new', videoPath: '', videoUrl: 'https://cdn.example/new.mp4', prompt: 'New', createdAt: 200 },
  ]);
  const output = buildOutputAssetOptions([
    { path: 'output/server.mp4', mtimeMs: 300, size: 123, source: 'dreamina', promptSummary: 'Server prompt' } satisfies OutputRecentVideoItem,
  ]);

  assert.deepEqual(local.map((item) => item.id), ['local:new', 'local:old']);
  assert.equal(local[0]?.videoUrl, 'https://cdn.example/new.mp4');
  assert.match(local[1]?.videoUrl ?? '', /path=output%2Fold\.mp4/);
  assert.equal(output[0]?.id, 'output:output/server.mp4');
  assert.equal(output[0]?.prompt, 'Server prompt');
});

test('distribution asset helpers dedupe by video identity while preserving first source priority', () => {
  const packageAsset: DistributeAssetOption = {
    id: 'package:asset',
    source: 'package',
    title: 'Package asset',
    videoPath: 'same/video.mp4',
    createdAt: 1,
  };
  const currentAsset: DistributeAssetOption = {
    id: 'current:task',
    source: 'current',
    title: 'Current asset',
    videoPath: 'same/video.mp4',
    createdAt: 999,
  };
  const outputAsset: DistributeAssetOption = {
    id: 'output:other',
    source: 'output',
    title: 'Other asset',
    videoPath: 'other/video.mp4',
    createdAt: 500,
  };

  const merged = mergeAssetOptions(packageAsset, currentAsset, [], [outputAsset]);

  assert.deepEqual(merged.map((item) => item.id), ['output:other', 'package:asset']);
});

test('distribution asset helpers resolve prompt seed and source labels', () => {
  storage.clear();
  storage.setItem('h5-video-history-default', JSON.stringify([
    { taskId: 'task_recent', videoPath: 'recent.mp4', prompt: 'Recent prompt', createdAt: 123 },
  ]));

  assert.equal(resolvePromptSeed({ id: 'a', source: 'current', title: 'A', prompt: 'Asset prompt' }), 'Asset prompt');
  assert.equal(resolvePromptSeed(null, 'Fallback prompt'), 'Fallback prompt');
  assert.equal(resolvePromptSeed({ id: 'a', source: 'current', title: 'A', taskId: 'task_recent' }), 'Recent prompt');
  assert.equal(assetSourceLabel('package', (key) => key), 'distribute.assetPendingPackage');
  assert.equal(assetSourceLabel('output', (key) => key), 'distribute.assetOutput');
});
