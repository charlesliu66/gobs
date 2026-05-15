import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

test('motion transfer URL references are submitted through Kling with uploaded image refs', () => {
  const source = readFileSync(resolve(__dirname, '../src/components/StepVideo.tsx'), 'utf-8');

  assert.match(source, /buildKlingReferenceImages/);
  assert.match(source, /referenceImages: buildKlingReferenceImages\(\)/);
  assert.match(source, /referenceVideoUrl: refUrl/);
  assert.match(source, /referenceVideoReferType: 'feature'/);
  assert.match(source, /referenceVideoKeepSound: 'no'/);
  assert.match(source, /referenceVideoUrl: viralDanceReferenceVideoUrl\.trim\(\)/);
});
