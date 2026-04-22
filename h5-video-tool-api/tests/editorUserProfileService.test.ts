import test from 'node:test';
import assert from 'node:assert/strict';
import { updateEditorUserCommunicationProfile } from '../src/services/editorUserProfileService.ts';

test('explicit preference extraction identifies brief direct response style', () => {
  const profile = updateEditorUserCommunicationProfile(undefined, {
    username: 'market_admin',
    userMessage: '直接给我结果，不用讲太多原因',
  });

  assert.equal(profile.responseStyle?.value, 'brief_direct');
  assert.equal(profile.responseStyle?.source, 'explicit_user');
});

test('negative preference capture stores avoid-long-explanation signal', () => {
  const profile = updateEditorUserCommunicationProfile(undefined, {
    username: 'market_admin',
    userMessage: '不要再给我太长解释，也不要慢节奏开头',
  });

  assert.equal(profile.negativePreferences.length >= 1, true);
  assert.equal(profile.negativePreferences[0]?.key, 'avoid_long_explanations');
});

test('repeated behavior raises confidence for the same communication preference', () => {
  const first = updateEditorUserCommunicationProfile(undefined, {
    username: 'market_admin',
    userMessage: '直接给我结果',
  });
  const second = updateEditorUserCommunicationProfile(first, {
    username: 'market_admin',
    userMessage: '还是直接给我结果',
  });

  assert.equal(second.responseStyle?.value, 'brief_direct');
  assert.equal(second.responseStyle?.evidenceCount, 2);
  assert.ok((second.responseStyle?.confidence ?? 0) > (first.responseStyle?.confidence ?? 0));
});

test('recent contradiction lowers confidence and allows a new response style to replace the old one', () => {
  const first = updateEditorUserCommunicationProfile(undefined, {
    username: 'market_admin',
    userMessage: '直接给我结果',
  });
  const second = updateEditorUserCommunicationProfile(first, {
    username: 'market_admin',
    userMessage: '还是直接给我结果',
  });
  const contradicted = updateEditorUserCommunicationProfile(second, {
    username: 'market_admin',
    userMessage: '这次请详细解释一下原因',
  });

  assert.equal(contradicted.responseStyle?.value, 'detailed_explanatory');
  assert.ok((contradicted.responseStyle?.confidence ?? 1) < (second.responseStyle?.confidence ?? 0));
});
