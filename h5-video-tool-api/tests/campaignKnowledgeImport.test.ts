import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test('fastpublish core template import creates stable packs and is repeatable', async () => {
  const previousApiDataDir = process.env.API_DATA_DIR;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'qas-campaign-knowledge-import-'));
  process.env.API_DATA_DIR = tmp;

  try {
    const mod = await import('../src/services/campaignKnowledgeImport.ts');

    const first = await mod.importCampaignKnowledgeTemplate('market_admin', 'g1');
    const second = await mod.importCampaignKnowledgeTemplate('market_admin', 'g1');

    assert.equal(first.importedPackIds.length >= 6, true);
    assert.deepEqual(second.importedPackIds, first.importedPackIds);
    assert.equal(second.packs.length, first.packs.length);
    assert.equal(second.packs[0]?.gameId, 'g1');
  } finally {
    if (previousApiDataDir === undefined) {
      delete process.env.API_DATA_DIR;
    } else {
      process.env.API_DATA_DIR = previousApiDataDir;
    }
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('gold and glory canonical import creates source-backed packs for derivation', async () => {
  const previousApiDataDir = process.env.API_DATA_DIR;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'qas-gng-canonical-brain-'));
  process.env.API_DATA_DIR = tmp;

  try {
    const importMod = await import('../src/services/campaignKnowledgeImport.ts');
    const deriveMod = await import('../src/services/campaignKnowledgeDerivation.ts');

    const first = await importMod.importCampaignKnowledgeTemplate(
      'market_admin',
      'gold-and-glory',
      importMod.GOLD_AND_GLORY_CANONICAL_TEMPLATE_ID,
    );
    const second = await importMod.importCampaignKnowledgeTemplate(
      'market_admin',
      'gold-and-glory',
      importMod.GOLD_AND_GLORY_CANONICAL_TEMPLATE_ID,
    );

    assert.equal(first.importedPackIds.length, 8);
    assert.deepEqual(second.importedPackIds, first.importedPackIds);
    assert.equal(second.packs.length, 8);
    assert.equal(second.sources.length > 8, true);

    const marketPack = second.packs.find((pack) => pack.type === 'market_fundamentals');
    assert.ok(marketPack);
    assert.equal(marketPack.templateId, importMod.GOLD_AND_GLORY_CANONICAL_TEMPLATE_ID);
    assert.equal(marketPack.sourceIds.length >= 3, true);
    assert.match(marketPack.facts.join(' '), /Malaysia/);
    assert.match(marketPack.facts.join(' '), /TikTok/);
    assert.match(marketPack.facts.join(' '), /ShadowRavenz/);

    const marketSource = second.sources.find((source) => source.originalPath?.includes('market-fundamentals.md'));
    assert.ok(marketSource);
    assert.match(marketSource.checksum ?? '', /^gold-and-glory-canonical:sha256:[a-f0-9]{64}$/);
    assert.match(marketSource.content ?? '', /Malaysia social ecosystem/);

    const context = deriveMod.deriveCampaignKnowledgeContext(second.packs, second.importedPackIds);
    assert.match(context.marketTruth.join(' '), /Malaysia/);
    assert.match(context.marketTruth.join(' '), /Hari Raya/);
    assert.match(context.marketTruth.join(' '), /Sword in the Stone/);
    assert.match(context.audienceTension.join(' '), /18-30/);
    assert.match(context.audienceTension.join(' '), /gear depletion/);
    assert.match(context.audienceTension.join(' '), /PvP/);
    assert.match(context.toneRules.join(' '), /brave/i);
    assert.match(context.toneRules.join(' '), /mobile-first/i);
    assert.match(context.toneRules.join(' '), /Manglish/i);
    assert.match(context.forbiddenClaims.join(' '), /guaranteed/i);
    assert.match(context.forbiddenClaims.join(' '), /political/i);
    assert.match(context.forbiddenClaims.join(' '), /religious/i);
    assert.match(context.approvedAngles.join(' '), /conversion triggers/i);
    assert.match(context.approvedAngles.join(' '), /emotional trigger/i);
    assert.match(context.approvedAngles.join(' '), /differentiation/i);
    assert.equal(context.hookCandidates.length > 0, true);
    assert.equal(context.visualCues.length > 0, true);
  } finally {
    if (previousApiDataDir === undefined) {
      delete process.env.API_DATA_DIR;
    } else {
      process.env.API_DATA_DIR = previousApiDataDir;
    }
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('gold and glory canonical import does not attach to other game ids', async () => {
  const previousApiDataDir = process.env.API_DATA_DIR;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'qas-gng-canonical-brain-wrong-game-'));
  process.env.API_DATA_DIR = tmp;

  try {
    const mod = await import('../src/services/campaignKnowledgeImport.ts');

    await assert.rejects(
      mod.importCampaignKnowledgeTemplate('market_admin', 'project-nova-arena', mod.GOLD_AND_GLORY_CANONICAL_TEMPLATE_ID),
      /gold-and-glory/i,
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
