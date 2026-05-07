import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pageSource = readFileSync(resolve(__dirname, '../src/pages/CampaignCreative.tsx'), 'utf-8');

test('CampaignCreative still preserves the advanced editor handoff', () => {
  assert.match(pageSource, /campaign_creative_editor_handoff/);
  assert.match(pageSource, /navigate\('\/editor', \{ state: \{ fromCampaignCreative: true \} \}\)/);
});
