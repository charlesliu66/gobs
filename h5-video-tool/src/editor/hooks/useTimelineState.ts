import { useCallback, useMemo, useState } from 'react';
import type { AspectRatioPreset, MediaAsset, TimelineProject, VideoClip } from '../types/timeline';
import { computeDurationSec, emptyTimelineProject, normalizeTimelineProject } from '../types/timeline';

const ASPECT_STORAGE_KEY = 'h5-editor-aspect-ratio';

function loadStoredAspect(): AspectRatioPreset {
  try {
    const v = localStorage.getItem(ASPECT_STORAGE_KEY) as AspectRatioPreset | null;
    if (v === '9:16' || v === '16:9' || v === '1:1' || v === '4:3') return v;
  } catch {
    /* ignore */
  }
  return '9:16';
}

export function useTimelineState() {
  const [aspectRatio, setAspectRatioState] = useState<AspectRatioPreset>(loadStoredAspect);
  const [project, setProject] = useState<TimelineProject>(() =>
    normalizeTimelineProject(emptyTimelineProject(loadStoredAspect())),
  );
  const [assets, setAssets] = useState<Record<string, MediaAsset>>({});
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const setAspectRatio = useCallback((next: AspectRatioPreset) => {
    setAspectRatioState(next);
    try {
      localStorage.setItem(ASPECT_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    setProject((p) => ({ ...p, aspectRatio: next }));
  }, []);

  const durationSec = useMemo(() => {
    const d = computeDurationSec(project);
    return d > 0 ? d : project.durationSec;
  }, [project]);

  const activeVideoClip = useMemo(() => {
    const vTrack = project.tracks.find((t) => t.type === 'video');
    if (!vTrack || vTrack.clips.length === 0) return null;
    /** 含右端点：播放头停在片段结尾（或工程总时长）时仍显示该段画面，避免预览与轨道不一致 */
    const clips = [...vTrack.clips]
      .map((c) => c as VideoClip)
      .sort((a, b) => a.timelineStart - b.timelineStart);
    const eps = 1e-3;
    /** 多段同时满足时取时间轴更靠后的片段（衔接点优先显示后一段） */
    let best: VideoClip | null = null;
    for (const vc of clips) {
      const clipLen = vc.sourceEnd - vc.sourceStart;
      const end = vc.timelineStart + clipLen;
      if (currentTime + eps >= vc.timelineStart && currentTime <= end + eps) {
        best = vc;
      }
    }
    return best;
  }, [project.tracks, currentTime]);

  const activeVideoUrl = useMemo(() => {
    if (!activeVideoClip) return null;
    const a = assets[activeVideoClip.assetId];
    return a?.url ?? null;
  }, [activeVideoClip, assets]);

  const sourceTimeForPreview = useMemo(() => {
    if (!activeVideoClip) return 0;
    const raw = activeVideoClip.sourceStart + (currentTime - activeVideoClip.timelineStart);
    const { sourceStart, sourceEnd, assetId } = activeVideoClip;
    let upper = sourceEnd;
    const fileDur = assets[assetId]?.durationSec;
    if (fileDur != null && Number.isFinite(fileDur) && fileDur > 0.05) {
      upper = Math.min(upper, fileDur);
    }
    return Math.min(Math.max(raw, sourceStart), upper);
  }, [activeVideoClip, currentTime, assets]);

  const seek = useCallback((t: number) => {
    const max = Math.max(durationSec, 0.001);
    setCurrentTime(Math.max(0, Math.min(t, max)));
  }, [durationSec]);

  return {
    aspectRatio,
    setAspectRatio,
    project,
    setProject,
    assets,
    setAssets,
    currentTime,
    setCurrentTime,
    isPlaying,
    setIsPlaying,
    durationSec,
    activeVideoClip,
    activeVideoUrl,
    sourceTimeForPreview,
    seek,
  };
}
