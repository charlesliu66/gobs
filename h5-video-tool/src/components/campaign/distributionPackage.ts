import type { DerivedCampaignKnowledgeContext } from '../../api/campaignKnowledge.ts';
import type {
  CampaignCreativeBrief,
  CampaignCreativeStrategy,
  CampaignCreativeVariant,
  CampaignCreativeVariantPack,
} from './model.ts';
import type {
  GameSourceAssetRequirement,
  ProducedOutputDraft,
  ProductionItem,
} from './outputPlan.ts';

export type CampaignDistributionPackageReviewStatus =
  | 'draft'
  | 'needs_review'
  | 'approved'
  | 'ready_to_distribute'
  | 'rejected';

export type CampaignDistributionPackageAssetStatus = 'ready' | 'missing' | 'generating' | 'failed';
export type CampaignDistributionPackageAssetType = 'video' | 'image' | 'caption_only';
export type CampaignDistributionPackageAssetSource = 'server_path' | 'verified_url' | 'gallery_asset';
export type CampaignDistributionPackageAssetReadinessState =
  | 'publishable'
  | 'needs_asset'
  | 'generating'
  | 'failed';
export type CampaignDistributionLanguage = 'zh' | 'en' | 'ms' | 'th' | 'id' | 'vi' | 'unknown';
export type CampaignDistributionSourceType = 'campaign_variant' | 'quick_film' | 'editor' | 'manual';

export interface CampaignDistributionPackageAsset {
  assetId?: string;
  type: CampaignDistributionPackageAssetType;
  url?: string;
  path?: string;
  status: CampaignDistributionPackageAssetStatus;
}

export interface CampaignDistributionPackageAssetReadiness {
  state: CampaignDistributionPackageAssetReadinessState;
  primaryAssetId?: string;
  publishableAsset?: {
    type: 'video' | 'image';
    source: CampaignDistributionPackageAssetSource;
    url?: string;
    path?: string;
  };
  reason?: string;
}

export interface CampaignDistributionPackageReview {
  status: CampaignDistributionPackageReviewStatus;
  notes?: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface CampaignDistributionPackageVariant {
  id?: string;
  title?: string;
  angle: string;
  hook: string;
  audience: string;
  proofPoint?: string;
  cta: string;
  riskNotes: string[];
}

export interface CampaignDistributionPackageCopy {
  headline?: string;
  caption: string;
  hashtags: string[];
  language: CampaignDistributionLanguage;
}

export interface CampaignDistributionKnowledgeContext {
  packIds: string[];
  marketTruth: string[];
  audienceTension: string[];
  toneRules: string[];
  forbiddenClaims: string[];
  visualCues: string[];
  approvedAngles: string[];
  hookCandidates: string[];
}

export interface CampaignDistributionPackage {
  id: string;
  campaignId?: string;
  gameId: string;
  ownerId: string;
  createdBy: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  source: {
    type: CampaignDistributionSourceType;
    sourceId?: string;
    createdFromRoute?: string;
  };
  campaign: {
    mission?: string;
    briefId?: string;
    mode?: CampaignCreativeBrief['mode'];
    objective?: string;
    generationSource?: 'llm' | 'fallback';
    warnings: string[];
  };
  variant: CampaignDistributionPackageVariant;
  assets: CampaignDistributionPackageAsset[];
  assetReadiness: CampaignDistributionPackageAssetReadiness;
  copy: CampaignDistributionPackageCopy;
  publishIntent: {
    platforms: string[];
    markets: string[];
    accountGroupIds?: string[];
    scheduleHint?: string;
  };
  knowledgeContext: CampaignDistributionKnowledgeContext;
  review: CampaignDistributionPackageReview;
}

export type CampaignDistributionCreateInput = Omit<
  CampaignDistributionPackage,
  'id' | 'ownerId' | 'createdBy' | 'updatedBy' | 'createdAt' | 'updatedAt'
>;

export type CampaignDistributionUpdateInput = Partial<
  Pick<CampaignDistributionPackage, 'title' | 'assets' | 'copy' | 'publishIntent' | 'assetReadiness' | 'review'>
>;

export interface BuildCampaignDistributionCreateInputArgs {
  mission: string;
  brief: CampaignCreativeBrief;
  strategy: CampaignCreativeStrategy;
  variantPack?: CampaignCreativeVariantPack | null;
  selectedVariantId?: string | null;
  knowledgeContext?: DerivedCampaignKnowledgeContext | null;
  routedKnowledgePackIds?: string[];
  generationSource: 'llm' | 'fallback';
  warnings: string[];
  primaryAsset?: {
    assetId?: string;
    type: 'video' | 'image';
    status: CampaignDistributionPackageAssetStatus;
    path?: string;
    url?: string;
    source: CampaignDistributionPackageAssetSource;
  };
}

export interface CampaignOutputAssetForDistribution {
  assetId: string;
  type: 'video' | 'image';
  path?: string;
  url?: string;
  source: CampaignDistributionPackageAssetSource;
}

export interface BuildCampaignDistributionCreateInputFromProductionItemArgs
  extends Omit<BuildCampaignDistributionCreateInputArgs, 'primaryAsset'> {
  productionItem: ProductionItem;
  outputAssets?: CampaignOutputAssetForDistribution[];
  sourceAssetRequirements?: GameSourceAssetRequirement[];
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.map((value) => value?.trim() || '').filter(Boolean))];
}

function inferCopyLanguage(brief: CampaignCreativeBrief): CampaignDistributionLanguage {
  const region = (brief.region ?? '').trim().toLowerCase();
  if (/thailand|\bth\b/.test(region)) return 'th';
  if (/indonesia|\bid\b/.test(region)) return 'id';
  if (/malaysia|\bms\b/.test(region)) return 'ms';
  if (/vietnam|\bvi\b/.test(region)) return 'vi';
  return 'en';
}

function resolveSelectedVariant(
  variantPack: CampaignCreativeVariantPack | null | undefined,
  selectedVariantId: string | null | undefined,
): CampaignCreativeVariant | null {
  if (!variantPack) return null;
  return variantPack.variants.find((variant) => variant.variantId === selectedVariantId)
    ?? variantPack.variants.find((variant) => variant.variantId === variantPack.selectedVariantId)
    ?? variantPack.variants[0]
    ?? null;
}

function buildKnowledgeContext(
  strategy: CampaignCreativeStrategy,
  knowledgeContext: DerivedCampaignKnowledgeContext | null | undefined,
  routedKnowledgePackIds: string[] | undefined,
): CampaignDistributionKnowledgeContext {
  return {
    packIds: uniqueStrings([
      ...(routedKnowledgePackIds ?? []),
      ...(knowledgeContext?.selectedPackIds ?? []),
      ...strategy.knowledgePackIds,
    ]),
    marketTruth: uniqueStrings([
      ...strategy.marketTruth,
      ...(knowledgeContext?.marketTruth ?? []),
    ]),
    audienceTension: uniqueStrings([
      ...strategy.audienceTension,
      ...(knowledgeContext?.audienceTension ?? []),
    ]),
    toneRules: uniqueStrings([
      ...strategy.toneRules,
      ...(knowledgeContext?.toneRules ?? []),
    ]),
    forbiddenClaims: uniqueStrings([
      ...strategy.forbiddenClaims,
      ...(knowledgeContext?.forbiddenClaims ?? []),
    ]),
    visualCues: uniqueStrings([
      ...strategy.visualCues,
      ...(knowledgeContext?.visualCues ?? []),
    ]),
    approvedAngles: uniqueStrings([
      ...strategy.approvedAngles,
      ...(knowledgeContext?.approvedAngles ?? []),
    ]),
    hookCandidates: uniqueStrings([
      ...strategy.hookCandidates,
      ...(knowledgeContext?.hookCandidates ?? []),
    ]),
  };
}

export function buildCampaignDistributionCreateInput(
  args: BuildCampaignDistributionCreateInputArgs,
): CampaignDistributionCreateInput {
  const nowIso = new Date().toISOString();
  const selectedVariant = resolveSelectedVariant(args.variantPack, args.selectedVariantId);
  const publishableAsset = args.primaryAsset
    && args.primaryAsset.status === 'ready'
    && (args.primaryAsset.path?.trim() || args.primaryAsset.url?.trim())
      ? {
          type: args.primaryAsset.type,
          source: args.primaryAsset.source,
          path: args.primaryAsset.path?.trim() || undefined,
          url: args.primaryAsset.url?.trim() || undefined,
        }
      : undefined;
  const assets: CampaignDistributionPackageAsset[] = publishableAsset
    ? [{
        assetId: args.primaryAsset?.assetId,
        type: args.primaryAsset?.type ?? 'video',
        path: publishableAsset.path,
        url: publishableAsset.url,
        status: args.primaryAsset?.status ?? 'ready',
      }]
    : [{
        type: 'caption_only',
        status: 'missing',
      }];

  const captionParts = uniqueStrings([
    selectedVariant?.hook,
    selectedVariant?.openingBeat,
    selectedVariant?.cta,
  ]);
  const knowledge = buildKnowledgeContext(args.strategy, args.knowledgeContext, args.routedKnowledgePackIds);

  return {
    gameId: 'gold_and_glory',
    title: selectedVariant?.title?.trim() || args.strategy.angle || args.brief.objective || 'Campaign package',
    source: {
      type: 'campaign_variant',
      sourceId: selectedVariant?.variantId ?? args.strategy.strategyId,
      createdFromRoute: '/campaign-creative',
    },
    campaign: {
      mission: args.mission.trim() || undefined,
      briefId: args.brief.briefId,
      mode: args.brief.mode,
      objective: args.brief.objective ?? args.strategy.objective,
      generationSource: args.generationSource,
      warnings: uniqueStrings(args.warnings),
    },
    variant: {
      id: selectedVariant?.variantId,
      title: selectedVariant?.title,
      angle: args.strategy.angle,
      hook: selectedVariant?.hook ?? args.strategy.recommendedHook,
      audience: args.strategy.targetAudience ?? args.brief.audience ?? '',
      proofPoint: args.strategy.sellingPointFocus ?? args.brief.sellingPoints[0],
      cta: selectedVariant?.cta ?? args.strategy.cta,
      riskNotes: uniqueStrings(args.strategy.riskNotes),
    },
    assets,
    assetReadiness: {
      state: publishableAsset ? 'publishable' : 'needs_asset',
      primaryAssetId: args.primaryAsset?.assetId,
      publishableAsset,
      reason: publishableAsset ? undefined : 'Package needs a real render or reusable asset before publishing.',
    },
    copy: {
      headline: selectedVariant?.title ?? args.strategy.angle,
      caption: captionParts.join(' '),
      hashtags: [],
      language: inferCopyLanguage(args.brief),
    },
    publishIntent: {
      platforms: ['tiktok'],
      markets: uniqueStrings([args.brief.region]),
    },
    knowledgeContext: knowledge,
    review: {
      status: publishableAsset ? 'needs_review' : 'draft',
      updatedAt: nowIso,
    },
  };
}

function sourceAssetReasonForProductionItem(
  item: ProductionItem,
  sourceAssetRequirements: GameSourceAssetRequirement[] | undefined,
): string {
  const related = (sourceAssetRequirements ?? []).filter((asset) =>
    item.requiredSourceAssetIds.includes(asset.id) && asset.status !== 'available',
  );
  if (related.length === 0) {
    return item.humanAction?.detail || 'Production output needs a real render before publishing.';
  }
  return related.map((asset) => asset.guidance || `${asset.label} is required.`).join(' ');
}

function firstProducedOutput(
  item: ProductionItem,
  kinds: ProducedOutputDraft['kind'][],
): ProducedOutputDraft | undefined {
  return item.producedOutputs?.find((output) => kinds.includes(output.kind) && output.body.trim());
}

function producedPackageCopy(item: ProductionItem): Partial<CampaignDistributionPackageCopy> | null {
  if (item.status !== 'produced' || (item.producedOutputs?.length ?? 0) === 0) return null;
  const post = firstProducedOutput(item, ['post_copy']);
  const caption = firstProducedOutput(item, ['caption']);
  const headline = firstProducedOutput(item, ['headline']);
  const hashtags = firstProducedOutput(item, ['hashtag']);
  const captionBody = post?.body || caption?.body;
  if (!captionBody && !headline?.body && !hashtags?.variants.length) return null;
  return {
    headline: headline?.body,
    caption: captionBody,
    hashtags: hashtags?.variants ?? [],
  };
}

export function buildCampaignDistributionCreateInputFromProductionItem(
  args: BuildCampaignDistributionCreateInputFromProductionItemArgs,
): CampaignDistributionCreateInput {
  const selectedOutputAsset = args.productionItem.status === 'produced'
    ? args.outputAssets?.find((asset) =>
        args.productionItem.outputAssetIds.includes(asset.assetId) && (asset.path?.trim() || asset.url?.trim())
      )
    : undefined;
  const draft = buildCampaignDistributionCreateInput({
    ...args,
    primaryAsset: selectedOutputAsset
      ? {
          assetId: selectedOutputAsset.assetId,
          type: selectedOutputAsset.type,
          status: 'ready',
          path: selectedOutputAsset.path,
          url: selectedOutputAsset.url,
          source: selectedOutputAsset.source,
        }
      : undefined,
  });
  const producedCopy = producedPackageCopy(args.productionItem);
  const hasProducedCopy = Boolean(producedCopy);
  const firstProducedTextAssetId = args.productionItem.producedOutputs?.[0]?.id;

  return {
    ...draft,
    title: args.productionItem.title || draft.title,
    source: {
      ...draft.source,
      sourceId: args.productionItem.id,
    },
    assetReadiness: selectedOutputAsset
      ? draft.assetReadiness
      : {
          state: 'needs_asset',
          reason: hasProducedCopy
            ? 'Produced copy is ready for review; choose accounts and attach required platform media before final publish.'
            : sourceAssetReasonForProductionItem(args.productionItem, args.sourceAssetRequirements),
        },
    assets: selectedOutputAsset
      ? draft.assets
      : hasProducedCopy
        ? [{
            assetId: firstProducedTextAssetId,
            type: 'caption_only',
            status: 'ready',
          }]
        : draft.assets,
    copy: producedCopy
      ? {
          ...draft.copy,
          headline: producedCopy.headline ?? draft.copy.headline,
          caption: producedCopy.caption ?? draft.copy.caption,
          hashtags: producedCopy.hashtags ?? draft.copy.hashtags,
        }
      : draft.copy,
    review: {
      ...draft.review,
      status: selectedOutputAsset || hasProducedCopy ? 'needs_review' : 'draft',
    },
    publishIntent: {
      ...draft.publishIntent,
      platforms: uniqueStrings([args.productionItem.platform || args.brief.platform]),
    },
  };
}
