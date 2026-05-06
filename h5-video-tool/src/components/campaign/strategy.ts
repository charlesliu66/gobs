import type {
  CampaignCreativeBrief,
  CampaignCreativeMode,
  CampaignCreativeStrategy,
} from './model';

function firstLine(items: string[], fallback: string): string {
  return items[0] ?? fallback;
}

function buildHookOptions(
  mode: CampaignCreativeMode,
  objective: string,
  primarySellingPoint: string,
): string[] {
  if (mode === 'tiktok_ua') {
    return [
      `前 2 秒直给冲突：${objective}`,
      `用结果反推卖点：${primarySellingPoint}`,
      '先抛低门槛 CTA，再补核心机制亮点',
    ];
  }

  return [
    `先用品牌世界观抓住注意力：${objective}`,
    `用真实使用场景放大卖点：${primarySellingPoint}`,
    '以情绪转场承接品牌调性与 CTA',
  ];
}

export function parseMultilineList(value: string): string[] {
  return value
    .split(/\r?\n|,|;/)
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

export function buildStrategyFromBrief(brief: CampaignCreativeBrief): CampaignCreativeStrategy {
  const objective = brief.objective || (brief.mode === 'tiktok_ua' ? '快速验证转化创意' : '建立品牌内容记忆点');
  const primarySellingPoint = firstLine(
    brief.sellingPoints,
    brief.mode === 'tiktok_ua' ? '核心玩法或收益感知' : '品牌主卖点',
  );
  const cta = brief.cta || (brief.mode === 'tiktok_ua' ? '现在下载并立即开玩' : '了解更多并进入品牌主页');
  const hookOptions = buildHookOptions(brief.mode, objective, primarySellingPoint);

  if (brief.mode === 'tiktok_ua') {
    return {
      platform: 'tiktok',
      mode: brief.mode,
      objective,
      audience: brief.audience,
      primarySellingPoint,
      hookOptions,
      recommendedHook: hookOptions[0],
      cta,
      angle: '强冲突 + 高收益感知 + 低门槛 CTA',
      tone: '快节奏、结果导向、前 3 秒强钩子',
      assetNeeds: [
        '1 条最能体现冲突或结果的角色/玩法素材',
        '1 组强化收益感的 UI 或数值画面',
        '1 组适合前 3 秒直出的封面/字幕文案',
      ],
      rationale: `优先把“${primarySellingPoint}”放到最前面，用结果或冲突先抓住注意力，再补玩法与 CTA，适合 TikTok UA 的首轮创意验证。`,
    };
  }

  return {
    platform: 'tiktok',
    mode: brief.mode,
    objective,
    audience: brief.audience,
    primarySellingPoint,
    hookOptions,
    recommendedHook: hookOptions[0],
    cta,
    angle: '品牌记忆点 + 使用场景 + 情绪共鸣',
    tone: '品牌调性优先、节奏清晰、情绪渐进',
    assetNeeds: [
      '1 组能体现品牌调性的主视觉或角色素材',
      '1 组贴近用户场景的演示/剧情镜头',
      '1 版适合封面与结尾的品牌 CTA 文案',
    ],
    rationale: `围绕“${primarySellingPoint}”建立品牌记忆点，先让用户理解品牌气质，再用场景化内容承接 CTA，更适合 Brand Content 的长期内容资产积累。`,
  };
}
