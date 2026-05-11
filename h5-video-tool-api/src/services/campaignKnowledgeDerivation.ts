import { createHash } from 'node:crypto';
import type { CampaignKnowledgePack } from './campaignKnowledgeStore.js';

export const CAMPAIGN_KNOWLEDGE_CITATION_SECTIONS = [
  'marketTruth',
  'audienceTension',
  'toneRules',
  'forbiddenClaims',
  'approvedAngles',
  'hookCandidates',
  'visualCues',
  'rationaleNotes',
] as const;

export type CampaignKnowledgeCitationSection = (typeof CAMPAIGN_KNOWLEDGE_CITATION_SECTIONS)[number];
export type CampaignKnowledgeCitationSourceField =
  | 'summary'
  | 'facts'
  | 'preferences'
  | 'avoid'
  | 'hookSeeds'
  | 'visualCues';

export interface CampaignKnowledgeCitation {
  citationId: string;
  packId: string;
  packTitle: string;
  section: CampaignKnowledgeCitationSection;
  sourceField: CampaignKnowledgeCitationSourceField;
  value: string;
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
  citations: CampaignKnowledgeCitation[];
}

interface DeriveCampaignKnowledgeContextOptions {
  suppressedCitationIds?: string[];
}

function unique(items: string[]): string[] {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}

function normalizeCitationValue(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function citationSectionPrefix(section: CampaignKnowledgeCitationSection): string {
  switch (section) {
    case 'marketTruth':
      return 'mt';
    case 'audienceTension':
      return 'at';
    case 'toneRules':
      return 'tr';
    case 'forbiddenClaims':
      return 'fc';
    case 'approvedAngles':
      return 'aa';
    case 'hookCandidates':
      return 'hc';
    case 'visualCues':
      return 'vc';
    case 'rationaleNotes':
      return 'rn';
  }
}

export function buildCampaignKnowledgeCitationId(
  packId: string,
  section: CampaignKnowledgeCitationSection,
  value: string,
): string {
  const hash = createHash('sha256')
    .update(`${packId.trim()}|${section}|${normalizeCitationValue(value)}`)
    .digest('hex')
    .slice(0, 18);
  return `kref_${citationSectionPrefix(section)}_${hash}`;
}

function pushKnowledgeEntries(input: {
  context: DerivedCampaignKnowledgeContext;
  target: string[];
  pack: CampaignKnowledgePack;
  section: CampaignKnowledgeCitationSection;
  sourceField: CampaignKnowledgeCitationSourceField;
  values: string[];
  suppressed: Set<string>;
}): void {
  const seenValues = new Set(input.target.map(normalizeCitationValue));
  const seenCitationIds = new Set(input.context.citations.map((citation) => citation.citationId));

  for (const value of input.values) {
    const normalized = normalizeCitationValue(value);
    if (!normalized || seenValues.has(normalized)) {
      continue;
    }
    const citationId = buildCampaignKnowledgeCitationId(input.pack.packId, input.section, normalized);
    if (input.suppressed.has(citationId)) {
      continue;
    }
    input.target.push(normalized);
    seenValues.add(normalized);
    if (!seenCitationIds.has(citationId)) {
      input.context.citations.push({
        citationId,
        packId: input.pack.packId,
        packTitle: input.pack.title,
        section: input.section,
        sourceField: input.sourceField,
        value: normalized,
      });
      seenCitationIds.add(citationId);
    }
  }
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
    citations: [],
  };
}

export function deriveCampaignKnowledgeContext(
  packs: CampaignKnowledgePack[],
  selectedPackIds: string[],
  options: DeriveCampaignKnowledgeContextOptions = {},
): DerivedCampaignKnowledgeContext {
  const context = createEmptyDerivedCampaignKnowledgeContext(selectedPackIds);
  const suppressed = new Set(unique(options.suppressedCitationIds ?? []));
  if (context.selectedPackIds.length === 0) {
    return context;
  }

  const selected = packs.filter((pack) => context.selectedPackIds.includes(pack.packId));
  if (selected.length === 0) {
    return context;
  }

  for (const pack of selected) {
    if (pack.summary) {
      pushKnowledgeEntries({
        context,
        target: context.rationaleNotes,
        pack,
        section: 'rationaleNotes',
        sourceField: 'summary',
        values: [`[${pack.title}] ${pack.summary}`],
        suppressed,
      });
    }

    if (pack.type === 'market_fundamentals' || pack.type === 'live_ops_history' || pack.type === 'live_ops_calendar') {
      pushKnowledgeEntries({
        context,
        target: context.marketTruth,
        pack,
        section: 'marketTruth',
        sourceField: 'facts',
        values: pack.facts,
        suppressed,
      });
    }
    if (pack.type === 'user_persona') {
      pushKnowledgeEntries({
        context,
        target: context.audienceTension,
        pack,
        section: 'audienceTension',
        sourceField: 'facts',
        values: pack.facts,
        suppressed,
      });
      pushKnowledgeEntries({
        context,
        target: context.audienceTension,
        pack,
        section: 'audienceTension',
        sourceField: 'preferences',
        values: pack.preferences,
        suppressed,
      });
    }
    if (pack.type === 'brand_tone') {
      pushKnowledgeEntries({
        context,
        target: context.toneRules,
        pack,
        section: 'toneRules',
        sourceField: 'preferences',
        values: pack.preferences,
        suppressed,
      });
      pushKnowledgeEntries({
        context,
        target: context.toneRules,
        pack,
        section: 'toneRules',
        sourceField: 'facts',
        values: pack.facts,
        suppressed,
      });
    }
    if (pack.type === 'brand_compliance') {
      pushKnowledgeEntries({
        context,
        target: context.forbiddenClaims,
        pack,
        section: 'forbiddenClaims',
        sourceField: 'avoid',
        values: pack.avoid,
        suppressed,
      });
      pushKnowledgeEntries({
        context,
        target: context.forbiddenClaims,
        pack,
        section: 'forbiddenClaims',
        sourceField: 'facts',
        values: pack.facts.filter((item) => /avoid|claim|guarantee|promise/i.test(item)),
        suppressed,
      });
    }
    if (pack.type === 'selling_point_playbook') {
      pushKnowledgeEntries({
        context,
        target: context.approvedAngles,
        pack,
        section: 'approvedAngles',
        sourceField: 'facts',
        values: pack.facts,
        suppressed,
      });
    }

    pushKnowledgeEntries({
      context,
      target: context.hookCandidates,
      pack,
      section: 'hookCandidates',
      sourceField: 'hookSeeds',
      values: pack.hookSeeds,
      suppressed,
    });
    pushKnowledgeEntries({
      context,
      target: context.visualCues,
      pack,
      section: 'visualCues',
      sourceField: 'visualCues',
      values: pack.visualCues,
      suppressed,
    });
  }

  return context;
}
