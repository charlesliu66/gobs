import type {
  CampaignOutputPlan,
} from '../components/campaign/outputPlan.ts';

export type CampaignOutputPlanCreateInput = Omit<
  CampaignOutputPlan,
  'id' | 'ownerId' | 'createdBy' | 'updatedBy' | 'createdAt' | 'updatedAt'
> & {
  id?: string;
};

export type CampaignOutputPlanUpdateInput = Partial<
  Pick<CampaignOutputPlan, 'status' | 'items' | 'sourceAssetRequirements' | 'capabilityGaps'>
>;

type ApiClientModule = typeof import('./client');

async function loadClient(): Promise<ApiClientModule> {
  return import('./client');
}

export function campaignOutputPlansPath(): string {
  return '/api/campaign-output/plans';
}

export function campaignOutputPlanPath(planId: string): string {
  return `${campaignOutputPlansPath()}/${encodeURIComponent(planId)}`;
}

export async function createCampaignOutputPlan(
  input: CampaignOutputPlanCreateInput,
): Promise<CampaignOutputPlan> {
  const { apiPost } = await loadClient();
  return apiPost(campaignOutputPlansPath(), input);
}

export async function listCampaignOutputPlans(): Promise<{ items: CampaignOutputPlan[] }> {
  const { apiGet } = await loadClient();
  const response = await apiGet<{ items?: CampaignOutputPlan[]; plans?: CampaignOutputPlan[] }>(
    campaignOutputPlansPath(),
  );
  return {
    items: response.items ?? response.plans ?? [],
  };
}

export async function getCampaignOutputPlan(planId: string): Promise<CampaignOutputPlan> {
  const { apiGet } = await loadClient();
  return apiGet(campaignOutputPlanPath(planId));
}

export async function updateCampaignOutputPlan(
  planId: string,
  input: CampaignOutputPlanUpdateInput,
): Promise<CampaignOutputPlan> {
  const { apiPatch } = await loadClient();
  return apiPatch(campaignOutputPlanPath(planId), input);
}
