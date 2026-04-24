import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getCharacterAssetStatus,
  getScenePropAssetStatus,
  summarizeDesignAssetReadiness,
} from '../src/studio/designAssetStatus.ts';
import type { CharacterSheet, PropSheet, SceneSheet } from '../src/studio/productionTypes.ts';
import type { PortraitJobState } from '../src/components/production/portraitJobKey.ts';

function character(patch: Partial<CharacterSheet> = {}): CharacterSheet {
  return {
    id: 'char-1',
    name: 'Silas',
    variants: [{ id: 'look-1', label: 'Default look' }],
    lookTree: [{ id: 'look-1', parentId: null, label: 'Default look' }],
    activeLookId: 'look-1',
    ...patch,
  };
}

function scene(patch: Partial<SceneSheet> = {}): SceneSheet {
  return {
    id: 'scene-1',
    name: 'Orphanage Hall',
    sceneRef: 'hall',
    variants: [{ id: 'scene-var-1', label: 'Main variant' }],
    ...patch,
  };
}

function prop(patch: Partial<PropSheet> = {}): PropSheet {
  return {
    id: 'prop-1',
    name: 'Lantern',
    sceneRef: 'hall',
    variants: [{ id: 'prop-var-1', label: 'Main variant' }],
    ...patch,
  };
}

test('getCharacterAssetStatus resolves ready from active look image', () => {
  const status = getCharacterAssetStatus(
    character({
      variants: [{ id: 'look-1', label: 'Default look', imageDataUrl: 'data:image/png;base64,ready' }],
      lookTree: [{ id: 'look-1', parentId: null, label: 'Default look', imageDataUrl: 'data:image/png;base64,ready' }],
    }),
    null,
  );

  assert.equal(status, 'ready');
});

test('getCharacterAssetStatus resolves generating and review from portrait job state', () => {
  const generatingJob: PortraitJobState = { status: 'generating' };
  const reviewJob: PortraitJobState = { status: 'done', previewDataUrl: 'data:image/png;base64,preview' };

  assert.equal(getCharacterAssetStatus(character(), generatingJob), 'generating');
  assert.equal(getCharacterAssetStatus(character(), reviewJob), 'review');
});

test('getCharacterAssetStatus resolves failed and missing when there is no confirmed image', () => {
  const failedJob: PortraitJobState = { status: 'error', error: 'boom' };

  assert.equal(getCharacterAssetStatus(character(), failedJob), 'failed');
  assert.equal(getCharacterAssetStatus(character(), null), 'missing');
});

test('getScenePropAssetStatus resolves ready, generating, review, failed, and missing', () => {
  assert.equal(
    getScenePropAssetStatus({
      hasImage: true,
      isGenerating: false,
      hasPreview: false,
      hasError: false,
    }),
    'ready',
  );
  assert.equal(
    getScenePropAssetStatus({
      hasImage: false,
      isGenerating: true,
      hasPreview: false,
      hasError: false,
    }),
    'generating',
  );
  assert.equal(
    getScenePropAssetStatus({
      hasImage: false,
      isGenerating: false,
      hasPreview: true,
      hasError: false,
    }),
    'review',
  );
  assert.equal(
    getScenePropAssetStatus({
      hasImage: false,
      isGenerating: false,
      hasPreview: false,
      hasError: true,
    }),
    'failed',
  );
  assert.equal(
    getScenePropAssetStatus({
      hasImage: false,
      isGenerating: false,
      hasPreview: false,
      hasError: false,
    }),
    'missing',
  );
});

test('summarizeDesignAssetReadiness counts ready, review, generating, failed, and missing assets', () => {
  const summary = summarizeDesignAssetReadiness({
    characters: [
      { sheet: character({ id: 'char-ready', variants: [{ id: 'look-1', label: 'Default', imageDataUrl: 'data:image/png;base64,1' }], lookTree: [{ id: 'look-1', parentId: null, label: 'Default', imageDataUrl: 'data:image/png;base64,1' }] }), portraitJob: null },
      { sheet: character({ id: 'char-review' }), portraitJob: { status: 'done', previewDataUrl: 'data:image/png;base64,preview' } },
      { sheet: character({ id: 'char-missing' }), portraitJob: null },
    ],
    scenes: [
      { sheet: scene({ id: 'scene-ready', variants: [{ id: 'scene-var-1', label: 'Main', imageDataUrl: 'data:image/png;base64,1' }] }) },
      { sheet: scene({ id: 'scene-generating' }), isGenerating: true },
    ],
    props: [
      { sheet: prop({ id: 'prop-failed' }), hasError: true },
      { sheet: prop({ id: 'prop-missing' }) },
    ],
  });

  assert.deepEqual(summary.characters, {
    total: 3,
    ready: 1,
    review: 1,
    generating: 0,
    failed: 0,
    missing: 1,
  });
  assert.deepEqual(summary.scenes, {
    total: 2,
    ready: 1,
    review: 0,
    generating: 1,
    failed: 0,
    missing: 0,
  });
  assert.deepEqual(summary.props, {
    total: 2,
    ready: 0,
    review: 0,
    generating: 0,
    failed: 1,
    missing: 1,
  });
  assert.equal(summary.missingTotal, 2);
});
