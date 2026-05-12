import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { LocaleProvider } from '../src/i18n/LocaleContext.tsx';
import {
  resolveStyleRefPickerPreviewUrl,
  StepInput,
} from '../src/studio/steps/StepInput.tsx';

test('StepInput renders asset-library entry for style reference parsing', () => {
  const html = renderToStaticMarkup(
    <LocaleProvider>
      <StepInput
        styleRefSummary=""
        onStyleRefSummaryChange={() => {}}
        aspectRatio="16:9"
        aspectOptions={['16:9']}
        onAspectRatioChange={() => {}}
        storyGenre=""
        onStoryGenreChange={() => {}}
        busyStyle={false}
        onStyleRefFileChange={() => {}}
        styleRefPreview={null}
        characterBible=""
        onCharacterBibleChange={() => {}}
        synopsis=""
        onSynopsisChange={() => {}}
        structureTemplate="three_act"
        templateOptions={[{ value: 'three_act', label: '三幕式' }]}
        onStructureTemplateChange={() => {}}
        busyL1={false}
        onGenerateStoryArc={() => {}}
      />
    </LocaleProvider>,
  );

  assert.match(html, /从素材库选择/);
});

test('style-ref picker preview uses protected asset file url', () => {
  const url = resolveStyleRefPickerPreviewUrl(
    { id: 'asset-123' },
    (assetId) => `/api/asset-library/assets/${assetId}/file?token=demo-token`,
  );

  assert.equal(url, '/api/asset-library/assets/asset-123/file?token=demo-token');
});
