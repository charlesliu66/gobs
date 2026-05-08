import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

test('AssetPicker supports campaign source asset selection props', () => {
  const source = readFileSync(resolve(__dirname, '../src/components/AssetPicker.tsx'), 'utf-8');

  assert.match(source, /initialQuery/);
  assert.match(source, /initialSelectedIds/);
  assert.match(source, /searchPlaceholder/);
  assert.match(source, /confirmLabel/);
  assert.match(source, /setQuery\(initialQuery\)/);
  assert.match(source, /new Set\(initialSelectedIds\)/);
});
