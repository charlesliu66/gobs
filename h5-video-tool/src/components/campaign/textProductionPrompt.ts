import type {
  CampaignCreativeBrief,
  CampaignCreativeStrategy,
} from './model.ts';
import type {
  CampaignKnowledgeCitation,
  DerivedCampaignKnowledgeContext,
} from '../../api/campaignKnowledge.ts';

export type TextProductionPlatform = 'tiktok' | 'facebook' | 'instagram' | 'x' | 'generic';
export type TextProducedOutputKind = 'caption' | 'headline' | 'hashtag' | 'post_copy' | 'cta' | 'platform_post';

export interface TextProductionContext {
  platform: TextProductionPlatform;
  angle: string;
  audience: string;
  tone: string;
  sellingPoints: string[];
  ctaIntent: string;
  forbiddenClaims: string[];
  knowledgeCitations?: string[];
}

export interface BuildTextProductionContextArgs {
  platform?: string;
  mission: string;
  brief: CampaignCreativeBrief;
  strategy?: CampaignCreativeStrategy | null;
  knowledgeContext?: DerivedCampaignKnowledgeContext | null;
  knowledgeReferences?: CampaignKnowledgeCitation[];
  selectedVariantTitle?: string | null;
}

export interface TextOutputDraftContent {
  title: string;
  body: string;
  variants: string[];
}

const PLATFORM_LABELS: Record<TextProductionPlatform, string> = {
  tiktok: 'TikTok',
  facebook: 'Facebook',
  instagram: 'Instagram',
  x: 'X',
  generic: 'cross-platform',
};

function cleanText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function uniqueStrings(values: Array<string | undefined | null>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  values.forEach((value) => {
    const text = cleanText(value);
    if (!text) return;
    const key = text.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    result.push(text);
  });
  return result;
}

function firstText(values: Array<string | undefined | null>, fallback: string): string {
  return uniqueStrings(values)[0] ?? fallback;
}

export function normalizeTextProductionPlatform(value: string | undefined | null): TextProductionPlatform {
  const normalized = (value ?? '').trim().toLowerCase();
  if (normalized.includes('facebook') || normalized === 'fb') return 'facebook';
  if (normalized.includes('instagram') || normalized === 'ig') return 'instagram';
  if (normalized === 'x' || normalized.includes('twitter')) return 'x';
  if (normalized.includes('tiktok') || normalized.includes('tik_tok')) return 'tiktok';
  return 'generic';
}

function citationSummary(citation: CampaignKnowledgeCitation): string {
  return `${citation.packTitle}: ${citation.value}`;
}

export function buildTextProductionContext(args: BuildTextProductionContextArgs): TextProductionContext {
  const platform = normalizeTextProductionPlatform(args.platform ?? args.strategy?.platform ?? args.brief.platform);
  const sellingPoints = uniqueStrings([
    args.strategy?.sellingPointFocus,
    ...args.brief.sellingPoints,
    args.knowledgeContext?.approvedAngles[0],
    args.brief.objective,
  ]);
  const forbiddenClaims = uniqueStrings([
    ...(args.brief.forbiddenClaims ?? []),
    ...(args.strategy?.forbiddenClaims ?? []),
    ...(args.knowledgeContext?.forbiddenClaims ?? []),
  ]);
  const knowledgeCitations = uniqueStrings([
    ...(args.knowledgeReferences ?? []).map(citationSummary),
    ...(args.knowledgeContext?.marketTruth ?? []),
    ...(args.knowledgeContext?.toneRules ?? []),
  ]);

  return {
    platform,
    angle: firstText([
      args.strategy?.angle,
      args.selectedVariantTitle,
      args.knowledgeContext?.approvedAngles[0],
      args.brief.objective,
    ], args.mission),
    audience: firstText([
      args.strategy?.targetAudience,
      args.brief.audience,
      args.knowledgeContext?.audienceTension[0],
    ], 'target players'),
    tone: firstText([
      args.strategy?.tone,
      args.strategy?.toneRules[0],
      args.knowledgeContext?.toneRules[0],
      args.brief.referenceStyle,
    ], 'clear, energetic, and specific'),
    sellingPoints: sellingPoints.length > 0 ? sellingPoints : [args.mission],
    ctaIntent: firstText([
      args.strategy?.cta,
      args.brief.cta,
    ], 'Play Gold and Glory today'),
    forbiddenClaims,
    knowledgeCitations: knowledgeCitations.length > 0 ? knowledgeCitations : undefined,
  };
}

function primarySellingPoint(context: TextProductionContext): string {
  return context.sellingPoints[0] ?? context.angle;
}

function headlineSeeds(context: TextProductionContext): string[] {
  return uniqueStrings([
    context.angle,
    primarySellingPoint(context),
    `${primarySellingPoint(context)} for ${context.audience}`,
  ]).slice(0, 3);
}

function hashtagFromText(value: string): string | undefined {
  const token = value.replace(/[^a-zA-Z0-9]+/g, '');
  if (token.length < 3) return undefined;
  return `#${token.slice(0, 32)}`;
}

export function buildTextHashtags(context: TextProductionContext): string[] {
  return uniqueStrings([
    '#GoldAndGlory',
    context.platform === 'facebook' ? '#FacebookGaming' : undefined,
    context.platform === 'tiktok' ? '#MobileRPG' : undefined,
    hashtagFromText(primarySellingPoint(context)),
    hashtagFromText(context.angle),
  ]).slice(0, 6);
}

export function buildTextOutputDraftContent(
  kind: TextProducedOutputKind,
  context: TextProductionContext,
): TextOutputDraftContent {
  const platformLabel = PLATFORM_LABELS[context.platform];
  const primaryPoint = primarySellingPoint(context);
  const headlines = headlineSeeds(context);
  const hashtags = buildTextHashtags(context);
  const captions = uniqueStrings([
    `${headlines[0]}. ${context.ctaIntent}.`,
    `${primaryPoint} for ${context.audience}. ${context.ctaIntent}.`,
    `${context.angle}. ${primaryPoint}.`,
  ]).slice(0, 3);
  const postCopies = uniqueStrings([
    `${captions[0]} ${context.tone}.`,
    `${headlines[0]}: ${primaryPoint}. ${context.ctaIntent}.`,
    `${context.audience} get ${primaryPoint}. ${context.ctaIntent}.`,
  ]).slice(0, 3);
  const ctas = uniqueStrings([
    context.ctaIntent,
    `Try ${primaryPoint} today`,
    `Start with ${context.angle}`,
  ]).slice(0, 3);
  const platformPosts = postCopies.map((copy, index) => [
    headlines[index % headlines.length],
    copy,
    ctas[index % ctas.length],
    hashtags.slice(0, 4).join(' '),
  ].filter(Boolean).join('\n'));

  switch (kind) {
    case 'caption':
      return { title: `${platformLabel} caption variants`, body: captions[0], variants: captions };
    case 'headline':
      return { title: `${platformLabel} headline variants`, body: headlines[0], variants: headlines };
    case 'hashtag':
      return { title: `${platformLabel} hashtag set`, body: hashtags.join(' '), variants: hashtags };
    case 'post_copy':
      return { title: `${platformLabel} post copy variants`, body: postCopies[0], variants: postCopies };
    case 'cta':
      return { title: `${platformLabel} CTA variants`, body: ctas[0], variants: ctas };
    case 'platform_post':
      return { title: `${platformLabel} platform post draft`, body: platformPosts[0], variants: platformPosts };
  }
}

export function buildTextProductionPrompt(
  kind: TextProducedOutputKind,
  context: TextProductionContext,
): string {
  const platformLabel = PLATFORM_LABELS[context.platform];
  return [
    `You are writing ${platformLabel} campaign ${kind.replace(/_/g, ' ')} drafts for a mobile game campaign.`,
    '',
    `Angle: ${context.angle}`,
    `Audience: ${context.audience}`,
    `Tone: ${context.tone}`,
    `Key selling points: ${context.sellingPoints.join(' | ')}`,
    `CTA intent: ${context.ctaIntent}`,
    `Forbidden claims: ${context.forbiddenClaims.length > 0 ? context.forbiddenClaims.join(' | ') : 'none provided'}`,
    context.knowledgeCitations?.length ? `Knowledge citations: ${context.knowledgeCitations.join(' | ')}` : undefined,
    '',
    'Rules:',
    '- Keep the draft platform-native and reviewable.',
    '- Bind each variant to one selling point.',
    '- Do NOT use forbidden claims.',
    '- Do NOT present compliance approval as guaranteed.',
    '',
    'Return JSON array entries with: text, sellingPoint, hookApproach, suggestedHashtags.',
  ].filter((line): line is string => typeof line === 'string').join('\n');
}
