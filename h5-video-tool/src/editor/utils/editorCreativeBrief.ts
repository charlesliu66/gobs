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

function normalizeSellingPoints(value: unknown): string[] {
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

function normalizeBriefStringList(value: unknown): string[] {
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
  mode?: EditorCreativeMode;
  objective?: string;
  audience?: string;
  sellingPoints?: string[] | string;
  cta?: string;
  referenceStyle?: string;
  region?: string;
  forbiddenClaims?: string[] | string;
}): EditorCreativeBrief | undefined {
  const sellingPoints = normalizeSellingPoints(input.sellingPoints);
  const objective = cleanText(input.objective);
  const audience = cleanText(input.audience);
  const cta = cleanText(input.cta);
  const referenceStyle = cleanText(input.referenceStyle);
  const region = cleanText(input.region);
  const forbiddenClaims = normalizeBriefStringList(input.forbiddenClaims);
  const mode = input.mode === 'tiktok_ua' ? 'tiktok_ua' : 'tiktok_content';

  const hasContent = Boolean(
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
