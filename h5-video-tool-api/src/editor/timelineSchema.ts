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

export type TrackType = 'video' | 'audio' | 'text';

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
  /** 播放速度，1 = 正常，0.25–4 */
  speed?: number;
  /** 原声音量 0–200，100 = 原始 */
  volume?: number;
}

export interface AudioClip {
  id: string;
  assetId: string;
  sourceStart: number;
  sourceEnd: number;
  timelineStart: number;
  gainDb?: number;
}

export type TextPresetId =
  | 'intro-minimal' | 'intro-impact'
  | 'outro-follow' | 'outro-brand'
  | 'sub-bottom' | 'sub-top' | 'sub-highlight'
  | 'title-card';

export interface TextClip {
  id: string;
  timelineStart: number;
  timelineEnd: number;
  text: string;
  presetId: TextPresetId;
  subtext?: string;
}

export interface Track {
  id: string;
  type: TrackType;
  label: string;
  clips: (VideoClip | AudioClip | TextClip)[];
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

/** 导出任务请求体 */
export interface EditorExportRequestBody {
  project: TimelineProject;
  aspectRatio?: AspectRatioPreset;
  resolution?: '720p' | '1080p' | '4K';
  format?: 'mp4' | 'mov';
  quality?: 'fast' | 'balanced' | 'high';
}
