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
    requirements.set(assetType, {
      id: sourceRequirementId(assetType),
      assetType,
      label: SOURCE_ASSET_LABELS[assetType] ?? assetType,
      neededForProductionItemIds: [],
      status: matched.length > 0 ? 'available' : 'missing',
      matchedAssetIds: matched.map((asset) => asset.assetId),
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
      gaps.push({
        id: `gap_missing_${slugify(requirement.assetType)}`,
        gapType: 'source_asset_missing',
        title: `${requirement.label} is missing`,
        affectedProductionItemIds: requirement.neededForProductionItemIds,
        currentWorkaround: requirement.guidance,
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
