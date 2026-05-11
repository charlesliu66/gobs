import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCharacterLibrarySaveSheet } from '../src/components/production/characterLibrarySaveSheet';
import type { CharacterSheet } from '../src/studio/productionTypes';

function baseSheet(): CharacterSheet {
  return {
    id: 'char-1',
    name: '盗贼团成员',
    isProtagonist: false,
    variants: [{ id: 'root', label: '默认形象', imageDataUrl: 'root-old' }],
    lookTree: [{ id: 'root', parentId: null, label: '默认形象', imageDataUrl: 'root-old' }],
    activeLookId: 'root',
    baseImageDataUrl: 'root-old',
    baseConfirmed: true,
    states: [],
  };
}

test('buildCharacterLibrarySaveSheet uses preview for replace saves', () => {
  const result = buildCharacterLibrarySaveSheet(
    baseSheet(),
    { mode: 'replace', nodeId: 'root' },
    'preview-new',
  );

  assert.equal(result.baseImageDataUrl, 'preview-new');
  assert.equal(result.activeLookId, 'root');
  assert.equal(result.lookTree?.find((node) => node.id === 'root')?.imageDataUrl, 'preview-new');
});

test('buildCharacterLibrarySaveSheet adds a preview branch before library save', () => {
  const result = buildCharacterLibrarySaveSheet(
    baseSheet(),
    { mode: 'branch', parentNodeId: 'root' },
    'preview-branch',
  );

  const branchNode = result.lookTree?.find((node) => node.parentId === 'root' && node.imageDataUrl === 'preview-branch');
  assert.ok(branchNode);
  assert.equal(result.activeLookId, branchNode?.id);
  assert.equal(result.baseImageDataUrl, 'preview-branch');
});

test('buildCharacterLibrarySaveSheet falls back to the current active look when no preview exists', () => {
  const result = buildCharacterLibrarySaveSheet(
    {
      ...baseSheet(),
      baseImageDataUrl: 'stale-base',
      lookTree: [
        { id: 'root', parentId: null, label: '默认形象', imageDataUrl: 'root-old' },
        { id: 'look-2', parentId: 'root', label: '变体 1', imageDataUrl: 'active-look' },
      ],
      variants: [
        { id: 'root', label: '默认形象', imageDataUrl: 'root-old' },
        { id: 'look-2', label: '变体 1', imageDataUrl: 'active-look' },
      ],
      activeLookId: 'look-2',
    },
    { mode: 'replace', nodeId: 'look-2' },
    null,
  );

  assert.equal(result.baseImageDataUrl, 'active-look');
});
