import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isStudioSeedanceReferenceReady,
  resolveStudioGenerationModel,
} from '../src/utils/studioGenerationReadiness.ts';

test('custom single-video generation can proceed without references by falling back to text-to-video', () => {
  assert.equal(
    isStudioSeedanceReferenceReady({
      templateId: 'custom',
      videoModel: 'dreamina-multimodal',
      referenceCount: 0,
      visualReferenceCount: 0,
      validationCanGenerate: false,
    }),
    true,
  );
  assert.equal(resolveStudioGenerationModel('custom', 'dreamina-multimodal', 0), 'dreamina-text2video');
});

test('reference-driven modes still require a visual Seedance reference', () => {
  assert.equal(
    isStudioSeedanceReferenceReady({
      templateId: 'viral-dance',
      videoModel: 'dreamina-multimodal',
      referenceCount: 0,
      visualReferenceCount: 0,
      validationCanGenerate: false,
    }),
    false,
  );
  assert.equal(
    isStudioSeedanceReferenceReady({
      templateId: 'boss-showcase',
      videoModel: 'dreamina-multimodal',
      referenceCount: 1,
      visualReferenceCount: 1,
      validationCanGenerate: true,
    }),
    true,
  );
  assert.equal(resolveStudioGenerationModel('viral-dance', 'dreamina-multimodal', 0), 'dreamina-multimodal');
});

test('custom single-video generation does not ignore audio-only references', () => {
  assert.equal(
    isStudioSeedanceReferenceReady({
      templateId: 'custom',
      videoModel: 'dreamina-multimodal',
      referenceCount: 1,
      visualReferenceCount: 0,
      validationCanGenerate: false,
    }),
    false,
  );
});
