import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeEditorCreativeBriefForRequest } from '../src/editor/utils/editorCreativeBrief.ts';

test('normalizeEditorCreativeBriefForRequest returns undefined for empty form', () => {
  const brief = normalizeEditorCreativeBriefForRequest({});
  assert.equal(brief, undefined);
});

test('normalizeEditorCreativeBriefForRequest defaults to tiktok content mode', () => {
  const brief = normalizeEditorCreativeBriefForRequest({
    sellingPoints: 'open world exploration',
  });

  assert.deepEqual(brief, {
    platform: 'tiktok',
    mode: 'tiktok_content',
    objective: undefined,
    audience: undefined,
    sellingPoints: ['open world exploration'],
    cta: undefined,
    referenceStyle: undefined,
  });
});

test('normalizeEditorCreativeBriefForRequest splits multiline selling points', () => {
  const brief = normalizeEditorCreativeBriefForRequest({
    mode: 'tiktok_ua',
    sellingPoints: 'SSR pull\nfast boss fight\nlaunch rewards',
    objective: 'drive installs',
  });

  assert.deepEqual(brief?.sellingPoints, ['SSR pull', 'fast boss fight', 'launch rewards']);
  assert.equal(brief?.mode, 'tiktok_ua');
  assert.equal(brief?.objective, 'drive installs');
});
