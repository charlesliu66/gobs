import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCreativeBriefPromptBlock,
  buildCreativeHookOptions,
  buildCreativeStrategy,
  buildDefaultCreativeUserMessage,
  normalizeEditorCreativeBrief,
  normalizeEditorCreativeStrategy,
  normalizeEditorCreativeVariant,
  normalizeEditorCreativeVariantPack,
} from '../src/services/editorCreativeBrief.ts';
import {
  buildCreativeBriefPromptBlockWithVariant,
} from '../src/services/editorCreativeVariantContext.ts';

test('normalizeEditorCreativeBrief trims blanks and defaults content mode', () => {
  const brief = normalizeEditorCreativeBrief({
    mode: 'unknown',
    sellingPoints: 'SSR pull,  launch rewards ',
    audience: '  anime fans ',
  });

  assert.deepEqual(brief, {
    briefId: undefined,
    platform: 'tiktok',
    mode: 'tiktok_content',
    objective: undefined,
    audience: 'anime fans',
    sellingPoints: ['SSR pull', 'launch rewards'],
    cta: undefined,
    referenceStyle: undefined,
    region: undefined,
    forbiddenClaims: [],
  });
});

test('normalizeEditorCreativeBrief splits full-width semicolons', () => {
  const brief = normalizeEditorCreativeBrief({
    mode: 'tiktok_content',
    sellingPoints: 'hook one；hook two',
    forbiddenClaims: 'claim one；claim two',
  });

  assert.ok(brief);
  assert.deepEqual(brief?.sellingPoints, ['hook one', 'hook two']);
  assert.deepEqual(brief?.forbiddenClaims, ['claim one', 'claim two']);
});

test('buildDefaultCreativeUserMessage creates UA brief copy', () => {
  const brief = normalizeEditorCreativeBrief({
    mode: 'tiktok_ua',
    sellingPoints: ['boss fight payoff'],
    audience: 'RPG players',
  });

  assert.ok(brief);
  const message = buildDefaultCreativeUserMessage(brief!, undefined, 'en');
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
  assert.equal(hooks.length, 3);
  assert.match(hooks[0]!, /instant SSR drop/);
});

test('buildCreativeStrategy adds rationale and CTA for content mode', () => {
  const brief = normalizeEditorCreativeBrief({
    mode: 'tiktok_content',
    sellingPoints: ['ice queen reveal'],
    audience: 'fantasy fans',
  });

  const strategy = buildCreativeStrategy(brief!, 'en');
  assert.ok(strategy);
  assert.equal(strategy?.cta, 'Follow for more');
  assert.equal(strategy?.targetAudience, 'fantasy fans');
  assert.equal(strategy?.sellingPointFocus, 'ice queen reveal');
});

test('buildCreativeStrategy assigns a default hook approach by mode', () => {
  const brief = normalizeEditorCreativeBrief({
    mode: 'tiktok_ua',
    sellingPoints: ['launch rewards'],
  });

  const strategy = buildCreativeStrategy(brief!, 'en');
  assert.ok(strategy);
  assert.equal(strategy?.hookApproach, 'conflict_first');
});

test('buildCreativeBriefPromptBlock includes hook and rationale', () => {
  const brief = normalizeEditorCreativeBrief({
    mode: 'tiktok_ua',
    sellingPoints: ['launch rewards'],
    objective: 'drive installs',
    cta: 'Play now',
  });
  const strategy = buildCreativeStrategy(brief!, 'en');

  const promptBlock = buildCreativeBriefPromptBlock(brief!, strategy, 'en');
  assert.match(promptBlock, /TikTok Campaign Brief/);
  assert.match(promptBlock, /Strategy ID/);
  assert.match(promptBlock, /Recommended hook/);
  assert.match(promptBlock, /Play now/);
});

test('buildDefaultCreativeUserMessage respects tuned hook approach', () => {
  const brief = normalizeEditorCreativeBrief({
    mode: 'tiktok_content',
    sellingPoints: ['ice queen reveal'],
    audience: 'fantasy fans',
  });
  const strategy = normalizeEditorCreativeStrategy({
    mode: 'tiktok_content',
    objective: 'content growth',
    targetAudience: 'fantasy fans',
    sellingPointFocus: 'ice queen reveal',
    hookOptions: ['Start inside the reveal.'],
    recommendedHook: 'Start inside the reveal.',
    hookApproach: 'story_first',
    cta: 'Follow for more',
    ctaType: 'brand_follow',
    rationale: 'Anchor the opening in a story beat before the CTA lands.',
    angle: 'story-first reveal',
    tone: 'brand-forward and native',
    assetNeeds: ['A reveal-first hero visual'],
    riskNotes: ['Avoid overclaiming the reveal'],
  });

  const message = buildDefaultCreativeUserMessage(brief!, strategy!, 'en');
  assert.match(message, /story-first/i);
});

test('normalizeEditorCreativeVariantPack keeps selected variant and ignores broken entries', () => {
  const pack = normalizeEditorCreativeVariantPack({
    variantPackId: 'pack_a',
    briefId: 'brief_a',
    strategyId: 'strategy_a',
    mode: 'tiktok_ua',
    selectedVariantId: 'variant_b',
    comparisonAxes: 'Hook, CTA',
    variants: [
      {
        variantId: 'variant_a',
        title: 'Hook punch',
        hook: 'Open on reward',
        cta: 'Download now',
        differenceSummary: 'Aggressive hook',
      },
      {
        variantId: 'variant_b',
        title: 'CTA push',
        hook: 'Show the payoff',
        cta: 'Install today',
        differenceSummary: 'CTA-forward close',
      },
      { variantId: 'broken' },
    ],
  });

  assert.equal(pack?.selectedVariantId, 'variant_b');
  assert.deepEqual(pack?.comparisonAxes, ['Hook', 'CTA']);
  assert.equal(pack?.variants.length, 2);
});

test('buildCreativeBriefPromptBlock includes selected variant context', () => {
  const brief = normalizeEditorCreativeBrief({
    mode: 'tiktok_ua',
    sellingPoints: ['launch rewards', 'boss payoff'],
    objective: 'drive installs',
    cta: 'Play now',
  });
  const strategy = buildCreativeStrategy(brief!, 'en');
  const variant = normalizeEditorCreativeVariant({
    variantId: 'variant_a',
    variantPackId: 'pack_a',
    strategyId: strategy?.strategyId,
    briefId: brief?.briefId,
    emphasis: 'hook_focus',
    title: 'Hook punch',
    hook: 'Open on launch rewards before the logo appears.',
    openingBeat: 'Start on the reward screen, then snap into gameplay.',
    sellingPointFocus: 'launch rewards',
    cta: 'Play now',
    ctaType: 'direct_response',
    editingDirection: 'Cut hard inside the first 2 seconds.',
    assetSuggestion: 'Reward splash frame',
    differenceSummary: 'Most aggressive opening of the pack.',
  });

  const promptBlock = buildCreativeBriefPromptBlockWithVariant(brief!, strategy, variant, undefined, 'en');
  assert.match(promptBlock, /Selected variant/i);
  assert.match(promptBlock, /Hook punch/);
  assert.match(promptBlock, /Cut hard inside the first 2 seconds/i);
});
