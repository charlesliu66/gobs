import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getShortDramaPresets,
  getTemplates,
} from '../src/config/prompt-templates/index.ts';

test('prompt template registry exposes only Studio Phase 1 templates', () => {
  const templates = getTemplates();

  assert.deepEqual(templates.map((template) => template.id), ['viral-dance', 'boss-showcase']);
  assert.equal(templates.find((template) => template.id === 'viral-dance')?.name, 'Motion Transfer');
  assert.equal(templates.find((template) => template.id === 'boss-showcase')?.name, 'Character Showcase');
});

test('legacy short-drama preset registry returns an empty list', () => {
  assert.deepEqual(getShortDramaPresets(), []);
});
