export type BannerPromptReadiness = 'template_ready' | 'needs_source_asset' | 'needs_copy';

export interface BannerPromptSpecInput {
  id: string;
  label: string;
  aspectRatio: string;
  width: number;
  height: number;
  platformHint: string;
}

export interface BannerPromptContext {
  readiness: BannerPromptReadiness;
  specIds: string[];
  sourceAssetIds: string[];
  mainVisualAssetId?: string;
  logoAssetId?: string;
  copy: {
    headline: string;
    shortCopy: string;
    cta: string;
  };
  assetFitWarnings: string[];
  forbiddenClaims: string[];
  knowledgeCitations: string[];
}

export interface BuildStructuredBannerPromptInput {
  angle: string;
  objective: string;
  audience: string;
  proof: string;
  specs: BannerPromptSpecInput[];
  mainVisualAssetId?: string;
  logoAssetId?: string;
  shortCopy: string;
  cta: string;
  visualDirection: string;
  forbiddenClaims?: string[];
  knowledgeCitations?: string[];
}

export interface StructuredBannerPrompt {
  title: string;
  body: string;
  variants: string[];
  context: BannerPromptContext;
}

const DEFAULT_FORBIDDEN_CLAIMS = [
  'Do not invent reward odds, guaranteed drops, rankings, or platform endorsements.',
  'Do not create new logos, characters, UI, or screenshots that are not backed by approved source assets.',
];

function cleanText(value: string | undefined): string {
  return value?.trim() || '';
}

function uniqueStrings(values: Array<string | undefined>): string[] {
  return [...new Set(values.map(cleanText).filter(Boolean))];
}

function bulletList(values: string[], fallback: string): string {
  const lines = values.length > 0 ? values : [fallback];
  return lines.map((line) => `- ${line}`).join('\n');
}

function shortTitle(value: string): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length > 72 ? `${normalized.slice(0, 69)}...` : normalized;
}

export function buildBannerPromptContext(input: BuildStructuredBannerPromptInput): BannerPromptContext {
  const mainVisualAssetId = cleanText(input.mainVisualAssetId);
  const logoAssetId = cleanText(input.logoAssetId);
  const shortCopy = cleanText(input.shortCopy);
  const cta = cleanText(input.cta);
  const headline = cleanText(input.angle) || cleanText(input.objective) || 'Campaign banner';
  const assetFitWarnings = uniqueStrings([
    input.specs.length === 0
      ? 'No Banner specs were selected; keep the composition adaptable until a format is chosen.'
      : undefined,
    mainVisualAssetId ? undefined : 'Main visual asset is missing; select approved key art or event art before rendering.',
    logoAssetId ? undefined : 'Logo asset is not selected; verify brand placement before final export.',
    shortCopy.length > 90 ? 'Short copy is long for small formats; verify 1:1 and 9:16 legibility.' : undefined,
    cta.length > 32 ? 'CTA is long; verify button or end-card readability on mobile placements.' : undefined,
  ]);
  const readiness: BannerPromptReadiness = !mainVisualAssetId
    ? 'needs_source_asset'
    : !shortCopy || !cta
      ? 'needs_copy'
      : 'template_ready';

  return {
    readiness,
    specIds: uniqueStrings(input.specs.map((spec) => spec.id)),
    sourceAssetIds: uniqueStrings([mainVisualAssetId, logoAssetId]),
    mainVisualAssetId: mainVisualAssetId || undefined,
    logoAssetId: logoAssetId || undefined,
    copy: {
      headline,
      shortCopy: shortCopy || 'NEEDS_SHORT_COPY',
      cta: cta || 'NEEDS_CTA',
    },
    assetFitWarnings,
    forbiddenClaims: uniqueStrings([
      ...(input.forbiddenClaims ?? []),
      ...DEFAULT_FORBIDDEN_CLAIMS,
    ]),
    knowledgeCitations: uniqueStrings(input.knowledgeCitations ?? []),
  };
}

export function buildStructuredBannerPrompt(input: BuildStructuredBannerPromptInput): StructuredBannerPrompt {
  const context = buildBannerPromptContext(input);
  const objectiveLines = [
    `Create static Campaign Banner prompt templates for: ${context.copy.headline}.`,
    `Objective: ${cleanText(input.objective) || 'Campaign objective not provided.'}`,
    `Audience: ${cleanText(input.audience) || 'Campaign audience not provided.'}`,
    `Proof point: ${cleanText(input.proof) || 'Use the strongest approved selling point.'}`,
    `Readiness classification: ${context.readiness}.`,
  ];
  const formatLines = input.specs.map((spec) =>
    `${spec.label} (${spec.aspectRatio}, ${spec.width}x${spec.height}) for ${spec.platformHint}`,
  );
  const sourceAssetLines = [
    `Main visual assetId: ${context.mainVisualAssetId ?? 'NEEDS_MAIN_VISUAL'}`,
    `Logo assetId: ${context.logoAssetId ?? 'OPTIONAL_OR_NEEDS_SELECTION'}`,
    'Use source assets as references only; do not invent unapproved characters, UI, logos, or rewards.',
  ];
  const copyLines = [
    `Headline/angle: ${context.copy.headline}`,
    `Short copy: ${context.copy.shortCopy}`,
    `CTA: ${context.copy.cta}`,
    'Keep copy meaning stable across all specs; only adjust line breaks for legibility.',
  ];
  const compositionLines = [
    cleanText(input.visualDirection) || 'Premium Gold and Glory composition with a clear focal point and readable CTA.',
    'Respect platform safe areas, keep CTA/logo out of edges, and preserve one dominant visual hierarchy.',
    'Deliver one prompt that can be rendered per spec; do not describe a free-form editable canvas.',
  ];
  const checklistLines = [
    'Treat this artifact as template-ready prompt context, not a final rendered image.',
    'Render or export a final image before any publishing workflow.',
    'Human-review each aspect ratio for asset fit, text legibility, and claim safety.',
  ];

  const body = [
    `## Objective\n${bulletList(objectiveLines, 'Campaign objective not provided.')}`,
    `## Formats\n${bulletList(formatLines, 'Format TBD; keep prompt adaptable until a Banner spec is selected.')}`,
    `## Source Assets\n${bulletList(sourceAssetLines, 'Select approved source assets before rendering.')}`,
    `## Copy Lock\n${bulletList(copyLines, 'Copy is not ready.')}`,
    `## Composition Rules\n${bulletList(compositionLines, 'Use the approved Campaign visual direction.')}`,
    `## Forbidden Claims\n${bulletList(context.forbiddenClaims, 'Avoid unsupported claims.')}`,
    `## Knowledge Citations\n${bulletList(context.knowledgeCitations, 'No routed knowledge citations attached.')}`,
    `## Asset-Fit Warnings\n${bulletList(context.assetFitWarnings, 'No asset-fit warnings for the selected prompt context.')}`,
    `## Handoff Checklist\n${bulletList(checklistLines, 'Review before final render.')}`,
  ].join('\n\n');

  return {
    title: `Banner prompt template - ${shortTitle(context.copy.headline)}`,
    body,
    variants: input.specs.map((spec) => `${spec.label} ${spec.aspectRatio}`),
    context,
  };
}
