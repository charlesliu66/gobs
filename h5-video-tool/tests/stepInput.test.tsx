import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { StepInput } from '../src/studio/steps/StepInput.tsx';

test('StepInput renders asset-library entry for style reference parsing', () => {
  const html = renderToStaticMarkup(
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
    />,
  );

  assert.match(html, /从素材库选择/);
});
