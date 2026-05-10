import type { LibraryAsset, TeamAssetCategory } from '../api/assetLibraryApi.ts';
import type {
  AssetContract,
  CampaignAssetCategory,
} from '../components/campaign/contracts/campaignOutputContracts.ts';

const TEAM_TO_CONTRACT_CATEGORY: Record<TeamAssetCategory, CampaignAssetCategory> = {
  character_image: 'character_image',
  scene_image: 'scene_image',
  ui_screenshot: 'ui_screenshot',
  logo: 'logo',
  gameplay_screenshot: 'gameplay_screenshot',
  video_clip: 'video_clip',
  finished_banner: 'finished_banner',
  reference_image: 'reference_image',
};

function resolveContractCategory(asset: LibraryAsset): CampaignAssetCategory {
  const category = asset.reuse_category ?? asset.team_category ?? asset.preprocess?.campaign_asset_category;
  return category ? TEAM_TO_CONTRACT_CATEGORY[category] : 'reference_image';
}

export function buildAssetContractFromLibraryAsset(
  asset: LibraryAsset,
  options: { campaignId?: string } = {},
): AssetContract {
  const width = asset.width ?? asset.preprocess?.width ?? undefined;
  const height = asset.height ?? asset.preprocess?.height ?? undefined;
  const durationSec = asset.duration ?? asset.preprocess?.duration_sec ?? undefined;

  return {
    assetId: asset.id,
    campaignId: options.campaignId,
    category: resolveContractCategory(asset),
    label: asset.filename,
    mimeType: asset.mime_type ?? asset.mimetype,
    width: width ?? undefined,
    height: height ?? undefined,
    durationMs: durationSec === undefined || durationSec === null
      ? undefined
      : Math.round(durationSec * 1000),
    createdAt: asset.created_at,
  };
}

export function getReusableAssetId(asset: Pick<LibraryAsset, 'id'>): string {
  return asset.id;
}
