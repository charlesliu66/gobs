import type {
  CampaignOutputPlan,
  GameSourceAssetRequirement,
  ProductionItem,
  ProductionItemType,
} from './outputPlan.ts';

export type StudioBridgeTemplateId = 'custom' | 'viral-dance' | 'boss-showcase';

export interface CampaignStudioHandoffSourceAsset {
  id: string;
  requirementId: string;
  assetType: string;
  label: string;
  semanticRole?: 'role' | 'scene';
}

export interface CampaignStudioHandoffState {
  fromCampaignOutput: true;
  templateId: StudioBridgeTemplateId;
  outputPlanId: string;
  campaignId?: string;
  gameId: string;
  briefId: string;
  productionItemId: string;
  productionItemType: ProductionItemType;
  distributionPackageId?: string;
  sourceAssetRequirementIds: string[];
  title: string;
  mission: string;
  prompt: string;
  sourceAssets: CampaignStudioHandoffSourceAsset[];
}

const STUDIO_ELIGIBLE_ITEM_TYPES = new Set<ProductionItemType>(['tiktok_video', 'short_video']);

function semanticRoleForAssetType(assetType: string): 'role' | 'scene' | undefined {
  if (assetType === 'character_art') return 'role';
  if (
    assetType === 'key_art' ||
    assetType === 'gameplay_recording' ||
    assetType === 'event_banner' ||
    assetType === 'ui_screenshot'
  ) {
    return 'scene';
  }
  return undefined;
}

function templateForProductionItem(item: ProductionItem): StudioBridgeTemplateId | null {
  if (item.type === 'short_video') return 'boss-showcase';
  if (item.type === 'tiktok_video') return 'custom';
  return null;
}

function sourceAssetsForItem(
  item: ProductionItem,
  requirements: GameSourceAssetRequirement[],
): CampaignStudioHandoffSourceAsset[] {
  const requirementIds = new Set(item.requiredSourceAssetIds);
  return requirements
    .filter((requirement) => requirementIds.has(requirement.id))
    .flatMap((requirement) =>
      requirement.matchedAssetIds.map((assetId) => ({
        id: assetId,
        requirementId: requirement.id,
        assetType: requirement.assetType,
        label: requirement.label,
        semanticRole: semanticRoleForAssetType(requirement.assetType),
      })),
    );
}

export function canOpenProductionItemInStudio(item: ProductionItem): boolean {
  return STUDIO_ELIGIBLE_ITEM_TYPES.has(item.type);
}

export function buildStudioPromptForProductionItem(item: ProductionItem, mission: string): string {
  return [
    `Campaign mission: ${mission}`,
    `Production item: ${item.title}`,
    `Platform: ${item.platform}`,
    `Creative brief: ${item.contentBrief}`,
    item.humanAction?.detail ? `Operator note: ${item.humanAction.detail}` : '',
    'Create a concise, marketer-ready video prompt. Preserve approved game assets and keep the first three seconds hook-first.',
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildCampaignStudioHandoff(input: {
  item: ProductionItem;
  plan: CampaignOutputPlan;
  distributionPackageId?: string | null;
}): CampaignStudioHandoffState | null {
  const templateId = templateForProductionItem(input.item);
  if (!templateId || !canOpenProductionItemInStudio(input.item)) return null;

  return {
    fromCampaignOutput: true,
    templateId,
    outputPlanId: input.plan.id,
    campaignId: input.plan.campaignId,
    gameId: input.plan.gameId,
    briefId: input.plan.briefId,
    productionItemId: input.item.id,
    productionItemType: input.item.type,
    distributionPackageId: input.distributionPackageId?.trim() || undefined,
    sourceAssetRequirementIds: [...input.item.requiredSourceAssetIds],
    title: input.item.title,
    mission: input.plan.mission,
    prompt: buildStudioPromptForProductionItem(input.item, input.plan.mission),
    sourceAssets: sourceAssetsForItem(input.item, input.plan.sourceAssetRequirements),
  };
}
