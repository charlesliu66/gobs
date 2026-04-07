/**
 * 与前端 `h5-video-tool/src/editor/types/timeline.ts` 字段保持一致。
 */

export type AspectRatioPreset = '9:16' | '16:9' | '1:1' | '4:3';

export interface Resolution {
  width: number;
  height: number;
}

const PRESET_TO_SIZE: Record<AspectRatioPreset, Resolution> = {
  '9:16': { width: 1080, height: 1920 },
  '16:9': { width: 1920, height: 1080 },
  '1:1': { width: 1080, height: 1080 },
  '4:3': { width: 1440, height: 1080 },
};

export function resolutionForPreset(preset: AspectRatioPreset): Resolution {
  return { ...PRESET_TO_SIZE[preset] };
}

export type TrackType = 'video' | 'audio';

export interface MediaAsset {
  id: string;
  url: string;
  kind: 'video' | 'audio' | 'image';
  durationSec?: number;
  tags?: string[];
  meta?: Record<string, unknown>;
}

export type ClipTransition = 'cut' | 'crossfade';

export interface VideoClip {
  id: string;
  assetId: string;
  sourceStart: number;
  sourceEnd: number;
  timelineStart: number;
  shotIndex?: number;
  note?: string;
  transitionAfter?: ClipTransition;
}

export interface AudioClip {
  id: string;
  assetId: string;
  sourceStart: number;
  sourceEnd: number;
  timelineStart: number;
  gainDb?: number;
}

export interface Track {
  id: string;
  type: TrackType;
  label: string;
  clips: (VideoClip | AudioClip)[];
}

export interface TimelineMix {
  sourceAudio: number;
  bgm: number;
}

export interface SubtitleCue {
  id: string;
  startSec: number;
  endSec: number;
  text: string;
}

export interface TimelineProject {
  id: string;
  fps: number;
  durationSec: number;
  aspectRatio: AspectRatioPreset;
  tracks: Track[];
  mix?: TimelineMix;
  subtitles?: SubtitleCue[];
}

export interface AgentRevision {
  id: string;
  parentRevisionId?: string;
  summary: string;
  createdAt: string;
}

/** 导出任务请求体（与 POST /api/editor/export 对齐） */
export interface EditorExportRequestBody {
  project: TimelineProject;
  /** 可选：覆盖工程内画幅 */
  aspectRatio?: AspectRatioPreset;
}
