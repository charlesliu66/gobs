import type {
  CampaignCreativeBrief,
  CampaignCreativeStrategy,
  CampaignCreativeVariantPack,
} from './model.ts';

export type ProductionItemType =
  | 'fb_post'
  | 'tiktok_video'
  | 'short_video'
  | 'banner'
  | 'caption_set'
  | 'headline_set'
  | 'hashtag_set';

export type ProductionCapability =
  | 'supported'
  | 'supported_with_source_assets'
  | 'unsupported'
  | 'manual_recommended';

export type ProductionItemStatus =
  | 'planned'
  | 'blocked'
  | 'ready_to_produce'
  | 'producing'
  | 'produced'
  | 'failed'
  | 'skipped';

export type ProducedOutputKind = 'caption' | 'headline' | 'hashtag' | 'post_copy';
export type ProducedOutputStatus = 'draft' | 'needs_review' | 'approved';

export interface ProducedOutputDraft {
  id: string;
  kind: ProducedOutputKind;
  title: string;
  body: string;
  variants: string[];
  platform: string;
  status: ProducedOutputStatus;
  createdAt: string;
}

export interface ProductionItem {
  id: string;
  type: ProductionItemType;
  quantity: number;
  platform: string;
  title: string;
  contentBrief: string;
  requiredSourceAssetIds: string[];
  productionCapability: ProductionCapability;
  status: ProductionItemStatus;
  gobsCanProduce: boolean;
  outputAssetIds: string[];
  distributionPackageIds: string[];
  producedOutputs?: ProducedOutputDraft[];
  humanAction?: {
    type: 'confirm' | 'provide_source_asset' | 'review_risk' | 'external_production';
    label: string;
    detail: string;
  };
}

export type GameSourceAssetRequirementStatus =
  | 'available'
  | 'missing'
  | 'needs_selection'
  | 'needs_upload'
  | 'can_generate_substitute'
  | 'blocked';

export interface GameSourceAssetRequirement {
  id: string;
  assetType: string;
  label: string;
  neededForProductionItemIds: string[];
  status: GameSourceAssetRequirementStatus;
  matchedAssetIds: string[];
  guidance: string;
  rightsNote?: string;
}

export interface CapabilityGap {
  id: string;
  gapType: 'generator_missing' | 'source_asset_missing' | 'adapter_missing' | 'quality_not_ready';
  title: string;
  affectedProductionItemIds: string[];
  currentWorkaround: string;
  priorityHint: 'low' | 'medium' | 'high';
}

export interface CampaignOutputPlan {
  id: string;
  campaignId?: string;
  gameId: string;
  ownerId?: string;
  createdBy?: string;
  updatedBy?: string;
  mission: string;
  briefId: string;
  status: 'draft' | 'needs_confirmation' | 'confirmed' | 'producing' | 'ready_for_distribution' | 'blocked';
  items: ProductionItem[];
  sourceAssetRequirements: GameSourceAssetRequirement[];
  capabilityGaps: CapabilityGap[];
  createdAt: string;
  updatedAt: string;
}

export interface AvailableSourceAsset {
  assetId: string;
  assetType: string;
  tags?: string[];
  matchStrength?: 'candidate' | 'confirmed';
}

export interface SourceAssetLibraryRecord {
  id: string;
  filename?: string;
  mime_type?: string;
  mimetype?: string;
  ai_category?: string;
  ai_description?: string | null;
  tags?: Array<{ key?: string; value?: string }>;
}

export interface BuildCampaignOutputPlanArgs {
  mission: string;
  brief: CampaignCreativeBrief;
  strategy?: CampaignCreativeStrategy | null;
  variantPack?: CampaignCreativeVariantPack | null;
  selectedVariantId?: string | null;
  requestedPlatforms?: string[];
  availableSourceAssets?: AvailableSourceAsset[];
}

export interface ProduceSupportedCampaignOutputsArgs {
  plan: CampaignOutputPlan;
  mission: string;
  brief: CampaignCreativeBrief;
  strategy?: CampaignCreativeStrategy | null;
  variantPack?: CampaignCreativeVariantPack | null;
  selectedVariantId?: string | null;
  selectedVariantTitle?: string | null;
}

const SOURCE_ASSET_LABELS: Record<string, string> = {
  game_logo: 'Game logo',
  key_art: 'Key art',
  character_art: 'Character art',
  hero_skill_clip: 'Hero skill clip',
  gameplay_recording: 'Gameplay recording',
  ui_screenshot: 'UI screenshot',
  reward_icon: 'Reward icon',
  event_banner: 'Event banner',
  store_badge: 'Store badge',
  brand_guideline: 'Brand guideline',
};

const VIDEO_SOURCE_ASSET_TYPES = new Set(['gameplay_recording', 'hero_skill_clip']);

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80) || 'item';
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.map((value) => value?.trim() || '').filter(Boolean))];
}

function safeSentence(value: string | null | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed || fallback;
}

function normalizePlatforms(brief: CampaignCreativeBrief, requestedPlatforms?: string[]): string[] {
  const platforms = uniqueStrings([
    brief.platform,
    ...(requestedPlatforms ?? []),
  ]).map((platform) => platform.toLowerCase());
  return platforms.length > 0 ? platforms : ['tiktok'];
}

function textCorpus(args: BuildCampaignOutputPlanArgs): string {
  return [
    args.mission,
    args.brief.objective,
    args.brief.audience,
    args.brief.cta,
    args.brief.referenceStyle,
    ...(args.brief.sellingPoints ?? []),
    ...(args.strategy?.assetNeeds ?? []),
    ...(args.strategy?.visualCues ?? []),
    args.strategy?.angle,
    args.strategy?.sellingPointFocus,
    args.strategy?.recommendedHook,
    args.strategy?.cta,
  ].join(' ').toLowerCase();
}

function needsCharacterArt(corpus: string): boolean {
  return /hero|character|skin|skill|champion|unit|角色|英雄|技能|皮肤/.test(corpus);
}

function needsUaAssets(brief: CampaignCreativeBrief, corpus: string): boolean {
  return brief.mode === 'tiktok_ua' || /ua|install|download|cpi|conversion|用户获取|下载|投放|转化/.test(corpus);
}

function needsBanner(corpus: string): boolean {
  return /banner|store|event|key art|keyart|hero visual|商店|活动|横幅|主视觉/.test(corpus);
}

function sourceRequirementId(assetType: string): string {
  return `src_${slugify(assetType)}`;
}

function itemId(type: ProductionItemType, platform: string): string {
  return `item_${slugify(platform)}_${slugify(type)}`;
}

function sourceGuidance(assetType: string): string {
  switch (assetType) {
    case 'gameplay_recording':
      return 'Provide real gameplay footage so GOBS can produce credible video outputs.';
    case 'game_logo':
      return 'Provide the approved game logo for end cards, thumbnails, and post visuals.';
    case 'character_art':
      return 'Provide approved character or hero art for visual posts and video focus moments.';
    case 'key_art':
      return 'Provide campaign key art before banner or image post production.';
    case 'reward_icon':
      return 'Provide reward UI or icon assets for UA payoff messaging.';
    case 'store_badge':
      return 'Provide store badge or install destination assets for UA variants.';
    case 'event_banner':
      return 'Provide event banner source material for event-specific formats.';
    default:
      return 'Provide approved game source material before production.';
  }
}

function buildSourceRequirements(
  requiredTypes: Set<string>,
  availableSourceAssets: AvailableSourceAsset[],
): Map<string, GameSourceAssetRequirement> {
  const requirements = new Map<string, GameSourceAssetRequirement>();
  [...requiredTypes].forEach((assetType) => {
    const matched = availableSourceAssets.filter((asset) => asset.assetType === assetType);
    const hasConfirmedMatch = matched.some((asset) => asset.matchStrength !== 'candidate');
    requirements.set(assetType, {
      id: sourceRequirementId(assetType),
      assetType,
      label: SOURCE_ASSET_LABELS[assetType] ?? assetType,
      neededForProductionItemIds: [],
      status: hasConfirmedMatch ? 'available' : matched.length > 0 ? 'needs_selection' : 'missing',
      matchedAssetIds: uniqueStrings(matched.map((asset) => asset.assetId)),
      guidance: sourceGuidance(assetType),
      rightsNote: 'Use only approved game-owned or licensed source assets.',
    });
  });
  return requirements;
}

function itemStatusForRequirementIds(
  requirementIds: string[],
  requirements: Map<string, GameSourceAssetRequirement>,
): ProductionItemStatus {
  if (requirementIds.length === 0) return 'ready_to_produce';
  const missing = [...requirements.values()].some((requirement) =>
    requirementIds.includes(requirement.id) && requirement.status !== 'available',
  );
  return missing ? 'blocked' : 'ready_to_produce';
}

function makeItem(input: {
  type: ProductionItemType;
  quantity: number;
  platform: string;
  title: string;
  contentBrief: string;
  requiredAssetTypes?: string[];
  capability: ProductionCapability;
  requirements: Map<string, GameSourceAssetRequirement>;
  fallbackReview?: boolean;
}): ProductionItem {
  const requiredSourceAssetIds = (input.requiredAssetTypes ?? []).map(sourceRequirementId);
  const status = itemStatusForRequirementIds(requiredSourceAssetIds, input.requirements);
  const item: ProductionItem = {
    id: itemId(input.type, input.platform),
    type: input.type,
    quantity: input.quantity,
    platform: input.platform,
    title: input.title,
    contentBrief: input.contentBrief,
    requiredSourceAssetIds,
    productionCapability: input.capability,
    status,
    gobsCanProduce: input.capability === 'supported' || (input.capability === 'supported_with_source_assets' && status !== 'blocked'),
    outputAssetIds: [],
    distributionPackageIds: [],
    producedOutputs: [],
  };
  if (input.fallbackReview) {
    item.humanAction = {
      type: 'review_risk',
      label: 'Review fallback plan',
      detail: 'This output plan was created without a strategy card, so confirm the deliverables before production.',
    };
  } else if (status === 'blocked') {
    item.humanAction = {
      type: 'provide_source_asset',
      label: 'Provide source assets',
      detail: 'This deliverable needs approved game source assets before GOBS can produce it.',
    };
  } else if (input.capability === 'manual_recommended') {
    item.humanAction = {
      type: 'external_production',
      label: 'Use manual production',
      detail: 'GOBS can plan this output, but Phase 1 recommends manual production or template support.',
    };
  }
  return item;
}

function attachRequirementUsage(
  items: ProductionItem[],
  requirements: Map<string, GameSourceAssetRequirement>,
): void {
  items.forEach((item) => {
    item.requiredSourceAssetIds.forEach((requirementId) => {
      const requirement = [...requirements.values()].find((entry) => entry.id === requirementId);
      if (!requirement) return;
      requirement.neededForProductionItemIds = uniqueStrings([
        ...requirement.neededForProductionItemIds,
        item.id,
      ]);
    });
  });
}

function buildCapabilityGaps(
  items: ProductionItem[],
  requirements: Map<string, GameSourceAssetRequirement>,
): CapabilityGap[] {
  const gaps: CapabilityGap[] = [];
  [...requirements.values()]
    .filter((requirement) => requirement.status !== 'available')
    .forEach((requirement) => {
      const hasCandidates = requirement.status === 'needs_selection' && requirement.matchedAssetIds.length > 0;
      gaps.push({
        id: `gap_missing_${slugify(requirement.assetType)}`,
        gapType: 'source_asset_missing',
        title: hasCandidates ? `${requirement.label} needs selection` : `${requirement.label} is missing`,
        affectedProductionItemIds: requirement.neededForProductionItemIds,
        currentWorkaround: hasCandidates
          ? `Choose an approved Asset Library candidate for ${requirement.label}.`
          : requirement.guidance,
        priorityHint: requirement.neededForProductionItemIds.some((itemIdValue) =>
          items.some((item) => item.id === itemIdValue && /video|banner/.test(item.type))
        ) ? 'high' : 'medium',
      });
    });

  items
    .filter((item) => item.productionCapability === 'manual_recommended')
    .forEach((item) => {
      gaps.push({
        id: `gap_manual_${item.id}`,
        gapType: 'generator_missing',
        title: `${item.title} needs a production adapter`,
        affectedProductionItemIds: [item.id],
        currentWorkaround: 'Use manual creative production or a safe template workflow for this Phase 1 deliverable.',
        priorityHint: item.type === 'banner' ? 'high' : 'medium',
      });
    });
  return gaps;
}

function sourceAssetSearchText(asset: SourceAssetLibraryRecord): string {
  return [
    asset.filename,
    asset.ai_category,
    asset.ai_description,
    ...(asset.tags ?? []).flatMap((tag) => [tag.key, tag.value]),
  ].join(' ').toLowerCase();
}

export function inferSourceAssetTypesForLibraryAsset(asset: SourceAssetLibraryRecord): string[] {
  const text = sourceAssetSearchText(asset);
  const mime = (asset.mimetype ?? asset.mime_type ?? '').toLowerCase();
  const types = new Set<string>();
  const isVideo = mime.startsWith('video/');
  const isImage = mime.startsWith('image/');

  if (isVideo && /gameplay|recording|battle|combat|clip|screen ?record|实机|录屏|战斗|玩法|视频片段/.test(text)) {
    types.add('gameplay_recording');
  }
  if (isVideo && /hero|character|skill|ultimate|ability|英雄|角色|技能|大招/.test(text)) {
    types.add('hero_skill_clip');
  }
  if (isImage && /logo|brand mark|app icon|游戏logo|标志|图标/.test(text)) {
    types.add('game_logo');
  }
  if (isImage && /key ?art|kv|poster|cover|splash|hero visual|主视觉|宣传图|海报|封面/.test(text)) {
    types.add('key_art');
  }
  if (isImage && /character|hero|skin|unit|角色|英雄|皮肤/.test(text)) {
    types.add('character_art');
  }
  if (isImage && /reward|coin|gem|chest|loot|奖励|金币|宝石|宝箱/.test(text)) {
    types.add('reward_icon');
  }
  if (isImage && /store badge|app store|google play|download badge|install badge|商店徽章|下载/.test(text)) {
    types.add('store_badge');
  }
  if (isImage && /event banner|event|activity|banner|活动|横幅/.test(text)) {
    types.add('event_banner');
  }
  if (isImage && /ui|screenshot|interface|screen|界面|截图|ui素材/.test(text)) {
    types.add('ui_screenshot');
  }

  return [...types];
}

export function sourceAssetFilterType(assetType: string): 'image' | 'video' | 'all' {
  if (VIDEO_SOURCE_ASSET_TYPES.has(assetType)) return 'video';
  return 'image';
}

export function buildAvailableSourceAssetsFromLibraryAssets(
  assets: SourceAssetLibraryRecord[],
): AvailableSourceAsset[] {
  return assets.flatMap((asset) =>
    inferSourceAssetTypesForLibraryAsset(asset).map((assetType) => ({
      assetId: asset.id,
      assetType,
      tags: uniqueStrings([
        asset.filename,
        asset.ai_category,
        asset.ai_description ?? undefined,
        ...(asset.tags ?? []).map((tag) => tag.value),
      ]),
      matchStrength: 'candidate' as const,
    })),
  );
}

function updateItemForSourceReadiness(
  item: ProductionItem,
  requirements: GameSourceAssetRequirement[],
): ProductionItem {
  const status = itemStatusForRequirementIds(
    item.requiredSourceAssetIds,
    new Map(requirements.map((requirement) => [requirement.assetType, requirement])),
  );
  const gobsCanProduce = item.productionCapability === 'supported'
    || (item.productionCapability === 'supported_with_source_assets' && status !== 'blocked');

  let humanAction = item.humanAction;
  if (status === 'blocked') {
    humanAction = {
      type: 'provide_source_asset',
      label: 'Provide source assets',
      detail: 'This deliverable needs approved game source assets before GOBS can produce it.',
    };
  } else if (item.productionCapability === 'manual_recommended') {
    humanAction = {
      type: 'external_production',
      label: 'Use manual production',
      detail: 'GOBS can plan this output, but Phase 1 recommends manual production or template support.',
    };
  } else if (item.status === 'blocked') {
    humanAction = undefined;
  }

  return {
    ...item,
    status,
    gobsCanProduce,
    humanAction,
  };
}

function rebuildPlanAfterSourceReadiness(plan: CampaignOutputPlan): CampaignOutputPlan {
  const items = plan.items.map((item) =>
    item.requiredSourceAssetIds.length > 0
      ? updateItemForSourceReadiness(item, plan.sourceAssetRequirements)
      : item,
  );
  const requirementMap = new Map(plan.sourceAssetRequirements.map((requirement) => [
    requirement.assetType,
    {
      ...requirement,
      neededForProductionItemIds: [] as string[],
    },
  ]));
  attachRequirementUsage(items, requirementMap);

  return {
    ...plan,
    items,
    sourceAssetRequirements: [...requirementMap.values()],
    capabilityGaps: buildCapabilityGaps(items, requirementMap),
    updatedAt: new Date().toISOString(),
  };
}

export function updateSourceAssetRequirementMatches(
  plan: CampaignOutputPlan,
  requirementId: string,
  matchedAssetIds: string[],
): CampaignOutputPlan {
  const sourceAssetRequirements = plan.sourceAssetRequirements.map((requirement) => {
    if (requirement.id !== requirementId) return requirement;
    const nextMatchedAssetIds = uniqueStrings(matchedAssetIds);
    return {
      ...requirement,
      matchedAssetIds: nextMatchedAssetIds,
      status: nextMatchedAssetIds.length > 0 ? 'available' as const : 'missing' as const,
    };
  });
  return rebuildPlanAfterSourceReadiness({
    ...plan,
    sourceAssetRequirements,
  });
}

export function applySourceAssetSelectionOverrides(
  plan: CampaignOutputPlan,
  overrides: Record<string, string[]>,
): CampaignOutputPlan {
  return Object.entries(overrides).reduce(
    (current, [requirementId, matchedAssetIds]) =>
      updateSourceAssetRequirementMatches(current, requirementId, matchedAssetIds),
    plan,
  );
}

function resolveVariantTitle(args: ProduceSupportedCampaignOutputsArgs): string | undefined {
  if (args.selectedVariantTitle?.trim()) return args.selectedVariantTitle.trim();
  const variant = args.variantPack?.variants.find((item) => item.variantId === args.selectedVariantId)
    ?? args.variantPack?.variants.find((item) => item.variantId === args.variantPack?.selectedVariantId)
    ?? args.variantPack?.variants[0];
  return variant?.title;
}

function textSignals(args: ProduceSupportedCampaignOutputsArgs): {
  hook: string;
  objective: string;
  audience: string;
  cta: string;
  proof: string;
  angle: string;
} {
  return {
    hook: safeSentence(args.strategy?.recommendedHook, safeSentence(resolveVariantTitle(args), args.brief.objective || args.mission)),
    objective: safeSentence(args.brief.objective || args.strategy?.objective, args.mission),
    audience: safeSentence(args.strategy?.targetAudience || args.brief.audience, 'Gold and Glory players'),
    cta: safeSentence(args.strategy?.cta || args.brief.cta, 'Play Gold and Glory today'),
    proof: safeSentence(args.strategy?.sellingPointFocus || args.brief.sellingPoints[0], args.brief.objective || args.mission),
    angle: safeSentence(args.strategy?.angle || resolveVariantTitle(args), args.brief.objective || args.mission),
  };
}

function outputId(item: ProductionItem, index: number): string {
  return `copy_${slugify(item.id)}_${index + 1}`;
}

function hashtagsFromSignals(signals: ReturnType<typeof textSignals>, platform: string): string[] {
  const raw = [
    'GoldAndGlory',
    platform === 'facebook' ? 'FacebookGaming' : 'MobileRPG',
    signals.proof,
    signals.angle,
  ];
  return uniqueStrings(raw)
    .map((value) => value.replace(/[^a-zA-Z0-9]+/g, ''))
    .filter((value) => value.length > 2)
    .slice(0, 6)
    .map((value) => `#${value}`);
}

function producedDraft(
  item: ProductionItem,
  kind: ProducedOutputKind,
  index: number,
  title: string,
  body: string,
  variants: string[],
  createdAt: string,
): ProducedOutputDraft {
  return {
    id: outputId(item, index),
    kind,
    title,
    body,
    variants,
    platform: item.platform,
    status: 'draft',
    createdAt,
  };
}

function buildProducedOutputsForItem(
  item: ProductionItem,
  args: ProduceSupportedCampaignOutputsArgs,
  createdAt: string,
): ProducedOutputDraft[] {
  const signals = textSignals(args);
  const captionVariants = uniqueStrings([
    `${signals.hook}. ${signals.cta}.`,
    `${signals.objective} for ${signals.audience}. ${signals.cta}.`,
    `${signals.proof}. ${signals.cta}.`,
  ]);
  const headlineVariants = uniqueStrings([
    resolveVariantTitle(args),
    signals.angle,
    signals.hook,
    signals.proof,
  ]).slice(0, 3);
  const hashtags = hashtagsFromSignals(signals, item.platform);

  switch (item.type) {
    case 'caption_set':
      return [
        producedDraft(item, 'caption', 0, 'Caption variants', captionVariants[0], captionVariants, createdAt),
      ];
    case 'headline_set':
      return [
        producedDraft(item, 'headline', 0, 'Headline variants', headlineVariants[0], headlineVariants, createdAt),
      ];
    case 'hashtag_set':
      return [
        producedDraft(item, 'hashtag', 0, 'Hashtag set', hashtags.join(' '), hashtags, createdAt),
      ];
    case 'fb_post': {
      const postBodies = Array.from({ length: Math.max(1, item.quantity) }, (_, index) => {
        const opener = captionVariants[index % captionVariants.length];
        return `${opener} ${signals.proof}.`;
      });
      return postBodies.map((body, index) =>
        producedDraft(item, 'post_copy', index, `Facebook post ${index + 1}`, body, [body], createdAt),
      );
    }
    default:
      return [];
  }
}

function isTextProductionSupported(item: ProductionItem): boolean {
  return ['caption_set', 'headline_set', 'hashtag_set', 'fb_post'].includes(item.type)
    && item.status !== 'blocked'
    && item.productionCapability !== 'manual_recommended'
    && item.productionCapability !== 'unsupported'
    && item.gobsCanProduce;
}

export function produceSupportedCampaignOutputs(
  args: ProduceSupportedCampaignOutputsArgs,
): CampaignOutputPlan {
  const nowIso = new Date().toISOString();
  let producedCount = 0;
  const items = args.plan.items.map((item) => {
    if ((item.producedOutputs?.length ?? 0) > 0 && item.status === 'produced') {
      producedCount += 1;
      return item;
    }
    if (!isTextProductionSupported(item)) {
      return {
        ...item,
        producedOutputs: item.producedOutputs ?? [],
      };
    }

    const producedOutputs = buildProducedOutputsForItem(item, args, nowIso);
    if (producedOutputs.length === 0) {
      return {
        ...item,
        producedOutputs: item.producedOutputs ?? [],
      };
    }
    producedCount += 1;
    return {
      ...item,
      status: 'produced' as const,
      outputAssetIds: producedOutputs.map((output) => output.id),
      producedOutputs,
      humanAction: {
        type: 'confirm' as const,
        label: 'Review produced draft',
        detail: 'GOBS produced this draft copy. Review it before distribution.',
      },
    };
  });

  return {
    ...args.plan,
    status: producedCount > 0 ? 'ready_for_distribution' : args.plan.status,
    items,
    updatedAt: nowIso,
  };
}

export function buildCampaignOutputPlan(args: BuildCampaignOutputPlanArgs): CampaignOutputPlan {
  const nowIso = new Date().toISOString();
  const corpus = textCorpus(args);
  const platforms = normalizePlatforms(args.brief, args.requestedPlatforms);
  const requiredTypes = new Set<string>();
  const hasStrategy = Boolean(args.strategy);

  platforms.forEach((platform) => {
    if (platform === 'tiktok') {
      requiredTypes.add('gameplay_recording');
      requiredTypes.add('game_logo');
      if (needsCharacterArt(corpus)) requiredTypes.add('character_art');
      if (needsUaAssets(args.brief, corpus)) {
        requiredTypes.add('reward_icon');
        requiredTypes.add('store_badge');
      }
    }
    if (platform === 'facebook' && needsCharacterArt(corpus)) {
      requiredTypes.add('character_art');
    }
  });
  if (needsBanner(corpus)) {
    requiredTypes.add('key_art');
    requiredTypes.add('game_logo');
    if (/event|活动/.test(corpus)) requiredTypes.add('event_banner');
  }

  const requirements = buildSourceRequirements(requiredTypes, args.availableSourceAssets ?? []);
  const items: ProductionItem[] = [
    makeItem({
      type: 'caption_set',
      quantity: 1,
      platform: 'cross_platform',
      title: 'Caption set',
      contentBrief: args.brief.cta || args.brief.objective || args.mission,
      capability: 'supported',
      requirements,
      fallbackReview: !hasStrategy,
    }),
    makeItem({
      type: 'headline_set',
      quantity: 1,
      platform: 'cross_platform',
      title: 'Headline set',
      contentBrief: args.brief.objective || args.mission,
      capability: 'supported',
      requirements,
      fallbackReview: !hasStrategy,
    }),
    makeItem({
      type: 'hashtag_set',
      quantity: 1,
      platform: 'cross_platform',
      title: 'Hashtag set',
      contentBrief: args.brief.audience || args.brief.region || args.mission,
      capability: 'supported',
      requirements,
      fallbackReview: !hasStrategy,
    }),
  ];

  if (platforms.includes('tiktok')) {
    const videoType: ProductionItemType = args.brief.mode === 'tiktok_ua' ? 'tiktok_video' : 'short_video';
    const videoRequiredTypes = [
      'gameplay_recording',
      'game_logo',
      ...(needsCharacterArt(corpus) ? ['character_art'] : []),
      ...(args.brief.mode === 'tiktok_ua' ? ['reward_icon', 'store_badge'] : []),
    ];
    items.push(makeItem({
      type: videoType,
      quantity: 2,
      platform: 'tiktok',
      title: args.brief.mode === 'tiktok_ua' ? 'TikTok UA video pack' : 'Short video pack',
      contentBrief: args.strategy?.recommendedHook || args.brief.objective || args.mission,
      requiredAssetTypes: videoRequiredTypes,
      capability: 'supported_with_source_assets',
      requirements,
      fallbackReview: !hasStrategy,
    }));
  }

  if (args.brief.mode === 'tiktok_content' || platforms.includes('facebook')) {
    const fbRequiredTypes = needsCharacterArt(corpus) ? ['character_art'] : [];
    items.push(makeItem({
      type: 'fb_post',
      quantity: 3,
      platform: 'facebook',
      title: 'Facebook post pack',
      contentBrief: args.strategy?.angle || args.brief.objective || args.mission,
      requiredAssetTypes: fbRequiredTypes,
      capability: fbRequiredTypes.length > 0 ? 'supported_with_source_assets' : 'supported',
      requirements,
      fallbackReview: !hasStrategy,
    }));
  }

  if (needsBanner(corpus)) {
    items.push(makeItem({
      type: 'banner',
      quantity: 1,
      platform: 'cross_platform',
      title: 'Campaign banner set',
      contentBrief: args.strategy?.angle || args.brief.objective || args.mission,
      requiredAssetTypes: ['key_art', 'game_logo', ...(/event|活动/.test(corpus) ? ['event_banner'] : [])],
      capability: 'manual_recommended',
      requirements,
      fallbackReview: !hasStrategy,
    }));
  }

  attachRequirementUsage(items, requirements);
  const capabilityGaps = buildCapabilityGaps(items, requirements);

  return {
    id: `output_plan_${slugify(args.brief.briefId || args.mission)}`,
    campaignId: undefined,
    gameId: 'gold_and_glory',
    mission: args.mission,
    briefId: args.brief.briefId,
    status: capabilityGaps.some((gap) => gap.priorityHint === 'high') ? 'needs_confirmation' : 'draft',
    items,
    sourceAssetRequirements: [...requirements.values()],
    capabilityGaps,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}
