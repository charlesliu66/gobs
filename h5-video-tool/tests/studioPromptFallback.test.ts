import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildStudioPromptFallback,
  isWeakPolishedPrompt,
} from '../src/utils/studioPromptFallback.ts';

test('isWeakPolishedPrompt catches empty and mojibake-like cloud responses', () => {
  assert.equal(isWeakPolishedPrompt('', 'hero walks out'), true);
  assert.equal(isWeakPolishedPrompt('?????????????????????', 'hero walks out'), true);
  assert.equal(isWeakPolishedPrompt('A cinematic hero reveal with @图片1 as the subject reference.', 'hero'), false);
});

test('buildStudioPromptFallback keeps available reference tokens and motion URL context', () => {
  const prompt = buildStudioPromptFallback('角色从废墟里走出来', {
    mode: 'viral-dance',
    duration: 8,
    aspectRatio: '9:16',
    locale: 'zh',
    referenceVideoUrl: 'https://www.tiktok.com/@demo/video/123',
    referenceAssets: [
      { slotId: 'role', title: '主角', kind: 'image', token: '@图片1', semanticRole: 'role' },
      { slotId: 'motion', title: '动作', kind: 'video', token: '@视频1' },
    ],
  });

  assert.match(prompt, /@图片1/);
  assert.match(prompt, /@视频1/);
  assert.match(prompt, /8s/);
  assert.match(prompt, /9:16/);
  assert.match(prompt, /公开视频链接/);
});
