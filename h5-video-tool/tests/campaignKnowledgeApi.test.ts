import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_CAMPAIGN_KNOWLEDGE_TEMPLATE_ID,
  GOLD_AND_GLORY_CANONICAL_TEMPLATE_ID,
  campaignKnowledgeCitationFeedbackPath,
  campaignKnowledgeDeriveContextPath,
  campaignKnowledgeImportTemplatePath,
  campaignKnowledgePacksPath,
  campaignKnowledgeSourcesPath,
} from '../src/api/campaignKnowledge.ts';

test('campaign knowledge API helpers build the expected endpoint paths', () => {
  assert.equal(campaignKnowledgePacksPath('g1'), '/api/campaign-knowledge/games/g1/packs');
  assert.equal(campaignKnowledgeImportTemplatePath('g1'), '/api/campaign-knowledge/games/g1/import-template');
  assert.equal(campaignKnowledgeSourcesPath('g1'), '/api/campaign-knowledge/games/g1/sources');
  assert.equal(campaignKnowledgeCitationFeedbackPath('g1'), '/api/campaign-knowledge/games/g1/citation-feedback');
  assert.equal(campaignKnowledgeDeriveContextPath('g1'), '/api/campaign-knowledge/games/g1/derive-context');
});

test('campaign knowledge API helpers encode game ids safely', () => {
  assert.equal(campaignKnowledgePacksPath('SEA launch'), '/api/campaign-knowledge/games/SEA%20launch/packs');
  assert.equal(campaignKnowledgeImportTemplatePath('TH/ID'), '/api/campaign-knowledge/games/TH%2FID/import-template');
  assert.equal(campaignKnowledgeCitationFeedbackPath('TH/ID'), '/api/campaign-knowledge/games/TH%2FID/citation-feedback');
});

test('campaign knowledge API defaults to the Gold and Glory canonical brain template', () => {
  assert.equal(GOLD_AND_GLORY_CANONICAL_TEMPLATE_ID, 'gold-and-glory-canonical');
  assert.equal(DEFAULT_CAMPAIGN_KNOWLEDGE_TEMPLATE_ID, GOLD_AND_GLORY_CANONICAL_TEMPLATE_ID);
});
