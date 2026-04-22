export type EditorCreativeMode = 'tiktok_content' | 'tiktok_ua';

export interface EditorCreativeBrief {
  platform: 'tiktok';
  mode: EditorCreativeMode;
  objective?: string;
  audience?: string;
  sellingPoints: string[];
  cta?: string;
  referenceStyle?: string;
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

function normalizeSellingPoints(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => cleanText(item))
      .filter((item): item is string => Boolean(item));
  }
  if (typeof value === 'string') {
    return value
      .split(/\r?\n|,|，|;|；/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

export function normalizeEditorCreativeBrief(input: unknown): EditorCreativeBrief | undefined {
  if (!input || typeof input !== 'object') return undefined;
  const raw = input as Record<string, unknown>;
  const sellingPoints = normalizeSellingPoints(raw.sellingPoints);
  const audience = cleanText(raw.audience);
  const objective = cleanText(raw.objective);
  const cta = cleanText(raw.cta);
  const referenceStyle = cleanText(raw.referenceStyle);
  const modeRaw = cleanText(raw.mode);
  const hasContent = Boolean(
    sellingPoints.length > 0 ||
    audience ||
    objective ||
    cta ||
    referenceStyle ||
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
  };
}

function defaultObjectiveForMode(mode: EditorCreativeMode): string {
  return mode === 'tiktok_ua' ? '点击转化' : '内容运营';
}

function defaultCtaForMode(mode: EditorCreativeMode): string {
  return mode === 'tiktok_ua' ? 'Download now' : 'Follow for more';
}

function primarySellingPoint(brief: EditorCreativeBrief): string {
  return brief.sellingPoints[0] || '核心玩法爽点';
}

export function buildCreativeHookOptions(brief: EditorCreativeBrief): string[] {
  const point = primarySellingPoint(brief);
  if (brief.mode === 'tiktok_ua') {
    return [
      `Wait, you get ${point}?`,
      `POV: ${point} hits in the first 3 seconds.`,
      `This ${point} payoff changes the whole run.`,
      `No one expects ${point} this early.`,
    ];
  }
  return [
    `POV: the moment ${point} finally lands.`,
    `This ${point} scene feels unreal.`,
    `You stay for the vibe, then ${point} hits.`,
    `When the world opens up and ${point} clicks.`,
  ];
}

export function buildCreativeStrategy(brief?: EditorCreativeBrief): EditorCreativeStrategy | undefined {
  if (!brief) return undefined;
  const primaryPoint = primarySellingPoint(brief);
  const objective = brief.objective || defaultObjectiveForMode(brief.mode);
  const hookOptions = buildCreativeHookOptions(brief);
  const recommendedHook = hookOptions[0] || `POV: ${primaryPoint}`;
  const cta = brief.cta || defaultCtaForMode(brief.mode);
  const audienceBlock = brief.audience ? `，面向「${brief.audience}」` : '';
  const rationale =
    brief.mode === 'tiktok_ua'
      ? `买量模式优先把「${primaryPoint}」放进前 3 秒钩子${audienceBlock}，节奏更快，结尾用更直接的 CTA「${cta}」。`
      : `内容模式优先把「${primaryPoint}」做成更易停留的 TikTok 开场${audienceBlock}，保留氛围感和角色/世界观表达，再用轻 CTA「${cta}」收尾。`;

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
): string {
  if (!brief || !strategy) return '';
  const lines: string[] = [
    '## TikTok Campaign Brief',
    `- Mode: ${brief.mode === 'tiktok_ua' ? 'TikTok 买量' : 'TikTok 内容'}`,
    `- Objective: ${strategy.objective}`,
    `- Selling points: ${brief.sellingPoints.length > 0 ? brief.sellingPoints.join(' / ') : primarySellingPoint(brief)}`,
    `- CTA: ${strategy.cta}`,
  ];
  if (brief.audience) lines.push(`- Audience: ${brief.audience}`);
  if (brief.referenceStyle) lines.push(`- Reference style: ${brief.referenceStyle}`);
  lines.push('');
  lines.push('## Creative Strategy');
  lines.push(`- Recommended hook: ${strategy.recommendedHook}`);
  if (strategy.hookOptions.length > 1) {
    lines.push(`- Backup hooks: ${strategy.hookOptions.slice(1).join(' | ')}`);
  }
  lines.push(`- Rationale: ${strategy.rationale}`);
  lines.push(
    brief.mode === 'tiktok_ua'
      ? '- Editing guidance: open strong in the first 3 seconds, surface payoff early, and end with a direct conversion CTA.'
      : '- Editing guidance: keep a creator-native TikTok tone, allow more atmosphere, and land the selling point before a softer CTA.',
  );
  return lines.join('\n');
}

export function buildDefaultCreativeUserMessage(brief: EditorCreativeBrief): string {
  const strategy = buildCreativeStrategy(brief);
  const objective = strategy?.objective || defaultObjectiveForMode(brief.mode);
  const point = primarySellingPoint(brief);
  const audience = brief.audience ? `，目标人群是「${brief.audience}」` : '';
  const reference = brief.referenceStyle ? `，参考风格是「${brief.referenceStyle}」` : '';
  const cta = strategy?.cta || defaultCtaForMode(brief.mode);
  if (brief.mode === 'tiktok_ua') {
    return `请基于已选素材制作一条适合 TikTok 游戏买量的 15 秒短视频，前 3 秒必须有强钩子，优先突出卖点「${point}」，目标是「${objective}」${audience}${reference}，结尾 CTA 用「${cta}」。`;
  }
  return `请基于已选素材制作一条适合 TikTok 游戏内容运营的 15 秒短视频，用更像平台内容的方式突出「${point}」，目标是「${objective}」${audience}${reference}，结尾 CTA 用「${cta}」。`;
}
