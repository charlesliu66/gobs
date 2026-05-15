import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildArkSeedanceCreatePayload,
  canRemoteCancelArkTask,
  normalizeArkSeedanceTask,
} from '../src/services/arkSeedanceVideo.ts';

test('buildArkSeedanceCreatePayload maps image-to-video requests to first-frame Ark content', () => {
  const payload = buildArkSeedanceCreatePayload({
    providerModel: 'Doubao-Seedance-2.0',
    submitParams: {
      storyboardText: 'A bright product reveal',
      aspectRatio: '16:9',
      duration: 8,
      model: 'dreamina-image2video',
      imageBase64: 'ZmFrZSBiYXNlNjQ=',
      imageMimeType: 'image/png',
    },
  });

  assert.equal(payload.model, 'Doubao-Seedance-2.0');
  assert.equal(payload.ratio, '16:9');
  assert.equal(payload.duration, 8);
  assert.equal(payload.watermark, true);
  assert.deepEqual(payload.content, [
    {
      type: 'text',
      text: 'A bright product reveal',
    },
    {
      type: 'image_url',
      image_url: {
        url: 'data:image/png;base64,ZmFrZSBiYXNlNjQ=',
      },
      role: 'first_frame',
    },
  ]);
});

test('buildArkSeedanceCreatePayload maps multimodal reference images and audio generation flags', () => {
  const payload = buildArkSeedanceCreatePayload({
    providerModel: 'Doubao-Seedance-2.0-fast',
    submitParams: {
      storyboardText: 'Use reference style and motion rhythm',
      aspectRatio: '9:16',
      duration: 11,
      model: 'dreamina-multimodal',
      multimodalImages: [
        { base64: 'aW1hZ2Ux', mimeType: 'image/jpeg' },
        { base64: 'aW1hZ2Uy', mimeType: 'image/webp' },
      ],
    },
  });

  assert.equal(payload.model, 'Doubao-Seedance-2.0-fast');
  assert.equal(payload.generate_audio, true);
  assert.deepEqual(payload.content, [
    { type: 'text', text: 'Use reference style and motion rhythm' },
    {
      type: 'image_url',
      image_url: { url: 'data:image/jpeg;base64,aW1hZ2Ux' },
      role: 'reference_image',
    },
    {
      type: 'image_url',
      image_url: { url: 'data:image/webp;base64,aW1hZ2Uy' },
      role: 'reference_image',
    },
  ]);
});

test('buildArkSeedanceCreatePayload clamps Seedance duration into 4 to 15 seconds', () => {
  const tooShort = buildArkSeedanceCreatePayload({
    providerModel: 'Doubao-Seedance-2.0',
    submitParams: {
      storyboardText: 'Short duration',
      aspectRatio: '16:9',
      duration: 2,
      model: 'dreamina-text2video',
    },
  });
  const tooLong = buildArkSeedanceCreatePayload({
    providerModel: 'Doubao-Seedance-2.0',
    submitParams: {
      storyboardText: 'Long duration',
      aspectRatio: '16:9',
      duration: 60,
      model: 'dreamina-text2video',
    },
  });

  assert.equal(tooShort.duration, 4);
  assert.equal(tooLong.duration, 15);
});

test('normalizeArkSeedanceTask converts succeeded tasks into compatibility payloads', () => {
  const normalized = normalizeArkSeedanceTask({
    id: 'task_success_1',
    status: 'succeeded',
    content: {
      video_url: 'https://example.com/video.mp4',
      last_frame_url: 'https://example.com/last-frame.png',
    },
    error: null,
  });

  assert.equal(normalized.submitId, 'task_success_1');
  assert.equal(normalized.phase, 'success');
  assert.equal(normalized.videoUrl, 'https://example.com/video.mp4');
  assert.equal(normalized.providerStatus, 'succeeded');
});

test('normalizeArkSeedanceTask classifies copyright and policy failures into bilingual display messages', () => {
  const normalized = normalizeArkSeedanceTask({
    id: 'task_failed_1',
    status: 'failed',
    error: {
      code: 'ContentPolicyViolation',
      message: 'Prompt may contain copyrighted lyrics or protected brand references.',
    },
  });

  assert.equal(normalized.phase, 'failed');
  assert.equal(normalized.errorCode, 'ARK_COPYRIGHT_RISK');
  assert.match(normalized.displayMessageZh ?? '', /版权|品牌|受保护/);
  assert.match(normalized.displayMessageEn ?? '', /copyright|brand|protected/i);
  assert.match(normalized.providerMessage ?? '', /copyrighted lyrics/i);
});

test('canRemoteCancelArkTask only allows queued provider tasks to be deleted remotely', () => {
  assert.equal(canRemoteCancelArkTask('queued'), true);
  assert.equal(canRemoteCancelArkTask('running'), false);
  assert.equal(canRemoteCancelArkTask('succeeded'), false);
});
