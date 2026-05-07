import type {
  CampaignAutomationLevel,
  CampaignCreativeBrief,
  CampaignCreativeCtaType,
  CampaignCreativeHookApproach,
  CampaignCreativeMode,
  CampaignPlan,
  CampaignProfile,
  CampaignCreativeStrategy,
  CampaignCreativeStrategyTuning,
  CampaignCreativeVariant,
  CampaignCreativeVariantEmphasis,
  CampaignCreativeVariantPack,
  FeedbackRecord,
  CampaignFeedbackType,
} from './model';
import type { DerivedCampaignKnowledgeContext } from '../../api/campaignKnowledge';

interface BuildStrategyOptions {
  strategyId?: string;
  tuning?: Partial<CampaignCreativeStrategyTuning>;
  knowledgeContext?: DerivedCampaignKnowledgeContext;
}

function firstLine(items: string[], fallback: string): string {
  return items[0] ?? fallback;
}

const DEFAULT_CAMPAIGN_AUTOMATION_LEVEL: CampaignAutomationLevel = 'managed_autopilot';

function createObjectId(
  prefix: 'brief' | 'strategy' | 'variant_pack' | 'campaign' | 'feedback',
): string {
  const suffix =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().slice(0, 8)
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return `${prefix}_${suffix}`;
}

function mergeUniqueStrings(...lists: ReadonlyArray<ReadonlyArray<string> | undefined>): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];

  for (const list of lists) {
    if (!list) continue;
    for (const item of list) {
      const normalized = item.trim();
      if (!normalized || seen.has(normalized)) continue;
      seen.add(normalized);
      merged.push(normalized);
    }
  }

  return merged;
}

function resolveKnowledgeHookOptions(
  hookApproach: CampaignCreativeHookApproach,
  knowledgeCandidates: string[],
  baseOptions: string[],
): string[] {
  if (knowledgeCandidates.length === 0) {
    return baseOptions;
  }

  const preferredIndex =
    hookApproach === 'benefit_first' ? 0 : hookApproach === 'conflict_first' ? 1 : 2;
  const preferredCandidate = knowledgeCandidates[preferredIndex % knowledgeCandidates.length];
  const remainingKnowledgeCandidates = knowledgeCandidates.filter(
    (candidate) => candidate !== preferredCandidate,
  );

  return mergeUniqueStrings([preferredCandidate], remainingKnowledgeCandidates, baseOptions);
}

function buildKnowledgeAwareAngle(baseAngle: string, approvedAngles: string[]): string {
  const approvedAngle = approvedAngles[0];
  if (!approvedAngle) {
    return baseAngle;
  }

  return `${approvedAngle} | ${baseAngle}`;
}

function buildKnowledgeAwareTone(baseTone: string, toneRules: string[]): string {
  const toneRule = toneRules[0];
  if (!toneRule) {
    return baseTone;
  }

  return `${baseTone} | ${toneRule}`;
}

function resolveDefaultCtaType(mode: CampaignCreativeMode): CampaignCreativeCtaType {
  return mode === 'tiktok_ua' ? 'direct_response' : 'brand_follow';
}

function resolveDefaultHookApproach(mode: CampaignCreativeMode): CampaignCreativeHookApproach {
  return mode === 'tiktok_ua' ? 'conflict_first' : 'story_first';
}

function buildDefaultSellingPointFocus(brief: CampaignCreativeBrief): string {
  return firstLine(
    brief.sellingPoints,
    brief.mode === 'tiktok_ua' ? '核心玩法或高收益瞬间' : '品牌主卖点与使用场景',
  );
}

function buildObjective(brief: CampaignCreativeBrief): string {
  return (
    brief.objective ||
    (brief.mode === 'tiktok_ua' ? '快速验证高转化创意方向' : '建立可复用的品牌内容记忆点')
  );
}

function buildCtaCopy(
  brief: CampaignCreativeBrief,
  ctaType: CampaignCreativeCtaType,
): string {
  if (brief.cta?.trim()) {
    return brief.cta.trim();
  }

  if (ctaType === 'direct_response') {
    return '现在下载并立刻开玩';
  }
  if (ctaType === 'soft_conversion') {
    return brief.mode === 'tiktok_ua' ? '先点进来看看这次活动值不值得' : '先看看完整内容再决定要不要继续了解';
  }
  return '关注并进入品牌主页了解更多';
}

function buildHookOptions(
  mode: CampaignCreativeMode,
  objective: string,
  sellingPointFocus: string,
  hookApproach: CampaignCreativeHookApproach,
): string[] {
  if (mode === 'tiktok_ua') {
    if (hookApproach === 'benefit_first') {
      return [
        `开场直接让用户看到“${sellingPointFocus}”的收益结果`,
        `先给结果，再补一句为什么现在就该点进来`,
        `把最强 payoff 放进前 2 秒，再立刻承接下载动作`,
      ];
    }
    if (hookApproach === 'story_first') {
      return [
        `先丢一个 1 句话的小剧情，再让“${sellingPointFocus}”接管节奏`,
        `从 POV 或人物瞬间切入，再把 payoff 翻出来`,
        `让用户先进入情境，再把“现在就试”落到 CTA 上`,
      ];
    }
    return [
      `先抛冲突：为什么大家都在被“${objective}”卡住？`,
      `把痛点和结果做正反对撞，再立刻给出“${sellingPointFocus}”`,
      `前三秒先制造不舒服，再用 payoff 解答并落下 CTA`,
    ];
  }

  if (hookApproach === 'benefit_first') {
    return [
      `先把“${sellingPointFocus}”的直观价值露出来，再延展内容氛围`,
      `先给用户一个马上能记住的结果，再承接品牌世界观`,
      `开头先收获，再解释为什么它值得被关注`,
    ];
  }
  if (hookApproach === 'conflict_first') {
    return [
      `先用反差或 tension 抓住注意力，再引出“${sellingPointFocus}”`,
      `把使用前后或情绪落差做成开场冲突`,
      `先抛一个“为什么会这样”的问题，再回收卖点`,
    ];
  }
  return [
    `先从角色、场景或氛围切入，再让“${sellingPointFocus}”自然浮出`,
    `让用户先进入情境，再把卖点变成剧情里的发现`,
    `用一小段叙事做开头，让品牌记忆点后置出现`,
  ];
}

function buildAngle(
  mode: CampaignCreativeMode,
  hookApproach: CampaignCreativeHookApproach,
  ctaType: CampaignCreativeCtaType,
): string {
  if (mode === 'tiktok_ua') {
    if (hookApproach === 'benefit_first') {
      return ctaType === 'direct_response'
        ? '收益先行开场 + 高频 payoff 证明 + 直接转化 CTA'
        : '收益先行开场 + 快速建立价值感 + 低门槛转化 CTA';
    }
    if (hookApproach === 'story_first') {
      return '微剧情切入 + payoff 接管节奏 + 结尾回收 CTA';
    }
    return '强冲突开场 + 结果反转回收 + 前置转化 CTA';
  }

  if (hookApproach === 'benefit_first') {
    return ctaType === 'brand_follow'
      ? '价值先露出 + 品牌氛围承接 + 轻关注 CTA'
      : '价值先露出 + 品牌场景延展 + 轻转化 CTA';
  }
  if (hookApproach === 'conflict_first') {
    return '反差冲突开场 + 卖点解释回收 + 情绪化收尾';
  }
  return '角色或场景先入场 + 卖点后置浮出 + 情绪化品牌收尾';
}

function buildTone(
  mode: CampaignCreativeMode,
  hookApproach: CampaignCreativeHookApproach,
  ctaType: CampaignCreativeCtaType,
): string {
  if (mode === 'tiktok_ua') {
    if (hookApproach === 'benefit_first') {
      return ctaType === 'direct_response'
        ? '节奏快、结果先行、每个镜头都为点击服务'
        : '节奏快、价值表达明确、转化动作不拖沓';
    }
    if (hookApproach === 'story_first') {
      return '先给情境，再快速提速，让 payoff 和 CTA 在中后段收紧';
    }
    return '高压、高反差、前三秒必须抓人并尽快给出答案';
  }

  if (hookApproach === 'benefit_first') {
    return '先清楚传达价值，再慢慢铺开品牌语气与场景感';
  }
  if (hookApproach === 'conflict_first') {
    return '先制造张力，再回收情绪，整体仍保持品牌可读性';
  }
  return '品牌调性优先、叙事清晰、保留原生内容感';
}

function buildAssetNeeds(
  mode: CampaignCreativeMode,
  sellingPointFocus: string,
  targetAudience: string | undefined,
  hookApproach: CampaignCreativeHookApproach,
): string[] {
  const audienceAsset = targetAudience
    ? `1 组更贴近“${targetAudience}”视角的封面或字幕文案`
    : '1 组适合封面与前贴字幕的开场 Hook 文案';

  if (mode === 'tiktok_ua') {
    const openerAsset =
      hookApproach === 'benefit_first'
        ? `1 组能在开场立刻说明“${sellingPointFocus}”结果感的高收益素材`
        : hookApproach === 'story_first'
          ? `1 组适合从人物或 POV 切入，再回收“${sellingPointFocus}”的开场素材`
          : '1 组能在前 3 秒制造冲突、压迫或悬念的强刺激镜头';

    return [
      openerAsset,
      '1 组适合前 3 秒直出的冲突镜头或结果镜头',
      audienceAsset,
    ];
  }

  const openerAsset =
    hookApproach === 'benefit_first'
      ? `1 组能先把“${sellingPointFocus}”价值露出来的主视觉素材`
      : hookApproach === 'conflict_first'
        ? '1 组适合做前后反差或情绪 tension 的对照镜头'
        : `1 组能建立氛围并承接“${sellingPointFocus}”的角色或场景素材`;

  return [
    openerAsset,
    '1 组贴近真实使用场景或角色关系的叙事镜头',
    targetAudience
      ? `1 组更容易让“${targetAudience}”代入的收尾素材`
      : '1 组适合品牌 CTA 与情绪承接的结尾素材',
  ];
}

function buildRiskNotes(brief: CampaignCreativeBrief): string[] {
  const riskNotes = (brief.forbiddenClaims ?? []).map((claim) => `避免宣称：${claim}`);

  if (brief.region) {
    riskNotes.push(`保持 ${brief.region} 市场语境与表达边界一致`);
  }

  if (riskNotes.length === 0) {
    riskNotes.push(
      brief.mode === 'tiktok_ua'
        ? '避免夸大收益、暗示必得结果或制造无法兑现的承诺'
        : '避免品牌语气失真，或为了强转化破坏内容原生感',
    );
  }

  return riskNotes;
}

function buildMergedRiskNotes(
  brief: CampaignCreativeBrief,
  forbiddenClaims: string[],
): string[] {
  const riskNotes = mergeUniqueStrings(forbiddenClaims).map((claim) => `避免宣称：${claim}`);

  if (brief.region) {
    riskNotes.push(`保持 ${brief.region} 市场语境与表达边界一致`);
  }

  if (riskNotes.length === 0) {
    return buildRiskNotes(brief);
  }

  return riskNotes;
}

function buildMergedRiskNotesSafe(
  brief: CampaignCreativeBrief,
  forbiddenClaims: string[],
): string[] {
  const riskNotes = mergeUniqueStrings(forbiddenClaims).map((claim) => `Avoid claim: ${claim}`);

  if (brief.region) {
    riskNotes.push(`Keep the ${brief.region} market context and claim boundaries consistent`);
  }

  if (riskNotes.length === 0) {
    return buildMergedRiskNotes(brief, forbiddenClaims);
  }

  return riskNotes;
}

function buildRationale(
  brief: CampaignCreativeBrief,
  sellingPointFocus: string,
  hookApproach: CampaignCreativeHookApproach,
  cta: string,
): string {
  const audienceBlock = brief.audience ? `，优先对“${brief.audience}”说话` : '';
  const regionBlock = brief.region ? `，并保持 ${brief.region} 市场语境一致` : '';

  if (brief.mode === 'tiktok_ua') {
    if (hookApproach === 'benefit_first') {
      return `先把“${sellingPointFocus}”打成最直观的收益感${audienceBlock}${regionBlock}，让用户几乎不用理解背景就能感知价值，再尽快把 CTA“${cta}”落下。`;
    }
    if (hookApproach === 'story_first') {
      return `先给一个足够短的小剧情把人带进来${audienceBlock}${regionBlock}，再把“${sellingPointFocus}”作为 payoff 抬出来，最后把 CTA“${cta}”收紧，兼顾吸引力和转化。`;
    }
    return `优先制造冲突和不适感${audienceBlock}${regionBlock}，让“${sellingPointFocus}”承担解答与回收的角色，再把 CTA“${cta}”提前落下，更适合 UA 的抢注意力场景。`;
  }

  if (hookApproach === 'benefit_first') {
    return `先让用户立刻看见“${sellingPointFocus}”的价值${audienceBlock}${regionBlock}，再把品牌氛围和场景补齐，最后用更轻的 CTA“${cta}”承接。`;
  }
  if (hookApproach === 'conflict_first') {
    return `通过反差或 tension 先抓住注意力${audienceBlock}${regionBlock}，再让“${sellingPointFocus}”回收问题，能让内容更有记忆点但不至于太像硬广。`;
  }
  return `围绕“${sellingPointFocus}”建立更稳定的内容情境${audienceBlock}${regionBlock}，让用户先进入角色或场景，再自然接受 CTA“${cta}”，更适合品牌内容沉淀。`;
}

export function parseMultilineList(value: string): string[] {
  return value
    .split(/\r?\n|,|;|，|；/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function buildBriefFromForm(input: {
  mode: CampaignCreativeMode;
  objective: string;
  audience: string;
  sellingPointsText: string;
  cta: string;
  referenceStyle: string;
  region: string;
  forbiddenClaimsText: string;
}): CampaignCreativeBrief {
  return {
    briefId: createObjectId('brief'),
    platform: 'tiktok',
    mode: input.mode,
    objective: input.objective.trim() || undefined,
    audience: input.audience.trim() || undefined,
    sellingPoints: parseMultilineList(input.sellingPointsText),
    cta: input.cta.trim() || undefined,
    referenceStyle: input.referenceStyle.trim() || undefined,
    region: input.region.trim() || undefined,
    forbiddenClaims: parseMultilineList(input.forbiddenClaimsText),
  };
}

export function buildDefaultStrategyTuning(
  brief: CampaignCreativeBrief,
): CampaignCreativeStrategyTuning {
  return {
    hookApproach: resolveDefaultHookApproach(brief.mode),
    sellingPointFocus: buildDefaultSellingPointFocus(brief),
    ctaType: resolveDefaultCtaType(brief.mode),
  };
}

export function buildCampaignProfile(
  brief: CampaignCreativeBrief,
  options?: {
    campaignId?: string;
    automationLevel?: CampaignAutomationLevel;
    knowledgeContext?: DerivedCampaignKnowledgeContext;
  },
): CampaignProfile {
  const knowledgeContext = options?.knowledgeContext;
  const selectedKnowledgePackIds = mergeUniqueStrings(knowledgeContext?.selectedPackIds);

  return {
    campaignId: options?.campaignId ?? createObjectId('campaign'),
    briefId: brief.briefId,
    automationLevel: options?.automationLevel ?? DEFAULT_CAMPAIGN_AUTOMATION_LEVEL,
    selectedKnowledgePackIds,
    knowledgeContext:
      knowledgeContext && (
        selectedKnowledgePackIds.length > 0 ||
        knowledgeContext.marketTruth.length > 0 ||
        knowledgeContext.audienceTension.length > 0 ||
        knowledgeContext.toneRules.length > 0 ||
        knowledgeContext.forbiddenClaims.length > 0 ||
        knowledgeContext.approvedAngles.length > 0 ||
        knowledgeContext.hookCandidates.length > 0 ||
        knowledgeContext.visualCues.length > 0 ||
        knowledgeContext.rationaleNotes.length > 0
      )
        ? {
            selectedPackIds: selectedKnowledgePackIds,
            marketTruth: mergeUniqueStrings(knowledgeContext.marketTruth),
            audienceTension: mergeUniqueStrings(knowledgeContext.audienceTension),
            toneRules: mergeUniqueStrings(knowledgeContext.toneRules),
            forbiddenClaims: mergeUniqueStrings(knowledgeContext.forbiddenClaims),
            approvedAngles: mergeUniqueStrings(knowledgeContext.approvedAngles),
            hookCandidates: mergeUniqueStrings(knowledgeContext.hookCandidates),
            visualCues: mergeUniqueStrings(knowledgeContext.visualCues),
            rationaleNotes: mergeUniqueStrings(knowledgeContext.rationaleNotes),
          }
        : undefined,
  };
}

export function buildCampaignPlan(
  brief: CampaignCreativeBrief,
  strategy: CampaignCreativeStrategy,
  options?: {
    campaignId?: string;
    automationLevel?: CampaignAutomationLevel;
    variantPack?: CampaignCreativeVariantPack | null;
    knowledgeContext?: DerivedCampaignKnowledgeContext;
  },
): CampaignPlan {
  const automationLevel = options?.automationLevel ?? DEFAULT_CAMPAIGN_AUTOMATION_LEVEL;
  const variantCount = options?.variantPack?.variants.length ?? 3;
  const knowledgePackCount =
    options?.knowledgeContext?.selectedPackIds.length ??
    strategy.knowledgePackIds.length;
  const reviewDecisions = mergeUniqueStrings(
    strategy.forbiddenClaims.length > 0
      ? ['Human review required before publish because claims are tightly constrained.']
      : [],
    strategy.riskNotes.length > 0 && !brief.region
      ? ['Quick review recommended before publish to confirm guardrails and tone.']
      : [],
    brief.region
      ? [`Review market fit for ${brief.region} before distribution goes live.`]
      : [],
  );

  const knowledgeLine =
    knowledgePackCount > 0
      ? `Anchor the plan in ${knowledgePackCount} selected knowledge pack${knowledgePackCount > 1 ? 's' : ''}.`
      : 'Proceed from the campaign brief alone and keep the first publish review lightweight.';

  return {
    campaignId: options?.campaignId ?? createObjectId('campaign'),
    briefId: brief.briefId,
    strategyId: strategy.strategyId,
    automationLevel,
    summary:
      `System will produce a ${variantCount}-variant TikTok pack around "${strategy.sellingPointFocus ?? strategy.objective}" and prepare it for distribution review. ${knowledgeLine}`,
    productionDecisions: mergeUniqueStrings(
      [`${variantCount} TikTok variants built around ${strategy.sellingPointFocus ?? strategy.objective}`],
      [`Lead with ${strategy.recommendedHook}`],
      strategy.cta ? [`Keep the CTA ready: ${strategy.cta}`] : [],
    ),
    distributionDecisions: mergeUniqueStrings(
      ['Prepare TikTok publish metadata'],
      knowledgePackCount > 0 ? ['Carry the selected knowledge context into review and distribution prep'] : [],
      automationLevel === 'full_autopilot'
        ? ['Auto-queue publish after validation']
        : ['Queue for campaign review before publish'],
    ),
    reviewDecisions:
      reviewDecisions.length > 0
        ? reviewDecisions
        : ['Review the recommended variant before the first publish batch.'],
  };
}

export function describeCampaignAutomationLevel(
  level: CampaignAutomationLevel,
): string {
  if (level === 'assist') {
    return 'System proposes the plan, but a human still approves each major step before it moves forward.';
  }
  if (level === 'full_autopilot') {
    return 'System keeps planning, producing, and queuing distribution unless an exception or guardrail blocks it.';
  }
  return 'System handles planning and preparation, but still pauses for risky or low-confidence review.';
}

export function buildCampaignPendingActions(
  brief: CampaignCreativeBrief,
  strategy: CampaignCreativeStrategy,
  options?: {
    automationLevel?: CampaignAutomationLevel;
    variantCount?: number;
  },
): string[] {
  const actions = mergeUniqueStrings(
    strategy.forbiddenClaims.length > 0 || Boolean(brief.region)
      ? ['Review claim and region guardrails before publish.']
      : [],
    (options?.variantCount ?? 0) > 1
      ? ['Confirm the first publish-ready variant.']
      : [],
    (options?.automationLevel ?? DEFAULT_CAMPAIGN_AUTOMATION_LEVEL) === 'assist'
      ? ['Approve the campaign plan before distribution prep continues.']
      : [],
  );

  return actions.length > 0
    ? actions
    : ['No manual review is required before the first publish queue.'];
}

export function buildFeedbackRecord(
  campaignId: string,
  summary: string,
  feedbackType: CampaignFeedbackType = 'human_direction',
  feedbackId?: string,
): FeedbackRecord {
  return {
    feedbackId: feedbackId ?? createObjectId('feedback'),
    campaignId,
    feedbackType,
    summary: summary.trim(),
  };
}

export function buildStrategyFromBrief(
  brief: CampaignCreativeBrief,
  options?: BuildStrategyOptions,
): CampaignCreativeStrategy {
  const defaultTuning = buildDefaultStrategyTuning(brief);
  const tuning: CampaignCreativeStrategyTuning = {
    ...defaultTuning,
    ...options?.tuning,
    sellingPointFocus:
      options?.tuning?.sellingPointFocus?.trim() || defaultTuning.sellingPointFocus,
  };

  const objective = buildObjective(brief);
  const cta = buildCtaCopy(brief, tuning.ctaType);
  const knowledgeContext = options?.knowledgeContext;
  const knowledgePackIds = mergeUniqueStrings(knowledgeContext?.selectedPackIds);
  const marketTruth = mergeUniqueStrings(knowledgeContext?.marketTruth);
  const audienceTension = mergeUniqueStrings(knowledgeContext?.audienceTension);
  const toneRules = mergeUniqueStrings(knowledgeContext?.toneRules);
  const forbiddenClaims = mergeUniqueStrings(
    brief.forbiddenClaims ?? [],
    knowledgeContext?.forbiddenClaims,
  );
  const visualCues = mergeUniqueStrings(knowledgeContext?.visualCues);
  const approvedAngles = mergeUniqueStrings(knowledgeContext?.approvedAngles);
  const hookCandidates = mergeUniqueStrings(knowledgeContext?.hookCandidates);
  const baseHookOptions = buildHookOptions(
    brief.mode,
    objective,
    tuning.sellingPointFocus,
    tuning.hookApproach,
  );
  const hookOptions = resolveKnowledgeHookOptions(
    tuning.hookApproach,
    hookCandidates,
    baseHookOptions,
  );
  const targetAudience = brief.audience;
  const baseAngle = buildAngle(brief.mode, tuning.hookApproach, tuning.ctaType);
  const baseTone = buildTone(brief.mode, tuning.hookApproach, tuning.ctaType);

  return {
    strategyId: options?.strategyId ?? createObjectId('strategy'),
    briefId: brief.briefId,
    platform: 'tiktok',
    mode: brief.mode,
    objective,
    targetAudience,
    sellingPointFocus: tuning.sellingPointFocus,
    hookApproach: tuning.hookApproach,
    hookOptions,
    recommendedHook: hookOptions[0] ?? tuning.sellingPointFocus,
    cta,
    ctaType: tuning.ctaType,
    angle: buildKnowledgeAwareAngle(baseAngle, approvedAngles),
    tone: buildKnowledgeAwareTone(baseTone, toneRules),
    assetNeeds: buildAssetNeeds(
      brief.mode,
      tuning.sellingPointFocus,
      targetAudience,
      tuning.hookApproach,
    ),
    riskNotes: buildMergedRiskNotesSafe(brief, forbiddenClaims),
    rationale: buildRationale(brief, tuning.sellingPointFocus, tuning.hookApproach, cta),
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

const VARIANT_SLOT_ORDER: CampaignCreativeVariantEmphasis[] = [
  'hook_focus',
  'selling_point_focus',
  'cta_focus',
];

function resolveVariantCtaType(
  mode: CampaignCreativeMode,
  emphasis: CampaignCreativeVariantEmphasis,
): CampaignCreativeCtaType {
  if (emphasis === 'hook_focus') {
    return mode === 'tiktok_ua' ? 'soft_conversion' : 'brand_follow';
  }
  if (emphasis === 'selling_point_focus') {
    return 'soft_conversion';
  }
  return mode === 'tiktok_ua' ? 'direct_response' : 'soft_conversion';
}

function resolveVariantSellingPoint(
  brief: CampaignCreativeBrief,
  fallback: string,
  emphasis: CampaignCreativeVariantEmphasis,
): string {
  const alternativeOrder =
    emphasis === 'selling_point_focus'
      ? [1, 2, 0]
      : emphasis === 'cta_focus'
        ? [2, 1, 0]
        : [0, 1, 2];

  for (const index of alternativeOrder) {
    const candidate = brief.sellingPoints[index]?.trim();
    if (candidate) {
      return candidate;
    }
  }
  return fallback;
}

function resolveVariantHookApproach(
  brief: CampaignCreativeBrief,
  emphasis: CampaignCreativeVariantEmphasis,
): CampaignCreativeHookApproach {
  if (emphasis === 'hook_focus') {
    return brief.mode === 'tiktok_ua' ? 'conflict_first' : 'story_first';
  }
  if (emphasis === 'selling_point_focus') {
    return 'benefit_first';
  }
  return brief.mode === 'tiktok_ua' ? 'story_first' : 'conflict_first';
}

function buildVariantTitle(
  mode: CampaignCreativeMode,
  emphasis: CampaignCreativeVariantEmphasis,
): string {
  if (emphasis === 'hook_focus') {
    return mode === 'tiktok_ua' ? 'Variant A · Hook punch' : 'Variant A · Opening memory point';
  }
  if (emphasis === 'selling_point_focus') {
    return 'Variant B · Selling-point proof';
  }
  return mode === 'tiktok_ua' ? 'Variant C · CTA push' : 'Variant C · Response close';
}

function buildVariantOpeningBeat(
  mode: CampaignCreativeMode,
  emphasis: CampaignCreativeVariantEmphasis,
  hook: string,
  focus: string,
): string {
  if (emphasis === 'hook_focus') {
    return mode === 'tiktok_ua'
      ? `Start on the payoff frame, then snap directly into "${hook}".`
      : `Open inside the mood first, then let "${hook}" become the first memory point.`;
  }
  if (emphasis === 'selling_point_focus') {
    return `Use the first beat to prove "${focus}" before widening into the rest of the story.`;
  }
  return mode === 'tiktok_ua'
    ? `Keep the hook compact, surface the payoff, and place the CTA on-screen before the midpoint.`
    : `Build value quickly, then reserve the final beat for an explicit response action.`;
}

function buildVariantEditingDirection(
  mode: CampaignCreativeMode,
  emphasis: CampaignCreativeVariantEmphasis,
): string {
  if (emphasis === 'hook_focus') {
    return mode === 'tiktok_ua'
      ? 'Cut hard in the first 2 seconds, keep the payoff visible, and avoid slow setup.'
      : 'Protect the opening mood, but make the first hook line land before the user can scroll away.';
  }
  if (emphasis === 'selling_point_focus') {
    return 'Hold one extra proof beat on the selling point, then let the supporting footage reinforce the same idea.';
  }
  return mode === 'tiktok_ua'
    ? 'Bring the CTA on-screen earlier, repeat it in the close, and make the response action impossible to miss.'
    : 'Let the reveal settle, then close with a clearer action cue than the base strategy.';
}

function buildVariantDifferenceSummary(
  emphasis: CampaignCreativeVariantEmphasis,
  focus: string,
): string {
  if (emphasis === 'hook_focus') {
    return 'This is the most opening-led variant in the pack, optimized to win attention before detail.';
  }
  if (emphasis === 'selling_point_focus') {
    return `This variant spends more screen time proving "${focus}" instead of pushing the CTA early.`;
  }
  return 'This is the most response-forward variant in the pack, trading some setup for a clearer action close.';
}

function buildVariantSummary(mode: CampaignCreativeMode): string {
  return mode === 'tiktok_ua'
    ? 'Compare three UA directions before editing: strongest hook, clearest selling-point proof, and hardest CTA close.'
    : 'Compare three content directions before editing: memory-point opening, selling-point proof, and stronger response close.';
}

function buildVariantTuning(
  brief: CampaignCreativeBrief,
  strategy: CampaignCreativeStrategy,
  emphasis: CampaignCreativeVariantEmphasis,
): CampaignCreativeStrategyTuning {
  const fallbackFocus = strategy.sellingPointFocus ?? buildDefaultSellingPointFocus(brief);
  return {
    hookApproach: resolveVariantHookApproach(brief, emphasis),
    sellingPointFocus: resolveVariantSellingPoint(brief, fallbackFocus, emphasis),
    ctaType: resolveVariantCtaType(brief.mode, emphasis),
  };
}

function buildVariantCta(
  brief: CampaignCreativeBrief,
  emphasis: CampaignCreativeVariantEmphasis,
  fallbackCta: string,
): string {
  const explicitCta = brief.cta?.trim();
  if (explicitCta) {
    return explicitCta;
  }

  if (emphasis === 'selling_point_focus') {
    return brief.mode === 'tiktok_ua'
      ? 'See the payoff, then tap in.'
      : 'Stay through the reveal, then follow for more.';
  }

  return fallbackCta;
}

function createKnowledgeContextFromStrategy(
  strategy: CampaignCreativeStrategy,
): DerivedCampaignKnowledgeContext | undefined {
  const hasKnowledge =
    strategy.knowledgePackIds.length > 0 ||
    strategy.marketTruth.length > 0 ||
    strategy.audienceTension.length > 0 ||
    strategy.toneRules.length > 0 ||
    strategy.forbiddenClaims.length > 0 ||
    strategy.approvedAngles.length > 0 ||
    strategy.hookCandidates.length > 0 ||
    strategy.visualCues.length > 0;

  if (!hasKnowledge) {
    return undefined;
  }

  return {
    selectedPackIds: strategy.knowledgePackIds,
    marketTruth: strategy.marketTruth,
    audienceTension: strategy.audienceTension,
    toneRules: strategy.toneRules,
    forbiddenClaims: strategy.forbiddenClaims,
    approvedAngles: strategy.approvedAngles,
    hookCandidates: strategy.hookCandidates,
    visualCues: strategy.visualCues,
    rationaleNotes: [],
  };
}

export function buildVariantPackFromStrategy(
  brief: CampaignCreativeBrief,
  strategy: CampaignCreativeStrategy,
): CampaignCreativeVariantPack {
  const variantPackId = strategy.strategyId
    ? `variant_pack_${strategy.strategyId}`
    : createObjectId('variant_pack');
  const knowledgeContext = createKnowledgeContextFromStrategy(strategy);
  const variants: CampaignCreativeVariant[] = VARIANT_SLOT_ORDER.map((emphasis, index) => {
    const tuning = buildVariantTuning(brief, strategy, emphasis);
    const derivedStrategy = buildStrategyFromBrief(brief, {
      strategyId: strategy.strategyId,
      tuning,
      knowledgeContext,
    });
    const hook = derivedStrategy.recommendedHook;
    const focus = derivedStrategy.sellingPointFocus ?? tuning.sellingPointFocus;
    return {
      variantId: `${variantPackId}_${emphasis}`,
      variantPackId,
      briefId: brief.briefId,
      strategyId: strategy.strategyId,
      emphasis,
      title: buildVariantTitle(brief.mode, emphasis),
      hook,
      openingBeat: buildVariantOpeningBeat(brief.mode, emphasis, hook, focus),
      sellingPointFocus: focus,
      cta: buildVariantCta(brief, emphasis, derivedStrategy.cta),
      ctaType: derivedStrategy.ctaType,
      editingDirection: buildVariantEditingDirection(brief.mode, emphasis),
      assetSuggestion: derivedStrategy.assetNeeds[0] ?? strategy.assetNeeds[0] ?? '',
      differenceSummary: buildVariantDifferenceSummary(emphasis, focus),
      isRecommended: index === 0,
    };
  });

  return {
    variantPackId,
    briefId: brief.briefId,
    strategyId: strategy.strategyId,
    mode: brief.mode,
    summary: buildVariantSummary(brief.mode),
    comparisonAxes: ['Hook', 'Selling point focus', 'CTA'],
    variants,
    selectedVariantId: variants[0]?.variantId ?? '',
  };
}
