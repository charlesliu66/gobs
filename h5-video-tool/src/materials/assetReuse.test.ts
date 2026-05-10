import test from 'node:test';
import assert from 'node:assert/strict';

import type { LibraryAsset } from '../api/assetLibraryApi.ts';
import {
  buildAssetContractFromLibraryAsset,
  getReusableAssetId,
} from './assetReuse.ts';

function makeAsset(overrides: Partial<LibraryAsset> = {}): LibraryAsset {
  return {
    id: 'asset_logo_01',
    filename: 'gold-glory-logo.png',
    mime_type: 'image/png',
    size: 1024,
    status: 'ready',
    created_at: '2026-05-10T00:00:00.000Z',
    updated_at: '2026-05-10T00:00:00.000Z',
    tags: [],
    ...overrides,
  };
}

test('buildAssetContractFromLibraryAsset keeps assetId and maps team category', () => {
  const asset = makeAsset({
    team_category: 'logo',
    width: 1200,
    height: 600,
  });

  const contract = buildAssetContractFromLibraryAsset(asset, {
    campaignId: 'campaign_gold_glory',
  });

  assert.equal(contract.assetId, 'asset_logo_01');
  assert.equal(contract.campaignId, 'campaign_gold_glory');
  assert.equal(contract.category, 'logo');
  assert.equal(contract.width, 1200);
  assert.equal(contract.height, 600);
  assert.equal(contract.mimeType, 'image/png');
});

test('buildAssetContractFromLibraryAsset uses preprocess fallback and duration milliseconds', () => {
  const asset = makeAsset({
    id: 'asset_clip_01',
    filename: 'gameplay-clip.mp4',
    mime_type: 'video/mp4',
    duration: null,
    preprocess: {
      file_type: 'video',
      width: 1080,
      height: 1920,
      aspect_ratio: '9:16',
      orientation: 'portrait',
      thumbnail_ready: true,
      duration_sec: 7.4,
      has_audio: true,
      campaign_asset_category: 'video_clip',
    },
  });

  const contract = buildAssetContractFromLibraryAsset(asset);

  assert.equal(contract.assetId, 'asset_clip_01');
  assert.equal(contract.category, 'video_clip');
  assert.equal(contract.durationMs, 7400);
  assert.equal(contract.width, 1080);
  assert.equal(getReusableAssetId(asset), 'asset_clip_01');
});
