export type CampaignCreativeMode = 'tiktok_content' | 'tiktok_ua';
export type CampaignCreativeCtaType = 'direct_response' | 'soft_conversion' | 'brand_follow';
export type CampaignCreativeHookApproach = 'benefit_first' | 'conflict_first' | 'story_first';
export type CampaignCreativeVariantEmphasis = 'hook_focus' | 'selling_point_focus' | 'cta_focus';

export interface CampaignCreativeBrief {
  briefId: string;
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
  strategyId: string;
  briefId: string;
  platform: 'tiktok';
  mode: CampaignCreativeMode;
  objective: string;
  targetAudience?: string;
  sellingPointFocus?: string;
  hookApproach?: CampaignCreativeHookApproach;
  hookOptions: string[];
  recommendedHook: string;
  cta: string;
  ctaType?: CampaignCreativeCtaType;
  rationale: string;
  angle: string;
  tone?: string;
  assetNeeds: string[];
  riskNotes: string[];
}

export interface CampaignCreativeStrategyTuning {
  hookApproach: CampaignCreativeHookApproach;
  sellingPointFocus: string;
  ctaType: CampaignCreativeCtaType;
}

export interface CampaignCreativeVariant {
  variantId: string;
  variantPackId: string;
  briefId: string;
  strategyId: string;
  emphasis: CampaignCreativeVariantEmphasis;
  title: string;
  hook: string;
  openingBeat: string;
  sellingPointFocus: string;
  cta: string;
  ctaType?: CampaignCreativeCtaType;
  editingDirection: string;
  assetSuggestion: string;
  differenceSummary: string;
  isRecommended: boolean;
}

export interface CampaignCreativeVariantPack {
  variantPackId: string;
  briefId: string;
  strategyId: string;
  mode: CampaignCreativeMode;
  summary: string;
  comparisonAxes: string[];
  variants: CampaignCreativeVariant[];
  selectedVariantId: string;
}

export interface CampaignCreativeHandoffPayload {
  brief: CampaignCreativeBrief;
  strategy: CampaignCreativeStrategy;
  variantPack?: CampaignCreativeVariantPack;
  selectedVariant?: CampaignCreativeVariant;
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
