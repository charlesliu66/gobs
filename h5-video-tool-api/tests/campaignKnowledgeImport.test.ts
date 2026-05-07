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
