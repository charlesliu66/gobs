import type {
  CampaignDistributionPackage,
  CampaignDistributionPackageAsset,
  CampaignDistributionUpdateInput,
} from './distributionPackage.ts';
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

  return {
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
