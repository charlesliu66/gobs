import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const routeSource = readFileSync(resolve(__dirname, '../src/pages/CampaignCreative.tsx'), 'utf-8');
const pageSource = readFileSync(resolve(__dirname, '../src/pages/campaignCreative/CampaignCreativePage.tsx'), 'utf-8');
const briefStepSource = readFileSync(resolve(__dirname, '../src/pages/campaignCreative/CampaignCreativeBriefStep.tsx'), 'utf-8');

test('CampaignCreative default page uses mission-first components instead of pack selector', () => {
  assert.match(routeSource, /CampaignCreativePage as CampaignCreative/);
  assert.match(pageSource, /CampaignCreativeBriefStep/);
  assert.match(briefStepSource, /MissionComposer/);
  assert.match(briefStepSource, /GeneratedBriefReview/);
  assert.doesNotMatch(pageSource, /CampaignKnowledgeSelector/);
  assert.doesNotMatch(briefStepSource, /CampaignKnowledgeSelector/);
  assert.doesNotMatch(briefStepSource, /onTogglePack/);
  assert.doesNotMatch(briefStepSource, /usePlatformMemory/);
});
