import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeEditorCreativeBriefForRequest,
  normalizeEditorCreativeVariantForRequest,
  normalizeEditorCreativeVariantPackForRequest,
} from '../src/editor/utils/editorCreativeBrief.ts';

test('normalizeEditorCreativeBriefForRequest returns undefined for empty form', () => {
  const brief = normalizeEditorCreativeBriefForRequest({});
  assert.equal(brief, undefined);
});

test('normalizeEditorCreativeBriefForRequest defaults to tiktok content mode', () => {
  const brief = normalizeEditorCreativeBriefForRequest({
    sellingPoints: 'open world exploration',
  });

  assert.deepEqual(brief, {
    briefId: undefined,
    platform: 'tiktok',
    mode: 'tiktok_content',
    objective: undefined,
    audience: undefined,
    sellingPoints: ['open world exploration'],
    cta: undefined,
    referenceStyle: undefined,
    region: undefined,
    forbiddenClaims: [],
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

test('normalizeEditorCreativeVariantForRequest trims content and keeps ids', () => {
  const variant = normalizeEditorCreativeVariantForRequest({
    variantId: ' variant_a ',
    variantPackId: ' pack_a ',
    strategyId: ' strategy_a ',
    briefId: ' brief_a ',
    emphasis: 'hook_focus',
    title: ' Hook punch ',
    hook: ' Launch inside the payoff ',
    openingBeat: ' Start on the reward screen ',
    sellingPointFocus: 'SSR launch rewards',
    cta: ' Download now ',
    ctaType: 'direct_response',
    editingDirection: ' fast contrast ',
    assetSuggestion: ' reward reveal shot ',
    differenceSummary: ' most aggressive opener ',
  });

  assert.deepEqual(variant, {
    variantId: 'variant_a',
    variantPackId: 'pack_a',
    strategyId: 'strategy_a',
    briefId: 'brief_a',
    emphasis: 'hook_focus',
    title: 'Hook punch',
    hook: 'Launch inside the payoff',
    openingBeat: 'Start on the reward screen',
    sellingPointFocus: 'SSR launch rewards',
    cta: 'Download now',
    ctaType: 'direct_response',
    editingDirection: 'fast contrast',
    assetSuggestion: 'reward reveal shot',
    differenceSummary: 'most aggressive opener',
    isRecommended: false,
  });
});

test('normalizeEditorCreativeVariantPackForRequest keeps only valid variants', () => {
  const pack = normalizeEditorCreativeVariantPackForRequest({
    variantPackId: ' pack_a ',
    briefId: ' brief_a ',
    strategyId: ' strategy_a ',
    mode: 'tiktok_ua',
    summary: ' compare three directions ',
    comparisonAxes: 'Hook, CTA',
    selectedVariantId: ' variant_b ',
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

  assert.equal(pack?.variantPackId, 'pack_a');
  assert.equal(pack?.selectedVariantId, 'variant_b');
  assert.deepEqual(pack?.comparisonAxes, ['Hook', 'CTA']);
  assert.equal(pack?.variants.length, 2);
});

test('normalizeEditorCreativeVariant helpers return undefined for missing payloads', () => {
  assert.equal(normalizeEditorCreativeVariantForRequest(undefined), undefined);
  assert.equal(normalizeEditorCreativeVariantPackForRequest(undefined), undefined);
});
