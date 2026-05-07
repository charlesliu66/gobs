import type {
  CampaignDistributionCreateInput,
  CampaignDistributionPackage,
  CampaignDistributionUpdateInput,
} from '../components/campaign/distributionPackage.ts';

type ApiClientModule = typeof import('./client');

async function loadClient(): Promise<ApiClientModule> {
  return import('./client');
}

export function campaignDistributionPackagesPath(): string {
  return '/api/campaign-distribution/packages';
}

export function campaignDistributionPackagePath(packageId: string): string {
  return `${campaignDistributionPackagesPath()}/${encodeURIComponent(packageId)}`;
}

export async function createCampaignDistributionPackage(
  input: CampaignDistributionCreateInput,
): Promise<CampaignDistributionPackage> {
  const { apiPost } = await loadClient();
  return apiPost(campaignDistributionPackagesPath(), input);
}

export async function listCampaignDistributionPackages(): Promise<{ items: CampaignDistributionPackage[] }> {
  const { apiGet } = await loadClient();
  const response = await apiGet<{ items?: CampaignDistributionPackage[]; packages?: CampaignDistributionPackage[] }>(
    campaignDistributionPackagesPath(),
  );
  return {
    items: response.items ?? response.packages ?? [],
  };
}

export async function getCampaignDistributionPackage(packageId: string): Promise<CampaignDistributionPackage> {
  const { apiGet } = await loadClient();
  return apiGet(campaignDistributionPackagePath(packageId));
}

export async function updateCampaignDistributionPackage(
  packageId: string,
  input: CampaignDistributionUpdateInput,
): Promise<CampaignDistributionPackage> {
  const { apiPatch } = await loadClient();
  return apiPatch(campaignDistributionPackagePath(packageId), input);
}
