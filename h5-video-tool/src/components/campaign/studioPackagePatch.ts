import type {
  CampaignDistributionPackage,
  CampaignDistributionPackageAsset,
  CampaignDistributionUpdateInput,
} from './distributionPackage.ts';
import type { CampaignOutputPlan } from './outputPlan.ts';
import type { CampaignStudioHandoffState } from './studioBridge.ts';

export interface StudioGeneratedVideoResult {
  taskId: string;
  videoPath?: string | null;
  videoUrl?: string | null;
}

const SAFE_IDENTIFIER_MAX_LENGTH = 128;

export function sanitizeStudioGeneratedAssetId(taskId: string): string {
  const normalized = taskId
    .trim()
    .replace(/[^\w-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, SAFE_IDENTIFIER_MAX_LENGTH);
  return normalized || `studio_asset_${Date.now()}`;
}

function uniqueAssetsById(assets: CampaignDistributionPackageAsset[]): CampaignDistributionPackageAsset[] {
  const seen = new Set<string>();
  return assets.filter((asset) => {
    const key = asset.assetId?.trim();
    if (!key) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.map((value) => value?.trim() ?? '').filter(Boolean))];
}

export function buildStudioGeneratedPackageUpdate(input: {
  pkg: CampaignDistributionPackage;
  handoff: CampaignStudioHandoffState;
  result: StudioGeneratedVideoResult;
}): CampaignDistributionUpdateInput | null {
  const linkedPackageId = input.handoff.distributionPackageId?.trim();
  if (linkedPackageId && linkedPackageId !== input.pkg.id) return null;

  const videoPath = input.result.videoPath?.trim() || undefined;
  const videoUrl = input.result.videoUrl?.trim() || undefined;
  if (!videoPath && !videoUrl) return null;

  const assetId = sanitizeStudioGeneratedAssetId(input.result.taskId);
  const readyAsset: CampaignDistributionPackageAsset = {
    assetId,
    type: 'video',
    status: 'ready',
    path: videoPath,
    url: videoPath ? undefined : videoUrl,
  };
  const previousAssets = input.pkg.assets.filter((asset) => asset.assetId !== assetId);
  const assets = uniqueAssetsById([readyAsset, ...previousAssets]);
  const sourceAssetIds = uniqueStrings([
    ...(input.pkg.source.sourceAssetIds ?? []),
    ...input.handoff.sourceAssets.map((asset) => asset.id),
  ]);
  const outputIds = uniqueStrings([
    assetId,
    ...(input.pkg.source.outputIds ?? []),
  ]);

  return {
    campaignId: input.handoff.campaignId ?? input.pkg.campaignId,
    source: {
      ...input.pkg.source,
      outputPlanId: input.handoff.outputPlanId,
      productionItemId: input.handoff.productionItemId,
      outputIds,
      sourceAssetIds,
    },
    assets,
    assetReadiness: {
      state: 'publishable',
      primaryAssetId: assetId,
      publishableAsset: {
        type: 'video',
        source: videoPath ? 'server_path' : 'verified_url',
        path: videoPath,
        url: videoPath ? undefined : videoUrl,
      },
      reason: undefined,
    },
    review: {
      ...input.pkg.review,
      status: 'needs_review',
      notes: input.pkg.review.notes,
      updatedAt: new Date().toISOString(),
    },
  };
}

export function buildStudioGeneratedOutputPlanUpdate(input: {
  plan: CampaignOutputPlan;
  handoff: CampaignStudioHandoffState;
  result: StudioGeneratedVideoResult;
}): Pick<CampaignOutputPlan, 'status' | 'items' | 'sourceAssetRequirements' | 'capabilityGaps'> | null {
  const linkedPlanId = input.handoff.outputPlanId?.trim();
  if (!linkedPlanId || linkedPlanId !== input.plan.id) return null;

  const videoPath = input.result.videoPath?.trim() || undefined;
  const videoUrl = input.result.videoUrl?.trim() || undefined;
  if (!videoPath && !videoUrl) return null;

  const assetId = sanitizeStudioGeneratedAssetId(input.result.taskId);
  let touched = false;
  const items = input.plan.items.map((item) => {
    if (item.id !== input.handoff.productionItemId) return item;
    touched = true;
    const outputAssetIds = [assetId, ...item.outputAssetIds.filter((id) => id !== assetId)];
    const packageId = input.handoff.distributionPackageId?.trim();
    const distributionPackageIds = packageId
      ? [packageId, ...item.distributionPackageIds.filter((id) => id !== packageId)]
      : item.distributionPackageIds;

    return {
      ...item,
      status: 'produced' as const,
      outputAssetIds,
      distributionPackageIds,
      humanAction: {
        type: 'confirm' as const,
        label: 'Review produced video',
        detail: 'Studio generated this production item. Review the linked package before distribution.',
      },
    };
  });

  if (!touched) return null;
  return {
    status: 'ready_for_distribution',
    items,
    sourceAssetRequirements: input.plan.sourceAssetRequirements,
    capabilityGaps: input.plan.capabilityGaps,
  };
}
