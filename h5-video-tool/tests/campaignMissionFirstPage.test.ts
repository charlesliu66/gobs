import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pageSource = readFileSync(resolve(__dirname, '../src/pages/CampaignCreative.tsx'), 'utf-8');

test('CampaignCreative default page uses mission-first components instead of pack selector', () => {
  assert.match(pageSource, /MissionComposer/);
  assert.match(pageSource, /GeneratedBriefReview/);
  assert.doesNotMatch(pageSource, /CampaignKnowledgeSelector/);
  assert.doesNotMatch(pageSource, /onTogglePack/);
  assert.doesNotMatch(pageSource, /usePlatformMemory/);
});
