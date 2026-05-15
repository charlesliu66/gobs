import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assignPromptReferenceTokens,
  getPromptReferenceUsage,
  insertPromptReferenceToken,
} from '../src/utils/promptReferenceTokens.ts';

test('assignPromptReferenceTokens numbers assets by media kind', () => {
  const sources = assignPromptReferenceTokens([
    { id: 'role', kind: 'image' as const },
    { id: 'motion', kind: 'video' as const },
    { id: 'scene', kind: 'image' as const },
  ]);

  assert.deepEqual(sources.map((source) => source.token), ['@图片1', '@视频1', '@图片2']);
});

test('insertPromptReferenceToken inserts at cursor and avoids duplicates', () => {
  const inserted = insertPromptReferenceToken('角色冲刺', '@图片1', 2, 2);
  assert.equal(inserted.value, '角色 @图片1 冲刺');
  assert.equal(inserted.inserted, true);

  const duplicate = insertPromptReferenceToken(inserted.value, '@图片1', inserted.value.length, inserted.value.length);
  assert.equal(duplicate.value, inserted.value);
  assert.equal(duplicate.inserted, false);
});

test('getPromptReferenceUsage marks referenced and missing tokens', () => {
  const usage = getPromptReferenceUsage(
    '用 @图片1 保持角色一致',
    assignPromptReferenceTokens([
      { id: 'role', kind: 'image' as const, filename: 'role.png' },
      { id: 'scene', kind: 'image' as const, filename: 'scene.png' },
    ]),
  );

  assert.deepEqual(usage.map((item) => [item.source.token, item.referenced]), [
    ['@图片1', true],
    ['@图片2', false],
  ]);
});
