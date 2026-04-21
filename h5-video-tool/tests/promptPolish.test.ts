import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPromptRequestHeaders } from '../src/api/promptPolish.ts';

test('buildPromptRequestHeaders includes JSON content type and bearer token when provided', () => {
  assert.deepEqual(buildPromptRequestHeaders('demo-token'), {
    'Content-Type': 'application/json',
    Authorization: 'Bearer demo-token',
  });
});

test('buildPromptRequestHeaders omits bearer token when none is available', () => {
  assert.deepEqual(buildPromptRequestHeaders(null), {
    'Content-Type': 'application/json',
  });
});
