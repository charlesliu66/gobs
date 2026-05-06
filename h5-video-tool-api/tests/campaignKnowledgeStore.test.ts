import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test('campaign knowledge store persists packs and sources through the resolver-managed root', async () => {
  const previousApiDataDir = process.env.API_DATA_DIR;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'qas-campaign-knowledge-'));
  process.env.API_DATA_DIR = tmp;

  try {
    const store = await import('../src/services/campaignKnowledgeStore.ts');

    const source = await store.saveCampaignKnowledgeSource('market_admin', 'g1', {
      sourceId: 'cks_tpl_brand_tone',
      gameId: 'g1',
      sourceType: 'fastpublish-template',
      title: 'Brand Tone Template',
      content: 'Lead with player payoff.',
      packType: 'brand_tone',
    });

    await store.upsertCampaignKnowledgePack('market_admin', 'g1', {
      packId: 'ckp_tpl_brand_tone',
      gameId: 'g1',
      type: 'brand_tone',
      title: 'Brand Tone',
      status: 'ready',
      summary: 'Tone summary',
      facts: ['Short-form native framing'],
      preferences: ['Lead with concrete value'],
      avoid: ['Avoid vague slogans'],
      hookSeeds: ['Open with payoff'],
      visualCues: ['Readable contrast'],
      sourceIds: [source.sourceId],
    });

    const packs = await store.listCampaignKnowledgePacks('market_admin', 'g1');
    const sources = await store.listCampaignKnowledgeSources('market_admin', 'g1');

    assert.equal(packs.length, 1);
    assert.equal(packs[0]?.packId, 'ckp_tpl_brand_tone');
    assert.equal(sources.length, 1);
    assert.equal(sources[0]?.sourceId, 'cks_tpl_brand_tone');
    assert.equal(
      fs.existsSync(path.join(tmp, '.data', 'campaign-knowledge', 'market_admin', 'g1', 'manifest.json')),
      true,
    );
  } finally {
    if (previousApiDataDir === undefined) {
      delete process.env.API_DATA_DIR;
    } else {
      process.env.API_DATA_DIR = previousApiDataDir;
    }
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('campaign knowledge store rejects unsafe ids before writing to disk', async () => {
  const previousApiDataDir = process.env.API_DATA_DIR;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'qas-campaign-knowledge-safe-'));
  process.env.API_DATA_DIR = tmp;

  try {
    const store = await import('../src/services/campaignKnowledgeStore.ts');

    await assert.rejects(
      () =>
        store.listCampaignKnowledgePacks('market_admin', '../escape'),
      /Invalid gameId/,
    );

    assert.equal(store.isSafeKnowledgeId('g1'), true);
    assert.equal(store.isSafeKnowledgeId('../escape'), false);
  } finally {
    if (previousApiDataDir === undefined) {
      delete process.env.API_DATA_DIR;
    } else {
      process.env.API_DATA_DIR = previousApiDataDir;
    }
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('upserting the same template pack id stays deterministic instead of duplicating manifest entries', async () => {
  const previousApiDataDir = process.env.API_DATA_DIR;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'qas-campaign-knowledge-deterministic-'));
  process.env.API_DATA_DIR = tmp;

  try {
    const store = await import('../src/services/campaignKnowledgeStore.ts');

    await store.upsertCampaignKnowledgePack('market_admin', 'g1', {
      packId: 'ckp_tpl_market_fundamentals',
      gameId: 'g1',
      type: 'market_fundamentals',
      title: 'Market Fundamentals',
      status: 'ready',
      summary: 'first',
      facts: ['fact one'],
      preferences: [],
      avoid: [],
      hookSeeds: [],
      visualCues: [],
      sourceIds: [],
    });

    await store.upsertCampaignKnowledgePack('market_admin', 'g1', {
      packId: 'ckp_tpl_market_fundamentals',
      gameId: 'g1',
      type: 'market_fundamentals',
      title: 'Market Fundamentals',
      status: 'ready',
      summary: 'second',
      facts: ['fact two'],
      preferences: [],
      avoid: [],
      hookSeeds: [],
      visualCues: [],
      sourceIds: [],
    });

    const packs = await store.listCampaignKnowledgePacks('market_admin', 'g1');
    assert.equal(packs.length, 1);
    assert.equal(packs[0]?.summary, 'second');
    assert.deepEqual(packs[0]?.facts, ['fact two']);
  } finally {
    if (previousApiDataDir === undefined) {
      delete process.env.API_DATA_DIR;
    } else {
      process.env.API_DATA_DIR = previousApiDataDir;
    }
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
