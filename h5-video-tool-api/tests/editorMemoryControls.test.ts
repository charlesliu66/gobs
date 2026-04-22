import test from 'node:test';
import assert from 'node:assert/strict';
import {
  rememberProjectFeedback,
  removeProjectMemoryItem,
  weakenUserProfileDimension,
} from '../src/services/editorMemoryControls.ts';
import {
  normalizeEditorProjectMemory,
  normalizeEditorUserCommunicationProfile,
} from '../src/types/editorAgentMemory.ts';

test('rememberProjectFeedback stores manual remembered preference text as project preference signal', () => {
  const memory = rememberProjectFeedback(undefined, {
    mode: 'remember',
    text: '开头更像 TikTok 原生自拍口播一点',
  });

  assert.equal(memory.preferenceSignals.length, 1);
  assert.match(memory.preferenceSignals[0]?.key ?? '', /^manual_preference_/);
  assert.equal(memory.preferenceSignals[0]?.value, '开头更像 TikTok 原生自拍口播一点');
});

test('removeProjectMemoryItem removes a remembered project signal by id', () => {
  const base = normalizeEditorProjectMemory({
    preferenceSignals: [
      { id: 'pref_1', key: 'pace', value: 'fast' },
      { id: 'pref_2', key: 'subtitle_style', value: 'big_bold' },
    ],
  });

  const next = removeProjectMemoryItem(base, {
    bucket: 'preferenceSignals',
    id: 'pref_1',
  });

  assert.deepEqual(next.preferenceSignals.map((item) => item.id), ['pref_2']);
});

test('weakenUserProfileDimension lowers confidence for a communication dimension', () => {
  const profile = normalizeEditorUserCommunicationProfile(
    {
      username: 'market_admin',
      responseStyle: {
        value: 'brief_direct',
        source: 'explicit_user',
        confidence: 0.82,
        evidenceCount: 4,
        lastConfirmedAt: '2026-04-22T00:00:00.000Z',
      },
    },
    'market_admin',
  );

  const weakened = weakenUserProfileDimension(profile, 'responseStyle');

  assert.equal(weakened.responseStyle?.value, 'brief_direct');
  assert.ok((weakened.responseStyle?.confidence ?? 1) < 0.82);
  assert.ok((weakened.responseStyle?.confidence ?? 0) <= 0.57);
});
