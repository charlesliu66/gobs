import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveEditorProjectSaveName,
  resolveProductionProjectSaveTitle,
} from '../src/services/projectPersistenceGuards.ts';

test('resolveEditorProjectSaveName rejects a new editor project without a real name', () => {
  const result = resolveEditorProjectSaveName({
    incomingName: '   ',
    isNewProject: true,
  });

  assert.equal(result.ok, false);
  assert.match(result.error ?? '', /name/i);
});

test('resolveEditorProjectSaveName keeps the previous name for existing editor projects', () => {
  const result = resolveEditorProjectSaveName({
    incomingName: '   ',
    existingName: 'TikTok Hook Cut',
    isNewProject: false,
  });

  assert.deepEqual(result, {
    ok: true,
    name: 'TikTok Hook Cut',
  });
});

test('resolveProductionProjectSaveTitle rejects a new production project without a real title', () => {
  const result = resolveProductionProjectSaveTitle({
    incomingTitle: '',
    isNewProject: true,
  });

  assert.equal(result.ok, false);
  assert.match(result.error ?? '', /title/i);
});

test('resolveProductionProjectSaveTitle keeps the previous title for existing projects', () => {
  const result = resolveProductionProjectSaveTitle({
    incomingTitle: '',
    existingTitle: 'Ice Queen Campaign',
    isNewProject: false,
  });

  assert.deepEqual(result, {
    ok: true,
    title: 'Ice Queen Campaign',
  });
});

test('project persistence guards normalize explicit names and titles', () => {
  const editor = resolveEditorProjectSaveName({
    incomingName: '  Hook V2  ',
    isNewProject: true,
  });
  const production = resolveProductionProjectSaveTitle({
    incomingTitle: '  Storyboard Sprint  ',
    isNewProject: true,
  });

  assert.deepEqual(editor, { ok: true, name: 'Hook V2' });
  assert.deepEqual(production, { ok: true, title: 'Storyboard Sprint' });
});
