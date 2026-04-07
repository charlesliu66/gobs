import type { TimelineProject, VideoClip } from './types/timeline';

export function sortedVideoClips(project: TimelineProject): VideoClip[] {
  const vTrack = project.tracks.find((t) => t.type === 'video');
  if (!vTrack) return [];
  return [...vTrack.clips]
    .map((c) => c as VideoClip)
    .sort((a, b) => a.timelineStart - b.timelineStart);
}

/** 按时间顺序的下一段（用于连续预览） */
export function getNextVideoClipAfter(
  project: TimelineProject,
  current: VideoClip,
): VideoClip | null {
  const sorted = sortedVideoClips(project);
  const idx = sorted.findIndex((c) => c.id === current.id);
  if (idx < 0 || idx >= sorted.length - 1) return null;
  return sorted[idx + 1];
}
