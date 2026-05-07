import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildEditorCreativeKnowledgeContextFromStrategy,
  buildCreativeBriefPromptBlock,
  buildCreativeHookOptions,
  buildCreativeStrategy,
  buildDefaultCreativeUserMessage,
  normalizeEditorCreativeKnowledgeContext,
  normalizeEditorCreativeBrief,
  normalizeEditorCreativeStrategy,
  normalizeEditorCreativeVariant,
  normalizeEditorCreativeVariantPack,
  resolveEditorCreativeKnowledgeState,
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

  const promptBlock = buildCreativeBriefPromptBlock(brief!, strategy, undefined, 'en');
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

test('normalizeEditorCreativeKnowledgeContext trims and dedupes applied knowledge fields', () => {
  const knowledgeContext = normalizeEditorCreativeKnowledgeContext({
    selectedPackIds: ' pack_a , pack_b , pack_a ',
    marketTruth: ['high competition', ' high competition ', 'reward windows matter'],
    toneRules: ' fast pacing \n keep CTA visible ',
    forbiddenClaims: ' no guaranteed SSR ; no fake scarcity ',
  });

  assert.deepEqual(knowledgeContext, {
    selectedPackIds: ['pack_a', 'pack_b'],
    marketTruth: ['high competition', 'reward windows matter'],
    audienceTension: [],
    toneRules: ['fast pacing', 'keep CTA visible'],
    forbiddenClaims: ['no guaranteed SSR', 'no fake scarcity'],
    approvedAngles: [],
    hookCandidates: [],
    visualCues: [],
    rationaleNotes: [],
  });
});

test('buildEditorCreativeKnowledgeContextFromStrategy reconstructs knowledge arrays from strategy', () => {
  const knowledgeContext = buildEditorCreativeKnowledgeContextFromStrategy({
    platform: 'tiktok',
    mode: 'tiktok_content',
    objective: 'content growth',
    hookOptions: ['Open on the reward reveal'],
    recommendedHook: 'Open on the reward reveal',
    cta: 'Follow for more',
    rationale: 'Keep the reward beat visible early.',
    assetNeeds: ['Reward splash frame'],
    riskNotes: ['Avoid fake urgency'],
    knowledgePackIds: ['pack_a'],
    marketTruth: ['Reward windows drive conversion spikes'],
    audienceTension: ['Players need proof before they click'],
    toneRules: ['Keep the payoff visible in the first 2 seconds'],
    forbiddenClaims: ['No guaranteed SSR'],
    visualCues: ['Reward splash frame'],
    approvedAngles: ['Show the live-ops timing advantage'],
    hookCandidates: ['Start with the reward reveal'],
  });

  assert.deepEqual(knowledgeContext, {
    selectedPackIds: ['pack_a'],
    marketTruth: ['Reward windows drive conversion spikes'],
    audienceTension: ['Players need proof before they click'],
    toneRules: ['Keep the payoff visible in the first 2 seconds'],
    forbiddenClaims: ['No guaranteed SSR'],
    approvedAngles: ['Show the live-ops timing advantage'],
    hookCandidates: ['Start with the reward reveal'],
    visualCues: ['Reward splash frame'],
    rationaleNotes: [],
  });
});

test('resolveEditorCreativeKnowledgeState backfills a fallback strategy from brief and knowledge context', () => {
  const brief = normalizeEditorCreativeBrief({
    mode: 'tiktok_ua',
    sellingPoints: ['launch rewards'],
    objective: 'drive installs',
    audience: 'RPG players',
    cta: 'Play now',
  });

  const resolved = resolveEditorCreativeKnowledgeState({
    brief,
    knowledgePackIds: ['pack_a'],
    knowledgeContext: normalizeEditorCreativeKnowledgeContext({
      selectedPackIds: ['pack_b'],
      marketTruth: ['Reward windows drive conversion spikes'],
      audienceTension: ['Players need proof before they click'],
      toneRules: ['Keep the payoff visible in the first 2 seconds'],
      forbiddenClaims: ['No guaranteed SSR'],
      approvedAngles: ['Show the live-ops timing advantage'],
      hookCandidates: ['Start with the reward reveal'],
      visualCues: ['Reward splash frame'],
      rationaleNotes: ['Prioritize live-ops urgency without fake scarcity'],
    }),
    replyLocale: 'en',
  });

  assert.equal(resolved.creativeStrategy?.sellingPointFocus, 'launch rewards');
  assert.deepEqual(resolved.knowledgePackIds, ['pack_b']);
  assert.deepEqual(resolved.creativeStrategy?.knowledgePackIds, ['pack_b']);
  assert.deepEqual(resolved.creativeStrategy?.marketTruth, ['Reward windows drive conversion spikes']);
  assert.deepEqual(resolved.creativeStrategy?.toneRules, ['Keep the payoff visible in the first 2 seconds']);
  assert.deepEqual(resolved.creativeStrategy?.hookCandidates, ['Start with the reward reveal']);
  assert.deepEqual(resolved.knowledgeContext?.rationaleNotes, [
    'Prioritize live-ops urgency without fake scarcity',
  ]);
});

test('buildCreativeBriefPromptBlock includes applied knowledge section', () => {
  const brief = normalizeEditorCreativeBrief({
    mode: 'tiktok_ua',
    sellingPoints: ['launch rewards'],
    objective: 'drive installs',
    cta: 'Play now',
  });
  const strategy = normalizeEditorCreativeStrategy({
    mode: 'tiktok_ua',
    objective: 'drive installs',
    targetAudience: 'RPG players',
    sellingPointFocus: 'launch rewards',
    hookOptions: ['Open on launch rewards'],
    recommendedHook: 'Open on launch rewards',
    hookApproach: 'benefit_first',
    cta: 'Play now',
    ctaType: 'direct_response',
    rationale: 'Lead with the reward window.',
    angle: 'Reward-first opener',
    tone: 'Fast and payoff-led',
    assetNeeds: ['Reward splash frame'],
    riskNotes: ['Avoid fake urgency'],
    knowledgePackIds: ['pack_a'],
    marketTruth: ['Reward windows drive conversion spikes'],
    audienceTension: ['Players need proof before they click'],
    toneRules: ['Keep the payoff visible in the first 2 seconds'],
    forbiddenClaims: ['No guaranteed SSR'],
    visualCues: ['Reward splash frame'],
    approvedAngles: ['Show the live-ops timing advantage'],
    hookCandidates: ['Start with the reward reveal'],
  });

  const promptBlock = buildCreativeBriefPromptBlock(
    brief!,
    strategy!,
    buildEditorCreativeKnowledgeContextFromStrategy(strategy!),
    'en',
  );

  assert.match(promptBlock, /Applied Knowledge/);
  assert.match(promptBlock, /Market truth/);
  assert.match(promptBlock, /Reward windows drive conversion spikes/);
  assert.match(promptBlock, /Forbidden claims/);
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

  const promptBlock = buildCreativeBriefPromptBlockWithVariant(
    brief!,
    strategy,
    variant,
    undefined,
    undefined,
    'en',
  );
  assert.match(promptBlock, /Selected variant/i);
  assert.match(promptBlock, /Hook punch/);
  assert.match(promptBlock, /Cut hard inside the first 2 seconds/i);
});
