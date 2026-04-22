import test from 'node:test';
import assert from 'node:assert/strict';
import {
  localizeAssetCategory,
  localizeAssetTagKey,
  localizeFilterOption,
  localizeGalleryTab,
} from './localize.ts';

test('localizeAssetCategory maps zh to en', () => {
  assert.equal(localizeAssetCategory('en', '场景'), 'Scenes');
  assert.equal(localizeAssetCategory('en', '未分类'), 'Uncategorized');
});

test('localizeAssetCategory maps en to zh', () => {
  assert.equal(localizeAssetCategory('zh-CN', 'character'), '角色');
  assert.equal(localizeAssetCategory('zh-CN', 'uncategorized'), '未分类');
});

test('localizeAssetTagKey prettifies unknown english keys', () => {
  assert.equal(localizeAssetTagKey('en', 'shot_type'), 'Shot Type');
});

test('localizeAssetTagKey maps known keys', () => {
  assert.equal(localizeAssetTagKey('en', 'quality'), 'Quality');
  assert.equal(localizeAssetTagKey('zh-CN', 'quality'), '质量');
});

test('localizeFilterOption maps filter values', () => {
  assert.equal(localizeFilterOption('en', 'type', 'image'), 'Image');
  assert.equal(localizeFilterOption('zh-CN', 'orientation', 'portrait'), '竖向');
});

test('localizeGalleryTab maps tabs', () => {
  assert.equal(localizeGalleryTab('en', 'favorites'), 'Favorites');
  assert.equal(localizeGalleryTab('zh-CN', 'recent'), '最近使用');
});
