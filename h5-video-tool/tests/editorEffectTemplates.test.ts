import test from 'node:test';
import assert from 'node:assert/strict';

import { TEXT_PRESETS } from '../src/editor/textPresets.ts';
import {
  buildEditorEffectApplication,
  buildEditorEffectTextClips,
  EDITOR_EFFECT_TEMPLATES,
  getEditorEffectTemplate,
  listEditorEffectTemplates,
  validateEditorEffectTemplates,
  type EditorEffectTemplateCategory,
} from '../src/editor/effectTemplates.ts';

const REQUIRED_CATEGORIES: EditorEffectTemplateCategory[] = [
  'frame',
  'transition',
  'character',
  'battle',
  'cta',
];

test('editor effect catalog has the Run 12 template range and required categories', () => {
  assert.equal(EDITOR_EFFECT_TEMPLATES.length, 6);

  const categories = new Set(EDITOR_EFFECT_TEMPLATES.map((template) => template.category));
  for (const category of REQUIRED_CATEGORIES) {
    assert.equal(categories.has(category), true, `missing category ${category}`);
  }

  assert.equal(listEditorEffectTemplates('cta').length, 2);
});

test('editor effect templates only use existing text presets and declare support', () => {
  assert.deepEqual(validateEditorEffectTemplates(), []);

  const knownPresetIds = new Set(TEXT_PRESETS.map((preset) => preset.id));
  for (const template of EDITOR_EFFECT_TEMPLATES) {
    assert.equal(template.previewSupported, true, `${template.id} preview`);
    assert.equal(template.exportSupported, true, `${template.id} export`);
    assert.ok(template.layers.length > 0, `${template.id} has layers`);
    for (const layer of template.layers) {
      assert.equal(knownPresetIds.has(layer.presetId), true, `${template.id}.${layer.key}`);
    }
  }
});

test('editor effect builder creates stable text clips within timeline bounds', () => {
  const clips = buildEditorEffectTextClips('character-entry-title', {
    timelineStart: 4,
    projectDurationSec: 12,
    aspectRatio: '9:16',
    seed: 'unit',
  });

  assert.equal(clips.length, 2);
  assert.deepEqual(clips.map((clip) => clip.id), [
    'effect_character-entry-title_unit_0_entry-title',
    'effect_character-entry-title_unit_1_entry-caption',
  ]);
  assert.deepEqual(clips.map((clip) => clip.presetId), ['intro-impact', 'sub-bottom']);

  for (const clip of clips) {
    assert.ok(clip.timelineStart >= 0);
    assert.ok(clip.timelineEnd <= 12);
    assert.ok(clip.timelineEnd > clip.timelineStart);
  }
});

test('editor effect builder clamps short projects and near-end applications', () => {
  const nearEnd = buildEditorEffectTextClips('end-card-cta', {
    timelineStart: 9.95,
    projectDurationSec: 10,
    aspectRatio: '16:9',
    seed: 'near-end',
  });

  assert.ok(nearEnd.length > 0);
  assert.ok(nearEnd.every((clip) => clip.timelineEnd <= 10));
  assert.ok(nearEnd.every((clip) => clip.timelineEnd > clip.timelineStart));

  const tiny = buildEditorEffectTextClips('creator-safe-frame', {
    timelineStart: 2,
    projectDurationSec: 0.15,
    aspectRatio: '1:1',
    seed: 'tiny',
  });

  assert.ok(tiny.length > 0);
  assert.ok(tiny.every((clip) => clip.timelineStart >= 0));
  assert.ok(tiny.every((clip) => clip.timelineEnd <= 0.15));
  assert.ok(tiny.every((clip) => clip.timelineEnd > clip.timelineStart));
});

test('transition template recommends the existing crossfade behavior', () => {
  const transition = getEditorEffectTemplate('gameplay-flash-transition');
  assert.equal(transition?.transitionAfter, 'crossfade');

  const application = buildEditorEffectApplication('gameplay-flash-transition', {
    timelineStart: 3,
    projectDurationSec: 8,
    aspectRatio: '9:16',
    seed: 'transition',
  });

  assert.equal(application?.transitionAfter, 'crossfade');
  assert.equal(application?.textClips.length, 1);
});

test('templates respect declared aspect-ratio support', () => {
  const clips = buildEditorEffectTextClips('battle-cut-in', {
    timelineStart: 1,
    projectDurationSec: 6,
    aspectRatio: '4:3',
    seed: 'unsupported',
  });

  assert.deepEqual(clips, []);
});
