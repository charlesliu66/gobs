import { localizedText, type ReplyLocale } from './replyLocale.js';

export type EditorCreativeMode = 'tiktok_content' | 'tiktok_ua';

export interface EditorCreativeBrief {
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

export interface EditorCreativeStrategy {
  platform: 'tiktok';
  mode: EditorCreativeMode;
  objective: string;
  audience?: string;
  primarySellingPoint?: string;
  hookOptions: string[];
  recommendedHook: string;
  cta: string;
  rationale: string;
}

function cleanText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
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

export function normalizeEditorCreativeBrief(input: unknown): EditorCreativeBrief | undefined {
  if (!input || typeof input !== 'object') return undefined;
  const raw = input as Record<string, unknown>;
  const sellingPoints = normalizeStringList(raw.sellingPoints);
  const audience = cleanText(raw.audience);
  const objective = cleanText(raw.objective);
  const cta = cleanText(raw.cta);
  const referenceStyle = cleanText(raw.referenceStyle);
  const region = cleanText(raw.region);
  const forbiddenClaims = normalizeStringList(raw.forbiddenClaims);
  const modeRaw = cleanText(raw.mode);

  const hasContent = Boolean(
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
  const objective = cleanText(raw.objective);
  const recommendedHook = cleanText(raw.recommendedHook);
  const cta = cleanText(raw.cta);
  const rationale = cleanText(raw.rationale);
  const primarySellingPoint = cleanText(raw.primarySellingPoint);
  const audience = cleanText(raw.audience);
  const hookOptions = normalizeStringList(raw.hookOptions);
  const modeRaw = cleanText(raw.mode);

  if (!objective || !recommendedHook || !cta || !rationale) {
    return undefined;
  }

  const mode: EditorCreativeMode =
    modeRaw === 'tiktok_ua' || modeRaw === 'tiktok_content'
      ? modeRaw
      : 'tiktok_content';

  return {
    platform: 'tiktok',
    mode,
    objective,
    audience,
    primarySellingPoint,
    hookOptions: hookOptions.length > 0 ? hookOptions : [recommendedHook],
    recommendedHook,
    cta,
    rationale,
  };
}

function defaultObjectiveForMode(mode: EditorCreativeMode, replyLocale: ReplyLocale): string {
  if (mode === 'tiktok_ua') {
    return localizedText(replyLocale, '点击转化', 'Click-through conversion');
  }
  return localizedText(replyLocale, '内容运营', 'Content growth');
}

function defaultCtaForMode(mode: EditorCreativeMode, replyLocale: ReplyLocale): string {
  if (mode === 'tiktok_ua') {
    return localizedText(replyLocale, '立即下载', 'Download now');
  }
  return localizedText(replyLocale, '关注获取更多', 'Follow for more');
}

function primarySellingPoint(brief: EditorCreativeBrief, replyLocale: ReplyLocale): string {
  return brief.sellingPoints[0] || localizedText(replyLocale, '核心玩法爆点', 'core gameplay payoff');
}

export function buildCreativeHookOptions(
  brief: EditorCreativeBrief,
  replyLocale: ReplyLocale,
): string[] {
  const point = primarySellingPoint(brief, replyLocale);
  if (brief.mode === 'tiktok_ua') {
    return replyLocale === 'en'
      ? [
          `Wait, you get ${point}?`,
          `POV: ${point} lands in the first 3 seconds.`,
          `This ${point} payoff changes the whole run.`,
          `No one expects ${point} that early.`,
        ]
      : [
          `等等，这个“${point}”一开场就给到了？`,
          `POV：前 3 秒就把“${point}”打出来。`,
          `这个“${point}”一出来，整条视频都成立了。`,
          `没人会想到“${point}”这么早就放出来。`,
        ];
  }

  return replyLocale === 'en'
    ? [
        `POV: the moment ${point} finally lands.`,
        `This ${point} scene feels unreal.`,
        `You stay for the vibe, then ${point} hits.`,
        `When the world opens up and ${point} clicks.`,
      ]
    : [
        `POV：当“${point}”真正打出来的那一刻。`,
        `这个“${point}”的画面质感有点离谱。`,
        `你先是被氛围留住，然后“${point}”突然打到点上。`,
        `世界观铺开之后，“${point}”一下就成立了。`,
      ];
}

export function buildCreativeStrategy(
  brief?: EditorCreativeBrief,
  replyLocale: ReplyLocale = 'zh-CN',
): EditorCreativeStrategy | undefined {
  if (!brief) return undefined;

  const primaryPoint = primarySellingPoint(brief, replyLocale);
  const objective = brief.objective || defaultObjectiveForMode(brief.mode, replyLocale);
  const hookOptions = buildCreativeHookOptions(brief, replyLocale);
  const recommendedHook = hookOptions[0] || (replyLocale === 'en' ? `POV: ${primaryPoint}` : `POV：${primaryPoint}`);
  const cta = brief.cta || defaultCtaForMode(brief.mode, replyLocale);
  const audienceBlock = brief.audience
    ? localizedText(replyLocale, `，面向“${brief.audience}”`, ` for ${brief.audience}`)
    : '';
  const regionBlock = brief.region
    ? localizedText(replyLocale, `，地区边界是“${brief.region}”`, ` in the ${brief.region} market`)
    : '';
  const forbiddenBlock = brief.forbiddenClaims && brief.forbiddenClaims.length > 0
    ? localizedText(
        replyLocale,
        `，并避开这些风险禁区：“${brief.forbiddenClaims.join(' / ')}”`,
        ` while avoiding these forbidden claims: ${brief.forbiddenClaims.join(' / ')}`,
      )
    : '';

  const rationale =
    brief.mode === 'tiktok_ua'
      ? localizedText(
          replyLocale,
          `买量模式会优先把“${primaryPoint}”放进前 3 秒钩子${audienceBlock}${regionBlock}，节奏更快，结尾用更直接的 CTA“${cta}”${forbiddenBlock}。`,
          `UA mode pushes "${primaryPoint}" into the first 3-second hook${audienceBlock}${regionBlock}, keeps the pace sharper, closes with a direct CTA "${cta}", and avoids forbidden claims${forbiddenBlock}.`,
        )
      : localizedText(
          replyLocale,
          `内容模式会先把“${primaryPoint}”做成更容易停留的 TikTok 开场${audienceBlock}${regionBlock}，保留氛围感和角色表达，再用较软的 CTA“${cta}”收尾${forbiddenBlock}。`,
          `Content mode turns "${primaryPoint}" into a creator-native TikTok opening${audienceBlock}${regionBlock}, keeps more atmosphere and character expression, lands on a softer CTA "${cta}", and avoids risky claims${forbiddenBlock}.`,
        );

  return {
    platform: 'tiktok',
    mode: brief.mode,
    objective,
    audience: brief.audience,
    primarySellingPoint: primaryPoint,
    hookOptions,
    recommendedHook,
    cta,
    rationale,
  };
}

export function buildCreativeBriefPromptBlock(
  brief?: EditorCreativeBrief,
  strategy?: EditorCreativeStrategy,
  replyLocale: ReplyLocale = 'zh-CN',
): string {
  if (!brief || !strategy) return '';

  const lines: string[] = [
    replyLocale === 'en' ? '## TikTok Campaign Brief' : '## TikTok 投放/内容 Brief',
    `- ${replyLocale === 'en' ? 'Mode' : '模式'}: ${
      brief.mode === 'tiktok_ua'
        ? localizedText(replyLocale, 'TikTok 买量', 'TikTok UA')
        : localizedText(replyLocale, 'TikTok 内容', 'TikTok Content')
    }`,
    `- ${replyLocale === 'en' ? 'Objective' : '目标'}: ${strategy.objective}`,
    `- ${replyLocale === 'en' ? 'Selling points' : '卖点'}: ${
      brief.sellingPoints.length > 0 ? brief.sellingPoints.join(' / ') : primarySellingPoint(brief, replyLocale)
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
  lines.push(`- ${replyLocale === 'en' ? 'Recommended hook' : '推荐开场'}: ${strategy.recommendedHook}`);
  if (strategy.hookOptions.length > 1) {
    lines.push(`- ${replyLocale === 'en' ? 'Backup hooks' : '备选开场'}: ${strategy.hookOptions.slice(1).join(' | ')}`);
  }
  lines.push(`- ${replyLocale === 'en' ? 'Rationale' : '策略理由'}: ${strategy.rationale}`);
  lines.push(
    brief.mode === 'tiktok_ua'
      ? localizedText(
          replyLocale,
          '- 剪辑要求：前 3 秒要强钩子，尽早露出 payoff，结尾给直接转化 CTA。',
          '- Editing guidance: open strong in the first 3 seconds, surface the payoff early, and end with a direct conversion CTA.',
        )
      : localizedText(
          replyLocale,
          '- 剪辑要求：保持原生 TikTok 内容感，多留一点氛围，再在中后段落下卖点和柔和 CTA。',
          '- Editing guidance: keep a creator-native TikTok tone, allow more atmosphere, then land the selling point before a softer CTA.',
        ),
  );
  return lines.join('\n');
}

export function buildDefaultCreativeUserMessage(
  brief: EditorCreativeBrief,
  replyLocale: ReplyLocale = 'zh-CN',
): string {
  const strategy = buildCreativeStrategy(brief, replyLocale);
  const objective = strategy?.objective || defaultObjectiveForMode(brief.mode, replyLocale);
  const point = primarySellingPoint(brief, replyLocale);
  const audience = brief.audience
    ? localizedText(replyLocale, `，目标人群是“${brief.audience}”`, ` for ${brief.audience}`)
    : '';
  const reference = brief.referenceStyle
    ? localizedText(replyLocale, `，参考风格是“${brief.referenceStyle}”`, ` with a reference style of ${brief.referenceStyle}`)
    : '';
  const region = brief.region
    ? localizedText(replyLocale, `，面向“${brief.region}”地区`, ` for the ${brief.region} market`)
    : '';
  const forbiddenClaims = brief.forbiddenClaims && brief.forbiddenClaims.length > 0
    ? localizedText(
        replyLocale,
        `，并避开这些风险禁区：“${brief.forbiddenClaims.join(' / ')}”`,
        `, while avoiding these forbidden claims: "${brief.forbiddenClaims.join(' / ')}"`,
      )
    : '';
  const cta = strategy?.cta || defaultCtaForMode(brief.mode, replyLocale);

  if (brief.mode === 'tiktok_ua') {
    return replyLocale === 'en'
      ? `Create a 15-second TikTok game UA cut from the selected footage. The first 3 seconds must hook hard, the edit should surface "${point}" early, the goal is "${objective}"${audience}${region}${reference}, and the ending CTA should be "${cta}"${forbiddenClaims}.`
      : `请基于已选素材制作一条适合 TikTok 游戏买量的 15 秒短视频，前 3 秒必须有强钩子，优先突出卖点“${point}”，目标是“${objective}”${audience}${region}${reference}，结尾 CTA 用“${cta}”${forbiddenClaims}。`;
  }

  return replyLocale === 'en'
    ? `Create a 15-second TikTok content cut from the selected footage. Keep it creator-native, make "${point}" the main payoff, the goal is "${objective}"${audience}${region}${reference}, and close with the CTA "${cta}"${forbiddenClaims}.`
    : `请基于已选素材制作一条适合 TikTok 内容运营的 15 秒短视频，用更像平台内容的方式突出“${point}”，目标是“${objective}”${audience}${region}${reference}，结尾 CTA 用“${cta}”${forbiddenClaims}。`;
}
