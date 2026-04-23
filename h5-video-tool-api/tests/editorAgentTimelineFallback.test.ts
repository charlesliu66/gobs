import test from 'node:test';
import assert from 'node:assert/strict';
import type { TimelineProject } from '../src/editor/timelineSchema.ts';
import { sanitizeAgentProject } from '../src/services/editorAgentService.ts';
import {
  applyFallbackTracksToProject,
  buildFallbackTracksFromCandidateWindows,
} from '../src/services/editorAgentTimelineFallback.ts';

function buildProject(videoAssetId = 'missing_asset'): TimelineProject {
  return {
    id: 'proj_1',
    fps: 30,
    durationSec: 12,
    aspectRatio: '9:16',
    tracks: [
      {
        id: 'v1',
        type: 'video',
        label: 'Video',
        clips: [
          {
            id: 'clip_1',
            assetId: videoAssetId,
            sourceStart: 0,
            sourceEnd: 4,
            timelineStart: 0,
          },
        ],
      },
      {
        id: 'a1',
        type: 'audio',
        label: 'Source Audio',
        clips: [],
      },
      {
        id: 't1',
        type: 'text',
        label: 'Text',
        clips: [],
      },
    ],
  };
}

test('buildFallbackTracksFromCandidateWindows rotates across assets and fills a bounded duration', () => {
  const fallback = buildFallbackTracksFromCandidateWindows(
    [
      { id: 'w1', assetId: 'asset_alpha', sourceStart: 0, sourceEnd: 4 },
      { id: 'w2', assetId: 'asset_beta', sourceStart: 5, sourceEnd: 9 },
      { id: 'w3', assetId: 'asset_alpha', sourceStart: 10, sourceEnd: 14 },
    ],
    7,
  );

  assert.ok(fallback);
  assert.equal(fallback.videoClips.length, 3);
  assert.equal(fallback.videoClips[0]?.assetId, 'asset_alpha');
  assert.equal(fallback.videoClips[1]?.assetId, 'asset_beta');
  assert.equal(fallback.videoClips[2]?.assetId, 'asset_alpha');
  assert.ok(fallback.durationSec <= 7.01);
  assert.equal(fallback.audioClips.length, fallback.videoClips.length);
});

test('fallback rebuild recovers a project after sanitize removes invalid clip asset ids', () => {
  const allowed = new Set(['asset_alpha', 'asset_beta']);
  const durationMap = new Map<string, number>([
    ['asset_alpha', 20],
    ['asset_beta', 20],
  ]);
  const candidateWindows = [
    { id: 'w1', assetId: 'asset_alpha', sourceStart: 0, sourceEnd: 4 },
    { id: 'w2', assetId: 'asset_beta', sourceStart: 4, sourceEnd: 8 },
  ];

  const sanitizedEmpty = sanitizeAgentProject(buildProject(), allowed, durationMap, candidateWindows);
  const emptyVideoTrack = sanitizedEmpty.tracks.find((track) => track.id === 'v1' && track.type === 'video');
  assert.equal(emptyVideoTrack?.clips.length, 0);

  const fallback = buildFallbackTracksFromCandidateWindows(candidateWindows, 6);
  assert.ok(fallback);

  const recovered = sanitizeAgentProject(
    applyFallbackTracksToProject(buildProject(), fallback!),
    allowed,
    durationMap,
    candidateWindows,
  );

  const videoTrack = recovered.tracks.find((track) => track.id === 'v1' && track.type === 'video');
  const audioTrack = recovered.tracks.find((track) => track.id === 'a1' && track.type === 'audio');
  assert.ok(videoTrack);
  assert.ok(audioTrack);
  assert.ok((videoTrack?.clips.length ?? 0) > 0);
  assert.equal(audioTrack?.clips.length, videoTrack?.clips.length);
  for (const clip of videoTrack?.clips ?? []) {
    assert.ok(allowed.has((clip as { assetId: string }).assetId));
  }
});
