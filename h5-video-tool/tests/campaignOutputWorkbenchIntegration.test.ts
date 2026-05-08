import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pageSource = readFileSync(resolve(__dirname, '../src/pages/CampaignCreative.tsx'), 'utf-8');

test('CampaignCreative integrates CampaignOutputWorkbench after brief confirmation', () => {
  assert.match(pageSource, /CampaignOutputWorkbench/);
  assert.match(pageSource, /campaignOutputPlanDraft/);
  assert.match(pageSource, /buildCampaignOutputPlan/);
  assert.match(pageSource, /createCampaignOutputPlan/);
});

test('CampaignCreative keeps system plan and strategy controls secondary', () => {
  assert.match(pageSource, /advancedStrategyDetails/);
  assert.match(pageSource, /<details[^>]+data-section="advancedStrategyDetails"/);
  assert.match(pageSource, /CampaignPlanCard/);
  assert.match(pageSource, /CampaignStrategyCard/);
  assert.match(pageSource, /CampaignStrategyTuningPanel/);
});

test('CampaignCreative default path does not reintroduce old selector surfaces', () => {
  assert.doesNotMatch(pageSource, /CampaignKnowledgeSelector/);
  assert.doesNotMatch(pageSource, /CampaignKnowledgePackCard/);
  assert.doesNotMatch(pageSource, /CampaignBriefForm/);
});
