import type {
  CampaignOutputPlan,
  GameSourceAssetRequirement,
  ProductionCapability,
  ProductionItem,
  ProductionItemType,
} from './outputPlan.ts';

const AUTO_READY_ITEM_TYPES = new Set<ProductionItemType>([
  'caption_set',
  'headline_set',
  'hashtag_set',
  'fb_post',
]);

export type ProductionReadiness =
  | 'auto_ready'
  | 'template_ready'
  | 'brief_ready'
  | 'needs_source_asset'
  | 'unsupported';

export interface CoverageSummary {
  total: number;
  autoReady: number;
  templateReady: number;
  briefReady: number;
  needsSourceAsset: number;
  unsupported: number;
  trueProductionCoverage: number;
  directProductionCoverage: number;
  templateProductionCoverage: number;
  assistiveCoverage: number;
  blockedRate: number;
}

export interface ProductionItemCoverageState {
  itemId: string;
  readiness: ProductionReadiness;
  quantity: number;
  missingRequirementIds: string[];
  missingRequirementLabels: string[];
}

function safeQuantity(item: ProductionItem): number {
  return Number.isFinite(item.quantity) ? Math.max(0, item.quantity) : 0;
}

function buildRequirementMap(
  requirements: GameSourceAssetRequirement[],
): Map<string, GameSourceAssetRequirement> {
  return new Map(requirements.map((requirement) => [requirement.id, requirement]));
}

function listMissingRequirements(
  item: ProductionItem,
  requirementMap: Map<string, GameSourceAssetRequirement>,
): GameSourceAssetRequirement[] {
  return item.requiredSourceAssetIds
    .map((requirementId) => requirementMap.get(requirementId))
    .filter(
      (requirement): requirement is GameSourceAssetRequirement =>
        requirement != null && requirement.status !== 'available',
    );
}

export function mapCapabilityToReadiness(
  capability: ProductionCapability,
  itemType: ProductionItemType,
  sourceAssetsSatisfied: boolean,
): ProductionReadiness {
  if (capability === 'supported') {
    return AUTO_READY_ITEM_TYPES.has(itemType) ? 'auto_ready' : 'template_ready';
  }
  if (capability === 'supported_with_source_assets') {
    return sourceAssetsSatisfied ? 'template_ready' : 'needs_source_asset';
  }
  if (capability === 'manual_recommended') {
    return 'brief_ready';
  }
  return 'unsupported';
}

export function buildProductionItemCoverageMap(
  plan: CampaignOutputPlan,
): Record<string, ProductionItemCoverageState> {
  const requirementMap = buildRequirementMap(plan.sourceAssetRequirements);

  return Object.fromEntries(
    plan.items.map((item) => {
      const missingRequirements = listMissingRequirements(item, requirementMap);
      const readiness = mapCapabilityToReadiness(
        item.productionCapability,
        item.type,
        missingRequirements.length === 0,
      );
      return [
        item.id,
        {
          itemId: item.id,
          readiness,
          quantity: safeQuantity(item),
          missingRequirementIds: missingRequirements.map((requirement) => requirement.id),
          missingRequirementLabels: missingRequirements.map((requirement) => requirement.label),
        },
      ];
    }),
  );
}

function ratio(count: number, total: number): number {
  return total > 0 ? count / total : 0;
}

export function summarizeCampaignOutputCoverage(plan: CampaignOutputPlan): CoverageSummary {
  const readinessByItemId = buildProductionItemCoverageMap(plan);

  const counts = plan.items.reduce(
    (accumulator, item) => {
      const quantity = readinessByItemId[item.id]?.quantity ?? safeQuantity(item);
      const readiness = readinessByItemId[item.id]?.readiness ?? 'unsupported';
      switch (readiness) {
        case 'auto_ready':
          accumulator.autoReady += quantity;
          break;
        case 'template_ready':
          accumulator.templateReady += quantity;
          break;
        case 'brief_ready':
          accumulator.briefReady += quantity;
          break;
        case 'needs_source_asset':
          accumulator.needsSourceAsset += quantity;
          break;
        default:
          accumulator.unsupported += quantity;
          break;
      }
      accumulator.total += quantity;
      return accumulator;
    },
    {
      total: 0,
      autoReady: 0,
      templateReady: 0,
      briefReady: 0,
      needsSourceAsset: 0,
      unsupported: 0,
    },
  );

  return {
    ...counts,
    trueProductionCoverage: ratio(counts.autoReady + counts.templateReady, counts.total),
    directProductionCoverage: ratio(counts.autoReady, counts.total),
    templateProductionCoverage: ratio(counts.templateReady, counts.total),
    assistiveCoverage: ratio(counts.briefReady, counts.total),
    blockedRate: ratio(counts.needsSourceAsset + counts.unsupported, counts.total),
  };
}
