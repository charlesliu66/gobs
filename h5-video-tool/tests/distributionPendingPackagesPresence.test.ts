import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pageSource = readFileSync(resolve(__dirname, '../src/pages/TabDistribute.tsx'), 'utf-8');

test('TabDistribute wires pending distribution package intake through query and panel adapter', () => {
  assert.match(pageSource, /PendingDistributionPackages/);
  assert.match(pageSource, /buildDistributeDraftFromPackage/);
  assert.match(pageSource, /new URLSearchParams\(location\.search\)\.get\('package'\)/);
});
