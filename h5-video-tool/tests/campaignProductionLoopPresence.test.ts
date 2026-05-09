import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), 'utf8');

test('CreateFlow keeps Campaign Studio handoff after router state is consumed', () => {
  const contextSource = source('src/context/CreateFlowContext.tsx');
  const studioSource = source('src/pages/Studio.tsx');

  assert.match(contextSource, /campaignStudioHandoff: CampaignStudioHandoffState \| null/);
  assert.match(contextSource, /setCampaignStudioHandoff/);
  assert.match(studioSource, /setCampaignStudioHandoff\(handoff\)/);
});

test('StepVideo syncs generated Campaign Studio videos back to linked distribution package', () => {
  const stepVideoSource = source('src/components/StepVideo.tsx');

  assert.match(stepVideoSource, /buildStudioGeneratedPackageUpdate/);
  assert.match(stepVideoSource, /buildStudioGeneratedOutputPlanUpdate/);
  assert.match(stepVideoSource, /updateCampaignDistributionPackage/);
  assert.match(stepVideoSource, /updateCampaignOutputPlan/);
  assert.match(stepVideoSource, /syncCampaignStudioPackage/);
  assert.match(stepVideoSource, /resultRouteForTask/);
});

test('Result page preserves Campaign package id for Distribution navigation', () => {
  const resultSource = source('src/pages/Result.tsx');

  assert.match(resultSource, /searchParams\.get\('package'\)/);
  assert.match(resultSource, /distributeRoute/);
  assert.equal(resultSource.includes('`/distribute?package=${encodeURIComponent(packageId)}`'), true);
});
