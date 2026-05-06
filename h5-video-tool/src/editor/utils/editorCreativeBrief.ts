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

export function normalizeEditorCreativeVariantForRequest(input: {
  variantId?: string;
  variantPackId?: string;
  strategyId?: string;
  briefId?: string;
  emphasis?: EditorCreativeVariantEmphasis;
  title?: string;
  hook?: string;
  openingBeat?: string;
  sellingPointFocus?: string;
  cta?: string;
  ctaType?: EditorCreativeCtaType;
  editingDirection?: string;
  assetSuggestion?: string;
  differenceSummary?: string;
  isRecommended?: boolean;
}): EditorCreativeVariant | undefined {
  const title = cleanText(input.title);
  const hook = cleanText(input.hook);
  const cta = cleanText(input.cta);
  const differenceSummary = cleanText(input.differenceSummary);
  if (!title || !hook || !cta || !differenceSummary) return undefined;

  return {
    variantId: cleanText(input.variantId),
    variantPackId: cleanText(input.variantPackId),
    strategyId: cleanText(input.strategyId),
    briefId: cleanText(input.briefId),
    emphasis: normalizeVariantEmphasis(input.emphasis),
    title,
    hook,
    openingBeat: cleanText(input.openingBeat),
    sellingPointFocus: cleanText(input.sellingPointFocus),
    cta,
    ctaType:
      input.ctaType === 'direct_response' ||
      input.ctaType === 'soft_conversion' ||
      input.ctaType === 'brand_follow'
        ? input.ctaType
        : undefined,
    editingDirection: cleanText(input.editingDirection),
    assetSuggestion: cleanText(input.assetSuggestion),
    differenceSummary,
    isRecommended: input.isRecommended === true,
  };
}

export function normalizeEditorCreativeVariantPackForRequest(input: {
  variantPackId?: string;
  briefId?: string;
  strategyId?: string;
  mode?: EditorCreativeMode;
  summary?: string;
  comparisonAxes?: string[] | string;
  variants?: Array<Parameters<typeof normalizeEditorCreativeVariantForRequest>[0]> | unknown;
  selectedVariantId?: string;
}): EditorCreativeVariantPack | undefined {
  const variants = Array.isArray(input.variants)
    ? input.variants
        .map((variant) => normalizeEditorCreativeVariantForRequest(
          variant as Parameters<typeof normalizeEditorCreativeVariantForRequest>[0],
        ))
        .filter((variant): variant is EditorCreativeVariant => Boolean(variant))
    : [];
  if (variants.length === 0) return undefined;

  const selectedVariantId = cleanText(input.selectedVariantId);
  return {
    variantPackId: cleanText(input.variantPackId),
    briefId: cleanText(input.briefId),
    strategyId: cleanText(input.strategyId),
    mode: input.mode === 'tiktok_ua' ? 'tiktok_ua' : input.mode === 'tiktok_content' ? 'tiktok_content' : undefined,
    summary: cleanText(input.summary),
    comparisonAxes: normalizeStringList(input.comparisonAxes),
    variants,
    selectedVariantId:
      selectedVariantId && variants.some((variant) => variant.variantId === selectedVariantId)
        ? selectedVariantId
        : variants[0]?.variantId,
  };
}
