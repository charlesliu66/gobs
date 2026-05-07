import type {
  CampaignDistributionPackage,
} from '../campaign/distributionPackage.ts';

export type PendingDistributionNextActionKey =
  | 'asset_library'
  | 'quick_film'
  | 'editor_fine_tune';

export interface PendingDistributionDraft {
  packageId: string;
  title: string;
  selectedAsset: {
    id: string;
    title: string;
    videoPath?: string;
    videoUrl?: string;
  } | null;
  selectedPlatformKeys: string[];
  platformDrafts: Record<string, { caption: string; hashtags: string }>;
  formPrefill: {
    campaignObjective: string;
    targetAudience: string;
    cta: string;
    market: string;
    brandTone: string;
    sellingPoints: string;
    avoidTerms: string;
  };
  campaignContext: {
    marketTruth: string[];
    audienceTension: string[];
    toneRules: string[];
    forbiddenClaims: string[];
    approvedAngles: string[];
    hookCandidates: string[];
    visualCues: string[];
  };
  publishSafety: {
    canPublishDirectly: boolean;
    keepAccountsExplicit: true;
    nextActionKeys: PendingDistributionNextActionKey[];
    reason?: string;
  };
}

const MISSING_ASSET_ACTIONS: PendingDistributionNextActionKey[] = [
  'asset_library',
  'quick_film',
  'editor_fine_tune',
];

function normalizePlatformKey(value: string): string {
  return value.trim().toLowerCase();
}

function resolveSelectedAsset(pkg: CampaignDistributionPackage): PendingDistributionDraft['selectedAsset'] {
  const publishable = pkg.assetReadiness.publishableAsset;
  if (publishable?.path || publishable?.url) {
    return {
      id: pkg.assetReadiness.primaryAssetId ?? `${pkg.id}:publishable`,
      title: pkg.title,
      videoPath: publishable.path,
      videoUrl: publishable.url,
    };
  }

  const readyAsset = pkg.assets.find((asset) => asset.status === 'ready' && (asset.path || asset.url));
  if (!readyAsset) return null;
  return {
    id: readyAsset.assetId ?? `${pkg.id}:asset`,
    title: pkg.title,
    videoPath: readyAsset.path,
    videoUrl: readyAsset.url,
  };
}

export function buildDistributeDraftFromPackage(pkg: CampaignDistributionPackage): PendingDistributionDraft {
  const selectedPlatformKeys = (pkg.publishIntent.platforms.length > 0
    ? pkg.publishIntent.platforms
    : ['default'])
    .map(normalizePlatformKey);
  const hashtags = pkg.copy.hashtags.join(' ').trim();
  const platformDrafts = Object.fromEntries(
    selectedPlatformKeys.map((platform) => [platform, {
      caption: pkg.copy.caption,
      hashtags,
    }]),
  );
  const selectedAsset = resolveSelectedAsset(pkg);
  const canPublishDirectly = pkg.assetReadiness.state === 'publishable' && Boolean(selectedAsset);

  return {
    packageId: pkg.id,
    title: pkg.title,
    selectedAsset,
    selectedPlatformKeys,
    platformDrafts,
    formPrefill: {
      campaignObjective: pkg.campaign.objective ?? '',
      targetAudience: pkg.knowledgeContext.audienceTension[0] ?? pkg.variant.audience ?? '',
      cta: pkg.variant.cta ?? '',
      market: pkg.publishIntent.markets[0] ?? '',
      brandTone: pkg.knowledgeContext.toneRules.join(' | '),
      sellingPoints: [pkg.variant.angle, ...pkg.knowledgeContext.approvedAngles].filter(Boolean).join('\n'),
      avoidTerms: pkg.knowledgeContext.forbiddenClaims.join('\n'),
    },
    campaignContext: {
      marketTruth: [...pkg.knowledgeContext.marketTruth],
      audienceTension: [...pkg.knowledgeContext.audienceTension],
      toneRules: [...pkg.knowledgeContext.toneRules],
      forbiddenClaims: [...pkg.knowledgeContext.forbiddenClaims],
      approvedAngles: [...pkg.knowledgeContext.approvedAngles],
      hookCandidates: [...pkg.knowledgeContext.hookCandidates],
      visualCues: [...pkg.knowledgeContext.visualCues],
    },
    publishSafety: {
      canPublishDirectly,
      keepAccountsExplicit: true,
      nextActionKeys: canPublishDirectly ? [] : MISSING_ASSET_ACTIONS,
      reason: canPublishDirectly
        ? undefined
        : (pkg.assetReadiness.reason || 'Package needs a real render before publishing.'),
    },
  };
}
