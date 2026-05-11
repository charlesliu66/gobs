import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCampaignKnowledgeCitationId,
  createEmptyDerivedCampaignKnowledgeContext,
  deriveCampaignKnowledgeContext,
} from '../src/services/campaignKnowledgeDerivation.ts';
import type { CampaignKnowledgePack } from '../src/services/campaignKnowledgeStore.ts';

const packs: CampaignKnowledgePack[] = [
  {
    packId: 'pack_market',
    gameId: 'g1',
    type: 'market_fundamentals',
    title: 'Market Fundamentals',
    status: 'ready',
    summary: 'Market summary',
    facts: ['Players need a clear payoff quickly.'],
    preferences: ['Lead with player tension.'],
    avoid: [],
    hookSeeds: ['Show the payoff first.'],
    visualCues: [],
    sourceIds: [],
    updatedAt: '2026-05-06T00:00:00.000Z',
  },
  {
    packId: 'pack_tone',
    gameId: 'g1',
    type: 'brand_tone',
    title: 'Brand Tone',
    status: 'ready',
    summary: 'Tone summary',
    facts: ['Keep it native to short-form creative.'],
    preferences: ['Use clear first-frame language.'],
    avoid: [],
    hookSeeds: [],
    visualCues: ['Readable contrast'],
    sourceIds: [],
    updatedAt: '2026-05-06T00:00:00.000Z',
  },
  {
    packId: 'pack_compliance',
    gameId: 'g1',
    type: 'brand_compliance',
    title: 'Compliance',
    status: 'ready',
    summary: 'Compliance summary',
    facts: ['Avoid unsupported claims.'],
    preferences: [],
    avoid: ['Do not promise guaranteed rewards.'],
    hookSeeds: [],
    visualCues: [],
    sourceIds: [],
    updatedAt: '2026-05-06T00:00:00.000Z',
  },
];

test('deriveCampaignKnowledgeContext combines selected pack data into stable arrays', () => {
  const context = deriveCampaignKnowledgeContext(packs, ['pack_market', 'pack_tone', 'pack_compliance']);

  assert.deepEqual(context.selectedPackIds, ['pack_market', 'pack_tone', 'pack_compliance']);
  assert.match(context.marketTruth[0] ?? '', /clear payoff/i);
  assert.match(context.toneRules.join(' '), /clear first-frame language/i);
  assert.match(context.forbiddenClaims.join(' '), /guaranteed rewards/i);
  assert.match(context.hookCandidates.join(' '), /payoff first/i);
  assert.match(context.visualCues.join(' '), /Readable contrast/);
  assert.equal(context.rationaleNotes.length >= 2, true);
  assert.equal(context.citations.length >= 6, true);
  assert.equal(
    context.citations.some((citation) =>
      citation.section === 'marketTruth' && citation.value === 'Players need a clear payoff quickly.'
    ),
    true,
  );
});

test('deriveCampaignKnowledgeContext returns empty-safe defaults when nothing is selected', () => {
  const context = deriveCampaignKnowledgeContext(packs, []);
  assert.deepEqual(context, createEmptyDerivedCampaignKnowledgeContext());
});

test('deriveCampaignKnowledgeContext ignores unknown selected ids without crashing', () => {
  const context = deriveCampaignKnowledgeContext(packs, ['missing']);
  assert.deepEqual(context, createEmptyDerivedCampaignKnowledgeContext(['missing']));
});

test('deriveCampaignKnowledgeContext suppresses rejected citation ids', () => {
  const suppressedCitationId = buildCampaignKnowledgeCitationId(
    'pack_market',
    'marketTruth',
    'Players need a clear payoff quickly.',
  );
  const context = deriveCampaignKnowledgeContext(packs, ['pack_market', 'pack_tone'], {
    suppressedCitationIds: [suppressedCitationId],
  });

  assert.equal(context.marketTruth.includes('Players need a clear payoff quickly.'), false);
  assert.equal(context.citations.some((citation) => citation.citationId === suppressedCitationId), false);
  assert.match(context.hookCandidates.join(' '), /payoff first/i);
});
