import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

test('UnifiedAssetSelector wraps AssetPicker and local upload with template-aware slots', () => {
  const source = readFileSync(resolve(__dirname, '../src/components/UnifiedAssetSelector.tsx'), 'utf-8');

  assert.match(source, /data-component="UnifiedAssetSelector"/);
  assert.match(source, /data-slot-id=\{slot\.id\}/);
  assert.match(source, /AssetPicker/);
  assert.match(source, /filterType=\{activeSlot\.mediaType\}/);
  assert.match(source, /selectedSources/);
  assert.match(source, /onSelectLocalFile/);
  assert.match(source, /data-source-action="upload-local"/);
  assert.match(source, /onSelectAsset\(activeSlot, assets\[0\] \?\? null\)/);
});

test('TabGenerate wires the unified selector and quality presets into Studio creation', () => {
  const source = readFileSync(resolve(__dirname, '../src/pages/TabGenerate.tsx'), 'utf-8');

  assert.match(source, /getUnifiedAssetSlots/);
  assert.match(source, /studioQualityPresets/);
  assert.match(source, /unifiedAssetSelector/);
  assert.match(source, /handleUnifiedAssetSelect/);
  assert.match(source, /handleUnifiedLocalFileSelect/);
  assert.match(source, /quick-primary-reference/);
  assert.match(source, /viral-motion/);
  assert.match(source, /showcase-character/);
  assert.match(source, /studio-slot-\$\{slot\.id\}/);
  assert.doesNotMatch(source, /setAssetPickerOpen/);
});
