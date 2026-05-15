import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildReferenceContextBlock,
  normalizePolishedPromptReferences,
} from '../src/services/promptPolish.ts';

test('custom reference assets auto-insert role and scene image tokens', () => {
  const prompt = normalizePolishedPromptReferences(
    '开场三秒用低机位推进，浪人在雨夜城门前拔刀收势，电影感逆光。',
    [
      {
        slotId: 'role-1',
        title: '雨夜浪人',
        kind: 'image',
        filename: 'ronin.png',
        token: '@图片1',
        semanticRole: 'role',
      },
      {
        slotId: 'scene-1',
        title: '雨夜城门',
        kind: 'image',
        filename: 'gate.png',
        token: '@图片2',
        semanticRole: 'scene',
      },
    ],
    { mode: 'custom' },
  );

  assert.match(prompt, /@图片1/);
  assert.match(prompt, /@图片2/);
  assert.match(prompt, /雨夜浪人/);
  assert.match(prompt, /雨夜城门/);
});

test('motion transfer reference assets auto-insert video token', () => {
  const prompt = normalizePolishedPromptReferences(
    '参考动作源的节奏，让角色在霓虹街区完成快速转身和定格。',
    [
      {
        slotId: 'motion-1',
        title: '街舞动作源',
        kind: 'video',
        filename: 'dance.mp4',
        token: '@视频1',
        semanticRole: 'motion',
      },
    ],
    { mode: 'motion-transfer' },
  );

  assert.match(prompt, /@视频1/);
  assert.match(prompt, /动作/);
});

test('unavailable fictional material tokens are removed', () => {
  const prompt = normalizePolishedPromptReferences(
    '@图片1 作为角色参考，@图片9 作为不存在的尾帧，@视频3 作为不存在的视频。',
    [
      {
        slotId: 'role-1',
        title: '主角',
        kind: 'image',
        filename: 'hero.png',
        token: '@图片1',
      },
    ],
    { mode: 'custom' },
  );

  assert.match(prompt, /@图片1/);
  assert.doesNotMatch(prompt, /@图片9/);
  assert.doesNotMatch(prompt, /@视频3/);
});

test('normalization does not invent tokens when no reference assets are available', () => {
  const prompt = normalizePolishedPromptReferences(
    '无参考素材时，只写具体画面、动作、运镜和社媒钩子。',
    [],
    { mode: 'custom' },
  );

  assert.doesNotMatch(prompt, /@(图片|视频|音频)\d+/);
});

test('reference context block exposes only available material tokens', () => {
  const block = buildReferenceContextBlock(
    [
      {
        slotId: 'role-1',
        title: '主角',
        kind: 'image',
        filename: 'hero.png',
        token: '@图片1',
      },
    ],
    { mode: 'custom' },
  );

  assert.match(block, /@图片1/);
  assert.doesNotMatch(block, /@图片2/);
  assert.doesNotMatch(block, /@视频1/);
});
