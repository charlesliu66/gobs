import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const routeSource = readFileSync(resolve(__dirname, '../src/pages/CampaignCreative.tsx'), 'utf-8');
const pageSource = readFileSync(resolve(__dirname, '../src/pages/campaignCreative/CampaignCreativePage.tsx'), 'utf-8');
const hookSource = readFileSync(resolve(__dirname, '../src/pages/campaignCreative/useCampaignCreativeState.ts'), 'utf-8');
const outputStepSource = readFileSync(resolve(__dirname, '../src/pages/campaignCreative/CampaignCreativeOutputStep.tsx'), 'utf-8');
const strategyStepSource = readFileSync(resolve(__dirname, '../src/pages/campaignCreative/CampaignCreativeStrategyStep.tsx'), 'utf-8');
const workbenchSource = readFileSync(resolve(__dirname, '../src/components/campaign/CampaignOutputWorkbench.tsx'), 'utf-8');
const bannerCardSource = readFileSync(resolve(__dirname, '../src/components/campaign/BannerOutputCard.tsx'), 'utf-8');
const qualityPanelSource = readFileSync(resolve(__dirname, '../src/components/campaign/CreativeQualityPanel.tsx'), 'utf-8');
const feedbackActionsSource = readFileSync(resolve(__dirname, '../src/components/campaign/feedback/creativeFeedbackActions.ts'), 'utf-8');

test('CampaignCreative integrates CampaignOutputWorkbench after brief confirmation', () => {
  assert.match(routeSource, /CampaignCreativePage as CampaignCreative/);
  assert.match(pageSource, /CampaignCreativeOutputStep/);
  assert.match(outputStepSource, /CampaignOutputWorkbench/);
  assert.match(hookSource, /campaignOutputPlanDraft/);
  assert.match(hookSource, /buildCampaignOutputPlan/);
  assert.match(hookSource, /buildAvailableSourceAssetsFromLibraryAssets/);
  assert.match(hookSource, /applySourceAssetSelectionOverrides/);
  assert.match(hookSource, /produceSupportedCampaignOutputs/);
  assert.match(hookSource, /createCampaignOutputPlan/);
  assert.match(hookSource, /buildCampaignDistributionCreateInputFromProductionItem/);
  assert.match(hookSource, /handleMarkBannerQuality/);
  assert.match(hookSource, /handleCreateNextVersion/);
  assert.match(hookSource, /appendNextVersionDraftToPlan/);
  assert.match(outputStepSource, /trueCoverage: t\('campaignCreative\.outputWorkbench\.trueCoverage'\)/);
  assert.match(outputStepSource, /assistiveCoverage: t\('campaignCreative\.outputWorkbench\.assistiveCoverage'\)/);
  assert.match(outputStepSource, /directCoverage: t\('campaignCreative\.outputWorkbench\.directCoverage'\)/);
  assert.match(outputStepSource, /readinessStatus: t\('campaignCreative\.outputWorkbench\.readinessStatus'\)/);
  assert.match(outputStepSource, /unsupportedReasonDetail: t\('campaignCreative\.outputWorkbench\.unsupportedReasonDetail'\)/);
});

test('CampaignCreative confirms production from the draft plan on the first primary action', () => {
  assert.match(hookSource, /const planToProduce = createdOutputPlan \?\? campaignOutputPlanDraft/);
  assert.match(hookSource, /plan: planToProduce/);
  assert.match(hookSource, /if \(createdOutputPlan\) \{/);
  assert.match(hookSource, /updateCampaignOutputPlan\(createdOutputPlan\.id/);
  assert.match(hookSource, /createCampaignOutputPlan\(producedPlan\)/);
});

test('CampaignCreative does not wire a separate save-only output plan action', () => {
  assert.doesNotMatch(hookSource, /handleCreateOutputPlan/);
  assert.doesNotMatch(outputStepSource, /onCreatePlan=\{/);
});

test('CampaignCreative wires source asset readiness through Asset Library and output plan patching', () => {
  assert.match(hookSource, /listAssets\(\{ pageSize: '100' \}\)/);
  assert.match(hookSource, /availableSourceAssets/);
  assert.match(hookSource, /sourceAssetSelections/);
  assert.match(hookSource, /updateSourceAssetRequirementMatches/);
  assert.match(hookSource, /recordUsage\(assetId, `campaign-source-asset:\$\{requirement\.assetType\}`\)/);
  assert.match(pageSource, /<AssetPicker/);
  assert.match(pageSource, /onChooseSourceAsset: setAssetPickerRequirement/);
  assert.match(pageSource, /sourceAssetFilterType\(assetPickerRequirement\.assetType\)/);
});

test('CampaignOutputWorkbench includes the Banner card and three-state quality controls', () => {
  assert.match(workbenchSource, /summarizeCampaignOutputCoverage/);
  assert.match(workbenchSource, /buildProductionItemCoverageMap/);
  assert.match(workbenchSource, /ReadinessBadge/);
  assert.match(workbenchSource, /CoverageBreakdownRow/);
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
  assert.match(strategyStepSource, /advancedStrategyDetails/);
  assert.match(strategyStepSource, /<details[^>]+data-section="advancedStrategyDetails"/);
  assert.match(outputStepSource, /CampaignPlanCard/);
  assert.match(strategyStepSource, /CampaignStrategyCard/);
  assert.match(strategyStepSource, /CampaignStrategyTuningPanel/);
});

test('CampaignCreative default path does not reintroduce old selector surfaces', () => {
  assert.doesNotMatch(pageSource, /CampaignKnowledgeSelector/);
  assert.doesNotMatch(pageSource, /CampaignKnowledgePackCard/);
  assert.doesNotMatch(pageSource, /CampaignBriefForm/);
  assert.doesNotMatch(strategyStepSource, /CampaignKnowledgeSelector/);
  assert.doesNotMatch(outputStepSource, /CampaignKnowledgePackCard/);
});
