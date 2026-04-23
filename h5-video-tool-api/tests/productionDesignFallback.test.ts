import test from 'node:test';
import assert from 'node:assert/strict';

import { parseProductionDesignResponse } from '../src/services/productionDesignFallback.ts';

test('parseProductionDesignResponse repairs fenced JSON with trailing commas', () => {
  const raw = [
    'Here is the production design JSON:',
    '```json',
    '{',
    '  "wardrobe": [',
    '    { "character": "The Black Knight", "item": "Heavy black armor", "notes": "battle worn" },',
    '  ],',
    '  "props": [',
    '    { "name": "longsword", "sceneRef": "loc-castle", "notes": "scarred blade" },',
    '  ],',
    '  "sets": [',
    '    { "sceneId": "loc-castle", "description": "ruined fortress", "palette": "cold steel" },',
    '  ],',
    '  "lighting": [',
    '    { "sceneId": "loc-castle", "key": "moonlight", "fill": "torch bounce", "mood": "ominous" },',
    '  ],',
    '  "colorGrading": "desaturated blue-gray",',
    '  "soundMusic": {',
    '    "sfx": [{ "moment": "gate opens", "idea": "metal groan" }],',
    '    "music": [{ "segment": "arrival", "mood": "grim", "bpm": 76 }],',
    '  }',
    '}',
    '```',
  ].join('\n');

  const parsed = parseProductionDesignResponse(raw);

  assert.equal(parsed.wardrobe[0]?.character, 'The Black Knight');
  assert.equal(parsed.props[0]?.name, 'longsword');
  assert.equal(parsed.sets[0]?.sceneId, 'loc-castle');
  assert.equal(parsed.lighting[0]?.mood, 'ominous');
  assert.equal(parsed.colorGrading, 'desaturated blue-gray');
  assert.equal(parsed.soundMusic.music[0]?.bpm, 76);
});

test('parseProductionDesignResponse fills missing arrays with safe defaults', () => {
  const parsed = parseProductionDesignResponse('{"colorGrading":"high contrast","soundMusic":{"sfx":[],"music":[]}}');

  assert.deepEqual(parsed.wardrobe, []);
  assert.deepEqual(parsed.props, []);
  assert.deepEqual(parsed.sets, []);
  assert.deepEqual(parsed.lighting, []);
  assert.equal(parsed.colorGrading, 'high contrast');
});
