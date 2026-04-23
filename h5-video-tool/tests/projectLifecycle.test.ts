import test from 'node:test';
import assert from 'node:assert/strict';

import {
  hasMeaningfulEditorDraft,
  hasMeaningfulProductionDraft,
  isUnnamedEditorProjectName,
  isUnnamedProductionProjectTitle,
  resolveUnnamedProjectGovernanceAction,
  shouldRequireEditorProjectNaming,
  shouldRequireProductionProjectNaming,
  suggestEditorProjectName,
  suggestProductionProjectTitle,
} from '../src/utils/projectLifecycle.ts';

test('detects unnamed editor and production project titles', () => {
  assert.equal(isUnnamedEditorProjectName(''), true);
  assert.equal(isUnnamedEditorProjectName('未命名剪辑项目'), true);
  assert.equal(isUnnamedEditorProjectName('Edit-0423'), false);

  assert.equal(isUnnamedProductionProjectTitle(''), true);
  assert.equal(isUnnamedProductionProjectTitle('未命名项目'), true);
  assert.equal(isUnnamedProductionProjectTitle('北境冰原活动企划'), false);
});

test('editor draft becomes meaningful only after real work exists', () => {
  assert.equal(
    hasMeaningfulEditorDraft({
      project: { tracks: [{ type: 'video', clips: [] }], subtitles: [] },
      assets: {},
      projectMemory: {
        rawEvents: [],
        stableFacts: [],
        preferenceSignals: [],
        negativePreferenceSignals: [],
        decisionLog: [],
        openIssues: [],
      },
    }),
    false,
  );

  assert.equal(
    hasMeaningfulEditorDraft({
      project: {
        tracks: [{ type: 'video', clips: [{ id: 'clip-1' }] }],
        subtitles: [],
      },
      assets: {},
      projectMemory: {
        rawEvents: [],
        stableFacts: [],
        preferenceSignals: [],
        negativePreferenceSignals: [],
        decisionLog: [],
        openIssues: [],
      },
    }),
    true,
  );
});

test('production draft becomes meaningful after generated content appears', () => {
  assert.equal(
    hasMeaningfulProductionDraft({
      project: {
        meta: { title: '' },
        story: null,
        productionDesign: null,
        shots: [],
        characterAssets: [],
        sceneAssets: [],
        propAssets: [],
      },
      characterBible: '',
      synopsis: '',
    }),
    false,
  );

  assert.equal(
    hasMeaningfulProductionDraft({
      project: {
        meta: { title: '' },
        story: { summary: '一位流亡女王回到冰原' },
        productionDesign: null,
        shots: [],
        characterAssets: [],
        sceneAssets: [],
        propAssets: [],
      },
      characterBible: '',
      synopsis: '',
    }),
    true,
  );
});

test('suggestEditorProjectName prefers source production title or asset name', () => {
  assert.equal(
    suggestEditorProjectName({
      sourceProductionTitle: '北境冰原活动分镜',
      fallbackDate: new Date(2026, 3, 23, 15, 30),
    }),
    '北境冰原活动分镜',
  );

  assert.equal(
    suggestEditorProjectName({
      assets: [{ originalName: 'hero_hook_v3.mp4' }],
      fallbackDate: new Date(2026, 3, 23, 15, 30),
    }),
    'hero_hook_v3',
  );
});

test('suggestProductionProjectTitle prefers story-like signals before fallback', () => {
  assert.equal(
    suggestProductionProjectTitle({
      storySummary: '北境流亡女王重返雪原王座',
      fallbackDate: new Date(2026, 3, 23, 15, 30),
    }),
    '北境流亡女王重返雪原王座',
  );

  assert.match(
    suggestProductionProjectTitle({
      fallbackDate: new Date(2026, 3, 23, 15, 30),
    }),
    /^高级制片-0423-1530$/,
  );
});

test('requires naming before first formal save on editor and production drafts', () => {
  assert.equal(
    shouldRequireEditorProjectNaming({
      projectName: '',
      hasPersistedProject: false,
      draftIsMeaningful: true,
    }),
    true,
  );

  assert.equal(
    shouldRequireEditorProjectNaming({
      projectName: '北境冰原活动混剪',
      hasPersistedProject: false,
      draftIsMeaningful: true,
    }),
    false,
  );

  assert.equal(
    shouldRequireProductionProjectNaming({
      projectTitle: '',
      hasPersistedProject: false,
      draftIsMeaningful: true,
    }),
    true,
  );

  assert.equal(
    shouldRequireProductionProjectNaming({
      projectTitle: '',
      hasPersistedProject: true,
      draftIsMeaningful: true,
    }),
    false,
  );
});

test('governance action deletes empty unnamed projects and renames meaningful unnamed projects', () => {
  assert.equal(
    resolveUnnamedProjectGovernanceAction({
      isUnnamed: true,
      draftIsMeaningful: false,
    }),
    'delete',
  );

  assert.equal(
    resolveUnnamedProjectGovernanceAction({
      isUnnamed: true,
      draftIsMeaningful: true,
    }),
    'rename',
  );

  assert.equal(
    resolveUnnamedProjectGovernanceAction({
      isUnnamed: false,
      draftIsMeaningful: true,
    }),
    'ignore',
  );
});
