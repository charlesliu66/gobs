import test from 'node:test';
import assert from 'node:assert/strict';
import {
  campaignKnowledgeDeriveContextPath,
  campaignKnowledgeImportTemplatePath,
  campaignKnowledgePacksPath,
  campaignKnowledgeSourcesPath,
} from '../src/api/campaignKnowledge.ts';

test('campaign knowledge API helpers build the expected endpoint paths', () => {
  assert.equal(campaignKnowledgePacksPath('g1'), '/api/campaign-knowledge/games/g1/packs');
  assert.equal(campaignKnowledgeImportTemplatePath('g1'), '/api/campaign-knowledge/games/g1/import-template');
  assert.equal(campaignKnowledgeSourcesPath('g1'), '/api/campaign-knowledge/games/g1/sources');
  assert.equal(campaignKnowledgeDeriveContextPath('g1'), '/api/campaign-knowledge/games/g1/derive-context');
});

test('campaign knowledge API helpers encode game ids safely', () => {
  assert.equal(campaignKnowledgePacksPath('SEA launch'), '/api/campaign-knowledge/games/SEA%20launch/packs');
  assert.equal(campaignKnowledgeImportTemplatePath('TH/ID'), '/api/campaign-knowledge/games/TH%2FID/import-template');
});
