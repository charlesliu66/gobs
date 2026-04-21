import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildGenerateCaptionRequestBody,
  buildPromptRequestHeaders,
} from '../src/api/promptPolish.ts';

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

test('buildGenerateCaptionRequestBody includes video and account context for caption quality generation', () => {
  assert.deepEqual(
    buildGenerateCaptionRequestBody('samurai battle', ['tiktok'], {
      existingCaption: 'draft',
      existingHashtags: '#samurai',
      language: 'EN',
      videoPath: 'output/admin/demo.mp4',
      videoUrl: '/api/video/file?path=output/admin/demo.mp4',
      accountContext: [
        { id: '1', platform: 'tiktok', region: 'TH', username: 'web TH tt' },
      ],
    }),
    {
      prompt: 'samurai battle',
      platforms: ['tiktok'],
      existingCaption: 'draft',
      existingHashtags: '#samurai',
      language: 'EN',
      videoPath: 'output/admin/demo.mp4',
      videoUrl: '/api/video/file?path=output/admin/demo.mp4',
      accountContext: [
        { id: '1', platform: 'tiktok', region: 'TH', username: 'web TH tt' },
      ],
    },
  );
});
