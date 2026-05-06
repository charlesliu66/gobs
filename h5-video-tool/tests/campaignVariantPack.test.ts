import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildBriefFromForm,
  buildDefaultStrategyTuning,
  buildStrategyFromBrief,
  buildVariantPackFromStrategy,
} from '../src/components/campaign/strategy.ts';

test('buildVariantPackFromStrategy returns three differentiated variants', () => {
  const brief = buildBriefFromForm({
    mode: 'tiktok_ua',
    objective: 'Drive RPG installs',
    audience: 'anime RPG players',
    sellingPointsText: 'SSR launch rewards\nBoss-fight payoff\nIce queen reveal',
    cta: '',
    referenceStyle: 'fast hook + gameplay proof',
    region: 'US',
    forbiddenClaimsText: 'No guaranteed rewards',
  });
  const strategy = buildStrategyFromBrief(brief, {
    strategyId: 'strategy_fixed',
    tuning: buildDefaultStrategyTuning(brief),
  });

  const pack = buildVariantPackFromStrategy(brief, strategy);

  assert.equal(pack.variantPackId, 'variant_pack_strategy_fixed');
  assert.equal(pack.briefId, brief.briefId);
  assert.equal(pack.strategyId, 'strategy_fixed');
  assert.equal(pack.variants.length, 3);
  assert.equal(pack.selectedVariantId, pack.variants[0]?.variantId);
  assert.deepEqual(
    pack.variants.map((variant) => variant.emphasis),
    ['hook_focus', 'selling_point_focus', 'cta_focus'],
  );
  assert.deepEqual(
    pack.variants.map((variant) => variant.strategyId),
    ['strategy_fixed', 'strategy_fixed', 'strategy_fixed'],
  );
  assert.notEqual(pack.variants[0]?.hook, pack.variants[1]?.hook);
  assert.notEqual(pack.variants[1]?.sellingPointFocus, pack.variants[0]?.sellingPointFocus);
  assert.notEqual(pack.variants[2]?.cta, pack.variants[0]?.cta);
  assert.ok(pack.variants.every((variant) => variant.differenceSummary.length > 0));
});

test('buildVariantPackFromStrategy keeps stable slot ids when strategy id is reused', () => {
  const brief = buildBriefFromForm({
    mode: 'tiktok_content',
    objective: 'Grow brand affinity',
    audience: 'fantasy fans',
    sellingPointsText: 'Ice queen reveal\nWorld building\nEmotional payoff',
    cta: '',
    referenceStyle: 'story-led reveal',
    region: '',
    forbiddenClaimsText: '',
  });
  const strategy = buildStrategyFromBrief(brief, {
    strategyId: 'strategy_shared',
    tuning: buildDefaultStrategyTuning(brief),
  });

  const firstPack = buildVariantPackFromStrategy(brief, strategy);
  const secondPack = buildVariantPackFromStrategy(brief, strategy);

  assert.deepEqual(
    firstPack.variants.map((variant) => variant.variantId),
    secondPack.variants.map((variant) => variant.variantId),
  );
});

test('buildVariantPackFromStrategy respects explicit brief CTA and still keeps hook directions distinct', () => {
  const brief = buildBriefFromForm({
    mode: 'tiktok_content',
    objective: 'Drive store visits',
    audience: 'fantasy fans',
    sellingPointsText: 'Ice queen reveal',
    cta: 'Visit our store',
    referenceStyle: 'story-led reveal',
    region: 'US',
    forbiddenClaimsText: '',
  });
  const strategy = buildStrategyFromBrief(brief, {
    strategyId: 'strategy_cta',
    tuning: buildDefaultStrategyTuning(brief),
  });

  const pack = buildVariantPackFromStrategy(brief, strategy);

  assert.ok(pack.variants.every((variant) => variant.cta === 'Visit our store'));
  assert.equal(new Set(pack.variants.map((variant) => variant.hook)).size, 3);
});

test('buildVariantPackFromStrategy stays differentiated even with one selling point', () => {
  const brief = buildBriefFromForm({
    mode: 'tiktok_ua',
    objective: 'Drive installs',
    audience: 'anime RPG players',
    sellingPointsText: 'Boss-fight payoff',
    cta: '',
    referenceStyle: 'fast hook + gameplay proof',
    region: 'US',
    forbiddenClaimsText: '',
  });
  const strategy = buildStrategyFromBrief(brief, {
    strategyId: 'strategy_single_point',
    tuning: buildDefaultStrategyTuning(brief),
  });

  const pack = buildVariantPackFromStrategy(brief, strategy);

  assert.equal(new Set(pack.variants.map((variant) => variant.hook)).size, 3);
  assert.equal(new Set(pack.variants.map((variant) => variant.differenceSummary)).size, 3);
});
