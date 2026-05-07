import { randomUUID } from 'crypto';
import { localizedText, type ReplyLocale } from './replyLocale.js';

export type EditorCreativeMode = 'tiktok_content' | 'tiktok_ua';
export type EditorCreativeCtaType = 'direct_response' | 'soft_conversion' | 'brand_follow';
export type EditorCreativeHookApproach = 'benefit_first' | 'conflict_first' | 'story_first';
export type EditorCreativeVariantEmphasis = 'hook_focus' | 'selling_point_focus' | 'cta_focus';

export interface EditorCreativeBrief {
  briefId?: string;
  platform: 'tiktok';
  mode: EditorCreativeMode;
  objective?: string;
  audience?: string;
  sellingPoints: string[];
  cta?: string;
  referenceStyle?: string;
  region?: string;
  forbiddenClaims?: string[];
}

export interface EditorCreativeKnowledgeContext {
  selectedPackIds: string[];
  marketTruth: string[];
  audienceTension: string[];
  toneRules: string[];
  forbiddenClaims: string[];
  approvedAngles: string[];
  hookCandidates: string[];
  visualCues: string[];
  rationaleNotes: string[];
}

export interface EditorCreativeStrategy {
  strategyId?: string;
  briefId?: string;
  platform: 'tiktok';
  mode: EditorCreativeMode;
  objective: string;
  targetAudience?: string;
  sellingPointFocus?: string;
  hookApproach?: EditorCreativeHookApproach;
  hookOptions: string[];
  recommendedHook: string;
  cta: string;
  ctaType?: EditorCreativeCtaType;
  rationale: string;
  angle?: string;
  tone?: string;
  assetNeeds: string[];
  riskNotes: string[];
  knowledgePackIds: string[];
  marketTruth: string[];
  audienceTension: string[];
  toneRules: string[];
  forbiddenClaims: string[];
  visualCues: string[];
  approvedAngles: string[];
  hookCandidates: string[];
}

export interface EditorCreativeVariant {
  variantId?: string;
  variantPackId?: string;
  strategyId?: string;
  briefId?: string;
  emphasis?: EditorCreativeVariantEmphasis;
  title: string;
  hook: string;
  openingBeat?: string;
  sellingPointFocus?: string;
  cta: string;
  ctaType?: EditorCreativeCtaType;
  editingDirection?: string;
  assetSuggestion?: string;
  differenceSummary: string;
  isRecommended?: boolean;
}

export interface EditorCreativeVariantPack {
  variantPackId?: string;
  briefId?: string;
  strategyId?: string;
  mode?: EditorCreativeMode;
  summary?: string;
  comparisonAxes: string[];
  variants: EditorCreativeVariant[];
  selectedVariantId?: string;
}

function cleanText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function uniqueStrings(items: string[]): string[] {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}

function normalizeStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => cleanText(item))
      .filter((item): item is string => Boolean(item));
  }
  if (typeof value === 'string') {
    return value
      .split(/\r?\n|,|;|，|；/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeVariantEmphasis(value: unknown): EditorCreativeVariantEmphasis | undefined {
  return value === 'hook_focus' || value === 'selling_point_focus' || value === 'cta_focus'
    ? value
    : undefined;
}

export function normalizeEditorCreativeKnowledgeContext(input: unknown): EditorCreativeKnowledgeContext | undefined {
  if (!input || typeof input !== 'object') return undefined;
  const raw = input as Record<string, unknown>;
  const selectedPackIds = uniqueStrings(
    normalizeStringList(raw.selectedPackIds ?? raw.knowledgePackIds),
  );
  const marketTruth = uniqueStrings(normalizeStringList(raw.marketTruth));
  const audienceTension = uniqueStrings(normalizeStringList(raw.audienceTension));
  const toneRules = uniqueStrings(normalizeStringList(raw.toneRules));
  const forbiddenClaims = uniqueStrings(normalizeStringList(raw.forbiddenClaims));
  const approvedAngles = uniqueStrings(normalizeStringList(raw.approvedAngles));
  const hookCandidates = uniqueStrings(normalizeStringList(raw.hookCandidates));
  const visualCues = uniqueStrings(normalizeStringList(raw.visualCues));
  const rationaleNotes = uniqueStrings(normalizeStringList(raw.rationaleNotes));

  const hasContent = Boolean(
    selectedPackIds.length > 0 ||
    marketTruth.length > 0 ||
    audienceTension.length > 0 ||
    toneRules.length > 0 ||
    forbiddenClaims.length > 0 ||
    approvedAngles.length > 0 ||
    hookCandidates.length > 0 ||
    visualCues.length > 0 ||
    rationaleNotes.length > 0,
  );
  if (!hasContent) {
    return undefined;
  }

  return {
    selectedPackIds,
    marketTruth,
    audienceTension,
    toneRules,
    forbiddenClaims,
    approvedAngles,
    hookCandidates,
    visualCues,
    rationaleNotes,
  };
}

export function buildEditorCreativeKnowledgeContextFromStrategy(
  strategy?: EditorCreativeStrategy | null,
): EditorCreativeKnowledgeContext | undefined {
  if (!strategy) return undefined;
  return normalizeEditorCreativeKnowledgeContext({
    selectedPackIds: strategy.knowledgePackIds,
    marketTruth: strategy.marketTruth,
    audienceTension: strategy.audienceTension,
    toneRules: strategy.toneRules,
    forbiddenClaims: strategy.forbiddenClaims,
    approvedAngles: strategy.approvedAngles,
    hookCandidates: strategy.hookCandidates,
    visualCues: strategy.visualCues,
  });
}

export function resolveEditorCreativeKnowledgeState(input: {
  brief?: EditorCreativeBrief;
  strategy?: EditorCreativeStrategy;
  knowledgeContext?: EditorCreativeKnowledgeContext;
  knowledgePackIds?: string[];
  replyLocale?: ReplyLocale;
}): {
  creativeStrategy?: EditorCreativeStrategy;
  knowledgeContext?: EditorCreativeKnowledgeContext;
  knowledgePackIds: string[];
} {
  const replyLocale = input.replyLocale ?? 'zh-CN';
  const inputKnowledgePackIds = uniqueStrings(input.knowledgePackIds ?? []);
  const baseStrategy = input.strategy ?? buildCreativeStrategy(input.brief, replyLocale);
  const baseKnowledgeContext =
    input.knowledgeContext ?? buildEditorCreativeKnowledgeContextFromStrategy(input.strategy);
  const resolvedKnowledgePackIds =
    baseKnowledgeContext?.selectedPackIds.length
      ? baseKnowledgeContext.selectedPackIds
      : inputKnowledgePackIds.length > 0
        ? inputKnowledgePackIds
        : (baseStrategy?.knowledgePackIds ?? []);
  const creativeStrategy = baseStrategy
    ? {
        ...baseStrategy,
        knowledgePackIds: resolvedKnowledgePackIds,
        marketTruth:
          baseStrategy.marketTruth.length > 0
            ? baseStrategy.marketTruth
            : (baseKnowledgeContext?.marketTruth ?? []),
        audienceTension:
          baseStrategy.audienceTension.length > 0
            ? baseStrategy.audienceTension
            : (baseKnowledgeContext?.audienceTension ?? []),
        toneRules:
          baseStrategy.toneRules.length > 0
            ? baseStrategy.toneRules
            : (baseKnowledgeContext?.toneRules ?? []),
        forbiddenClaims:
          baseStrategy.forbiddenClaims.length > 0
            ? baseStrategy.forbiddenClaims
            : (baseKnowledgeContext?.forbiddenClaims ?? []),
        visualCues:
          baseStrategy.visualCues.length > 0
            ? baseStrategy.visualCues
            : (baseKnowledgeContext?.visualCues ?? []),
        approvedAngles:
          baseStrategy.approvedAngles.length > 0
            ? baseStrategy.approvedAngles
            : (baseKnowledgeContext?.approvedAngles ?? []),
        hookCandidates:
          baseStrategy.hookCandidates.length > 0
            ? baseStrategy.hookCandidates
            : (baseKnowledgeContext?.hookCandidates ?? []),
      }
    : undefined;
  const knowledgeContext = normalizeEditorCreativeKnowledgeContext({
    selectedPackIds: creativeStrategy?.knowledgePackIds ?? resolvedKnowledgePackIds,
    marketTruth: creativeStrategy?.marketTruth ?? baseKnowledgeContext?.marketTruth,
    audienceTension: creativeStrategy?.audienceTension ?? baseKnowledgeContext?.audienceTension,
    toneRules: creativeStrategy?.toneRules ?? baseKnowledgeContext?.toneRules,
    forbiddenClaims: creativeStrategy?.forbiddenClaims ?? baseKnowledgeContext?.forbiddenClaims,
    approvedAngles: creativeStrategy?.approvedAngles ?? baseKnowledgeContext?.approvedAngles,
    hookCandidates: creativeStrategy?.hookCandidates ?? baseKnowledgeContext?.hookCandidates,
    visualCues: creativeStrategy?.visualCues ?? baseKnowledgeContext?.visualCues,
    rationaleNotes: baseKnowledgeContext?.rationaleNotes ?? [],
  });

  return {
    creativeStrategy,
    knowledgeContext,
    knowledgePackIds:
      creativeStrategy?.knowledgePackIds
      ?? knowledgeContext?.selectedPackIds
      ?? inputKnowledgePackIds,
  };
}

function fallbackId(prefix: 'brief' | 'strategy'): string {
  return `${prefix}_${randomUUID().slice(0, 8)}`;
}

function resolveCtaType(mode: EditorCreativeMode): EditorCreativeCtaType {
  return mode === 'tiktok_ua' ? 'direct_response' : 'brand_follow';
}

function resolveDefaultHookApproach(mode: EditorCreativeMode): EditorCreativeHookApproach {
  return mode === 'tiktok_ua' ? 'conflict_first' : 'story_first';
}

export function normalizeEditorCreativeBrief(input: unknown): EditorCreativeBrief | undefined {
  if (!input || typeof input !== 'object') return undefined;
  const raw = input as Record<string, unknown>;
  const briefId = cleanText(raw.briefId);
  const sellingPoints = normalizeStringList(raw.sellingPoints);
  const audience = cleanText(raw.audience);
  const objective = cleanText(raw.objective);
  const cta = cleanText(raw.cta);
  const referenceStyle = cleanText(raw.referenceStyle);
  const region = cleanText(raw.region);
  const forbiddenClaims = normalizeStringList(raw.forbiddenClaims);
  const modeRaw = cleanText(raw.mode);

  const hasContent = Boolean(
    briefId ||
    sellingPoints.length > 0 ||
    audience ||
    objective ||
    cta ||
    referenceStyle ||
    region ||
    forbiddenClaims.length > 0 ||
    modeRaw,
  );
  if (!hasContent) return undefined;

  const mode: EditorCreativeMode =
    modeRaw === 'tiktok_ua' || modeRaw === 'tiktok_content'
      ? modeRaw
      : 'tiktok_content';

  return {
    briefId,
    platform: 'tiktok',
    mode,
    objective,
    audience,
    sellingPoints,
    cta,
    referenceStyle,
    region,
    forbiddenClaims,
  };
}

export function normalizeEditorCreativeStrategy(input: unknown): EditorCreativeStrategy | undefined {
  if (!input || typeof input !== 'object') return undefined;
  const raw = input as Record<string, unknown>;
  const strategyId = cleanText(raw.strategyId);
  const briefId = cleanText(raw.briefId);
  const objective = cleanText(raw.objective);
  const recommendedHook = cleanText(raw.recommendedHook);
  const cta = cleanText(raw.cta);
  const rationale = cleanText(raw.rationale);
  const targetAudience = cleanText(raw.targetAudience) ?? cleanText(raw.audience);
  const sellingPointFocus = cleanText(raw.sellingPointFocus) ?? cleanText(raw.primarySellingPoint);
  const hookApproach = cleanText(raw.hookApproach) as EditorCreativeHookApproach | undefined;
  const hookOptions = normalizeStringList(raw.hookOptions);
  const angle = cleanText(raw.angle);
  const tone = cleanText(raw.tone);
  const ctaType = cleanText(raw.ctaType) as EditorCreativeCtaType | undefined;
  const assetNeeds = normalizeStringList(raw.assetNeeds);
  const riskNotes = normalizeStringList(raw.riskNotes);
  const knowledgePackIds = uniqueStrings(normalizeStringList(raw.knowledgePackIds));
  const marketTruth = uniqueStrings(normalizeStringList(raw.marketTruth));
  const audienceTension = uniqueStrings(normalizeStringList(raw.audienceTension));
  const toneRules = uniqueStrings(normalizeStringList(raw.toneRules));
  const forbiddenClaims = uniqueStrings(normalizeStringList(raw.forbiddenClaims));
  const visualCues = uniqueStrings(normalizeStringList(raw.visualCues));
  const approvedAngles = uniqueStrings(normalizeStringList(raw.approvedAngles));
  const hookCandidates = uniqueStrings(normalizeStringList(raw.hookCandidates));
  const modeRaw = cleanText(raw.mode);

  if (!objective || !recommendedHook || !cta || !rationale) {
    return undefined;
  }

  const mode: EditorCreativeMode =
    modeRaw === 'tiktok_ua' || modeRaw === 'tiktok_content'
      ? modeRaw
      : 'tiktok_content';

  return {
    strategyId,
    briefId,
    platform: 'tiktok',
    mode,
    objective,
    targetAudience,
    sellingPointFocus,
    hookApproach,
    hookOptions: hookOptions.length > 0 ? hookOptions : [recommendedHook],
    recommendedHook,
    cta,
    ctaType,
    rationale,
    angle,
    tone,
    assetNeeds,
    riskNotes,
    knowledgePackIds,
    marketTruth,
    audienceTension,
    toneRules,
    forbiddenClaims,
    visualCues,
    approvedAngles,
    hookCandidates,
  };
}

export function normalizeEditorCreativeVariant(input: unknown): EditorCreativeVariant | undefined {
  if (!input || typeof input !== 'object') return undefined;
  const raw = input as Record<string, unknown>;
  const title = cleanText(raw.title);
  const hook = cleanText(raw.hook);
  const cta = cleanText(raw.cta);
  const differenceSummary = cleanText(raw.differenceSummary);
  if (!title || !hook || !cta || !differenceSummary) {
    return undefined;
  }

  return {
    variantId: cleanText(raw.variantId),
    variantPackId: cleanText(raw.variantPackId),
    strategyId: cleanText(raw.strategyId),
    briefId: cleanText(raw.briefId),
    emphasis: normalizeVariantEmphasis(raw.emphasis),
    title,
    hook,
    openingBeat: cleanText(raw.openingBeat),
    sellingPointFocus: cleanText(raw.sellingPointFocus),
    cta,
    ctaType: cleanText(raw.ctaType) as EditorCreativeCtaType | undefined,
    editingDirection: cleanText(raw.editingDirection),
    assetSuggestion: cleanText(raw.assetSuggestion),
    differenceSummary,
    isRecommended: raw.isRecommended === true,
  };
}

export function normalizeEditorCreativeVariantPack(input: unknown): EditorCreativeVariantPack | undefined {
  if (!input || typeof input !== 'object') return undefined;
  const raw = input as Record<string, unknown>;
  const variants = Array.isArray(raw.variants)
    ? raw.variants
        .map((variant) => normalizeEditorCreativeVariant(variant))
        .filter((variant): variant is EditorCreativeVariant => Boolean(variant))
    : [];
  if (variants.length === 0) {
    return undefined;
  }

  const selectedVariantId = cleanText(raw.selectedVariantId);
  const modeRaw = cleanText(raw.mode);
  return {
    variantPackId: cleanText(raw.variantPackId),
    briefId: cleanText(raw.briefId),
    strategyId: cleanText(raw.strategyId),
    mode:
      modeRaw === 'tiktok_ua' || modeRaw === 'tiktok_content'
        ? modeRaw
        : undefined,
    summary: cleanText(raw.summary),
    comparisonAxes: normalizeStringList(raw.comparisonAxes),
    variants,
    selectedVariantId:
      selectedVariantId && variants.some((variant) => variant.variantId === selectedVariantId)
        ? selectedVariantId
        : variants[0]?.variantId,
  };
}

function defaultObjectiveForMode(mode: EditorCreativeMode, replyLocale: ReplyLocale): string {
  if (mode === 'tiktok_ua') {
    return localizedText(replyLocale, '点击转化', 'Click-through conversion');
  }
  return localizedText(replyLocale, '内容增长', 'Content growth');
}

function defaultCtaForMode(mode: EditorCreativeMode, replyLocale: ReplyLocale): string {
  if (mode === 'tiktok_ua') {
    return localizedText(replyLocale, '立即下载', 'Download now');
  }
  return localizedText(replyLocale, '关注获取更多', 'Follow for more');
}

function resolveSellingPointFocus(brief: EditorCreativeBrief, replyLocale: ReplyLocale): string {
  return brief.sellingPoints[0] || localizedText(replyLocale, '核心玩法爆点', 'core gameplay payoff');
}

function buildCreativeAssetNeeds(
  brief: EditorCreativeBrief,
  focus: string,
  replyLocale: ReplyLocale,
): string[] {
  if (brief.mode === 'tiktok_ua') {
    return replyLocale === 'en'
      ? [
          `A payoff-first visual that makes "${focus}" obvious immediately`,
          'A high-conflict or high-result shot that can carry the first 3 seconds',
          'Cover text or subtitle copy that can land the CTA early',
        ]
      : [
          `1 组能立刻说明“${focus}”的结果感素材`,
          '1 组适合前 3 秒直出的冲突或高收益镜头',
          '1 组能提前落下 CTA 的封面或字幕文案',
        ];
  }

  return replyLocale === 'en'
    ? [
        `A hero visual that builds the brand mood around "${focus}"`,
        'A usage or character scene that makes the selling point feel native',
        'A softer end card or subtitle line that carries the CTA naturally',
      ]
    : [
        `1 组围绕“${focus}”建立品牌气质的主视觉素材`,
        '1 组贴近使用场景或角色关系的叙事镜头',
        '1 组能自然承接 CTA 的结尾字幕或尾板文案',
      ];
}

function buildCreativeRiskNotes(
  brief: EditorCreativeBrief,
  replyLocale: ReplyLocale,
): string[] {
  const riskNotes = (brief.forbiddenClaims ?? []).map((claim) =>
    replyLocale === 'en' ? `Avoid claim: ${claim}` : `避免宣称：${claim}`,
  );

  if (brief.region) {
    riskNotes.push(
      replyLocale === 'en'
        ? `Keep the ${brief.region} market context and compliance boundary intact`
        : `保持 ${brief.region} 市场语境与表达边界一致`,
    );
  }

  if (riskNotes.length === 0) {
    riskNotes.push(
      brief.mode === 'tiktok_ua'
        ? localizedText(
            replyLocale,
            '避免夸大收益、暗示必得结果或制造无法兑现的承诺',
            'Avoid exaggerated rewards, guaranteed outcomes, or claims the footage cannot support',
          )
        : localizedText(
            replyLocale,
            '避免品牌语气失真，或为了强转化破坏内容原生感',
            'Avoid breaking the brand voice or forcing conversion language that harms native feel',
          ),
    );
  }

  return riskNotes;
}

function describeHookApproach(
  hookApproach: EditorCreativeHookApproach,
  replyLocale: ReplyLocale,
): string {
  if (hookApproach === 'benefit_first') {
    return localizedText(replyLocale, '收益先行', 'benefit-first');
  }
  if (hookApproach === 'story_first') {
    return localizedText(replyLocale, '剧情先行', 'story-first');
  }
  return localizedText(replyLocale, '冲突先行', 'conflict-first');
}

export function buildCreativeHookOptions(
  brief: EditorCreativeBrief,
  replyLocale: ReplyLocale,
  hookApproach: EditorCreativeHookApproach = resolveDefaultHookApproach(brief.mode),
): string[] {
  const focus = resolveSellingPointFocus(brief, replyLocale);
  if (brief.mode === 'tiktok_ua') {
    if (hookApproach === 'benefit_first') {
      return replyLocale === 'en'
        ? [
            `Show "${focus}" as the payoff immediately.`,
            `Lead with the result, then explain why it matters now.`,
            'Put the payoff in the first 2 seconds and follow with the CTA quickly.',
          ]
        : [
            `开场直接让“${focus}”变成最直观的 payoff。`,
            '先给结果，再补一句为什么现在就该点进来。',
            '把 payoff 放进前 2 秒，再尽快把 CTA 落下。',
          ];
    }
    if (hookApproach === 'story_first') {
      return replyLocale === 'en'
        ? [
            `Open with a micro-story, then let "${focus}" take over the pace.`,
            `Start from a POV beat, then reveal the payoff.`,
            'Use a short setup before the CTA tightens the conversion ask.',
          ]
        : [
            `先丢一个很短的小剧情，再让“${focus}”接管节奏。`,
            '从 POV 或人物瞬间切入，再把 payoff 翻出来。',
            '先给情境，再把 CTA 收紧到更明确的动作上。',
          ];
    }
    return replyLocale === 'en'
      ? [
          `Open on tension: why is everyone stuck before "${focus}" lands?`,
          `Turn the pain point and result into a direct contrast, then reveal "${focus}".`,
          'Make the first 3 seconds uncomfortable, then answer it with the payoff and CTA.',
        ]
      : [
          `先抛冲突：为什么大家都在被“${focus}”之前的状态卡住？`,
          '把痛点和结果做成正反对撞，再立刻给出卖点。',
          '前三秒先制造不舒服，再用 payoff 和 CTA 解答。',
        ];
  }

  if (hookApproach === 'benefit_first') {
    return replyLocale === 'en'
      ? [
          `Reveal the visible value of "${focus}" before extending the mood.`,
          'Give the audience a concrete result first, then widen into the brand world.',
          'Open on value, then explain why it deserves attention.',
        ]
      : [
          `先把“${focus}”的直观价值露出来，再延展内容氛围。`,
          '先给用户一个马上能记住的结果，再承接品牌世界观。',
          '开头先收获，再解释为什么它值得被关注。',
        ];
  }
  if (hookApproach === 'conflict_first') {
    return replyLocale === 'en'
      ? [
          `Use contrast or tension to hook attention before "${focus}" lands.`,
          'Turn before-and-after or emotional contrast into the opening beat.',
          'Ask a tension-led question first, then recover it with the selling point.',
        ]
      : [
          `先用反差或 tension 抓住注意力，再引出“${focus}”。`,
          '把使用前后或情绪落差做成开场冲突。',
          '先抛一个“为什么会这样”的问题，再回收卖点。',
        ];
  }

  return replyLocale === 'en'
    ? [
        `Start from the character, scene, or atmosphere before "${focus}" surfaces.`,
        'Let the audience enter the situation first, then turn the selling point into a discovery.',
        'Use a short story beat to open, with the brand memory point appearing later.',
      ]
    : [
        `先从角色、场景或氛围切入，再让“${focus}”自然浮出。`,
        '让用户先进入情境，再把卖点变成剧情里的发现。',
        '用一小段叙事做开头，让品牌记忆点后置出现。',
      ];
}

export function buildCreativeStrategy(
  brief?: EditorCreativeBrief,
  replyLocale: ReplyLocale = 'zh-CN',
): EditorCreativeStrategy | undefined {
  if (!brief) return undefined;

  const sellingPointFocus = resolveSellingPointFocus(brief, replyLocale);
  const objective = brief.objective || defaultObjectiveForMode(brief.mode, replyLocale);
  const hookApproach = resolveDefaultHookApproach(brief.mode);
  const hookOptions = buildCreativeHookOptions(brief, replyLocale, hookApproach);
  const recommendedHook = hookOptions[0] || (replyLocale === 'en' ? `POV: ${sellingPointFocus}` : `POV：${sellingPointFocus}`);
  const cta = brief.cta || defaultCtaForMode(brief.mode, replyLocale);
  const angle =
    brief.mode === 'tiktok_ua'
      ? hookApproach === 'benefit_first'
        ? localizedText(replyLocale, '收益先行开场 + 高频 payoff 证明 + 直接转化 CTA', 'Benefit-first opening + payoff proof + direct-response CTA')
        : hookApproach === 'story_first'
          ? localizedText(replyLocale, '微剧情切入 + payoff 接管节奏 + 结尾回收 CTA', 'Micro-story opening + payoff takeover + CTA close')
          : localizedText(replyLocale, '强冲突开场 + 结果反转回收 + 前置转化 CTA', 'Conflict-first opening + payoff reversal + forward CTA')
      : hookApproach === 'benefit_first'
        ? localizedText(replyLocale, '价值先露出 + 品牌氛围承接 + 轻关注 CTA', 'Value-first opening + brand mood carry + softer CTA')
        : hookApproach === 'conflict_first'
          ? localizedText(replyLocale, '反差冲突开场 + 卖点解释回收 + 情绪化收尾', 'Contrast-led opening + selling point recovery + emotional close')
          : localizedText(replyLocale, '角色或场景先入场 + 卖点后置浮出 + 情绪化品牌收尾', 'Story-first opening + delayed selling point reveal + emotional brand close');
  const tone =
    brief.mode === 'tiktok_ua'
      ? hookApproach === 'benefit_first'
        ? localizedText(replyLocale, '节奏快、结果先行、每个镜头都为点击服务', 'Fast-paced, payoff-led, and conversion-minded in every beat')
        : hookApproach === 'story_first'
          ? localizedText(replyLocale, '先给情境，再快速提速，让 payoff 和 CTA 在中后段收紧', 'Open with setup, then accelerate so the payoff and CTA tighten the back half')
          : localizedText(replyLocale, '高压、高反差、前三秒必须抓人并尽快给出答案', 'High-pressure, high-contrast, and answer-driven within the first 3 seconds')
      : hookApproach === 'benefit_first'
        ? localizedText(replyLocale, '先清楚传达价值，再慢慢铺开品牌语气与场景感', 'Communicate value clearly first, then widen into brand mood and setting')
        : hookApproach === 'conflict_first'
          ? localizedText(replyLocale, '先制造张力，再回收情绪，整体仍保持品牌可读性', 'Create tension first, then recover the emotion while keeping the brand readable')
          : localizedText(replyLocale, '品牌调性优先、叙事清晰、保留原生内容感', 'Brand-forward, clear in story, and still native to the feed');
  const assetNeeds = buildCreativeAssetNeeds(brief, sellingPointFocus, replyLocale);
  const riskNotes = buildCreativeRiskNotes(brief, replyLocale);
  const audienceBlock = brief.audience
    ? localizedText(replyLocale, `，目标人群是“${brief.audience}”`, ` for ${brief.audience}`)
    : '';
  const regionBlock = brief.region
    ? localizedText(replyLocale, `，面向“${brief.region}”市场`, ` in the ${brief.region} market`)
    : '';
  const rationale =
    brief.mode === 'tiktok_ua'
      ? hookApproach === 'benefit_first'
        ? localizedText(
            replyLocale,
            `优先把“${sellingPointFocus}”打成最直观的收益感${audienceBlock}${regionBlock}，让用户几乎不用理解背景就能感知价值，再尽快把 CTA “${cta}”落下。`,
            `Push "${sellingPointFocus}" as an immediate payoff${audienceBlock}${regionBlock}, so the audience feels the value before they need more context, then land the CTA "${cta}" quickly.`,
          )
        : hookApproach === 'story_first'
          ? localizedText(
              replyLocale,
              `先给一个足够短的小剧情把人带进来${audienceBlock}${regionBlock}，再把“${sellingPointFocus}”作为 payoff 抬出来，最后把 CTA “${cta}”收紧。`,
              `Use a very short story beat to pull people in${audienceBlock}${regionBlock}, then lift "${sellingPointFocus}" as the payoff before tightening into the CTA "${cta}".`,
            )
          : localizedText(
              replyLocale,
              `优先制造冲突和不适感${audienceBlock}${regionBlock}，让“${sellingPointFocus}”承担解答与回收的角色，再把 CTA “${cta}”提前落下。`,
              `Create tension first${audienceBlock}${regionBlock}, let "${sellingPointFocus}" act as the answer and recovery, then land the CTA "${cta}" early.`,
            )
      : hookApproach === 'benefit_first'
        ? localizedText(
            replyLocale,
            `先让用户立刻看见“${sellingPointFocus}”的价值${audienceBlock}${regionBlock}，再把品牌氛围和场景补齐，最后用更轻的 CTA “${cta}”承接。`,
            `Let the audience see the value of "${sellingPointFocus}" immediately${audienceBlock}${regionBlock}, then fill in the brand mood and context before landing the softer CTA "${cta}".`,
          )
        : hookApproach === 'conflict_first'
          ? localizedText(
              replyLocale,
              `通过反差或 tension 先抓住注意力${audienceBlock}${regionBlock}，再让“${sellingPointFocus}”回收问题，能让内容更有记忆点。`,
              `Use contrast or tension to hook attention first${audienceBlock}${regionBlock}, then let "${sellingPointFocus}" recover the question so the content stays memorable.`,
            )
          : localizedText(
              replyLocale,
              `围绕“${sellingPointFocus}”建立更稳定的内容情境${audienceBlock}${regionBlock}，让用户先进入角色或场景，再自然接受 CTA “${cta}”。`,
              `Build a steadier content situation around "${sellingPointFocus}"${audienceBlock}${regionBlock}, let the audience enter the scene first, then accept the CTA "${cta}" more naturally.`,
            );

  return {
    strategyId: fallbackId('strategy'),
    briefId: brief.briefId ?? fallbackId('brief'),
    platform: 'tiktok',
    mode: brief.mode,
    objective,
    targetAudience: brief.audience,
    sellingPointFocus,
    hookApproach,
    hookOptions,
    recommendedHook,
    cta,
    ctaType: resolveCtaType(brief.mode),
    rationale,
    angle,
    tone,
    assetNeeds,
    riskNotes,
    knowledgePackIds: [],
    marketTruth: [],
    audienceTension: [],
    toneRules: [],
    forbiddenClaims: [],
    visualCues: [],
    approvedAngles: [],
    hookCandidates: [],
  };
}

function resolveEffectiveKnowledgeContext(
  knowledgeContext: EditorCreativeKnowledgeContext | undefined,
  strategy?: EditorCreativeStrategy,
): EditorCreativeKnowledgeContext | undefined {
  return knowledgeContext ?? buildEditorCreativeKnowledgeContextFromStrategy(strategy);
}

export function buildCreativeBriefPromptBlock(
  brief?: EditorCreativeBrief,
  strategy?: EditorCreativeStrategy,
  knowledgeContext?: EditorCreativeKnowledgeContext,
  replyLocale: ReplyLocale = 'zh-CN',
): string {
  if (!brief || !strategy) return '';
  const effectiveKnowledgeContext = resolveEffectiveKnowledgeContext(knowledgeContext, strategy);

  const lines: string[] = [
    replyLocale === 'en' ? '## TikTok Campaign Brief' : '## TikTok 投放/内容 Brief',
    `- ${replyLocale === 'en' ? 'Brief ID' : 'Brief ID'}: ${strategy.briefId ?? brief.briefId ?? 'n/a'}`,
    `- ${replyLocale === 'en' ? 'Strategy ID' : 'Strategy ID'}: ${strategy.strategyId ?? 'n/a'}`,
    `- ${replyLocale === 'en' ? 'Mode' : '模式'}: ${
      brief.mode === 'tiktok_ua'
        ? localizedText(replyLocale, 'TikTok 买量', 'TikTok UA')
        : localizedText(replyLocale, 'TikTok 内容', 'TikTok Content')
    }`,
    `- ${replyLocale === 'en' ? 'Objective' : '目标'}: ${strategy.objective}`,
    `- ${replyLocale === 'en' ? 'Selling points' : '卖点'}: ${
      brief.sellingPoints.length > 0 ? brief.sellingPoints.join(' / ') : resolveSellingPointFocus(brief, replyLocale)
    }`,
    `- CTA: ${strategy.cta}`,
  ];

  if (brief.audience) {
    lines.push(`- ${replyLocale === 'en' ? 'Audience' : '人群'}: ${brief.audience}`);
  }
  if (brief.referenceStyle) {
    lines.push(`- ${replyLocale === 'en' ? 'Reference style' : '参考风格'}: ${brief.referenceStyle}`);
  }
  if (brief.region) {
    lines.push(`- ${replyLocale === 'en' ? 'Region' : '地区'}: ${brief.region}`);
  }
  if (brief.forbiddenClaims && brief.forbiddenClaims.length > 0) {
    lines.push(`- ${replyLocale === 'en' ? 'Forbidden claims' : '风险禁区'}: ${brief.forbiddenClaims.join(' / ')}`);
  }

  lines.push('');
  lines.push(replyLocale === 'en' ? '## Creative Strategy' : '## 创意策略');
  if (strategy.angle) {
    lines.push(`- ${replyLocale === 'en' ? 'Angle' : '创意角度'}: ${strategy.angle}`);
  }
  if (strategy.targetAudience) {
    lines.push(`- ${replyLocale === 'en' ? 'Target audience' : '目标受众'}: ${strategy.targetAudience}`);
  }
  if (strategy.sellingPointFocus) {
    lines.push(`- ${replyLocale === 'en' ? 'Selling point focus' : '优先卖点'}: ${strategy.sellingPointFocus}`);
  }
  if (strategy.hookApproach) {
    lines.push(`- ${replyLocale === 'en' ? 'Hook approach' : 'Hook 方向'}: ${describeHookApproach(strategy.hookApproach, replyLocale)}`);
  }
  lines.push(`- ${replyLocale === 'en' ? 'Recommended hook' : '推荐开场'}: ${strategy.recommendedHook}`);
  if (strategy.hookOptions.length > 1) {
    lines.push(`- ${replyLocale === 'en' ? 'Backup hooks' : '备选开场'}: ${strategy.hookOptions.slice(1).join(' | ')}`);
  }
  if (strategy.tone) {
    lines.push(`- ${replyLocale === 'en' ? 'Tone' : '节奏语气'}: ${strategy.tone}`);
  }
  if (strategy.assetNeeds.length > 0) {
    lines.push(`- ${replyLocale === 'en' ? 'Asset needs' : '建议素材'}: ${strategy.assetNeeds.join(' / ')}`);
  }
  if (strategy.riskNotes.length > 0) {
    lines.push(`- ${replyLocale === 'en' ? 'Risk notes' : '风险约束'}: ${strategy.riskNotes.join(' / ')}`);
  }
  lines.push(`- ${replyLocale === 'en' ? 'Rationale' : '策略理由'}: ${strategy.rationale}`);
  if (effectiveKnowledgeContext) {
    lines.push('');
    lines.push(replyLocale === 'en' ? '## Applied Knowledge' : '## 已应用知识');
    if (effectiveKnowledgeContext.selectedPackIds.length > 0) {
      lines.push(`- ${
        replyLocale === 'en' ? 'Knowledge packs' : '知识包'
      }: ${
        replyLocale === 'en'
          ? `${effectiveKnowledgeContext.selectedPackIds.length} selected`
          : `已选择 ${effectiveKnowledgeContext.selectedPackIds.length} 个`
      }`);
    }
    if (effectiveKnowledgeContext.marketTruth.length > 0) {
      lines.push(`- ${replyLocale === 'en' ? 'Market truth' : '市场事实'}: ${effectiveKnowledgeContext.marketTruth.slice(0, 4).join(' / ')}`);
    }
    if (effectiveKnowledgeContext.audienceTension.length > 0) {
      lines.push(`- ${replyLocale === 'en' ? 'Audience tension' : '人群张力'}: ${effectiveKnowledgeContext.audienceTension.slice(0, 4).join(' / ')}`);
    }
    if (effectiveKnowledgeContext.toneRules.length > 0) {
      lines.push(`- ${replyLocale === 'en' ? 'Tone rules' : '语气规则'}: ${effectiveKnowledgeContext.toneRules.slice(0, 4).join(' / ')}`);
    }
    if (effectiveKnowledgeContext.visualCues.length > 0) {
      lines.push(`- ${replyLocale === 'en' ? 'Visual cues' : '视觉线索'}: ${effectiveKnowledgeContext.visualCues.slice(0, 4).join(' / ')}`);
    }
    if (effectiveKnowledgeContext.approvedAngles.length > 0) {
      lines.push(`- ${replyLocale === 'en' ? 'Approved angles' : '可用角度'}: ${effectiveKnowledgeContext.approvedAngles.slice(0, 4).join(' / ')}`);
    }
    if (effectiveKnowledgeContext.hookCandidates.length > 0) {
      lines.push(`- ${replyLocale === 'en' ? 'Hook candidates' : 'Hook 备选'}: ${effectiveKnowledgeContext.hookCandidates.slice(0, 4).join(' / ')}`);
    }
    if (effectiveKnowledgeContext.forbiddenClaims.length > 0) {
      lines.push(`- ${replyLocale === 'en' ? 'Forbidden claims' : '避免表达'}: ${effectiveKnowledgeContext.forbiddenClaims.slice(0, 5).join(' / ')}`);
    }
    if (effectiveKnowledgeContext.rationaleNotes.length > 0) {
      lines.push(`- ${replyLocale === 'en' ? 'Knowledge rationale' : '知识依据'}: ${effectiveKnowledgeContext.rationaleNotes.slice(0, 3).join(' / ')}`);
    }
  }
  lines.push(
    brief.mode === 'tiktok_ua'
      ? localizedText(
          replyLocale,
          '- 剪辑要求：前 3 秒必须强 Hook，尽早露出 payoff，并把 CTA 放在可感知的位置。',
          '- Editing guidance: hook hard in the first 3 seconds, surface the payoff early, and keep the CTA visible.',
        )
      : localizedText(
          replyLocale,
          '- 剪辑要求：先保留原生内容感和品牌氛围，再让卖点自然浮出，最后轻柔收住 CTA。',
          '- Editing guidance: preserve native-feeling content and brand mood first, let the selling point surface naturally, then land the CTA softly.',
        ),
  );
  return lines.join('\n');
}

export function buildDefaultCreativeUserMessage(
  brief: EditorCreativeBrief,
  strategy?: EditorCreativeStrategy,
  replyLocale: ReplyLocale = 'zh-CN',
): string {
  const effectiveStrategy = strategy ?? buildCreativeStrategy(brief, replyLocale);
  const objective = effectiveStrategy?.objective || defaultObjectiveForMode(brief.mode, replyLocale);
  const focus = effectiveStrategy?.sellingPointFocus || resolveSellingPointFocus(brief, replyLocale);
  const hook = effectiveStrategy?.recommendedHook;
  const hookApproach = effectiveStrategy?.hookApproach;
  const angle = effectiveStrategy?.angle;
  const tone = effectiveStrategy?.tone;
  const cta = effectiveStrategy?.cta || defaultCtaForMode(brief.mode, replyLocale);
  const audience = brief.audience
    ? localizedText(replyLocale, `，目标人群是“${brief.audience}”`, ` for ${brief.audience}`)
    : '';
  const reference = brief.referenceStyle
    ? localizedText(replyLocale, `，参考风格是“${brief.referenceStyle}”`, ` with a reference style of ${brief.referenceStyle}`)
    : '';
  const region = brief.region
    ? localizedText(replyLocale, `，面向“${brief.region}”市场`, ` for the ${brief.region} market`)
    : '';
  const risk = effectiveStrategy && effectiveStrategy.riskNotes.length > 0
    ? localizedText(
        replyLocale,
        `，并遵守这些风险约束：“${effectiveStrategy.riskNotes.join(' / ')}”`,
        `, while respecting these risk notes: "${effectiveStrategy.riskNotes.join(' / ')}"`,
      )
    : '';
  const hookApproachBlock = hookApproach
    ? localizedText(
        replyLocale,
        `，采用“${describeHookApproach(hookApproach, replyLocale)}”的 Hook 方向`,
        `, using a ${describeHookApproach(hookApproach, replyLocale)} hook approach`,
      )
    : '';

  if (brief.mode === 'tiktok_ua') {
    return replyLocale === 'en'
      ? `Create a 15-second TikTok game UA cut from the selected footage. The goal is "${objective}"${audience}${region}${reference}. Lead with "${focus}" as the payoff, use the hook "${hook ?? focus}"${hookApproachBlock}, keep the angle "${angle ?? 'payoff-first opening'}", hold the tone "${tone ?? 'fast and conversion-led'}", and end on the CTA "${cta}"${risk}.`
      : `请基于已选素材制作一条适合 TikTok 游戏买量的 15 秒短视频，目标是“${objective}”${audience}${region}${reference}。优先把“${focus}”打成结果感最强的 payoff，用“${hook ?? focus}”作为开场${hookApproachBlock}，保持“${angle ?? '结果先行'}”的创意角度和“${tone ?? '快节奏强转化'}”的节奏，结尾落到 CTA“${cta}”${risk}。`;
  }

  return replyLocale === 'en'
    ? `Create a 15-second TikTok content cut from the selected footage. The goal is "${objective}"${audience}${region}${reference}. Build the story around "${focus}", use the hook "${hook ?? focus}"${hookApproachBlock}, keep the angle "${angle ?? 'brand memory point first'}", stay in the tone "${tone ?? 'brand-forward and native'}", and close with the CTA "${cta}"${risk}.`
    : `请基于已选素材制作一条适合 TikTok 内容运营的 15 秒短视频，目标是“${objective}”${audience}${region}${reference}。围绕“${focus}”建立品牌记忆点，用“${hook ?? focus}”作为开场${hookApproachBlock}，保持“${angle ?? '品牌记忆点优先'}”的创意角度和“${tone ?? '品牌调性优先'}”的节奏，最后自然落到 CTA“${cta}”${risk}。`;
}
