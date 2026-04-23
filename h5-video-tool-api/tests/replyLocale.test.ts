import test from 'node:test';
import assert from 'node:assert/strict';

import { parseTranslatedEntriesResponse } from '../src/services/replyLocale.ts';

test('parseTranslatedEntriesResponse repairs fenced JSON with trailing commas', () => {
  const raw = [
    '```json',
    '{',
    '  "items": [',
    '    { "path": "shots.0.subject", "value": "A black knight rides through the ruins" },',
    '    { "path": "shots.0.action", "value": "He raises his sword toward the gate" },',
    '  ]',
    '}',
    '```',
  ].join('\n');

  const parsed = parseTranslatedEntriesResponse(raw);

  assert.equal(parsed.length, 2);
  assert.equal(parsed[0]?.path, 'shots.0.subject');
  assert.equal(parsed[1]?.value, 'He raises his sword toward the gate');
});

test('parseTranslatedEntriesResponse ignores wrapper prose around JSON', () => {
  const raw = [
    'Here is the translated payload:',
    '{',
    '  "items": [',
    '    { "path": "productionDesign.props.0.notes", "value": "Weathered bronze engravings" }',
    '  ]',
    '}',
    'Use these directly.',
  ].join('\n');

  const parsed = parseTranslatedEntriesResponse(raw);

  assert.deepEqual(parsed, [
    { path: 'productionDesign.props.0.notes', value: 'Weathered bronze engravings' },
  ]);
});
