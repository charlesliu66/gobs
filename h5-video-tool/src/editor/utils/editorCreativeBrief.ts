export type EditorCreativeMode = 'tiktok_content' | 'tiktok_ua';
export type EditorCreativeCtaType = 'direct_response' | 'soft_conversion' | 'brand_follow';
export type EditorCreativeHookApproach = 'benefit_first' | 'conflict_first' | 'story_first';

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

export function normalizeEditorCreativeBriefForRequest(input: {
  briefId?: string;
  mode?: EditorCreativeMode;
  objective?: string;
  audience?: string;
  sellingPoints?: string[] | string;
  cta?: string;
  referenceStyle?: string;
  region?: string;
  forbiddenClaims?: string[] | string;
}): EditorCreativeBrief | undefined {
  const briefId = cleanText(input.briefId);
  const sellingPoints = normalizeStringList(input.sellingPoints);
  const objective = cleanText(input.objective);
  const audience = cleanText(input.audience);
  const cta = cleanText(input.cta);
  const referenceStyle = cleanText(input.referenceStyle);
  const region = cleanText(input.region);
  const forbiddenClaims = normalizeStringList(input.forbiddenClaims);
  const mode = input.mode === 'tiktok_ua' ? 'tiktok_ua' : 'tiktok_content';

  const hasContent = Boolean(
    briefId ||
    objective ||
    audience ||
    cta ||
    referenceStyle ||
    region ||
    forbiddenClaims.length > 0 ||
    sellingPoints.length > 0,
  );

  if (!hasContent) return undefined;

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
