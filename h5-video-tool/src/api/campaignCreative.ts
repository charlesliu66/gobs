import type {
  CampaignCreativeBrief,
  CampaignCreativeMode,
} from '../components/campaign/model';
import type { DerivedCampaignKnowledgeContext } from './campaignKnowledge';

export type { DerivedCampaignKnowledgeContext } from './campaignKnowledge';

export type CampaignMissionBriefGenerationSource = 'llm' | 'fallback';

export interface CampaignMissionBriefRequest {
  mission: string;
  mode?: CampaignCreativeMode;
  uiLocale?: 'zh' | 'en';
}

export interface CampaignMissionBriefResponse {
  brief: CampaignCreativeBrief;
  knowledgeContext: DerivedCampaignKnowledgeContext;
  routedKnowledgePackIds: string[];
  generationSource: CampaignMissionBriefGenerationSource;
  warnings: string[];
}

type ApiClientModule = typeof import('./client');

async function loadClient(): Promise<ApiClientModule> {
  return import('./client');
}

export function campaignMissionBriefPath(): string {
  return '/api/campaign-creative/mission-brief';
}

export async function generateCampaignMissionBrief(
  input: CampaignMissionBriefRequest,
): Promise<CampaignMissionBriefResponse> {
  const { apiPost } = await loadClient();
  return apiPost(campaignMissionBriefPath(), input);
}
