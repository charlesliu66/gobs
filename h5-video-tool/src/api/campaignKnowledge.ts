export const CAMPAIGN_KNOWLEDGE_PACK_TYPES = [
  'brand_tone',
  'brand_compliance',
  'visual_style',
  'market_fundamentals',
  'user_persona',
  'live_ops_calendar',
  'live_ops_history',
  'selling_point_playbook',
] as const;
export const GOLD_AND_GLORY_CANONICAL_TEMPLATE_ID = 'gold-and-glory-canonical';
export const DEFAULT_CAMPAIGN_KNOWLEDGE_TEMPLATE_ID = GOLD_AND_GLORY_CANONICAL_TEMPLATE_ID;

export type CampaignKnowledgePackType = (typeof CAMPAIGN_KNOWLEDGE_PACK_TYPES)[number];
export type CampaignKnowledgePackStatus = 'draft' | 'ready' | 'archived';

export interface CampaignKnowledgePack {
  packId: string;
  gameId: string;
  type: CampaignKnowledgePackType;
  title: string;
  status: CampaignKnowledgePackStatus;
  summary: string;
  facts: string[];
  preferences: string[];
  avoid: string[];
  hookSeeds: string[];
  visualCues: string[];
  sourceIds: string[];
  templateId?: string;
  updatedAt: string;
}

export interface DerivedCampaignKnowledgeContext {
  selectedPackIds: string[];
  marketTruth: string[];
  audienceTension: string[];
  toneRules: string[];
  forbiddenClaims: string[];
  approvedAngles: string[];
  hookCandidates: string[];
  visualCues: string[];
  rationaleNotes: string[];
}

type ApiClientModule = typeof import('./client');

async function loadClient(): Promise<ApiClientModule> {
  return import('./client');
}

export function campaignKnowledgePacksPath(gameId: string): string {
  return `/api/campaign-knowledge/games/${encodeURIComponent(gameId)}/packs`;
}

export function campaignKnowledgeImportTemplatePath(gameId: string): string {
  return `/api/campaign-knowledge/games/${encodeURIComponent(gameId)}/import-template`;
}

export function campaignKnowledgeSourcesPath(gameId: string): string {
  return `/api/campaign-knowledge/games/${encodeURIComponent(gameId)}/sources`;
}

export function campaignKnowledgeDeriveContextPath(gameId: string): string {
  return `/api/campaign-knowledge/games/${encodeURIComponent(gameId)}/derive-context`;
}

export async function listCampaignKnowledgePacks(
  gameId: string,
): Promise<{ gameId: string; packs: CampaignKnowledgePack[] }> {
  const { apiGet } = await loadClient();
  return apiGet(campaignKnowledgePacksPath(gameId));
}

export async function importKnowledgeTemplate(
  gameId: string,
  templateId = DEFAULT_CAMPAIGN_KNOWLEDGE_TEMPLATE_ID,
): Promise<{ gameId: string; importedPackIds: string[]; packs: CampaignKnowledgePack[] }> {
  const { apiPost } = await loadClient();
  return apiPost(campaignKnowledgeImportTemplatePath(gameId), {
    templateId,
  });
}

export async function createKnowledgeSource(
  gameId: string,
  input: { title: string; content: string; packType: CampaignKnowledgePackType; sourceType?: 'manual' | 'upload' },
): Promise<{ gameId: string; sourceId: string; pack: CampaignKnowledgePack; packs: CampaignKnowledgePack[] }> {
  const { apiPost } = await loadClient();
  return apiPost(campaignKnowledgeSourcesPath(gameId), input);
}

export async function deriveKnowledgeContext(
  gameId: string,
  selectedPackIds: string[],
): Promise<{ gameId: string; context: DerivedCampaignKnowledgeContext }> {
  const { apiPost } = await loadClient();
  return apiPost(campaignKnowledgeDeriveContextPath(gameId), {
    selectedPackIds,
  });
}
