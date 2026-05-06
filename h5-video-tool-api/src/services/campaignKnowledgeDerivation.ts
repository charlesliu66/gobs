import type { CampaignKnowledgePack } from './campaignKnowledgeStore.js';

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

function unique(items: string[]): string[] {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}

export function createEmptyDerivedCampaignKnowledgeContext(
  selectedPackIds: string[] = [],
): DerivedCampaignKnowledgeContext {
  return {
    selectedPackIds: unique(selectedPackIds),
    marketTruth: [],
    audienceTension: [],
    toneRules: [],
    forbiddenClaims: [],
    approvedAngles: [],
    hookCandidates: [],
    visualCues: [],
    rationaleNotes: [],
  };
}

export function deriveCampaignKnowledgeContext(
  packs: CampaignKnowledgePack[],
  selectedPackIds: string[],
): DerivedCampaignKnowledgeContext {
  const context = createEmptyDerivedCampaignKnowledgeContext(selectedPackIds);
  if (context.selectedPackIds.length === 0) {
    return context;
  }

  const selected = packs.filter((pack) => context.selectedPackIds.includes(pack.packId));
  if (selected.length === 0) {
    return context;
  }

  for (const pack of selected) {
    if (pack.summary) {
      context.rationaleNotes.push(`[${pack.title}] ${pack.summary}`);
    }

    if (pack.type === 'market_fundamentals' || pack.type === 'live_ops_history' || pack.type === 'live_ops_calendar') {
      context.marketTruth.push(...pack.facts);
    }
    if (pack.type === 'user_persona') {
      context.audienceTension.push(...pack.facts, ...pack.preferences);
    }
    if (pack.type === 'brand_tone') {
      context.toneRules.push(...pack.preferences, ...pack.facts);
    }
    if (pack.type === 'brand_compliance') {
      context.forbiddenClaims.push(...pack.avoid, ...pack.facts.filter((item) => /avoid|claim|guarantee|promise/i.test(item)));
    }
    if (pack.type === 'selling_point_playbook') {
      context.approvedAngles.push(...pack.facts);
    }

    context.hookCandidates.push(...pack.hookSeeds);
    context.visualCues.push(...pack.visualCues);
  }

  context.marketTruth = unique(context.marketTruth);
  context.audienceTension = unique(context.audienceTension);
  context.toneRules = unique(context.toneRules);
  context.forbiddenClaims = unique(context.forbiddenClaims);
  context.approvedAngles = unique(context.approvedAngles);
  context.hookCandidates = unique(context.hookCandidates);
  context.visualCues = unique(context.visualCues);
  context.rationaleNotes = unique(context.rationaleNotes);
  return context;
}
