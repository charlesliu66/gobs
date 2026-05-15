import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SEEDANCE_DURATION_OPTIONS,
  SEEDANCE_REFERENCE_LIMITS,
  getSeedanceAcceptString,
  inferSeedanceMediaKind,
  isSeedanceReferenceFileSupported,
  validateSeedanceReferenceSet,
} from '../src/config/seedanceSourceConstraints.ts';

test('Seedance duration and media limits match the shared Advanced Studio contract', () => {
  assert.deepEqual(SEEDANCE_DURATION_OPTIONS, [4, 5, 8, 10, 15]);
  assert.deepEqual(SEEDANCE_REFERENCE_LIMITS, {
    image: 9,
    video: 3,
    audio: 3,
    total: 12,
  });
});

test('Seedance accepts only supported image, video, and audio source formats', () => {
  assert.equal(isSeedanceReferenceFileSupported({ name: 'hero.JPG', type: 'image/jpeg' }, 'image'), true);
  assert.equal(isSeedanceReferenceFileSupported({ name: 'scene.webp', type: 'image/webp' }, 'image'), true);
  assert.equal(isSeedanceReferenceFileSupported({ name: 'motion.mov', type: 'video/quicktime' }, 'video'), true);
  assert.equal(isSeedanceReferenceFileSupported({ name: 'voice.mp3', type: 'audio/mpeg' }, 'audio'), true);

  assert.equal(isSeedanceReferenceFileSupported({ name: 'anim.gif', type: 'image/gif' }, 'image'), false);
  assert.equal(isSeedanceReferenceFileSupported({ name: 'motion.avi', type: 'video/x-msvideo' }, 'video'), false);
  assert.equal(isSeedanceReferenceFileSupported({ name: 'voice.aac', type: 'audio/aac' }, 'audio'), false);
});

test('Seedance media kind inference handles extensions and mime types', () => {
  assert.equal(inferSeedanceMediaKind({ name: 'role.png', type: '' }), 'image');
  assert.equal(inferSeedanceMediaKind({ name: 'clip', type: 'video/mp4' }), 'video');
  assert.equal(inferSeedanceMediaKind({ name: 'music.wav', type: '' }), 'audio');
  assert.equal(inferSeedanceMediaKind({ name: 'archive.zip', type: 'application/zip' }), null);
});

test('Seedance accept strings are slot-specific', () => {
  assert.equal(getSeedanceAcceptString('image'), '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp');
  assert.equal(getSeedanceAcceptString('video'), '.mp4,.mov,video/mp4,video/quicktime');
  assert.equal(getSeedanceAcceptString('audio'), '.mp3,.wav,audio/mpeg,audio/mp3,audio/wav,audio/x-wav');
});

test('Seedance reference validation blocks excess counts and audio-only generation', () => {
  assert.equal(validateSeedanceReferenceSet([{ kind: 'audio' }]).canGenerate, false);
  assert.equal(validateSeedanceReferenceSet([{ kind: 'audio' }]).reason, 'audio-only');

  assert.equal(validateSeedanceReferenceSet(Array.from({ length: 9 }, () => ({ kind: 'image' }))).ok, true);
  assert.equal(validateSeedanceReferenceSet(Array.from({ length: 10 }, () => ({ kind: 'image' }))).reason, 'too-many-images');

  assert.equal(validateSeedanceReferenceSet(Array.from({ length: 3 }, () => ({ kind: 'video' }))).ok, true);
  assert.equal(validateSeedanceReferenceSet(Array.from({ length: 4 }, () => ({ kind: 'video' }))).reason, 'too-many-videos');

  const twelveRefs = [
    ...Array.from({ length: 9 }, () => ({ kind: 'image' as const })),
    ...Array.from({ length: 3 }, () => ({ kind: 'video' as const })),
  ];
  assert.equal(validateSeedanceReferenceSet(twelveRefs).ok, true);
  assert.equal(validateSeedanceReferenceSet([...twelveRefs, { kind: 'audio' }]).reason, 'too-many-total');
});
