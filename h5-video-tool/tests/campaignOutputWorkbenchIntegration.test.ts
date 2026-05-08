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
  assert.match(pageSource, /produceSupportedCampaignOutputs/);
  assert.match(pageSource, /createCampaignOutputPlan/);
  assert.match(pageSource, /buildCampaignDistributionCreateInputFromProductionItem/);
});

test('CampaignCreative confirms production from the draft plan on the first primary action', () => {
  assert.match(pageSource, /const planToProduce = createdOutputPlan \?\? campaignOutputPlanDraft/);
  assert.match(pageSource, /plan: planToProduce/);
  assert.match(pageSource, /if \(createdOutputPlan\) \{/);
  assert.match(pageSource, /updateCampaignOutputPlan\(createdOutputPlan\.id/);
  assert.match(pageSource, /createCampaignOutputPlan\(producedPlan\)/);
});

test('CampaignCreative does not wire a separate save-only output plan action', () => {
  assert.doesNotMatch(pageSource, /handleCreateOutputPlan/);
  assert.doesNotMatch(pageSource, /onCreatePlan=\{/);
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
