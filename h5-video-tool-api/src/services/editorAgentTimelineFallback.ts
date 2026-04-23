import type { AudioClip, TimelineProject, Track, VideoClip } from '../editor/timelineSchema.js';
import type { CandidateWindow } from './editorHighlightCandidates.js';

export interface CandidateWindowFallbackTracks {
  videoClips: VideoClip[];
  audioClips: AudioClip[];
  durationSec: number;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function buildFallbackTracksFromCandidateWindows(
  candidateWindows: CandidateWindow[],
  targetTimelineSec: number,
): CandidateWindowFallbackTracks | null {
  if (candidateWindows.length === 0) return null;

  const byAsset = new Map<string, CandidateWindow[]>();
  for (const window of candidateWindows) {
    if (!byAsset.has(window.assetId)) byAsset.set(window.assetId, []);
    byAsset.get(window.assetId)!.push(window);
  }

  const assetIds = Array.from(byAsset.keys());
  if (assetIds.length === 0) return null;

  const iterators = assetIds.map(() => 0);
  const fallbackVideoClips: VideoClip[] = [];
  let timelineStart = 0;
  let guard = 0;

  while (timelineStart < targetTimelineSec && guard++ < 60) {
    let picked: CandidateWindow | null = null;

    for (let offset = 0; offset < assetIds.length; offset += 1) {
      const assetIndex = (guard - 1 + offset) % assetIds.length;
      const assetId = assetIds[assetIndex]!;
      const windows = byAsset.get(assetId)!;
      if (iterators[assetIndex]! >= windows.length) continue;
      picked = windows[iterators[assetIndex]!]!;
      iterators[assetIndex]! += 1;
      break;
    }

    if (!picked) break;

    const rawDuration = picked.sourceEnd - picked.sourceStart;
    const wantedDuration = Math.min(rawDuration, 3.2, targetTimelineSec - timelineStart);
    if (wantedDuration < 0.4) break;

    const clipIndex = fallbackVideoClips.length;
    fallbackVideoClips.push({
      id: `fb_v_${picked.assetId.slice(-8)}_${clipIndex}`,
      assetId: picked.assetId,
      sourceStart: round2(picked.sourceStart),
      sourceEnd: round2(picked.sourceStart + wantedDuration),
      timelineStart: round2(timelineStart),
    } as VideoClip);
    timelineStart += wantedDuration;
  }

  if (fallbackVideoClips.length === 0) return null;

  const durationSec = round2(timelineStart);
  const fallbackAudioClips: AudioClip[] = fallbackVideoClips.map((clip, index) => ({
    id: `fb_a_${clip.assetId.slice(-8)}_${index}`,
    assetId: clip.assetId,
    sourceStart: clip.sourceStart,
    sourceEnd: clip.sourceEnd,
    timelineStart: clip.timelineStart,
    gainDb: 0,
  }));

  return {
    videoClips: fallbackVideoClips,
    audioClips: fallbackAudioClips,
    durationSec,
  };
}

export function applyFallbackTracksToProject(
  project: TimelineProject,
  fallback: CandidateWindowFallbackTracks,
): TimelineProject {
  const tracks = project.tracks.map((track) => {
    if (track.type === 'video' && track.id === 'v1') {
      return { ...track, clips: fallback.videoClips } as Track;
    }
    if (track.type === 'audio' && track.id === 'a1') {
      return { ...track, clips: fallback.audioClips } as Track;
    }
    return track;
  });

  return {
    ...project,
    tracks,
    durationSec: fallback.durationSec,
  };
}
