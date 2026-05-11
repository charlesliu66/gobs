import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pageSource = readFileSync(resolve(__dirname, '../src/pages/CampaignCreative.tsx'), 'utf-8');
const workbenchSource = readFileSync(resolve(__dirname, '../src/components/campaign/CampaignOutputWorkbench.tsx'), 'utf-8');
const bannerCardSource = readFileSync(resolve(__dirname, '../src/components/campaign/BannerOutputCard.tsx'), 'utf-8');
const qualityPanelSource = readFileSync(resolve(__dirname, '../src/components/campaign/CreativeQualityPanel.tsx'), 'utf-8');
const feedbackActionsSource = readFileSync(resolve(__dirname, '../src/components/campaign/feedback/creativeFeedbackActions.ts'), 'utf-8');

test('CampaignCreative integrates CampaignOutputWorkbench after brief confirmation', () => {
  assert.match(pageSource, /CampaignOutputWorkbench/);
  assert.match(pageSource, /campaignOutputPlanDraft/);
  assert.match(pageSource, /buildCampaignOutputPlan/);
  assert.match(pageSource, /buildAvailableSourceAssetsFromLibraryAssets/);
  assert.match(pageSource, /applySourceAssetSelectionOverrides/);
  assert.match(pageSource, /produceSupportedCampaignOutputs/);
  assert.match(pageSource, /createCampaignOutputPlan/);
  assert.match(pageSource, /buildCampaignDistributionCreateInputFromProductionItem/);
  assert.match(pageSource, /handleMarkBannerQuality/);
  assert.match(pageSource, /handleCreateNextVersion/);
  assert.match(pageSource, /appendNextVersionDraftToPlan/);
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

test('CampaignCreative wires source asset readiness through Asset Library and output plan patching', () => {
  assert.match(pageSource, /listAssets\(\{ pageSize: '100' \}\)/);
  assert.match(pageSource, /availableSourceAssets/);
  assert.match(pageSource, /sourceAssetSelections/);
  assert.match(pageSource, /updateSourceAssetRequirementMatches/);
  assert.match(pageSource, /recordUsage\(assetId, `campaign-source-asset:\$\{requirement\.assetType\}`\)/);
  assert.match(pageSource, /<AssetPicker/);
  assert.match(pageSource, /onChooseSourceAsset=\{setAssetPickerRequirement\}/);
  assert.match(pageSource, /sourceAssetFilterType\(assetPickerRequirement\.assetType\)/);
});

test('CampaignOutputWorkbench includes the Banner card and three-state quality controls', () => {
  assert.match(workbenchSource, /BannerOutputCard/);
  assert.match(workbenchSource, /onMarkBannerQuality/);
  assert.match(bannerCardSource, /bannerPromptPlaceholder/);
  assert.match(bannerCardSource, /qualityUsable/);
  assert.match(bannerCardSource, /qualityNeedsFix/);
  assert.match(bannerCardSource, /qualityUnusable/);
  assert.match(bannerCardSource, /usable/);
  assert.match(bannerCardSource, /needs_fix/);
  assert.match(bannerCardSource, /unusable/);
});

test('CampaignOutputWorkbench includes quality review panel and next-version feedback loop', () => {
  assert.match(workbenchSource, /CreativeQualityPanel/);
  assert.match(workbenchSource, /onCreateNextVersion/);
  assert.match(feedbackActionsSource, /human marks, selected feedback tags, and static rules only/);
  assert.match(qualityPanelSource, /CreateNextVersion/);
  assert.match(qualityPanelSource, /nextVersionUnsupported/);
  assert.match(feedbackActionsSource, /parentOutputId/);
  assert.match(feedbackActionsSource, /feedbackTagIds/);
  assert.match(feedbackActionsSource, /briefId/);
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
