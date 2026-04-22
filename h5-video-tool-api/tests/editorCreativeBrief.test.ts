import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCreativeBriefPromptBlock,
  buildCreativeHookOptions,
  buildCreativeStrategy,
  buildDefaultCreativeUserMessage,
  normalizeEditorCreativeBrief,
} from '../src/services/editorCreativeBrief.ts';

test('normalizeEditorCreativeBrief trims blanks and defaults content mode', () => {
  const brief = normalizeEditorCreativeBrief({
    mode: 'unknown',
    sellingPoints: 'SSR pull,  launch rewards ',
    audience: '  anime fans ',
  });

  assert.deepEqual(brief, {
    platform: 'tiktok',
    mode: 'tiktok_content',
    objective: undefined,
    audience: 'anime fans',
    sellingPoints: ['SSR pull', 'launch rewards'],
    cta: undefined,
    referenceStyle: undefined,
  });
});

test('buildDefaultCreativeUserMessage creates UA brief copy', () => {
  const brief = normalizeEditorCreativeBrief({
    mode: 'tiktok_ua',
    sellingPoints: ['boss fight payoff'],
    audience: 'RPG players',
  });

  assert.ok(brief);
  const message = buildDefaultCreativeUserMessage(brief!);
  assert.match(message, /TikTok/);
  assert.match(message, /boss fight payoff/);
  assert.match(message, /Download now/);
});

test('buildCreativeHookOptions returns stronger hooks for UA mode', () => {
  const brief = normalizeEditorCreativeBrief({
    mode: 'tiktok_ua',
    sellingPoints: ['instant SSR drop'],
  });

  const hooks = buildCreativeHookOptions(brief!);
  assert.equal(hooks.length, 4);
  assert.match(hooks[0]!, /instant SSR drop/);
});

test('buildCreativeStrategy adds rationale and CTA for content mode', () => {
  const brief = normalizeEditorCreativeBrief({
    mode: 'tiktok_content',
    sellingPoints: ['ice queen reveal'],
    audience: 'fantasy fans',
  });

  const strategy = buildCreativeStrategy(brief!);
  assert.ok(strategy);
  assert.equal(strategy?.cta, 'Follow for more');
  assert.match(strategy?.rationale ?? '', /TikTok/);
});

test('buildCreativeBriefPromptBlock includes hook and rationale', () => {
  const brief = normalizeEditorCreativeBrief({
    mode: 'tiktok_ua',
    sellingPoints: ['launch rewards'],
    objective: 'drive installs',
    cta: 'Play now',
  });
  const strategy = buildCreativeStrategy(brief!);

  const promptBlock = buildCreativeBriefPromptBlock(brief!, strategy);
  assert.match(promptBlock, /TikTok Campaign Brief/);
  assert.match(promptBlock, /Recommended hook/);
  assert.match(promptBlock, /Play now/);
});
