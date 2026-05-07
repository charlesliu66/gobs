import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CampaignKnowledgePackCard } from '../src/components/campaign/CampaignKnowledgePackCard.tsx';
import { CampaignKnowledgeSelector } from '../src/components/campaign/CampaignKnowledgeSelector.tsx';
import { isStableKnowledgeGameId } from '../src/context/PlatformMemoryContext.tsx';

test('isStableKnowledgeGameId only enables persisted knowledge flow for seeded games', () => {
  assert.equal(isStableKnowledgeGameId('gold-and-glory'), true);
  assert.equal(isStableKnowledgeGameId('g1'), false);
  assert.equal(isStableKnowledgeGameId('g2'), false);
  assert.equal(isStableKnowledgeGameId('g999999'), false);
});

test('CampaignKnowledgeSelector renders a Gold and Glory brain shell without current game framing', () => {
  const html = renderToStaticMarkup(
    <CampaignKnowledgeSelector
      brainName="Gold and Glory"
      supported
      loading={false}
      error={null}
      selectedCountLabel="0 selected"
      packs={[]}
      selectedPackIds={[]}
      copy={{
        title: 'Knowledge Brain',
        subtitle: 'Bring Gold and Glory knowledge into this campaign strategy.',
        unsupportedTitle: 'Brain unavailable',
        unsupportedBody: 'Brain unavailable body',
        emptyTitle: 'No knowledge packs are available yet',
        emptyBody: 'Load Gold and Glory fastpublish material into the brain.',
        selectAll: 'Select All',
        clearSelection: 'Clear Selection',
        refresh: 'Refresh',
        packFacts: 'Facts',
        packHooks: 'Hooks',
        packVisuals: 'Visuals',
        selected: 'Selected',
        optional: 'Optional',
      }}
      onTogglePack={() => {}}
      onSelectAll={() => {}}
      onClearSelection={() => {}}
      onRefresh={() => {}}
    />,
  );

  assert.match(html, /Gold and Glory/);
  assert.doesNotMatch(html, /Current Game/);
});

test('CampaignKnowledgePackCard renders structured knowledge pack content', () => {
  const html = renderToStaticMarkup(
    <CampaignKnowledgePackCard
      pack={{
        packId: 'ckp_tpl_brand_tone',
        gameId: 'gold-and-glory',
        type: 'brand_tone',
        title: 'Brand Tone',
        status: 'ready',
        summary: 'Use a native short-form voice.',
        facts: ['Lead with player payoff.'],
        preferences: ['Keep the first frame decisive.'],
        avoid: ['Avoid vague slogans.'],
        hookSeeds: ['Open with payoff first.'],
        visualCues: ['Readable contrast'],
        sourceIds: ['cks_tpl_brand_tone'],
        updatedAt: '2026-05-06T00:00:00.000Z',
      }}
    />,
  );

  assert.match(html, /Brand Tone/);
  assert.match(html, /Use a native short-form voice/);
  assert.match(html, /Hook Seeds/);
  assert.match(html, /ready/);
});
