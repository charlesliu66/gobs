import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveLocalizedVideoErrorMessage } from '../src/studio/videoErrorDisplay.ts';

test('resolveLocalizedVideoErrorMessage prefers Chinese display text in zh-CN locale', () => {
  const message = resolveLocalizedVideoErrorMessage('zh-CN', {
    displayMessageZh: '提示词可能涉及版权/IP限制，请改写后重试。',
    displayMessageEn: 'The prompt may hit copyright or IP restrictions. Rewrite it and try again.',
    failReason: 'provider raw message',
  });

  assert.equal(message, '提示词可能涉及版权/IP限制，请改写后重试。');
});

test('resolveLocalizedVideoErrorMessage prefers English display text in en locale', () => {
  const message = resolveLocalizedVideoErrorMessage('en', {
    displayMessageZh: '提示词可能涉及版权/IP限制，请改写后重试。',
    displayMessageEn: 'The prompt may hit copyright or IP restrictions. Rewrite it and try again.',
    failReason: 'provider raw message',
  });

  assert.equal(message, 'The prompt may hit copyright or IP restrictions. Rewrite it and try again.');
});

test('resolveLocalizedVideoErrorMessage falls back safely when only one localized field exists', () => {
  assert.equal(
    resolveLocalizedVideoErrorMessage('en', {
      displayMessageZh: '素材地址不可访问，请检查链接后重试。',
      failReason: 'provider raw message',
    }),
    '素材地址不可访问，请检查链接后重试。',
  );

  assert.equal(
    resolveLocalizedVideoErrorMessage('zh-CN', {
      displayMessageEn: 'The source asset URL is not reachable. Check the link and try again.',
      failReason: 'provider raw message',
    }),
    'The source asset URL is not reachable. Check the link and try again.',
  );
});

test('resolveLocalizedVideoErrorMessage falls back to failReason when no localized display text exists', () => {
  const message = resolveLocalizedVideoErrorMessage('zh-CN', {
    failReason: 'provider raw message',
  });

  assert.equal(message, 'provider raw message');
});
