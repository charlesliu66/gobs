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
  assert.match(source, /onInsertToken/);
  assert.match(source, /onSaveLocalToLibrary/);
  assert.match(source, /librarySaveStatuses/);
  assert.match(source, /data-source-status=\{status\}/);
  assert.match(source, /data-source-action="upload-local"/);
  assert.match(source, /data-source-action="insert-token"/);
  assert.match(source, /data-source-action="save-to-library"/);
  assert.match(source, /status\?: 'ready' \| 'reading' \| 'error'/);
  assert.match(source, /UnifiedAssetLibrarySaveState/);
  assert.match(source, /token\?: string/);
  assert.match(source, /error\?: string/);
  assert.match(source, /Reading file\.\.\.|正在读取文件/);
  assert.match(source, /onSelectAsset\(activeSlot, assets\[0\] \?\? null\)/);
});

test('TabGenerate wires the unified selector, local upload status, and prompt references into Studio creation', () => {
  const source = readFileSync(resolve(__dirname, '../src/pages/TabGenerate.tsx'), 'utf-8');

  assert.match(source, /getUnifiedAssetSlots/);
  assert.match(source, /unifiedAssetSelector/);
  assert.match(source, /handleUnifiedAssetSelect/);
  assert.match(source, /handleUnifiedLocalFileSelect/);
  assert.match(source, /handleSaveLocalSourceToLibrary/);
  assert.match(source, /importAssets\(\[file\]\)/);
  assert.match(source, /waitForAssetImportDone/);
  assert.match(source, /promptReferencePreview/);
  assert.match(source, /handleInsertPromptToken/);
  assert.match(source, /referenceAssets: promptReferenceAssets/);
  assert.match(source, /buildStudioPromptFallback/);
  assert.match(source, /isWeakPolishedPrompt/);
  assert.match(source, /polishNotice/);
  assert.match(source, /data-action="one-click-prompt"/);
  assert.match(source, /status: 'reading'/);
  assert.match(source, /status: 'ready'/);
  assert.match(source, /data-section="viralReferenceVideoUrl"/);
  assert.match(source, /data-field="viral-reference-video-url"/);
  assert.match(source, /handleViralDanceReferenceUrlChange/);
  assert.match(source, /setVideoModel\('kling-v3-omni'\)/);
  assert.match(source, /quick-primary-reference/);
  assert.match(source, /viral-motion/);
  assert.match(source, /showcase-character/);
  assert.match(source, /studio-slot-\$\{slot\.id\}/);
  assert.doesNotMatch(source, /data-section="studioQualityPresets"/);
  assert.doesNotMatch(source, /localizedPromptStyles/);
  assert.doesNotMatch(source, /setAssetPickerOpen/);
});
