export type CampaignCreativeMode = 'tiktok_content' | 'tiktok_ua';

export interface CampaignCreativeBrief {
  platform: 'tiktok';
  mode: CampaignCreativeMode;
  objective?: string;
  audience?: string;
  sellingPoints: string[];
  cta?: string;
  referenceStyle?: string;
  region?: string;
  forbiddenClaims?: string[];
}

export interface CampaignCreativeStrategy {
  platform: 'tiktok';
  mode: CampaignCreativeMode;
  objective: string;
  audience?: string;
  primarySellingPoint?: string;
  hookOptions: string[];
  recommendedHook: string;
  cta: string;
  rationale: string;
  angle: string;
  tone: string;
  assetNeeds: string[];
}

export interface CampaignCreativeHandoffPayload {
  brief: CampaignCreativeBrief;
  strategy: CampaignCreativeStrategy;
  source: 'campaign-creative';
  createdAt: number;
}

export interface CampaignCreativeFormState {
  mode: CampaignCreativeMode;
  objective: string;
  audience: string;
  sellingPointsText: string;
  cta: string;
  referenceStyle: string;
  region: string;
  forbiddenClaimsText: string;
}
