import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pageSource = readFileSync(resolve(__dirname, '../src/pages/CampaignCreative.tsx'), 'utf-8');

test('CampaignCreative adds a distribution package panel without bringing back the pack selector', () => {
  assert.match(pageSource, /DistributionPackagePanel/);
  assert.doesNotMatch(pageSource, /CampaignKnowledgeSelector/);
});
