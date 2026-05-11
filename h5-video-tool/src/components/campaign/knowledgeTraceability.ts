import type {
  CampaignKnowledgeCitation,
  CampaignKnowledgeCitationFeedback,
  CampaignKnowledgeCitationFeedbackState,
  DerivedCampaignKnowledgeContext,
} from '../../api/campaignKnowledge.ts';

export const GOLD_AND_GLORY_CAMPAIGN_GAME_ID = 'gold-and-glory';

export type KnowledgeFeedbackByCitationId = Record<string, CampaignKnowledgeCitationFeedbackState>;

const SECTION_PRIORITY: Record<CampaignKnowledgeCitation['section'], number> = {
  marketTruth: 1,
  approvedAngles: 2,
  hookCandidates: 3,
  audienceTension: 4,
  toneRules: 5,
  visualCues: 6,
  forbiddenClaims: 7,
  rationaleNotes: 8,
};

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function buildFeedbackByCitationId(
  feedback: CampaignKnowledgeCitationFeedback[],
): KnowledgeFeedbackByCitationId {
  return Object.fromEntries(
    feedback
      .filter((item) => item.citationId && item.state)
      .map((item) => [item.citationId, item.state]),
  );
}

export function selectVisibleKnowledgeCitations(
  context: DerivedCampaignKnowledgeContext | null | undefined,
  limit = 6,
): CampaignKnowledgeCitation[] {
  const citations = context?.citations ?? [];
  const seenValues = new Set<string>();
  return citations
    .filter((citation) => {
      const valueKey = `${citation.section}:${normalizeText(citation.value)}`;
      if (!citation.citationId || !citation.value || seenValues.has(valueKey)) {
        return false;
      }
      seenValues.add(valueKey);
      return true;
    })
    .sort((a, b) => {
      const priorityDiff = SECTION_PRIORITY[a.section] - SECTION_PRIORITY[b.section];
      if (priorityDiff !== 0) return priorityDiff;
      return a.packTitle.localeCompare(b.packTitle);
    })
    .slice(0, limit);
}

export function summarizeKnowledgeReferences(
  references: readonly CampaignKnowledgeCitation[] | undefined,
  limit = 3,
): string[] {
  return (references ?? [])
    .map((reference) => {
      const value = normalizeText(reference.value);
      if (!value) return '';
      return `${reference.packTitle}: ${value}`;
    })
    .filter(Boolean)
    .slice(0, limit);
}

export function isRejectedKnowledgeFeedback(
  state: CampaignKnowledgeCitationFeedbackState | undefined,
): boolean {
  return state === 'do_not_use_again';
}
