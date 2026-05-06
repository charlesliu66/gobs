import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CampaignKnowledgePackCard } from '../src/components/campaign/CampaignKnowledgePackCard.tsx';
import { isStableKnowledgeGameId } from '../src/context/PlatformMemoryContext.tsx';

test('isStableKnowledgeGameId only enables persisted knowledge flow for seeded games', () => {
  assert.equal(isStableKnowledgeGameId('g1'), true);
  assert.equal(isStableKnowledgeGameId('g2'), true);
  assert.equal(isStableKnowledgeGameId('g999999'), false);
});

test('CampaignKnowledgePackCard renders structured knowledge pack content', () => {
  const html = renderToStaticMarkup(
    <CampaignKnowledgePackCard
      pack={{
        packId: 'ckp_tpl_brand_tone',
        gameId: 'g1',
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
