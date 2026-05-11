import type { ProductionItem } from './outputPlan.ts';

export type CampaignProductionReadiness =
  | 'auto_ready'
  | 'template_ready'
  | 'brief_ready'
  | 'needs_source_asset'
  | 'unsupported';

export interface CampaignOutputCoverageSummary {
  total: number;
  trueReady: number;
  directReady: number;
  templateReady: number;
  assistiveReady: number;
  needsSourceAsset: number;
  unsupported: number;
}

const TEXT_OUTPUT_TYPES = new Set<ProductionItem['type']>([
  'caption_set',
  'headline_set',
  'hashtag_set',
  'fb_post',
]);

function quantity(item: ProductionItem): number {
  return Number.isFinite(item.quantity) && item.quantity > 0 ? item.quantity : 0;
}

export function readinessForProductionItem(item: ProductionItem): CampaignProductionReadiness {
  if (item.productionCapability === 'unsupported') return 'unsupported';
  if (item.productionCapability === 'manual_recommended') return 'brief_ready';
  if (item.status === 'blocked' || !item.gobsCanProduce) {
    return item.requiredSourceAssetIds.length > 0 ? 'needs_source_asset' : 'unsupported';
  }
  if (item.type === 'banner') return 'template_ready';
  if (TEXT_OUTPUT_TYPES.has(item.type)) return 'auto_ready';
  if (item.productionCapability === 'supported_with_source_assets') return 'template_ready';
  return 'auto_ready';
}

export function summarizeCampaignOutputCoverage(items: ProductionItem[]): CampaignOutputCoverageSummary {
  const summary: CampaignOutputCoverageSummary = {
    total: 0,
    trueReady: 0,
    directReady: 0,
    templateReady: 0,
    assistiveReady: 0,
    needsSourceAsset: 0,
    unsupported: 0,
  };

  items.forEach((item) => {
    const count = quantity(item);
    const readiness = readinessForProductionItem(item);
    summary.total += count;
    if (readiness === 'auto_ready') {
      summary.directReady += count;
      summary.trueReady += count;
    } else if (readiness === 'template_ready') {
      summary.templateReady += count;
      summary.trueReady += count;
    } else if (readiness === 'brief_ready') {
      summary.assistiveReady += count;
    } else if (readiness === 'needs_source_asset') {
      summary.needsSourceAsset += count;
    } else {
      summary.unsupported += count;
    }
  });

  return summary;
}
