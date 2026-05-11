import test from 'node:test';
import assert from 'node:assert/strict';
import type { DerivedCampaignKnowledgeContext } from '../src/api/campaignKnowledge.ts';
import {
  buildFeedbackByCitationId,
  selectVisibleKnowledgeCitations,
  summarizeKnowledgeReferences,
} from '../src/components/campaign/knowledgeTraceability.ts';

const context: DerivedCampaignKnowledgeContext = {
  selectedPackIds: ['pack_market'],
  marketTruth: ['Players need payoff quickly.'],
  audienceTension: [],
  toneRules: ['Keep claims concrete.'],
  forbiddenClaims: [],
  approvedAngles: ['Lead with the reward loop.'],
  hookCandidates: ['Open on the reward reveal.'],
  visualCues: [],
  rationaleNotes: [],
  citations: [
    {
      citationId: 'kref_hc_1',
      packId: 'pack_market',
      packTitle: 'Market',
      section: 'hookCandidates',
      sourceField: 'hookSeeds',
      value: 'Open on the reward reveal.',
    },
    {
      citationId: 'kref_mt_1',
      packId: 'pack_market',
      packTitle: 'Market',
      section: 'marketTruth',
      sourceField: 'facts',
      value: 'Players need payoff quickly.',
    },
    {
      citationId: 'kref_aa_1',
      packId: 'pack_market',
      packTitle: 'Market',
      section: 'approvedAngles',
      sourceField: 'facts',
      value: 'Lead with the reward loop.',
    },
  ],
};

test('selectVisibleKnowledgeCitations prioritizes visible cited knowledge', () => {
  const visible = selectVisibleKnowledgeCitations(context, 3);
  assert.deepEqual(visible.map((item) => item.section), ['marketTruth', 'approvedAngles', 'hookCandidates']);
});

test('buildFeedbackByCitationId maps persisted feedback into quick lookup state', () => {
  const mapped = buildFeedbackByCitationId([
    {
      citationId: 'kref_mt_1',
      gameId: 'gold-and-glory',
      state: 'do_not_use_again',
      updatedAt: '2026-05-11T00:00:00.000Z',
      updatedBy: 'operator',
    },
  ]);

  assert.deepEqual(mapped, { kref_mt_1: 'do_not_use_again' });
});

test('summarizeKnowledgeReferences creates compact output-plan labels', () => {
  assert.deepEqual(summarizeKnowledgeReferences(context.citations, 2), [
    'Market: Open on the reward reveal.',
    'Market: Players need payoff quickly.',
  ]);
});
