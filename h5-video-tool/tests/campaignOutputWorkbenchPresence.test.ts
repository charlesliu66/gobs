import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  campaignOutputPlanPath,
  campaignOutputPlansPath,
} from '../src/api/campaignOutputPlan.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

test('campaign output plan API helpers build output plan endpoints', () => {
  assert.equal(campaignOutputPlansPath(), '/api/campaign-output/plans');
  assert.equal(campaignOutputPlanPath('plan_123'), '/api/campaign-output/plans/plan_123');
});

test('CampaignOutputWorkbench exposes output, source asset, gap, and production confirmation sections', () => {
  const source = readFileSync(
    resolve(__dirname, '../src/components/campaign/CampaignOutputWorkbench.tsx'),
    'utf-8',
  );

  assert.match(source, /outputSummary/);
  assert.match(source, /productionList/);
  assert.match(source, /sourceAssetReadiness/);
  assert.match(source, /capabilityGaps/);
  assert.match(source, /confirmProduction/);
});

test('campaign output workbench i18n exists in Chinese and English locale blocks', () => {
  const messages = readFileSync(resolve(__dirname, '../src/i18n/messages.ts'), 'utf-8');

  assert.match(messages, /outputWorkbench:\s*{/);
  assert.match(messages, /产出清单/);
  assert.match(messages, /Output Workbench/);
  assert.match(messages, /Source Asset Readiness/);
});
