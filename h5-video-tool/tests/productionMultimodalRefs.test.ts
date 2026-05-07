import test from 'node:test';
import assert from 'node:assert/strict';

import type { CharacterSheet, ProductionShot, SceneSheet } from '../src/studio/productionTypes.ts';
import {
  buildShotMultimodalRefPack,
  computeShotRefTags,
  extractAtImageContext,
} from '../src/studio/productionAssets.ts';

const IMG = 'data:image/png;base64,AA==';

function makeShot(overrides: Partial<ProductionShot> = {}): ProductionShot {
  return {
    shotIndex: 1,
    durationSec: 8,
    sceneRef: 'scene-toothbrush',
    shotScale: 'medium',
    cameraMove: 'slow push',
    lensFeel: '35mm',
    subject: 'A teenage Mexican son, wearing a gaming-themed T-shirt, casually picking up a plain black toothbrush from a shelf. His father stands nearby.',
    action: 'Son reaches for and picks up the toothbrush.',
    composition: '',
    lighting: '',
    emotion: '',
    continuity: '',
    dialogue: '',
    audioCue: '',
    notes: '',
    structuredStill: {
      sp_subject: 'A teenage Mexican son, wearing a gaming-themed T-shirt, casually picking up a plain black toothbrush from a shelf. His father stands nearby.',
      sp_environment: 'A narrow, brightly lit personal care aisle in a convenience store, shelves packed with toothbrushes and toiletries.',
      sp_style: 'Realistic, high-contrast, slightly cool tones.',
      sp_lighting: 'Overhead fluorescent lights, clear and functional.',
      sp_camera: '',
      sp_composition: '',
      sp_continuity: '',
      sp_negative: '',
    },
    structuredMotion: {
      mp_motion: 'Son reaches for and picks up the toothbrush.',
      mp_camera: '',
      mp_tempo: '',
      mp_transition: '',
      mp_audio: '',
    },
    ...overrides,
  };
}

function makeCharacter(id: string, name: string): CharacterSheet {
  return {
    id,
    name,
    variants: [{ id: `${id}-look`, label: 'Default', imageDataUrl: IMG }],
    lookTree: [{ id: `${id}-look`, parentId: null, label: 'Default', imageDataUrl: IMG }],
    activeLookId: `${id}-look`,
  };
}

const characters = [
  makeCharacter('ch-son', 'Mexican Gaming Son'),
  makeCharacter('ch-father', 'Mexican Father'),
];

const scenes: SceneSheet[] = [
  {
    id: 'scene-toothbrush',
    sceneRef: 'scene-toothbrush',
    name: 'Toothbrush Aisle',
    variants: [{ id: 'scene-look', label: 'Main', imageDataUrl: IMG }],
  },
];

test('English multimodal refs inject unique aliases instead of requiring exact card names', () => {
  const pack = buildShotMultimodalRefPack(makeShot(), characters, scenes, [], undefined, 'en');

  assert.equal(pack.multimodalImages.length, 3);
  assert.deepEqual(pack.labels, [
    'Character [Mexican Gaming Son]',
    'Character [Mexican Father]',
    'Scene [Toothbrush Aisle]',
  ]);
  assert.match(pack.narrativeWithInlineTags, /\bson@图片1\b/i);
  assert.match(pack.narrativeWithInlineTags, /\bfather@图片2\b/i);
  assert.match(pack.narrativeWithInlineTags, /\baisle@图片3\b/i);
  assert.doesNotMatch(pack.narrativeWithInlineTags, /@图片\d+@图片\d+/);
  assert.match(pack.refPromptSuffix, /^Reference order/);
  assert.match(pack.refPromptSuffix, /@图片1 is Character \[Mexican Gaming Son\]/);
});

test('English at-image context is localized while preserving the Dreamina token', () => {
  assert.equal(extractAtImageContext('hello son@图片1 reaches', 1, 'en'), 'after "...son"');
  assert.equal(extractAtImageContext('hello son@图片1 reaches', 1), '「…hello son」后');
});

test('English storyboard fallback tags use scene wording instead of Chinese raw scene tags', () => {
  assert.deepEqual(computeShotRefTags(
    { sceneRef: 'unknown-aisle', subject: 'No named character', action: 'walks' },
    characters,
    scenes,
    'en',
  ), ['@scene:unknown-aisle']);
});
