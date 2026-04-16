/**
 * 剪辑时间轴 — 与后端 `h5-video-tool-api/src/editor/timelineSchema.ts` 保持字段一致。
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
  /** 源媒体时长（秒），未知时可省略 */
  durationSec?: number;
  tags?: string[];
  meta?: Record<string, unknown>;
}

/** 与下一段之间的转场；末段可忽略。导出 FFmpeg 时可消费 */
export type ClipTransition = 'cut' | 'crossfade';

export interface VideoClip {
  id: string;
  assetId: string;
  /** 源内入点（秒） */
  sourceStart: number;
  /** 源内出点（秒） */
  sourceEnd: number;
  /** 时间轴上的起点（秒） */
  timelineStart: number;
  /** 可选：分镜/初稿镜号，便于对照原规划 */
  shotIndex?: number;
  /** 可选：片段说明（Agent 或用户备注） */
  note?: string;
  /** 与下一段之间转场，默认硬切 */
  transitionAfter?: ClipTransition;
  /** 播放速度倍率，默认 1.0；0.25–4.0 */
  speed?: number;
  /** 原声音量，0–200（百分比），默认 100 */
  volume?: number;
  /** 结构化元数据（分镜景别/运镜/主体/动作等，从高级制片导入时填充） */
  meta?: Record<string, unknown>;
}

export interface AudioClip {
  id: string;
  assetId: string;
  sourceStart: number;
  sourceEnd: number;
  timelineStart: number;
  gainDb?: number;
}

/** 文字/字幕/片头片尾 版式样式 ID */
export type TextPresetId =
  | 'intro-minimal'       // 片头-极简
  | 'intro-impact'        // 片头-冲击
  | 'outro-follow'        // 片尾-关注引导
  | 'outro-brand'         // 片尾-品牌落版
  | 'sub-bottom'          // 字幕-底部对话
  | 'sub-top'             // 字幕-顶部提示
  | 'sub-highlight'       // 字幕-动态高亮
  | 'title-card';         // 标题卡-章节分割

export interface TextClip {
  id: string;
  /** 时间轴上的起点（秒） */
  timelineStart: number;
  /** 时间轴上的终点（秒） */
  timelineEnd: number;
  /** 文案内容 */
  text: string;
  /** 版式预设 ID */
  presetId: TextPresetId;
  /** 可选副标题（片头/片尾用） */
  subtext?: string;
}

export interface Track {
  id: string;
  type: TrackType;
  label: string;
  clips: (VideoClip | AudioClip | TextClip)[];
}

/** 预览/导出混音：0–1 */
export interface TimelineMix {
  /** 视频内嵌原声音量 */
  sourceAudio: number;
  /** BGM 总音量 */
  bgm: number;
  /** BGM 淡出时长（秒），默认 2；0 = 无淡出 */
  bgmFadeOut?: number;
  /** BGM 淡入时长（秒），默认 1；0 = 无淡入 */
  bgmFadeIn?: number;
  /** 来自高级制片 SoundMusicPlan 的配乐风格提示，供 BgmMixPanel 预填 */
  bgmPromptHint?: string;
}

/** 成片字幕（时间轴秒，与导出时间线一致） */
export interface SubtitleCue {
  id: string;
  startSec: number;
  endSec: number;
  text: string;
}

export interface TimelineProject {
  id: string;
  fps: number;
  /** 工程总时长（秒），可由 clip 推算 */
  durationSec: number;
  aspectRatio: AspectRatioPreset;
  tracks: Track[];
  /** 双轨音量；缺省时在 normalizeTimelineProject 中补默认 */
  mix?: TimelineMix;
  /** 全局字幕轨 */
  subtitles?: SubtitleCue[];
  /** 来源制片项目 ID（从高级制片导入时自动填充，用于双向链接） */
  sourceProductionProjectId?: string;
  /** 来源制片项目标题 */
  sourceProductionTitle?: string;
}

export interface AgentRevision {
  id: string;
  parentRevisionId?: string;
  summary: string;
  createdAt: string;
}

export function emptyTimelineProject(aspectRatio: AspectRatioPreset): TimelineProject {
  return {
    id: `proj_${Date.now()}`,
    fps: 30,
    durationSec: 0,
    aspectRatio,
    mix: { sourceAudio: 1, bgm: 0.85 },
    tracks: [
      { id: 'v1', type: 'video', label: '视频', clips: [] },
      { id: 'a1', type: 'audio', label: '原声', clips: [] },
      { id: 'a2', type: 'audio', label: 'BGM', clips: [] },
      { id: 't1', type: 'text', label: '文字', clips: [] },
    ],
  };
}

const DEFAULT_MIX: TimelineMix = { sourceAudio: 1, bgm: 0.85 };

/** 补齐 v1/a1/a2 与 mix，兼容旧工程 */
export function normalizeTimelineProject(project: TimelineProject): TimelineProject {
  const want = [
    { id: 'v1', type: 'video' as const, label: '视频' },
    { id: 'a1', type: 'audio' as const, label: '原声' },
    { id: 'a2', type: 'audio' as const, label: 'BGM' },
    { id: 't1', type: 'text' as const, label: '文字' },
  ];
  const byId = new Map(project.tracks.map((t) => [t.id, t]));
  const tracks = want.map((w) => {
    const old = byId.get(w.id);
    if (old) {
      return { ...old, type: w.type, label: w.label };
    }
    return { id: w.id, type: w.type, label: w.label, clips: [] };
  });
  const mix = project.mix
    ? {
        sourceAudio: clamp01(project.mix.sourceAudio ?? 1),
        bgm: clamp01(project.mix.bgm ?? DEFAULT_MIX.bgm),
      }
    : DEFAULT_MIX;
  return { ...project, tracks, mix };
}

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 1;
  return Math.min(1, Math.max(0, x));
}

/** Lyria 单段时长（与后端一致，用于铺轨） */
export const BGM_CLIP_DURATION_SEC = 32.8;

/**
 * 在 BGM 轨放置/替换一段配乐（从时间 0 对齐；长度取工程时长与 BGM 文件长较小者）
 */
export function getActiveAudioClipAtTime(
  project: TimelineProject,
  trackId: string,
  t: number,
): AudioClip | null {
  const tr = project.tracks.find((x) => x.id === trackId);
  if (!tr || tr.type !== 'audio') return null;
  for (const c of tr.clips) {
    const ac = c as AudioClip;
    const end = ac.timelineStart + (ac.sourceEnd - ac.sourceStart);
    if (t + 1e-4 >= ac.timelineStart && t < end - 1e-4) return ac;
  }
  return null;
}

export function setBgmClipOnProject(
  project: TimelineProject,
  assetId: string,
  bgmFileDurationSec: number,
): TimelineProject {
  const p = normalizeTimelineProject(project);
  const projDur = computeDurationSec(p);
  const srcLen =
    projDur > 0.05
      ? Math.min(Math.max(bgmFileDurationSec, 0.5), projDur)
      : Math.max(bgmFileDurationSec, 0.5);
  const clip: AudioClip = {
    id: `bgm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    assetId,
    sourceStart: 0,
    sourceEnd: srcLen,
    timelineStart: 0,
    gainDb: 0,
  };
  const tracks = p.tracks.map((t) => {
    if (t.id !== 'a2') return t;
    return { ...t, clips: [clip] };
  });
  const next: TimelineProject = { ...p, tracks };
  return { ...next, durationSec: computeDurationSec(next) };
}

export function computeDurationSec(project: TimelineProject): number {
  let max = 0;
  for (const track of project.tracks) {
    for (const c of track.clips) {
      const end = 'timelineEnd' in c
        ? c.timelineEnd
        : c.timelineStart + (c.sourceEnd - c.sourceStart);
      if (end > max) max = end;
    }
  }
  return max;
}

/** 与 computeDurationSec 一致，写回工程，避免 Agent 返回的 durationSec 与 clip 不一致 */
export function withSyncedDuration(project: TimelineProject): TimelineProject {
  const d = computeDurationSec(project);
  return { ...project, durationSec: d };
}

/** 时间轴秒值取整，减轻浮点误差导致的「微缝隙」黑场 */
function roundTimelineSec(x: number): number {
  return Math.round(x * 100000) / 100000;
}

/**
 * 将 V1 上每段视频在原声轨 A1 上镜像为同 assetId、同入出点与 timeline 的音频片段，便于轨上展示与导出对齐。
 * 音频 id 为 `src_<videoClipId>`，与视频一一对应。
 */
export function syncSourceAudioClipsFromVideo(project: TimelineProject): TimelineProject {
  const p = normalizeTimelineProject(project);
  const vTrack = p.tracks.find((t) => t.id === 'v1');
  if (!vTrack || vTrack.type !== 'video') return p;
  const videoClips = [...(vTrack.clips as VideoClip[])].sort((a, b) => a.timelineStart - b.timelineStart);
  const audioClips: AudioClip[] = videoClips.map((vc) => ({
    id: `src_${vc.id}`,
    assetId: vc.assetId,
    sourceStart: vc.sourceStart,
    sourceEnd: vc.sourceEnd,
    timelineStart: vc.timelineStart,
    gainDb: 0,
  }));
  const tracks = p.tracks.map((t) => (t.id === 'a1' ? { ...t, clips: audioClips } : t));
  const next: TimelineProject = { ...p, tracks };
  return { ...next, durationSec: computeDurationSec(next) };
}

/**
 * 将每条视频轨上的多段 clip 按当前左右顺序首尾紧密相接（消除片段间空隙导致的预览黑场）。
 * 不改变每段的源入出点，只重算 timelineStart；并同步 A1 原声镜像。
 */
export function snapVideoClipsSequential(project: TimelineProject): TimelineProject {
  const p = normalizeTimelineProject(project);
  const tracks = p.tracks.map((t) => {
    if (t.type !== 'video') return t;
    const clips = [...(t.clips as VideoClip[])].sort((a, b) => a.timelineStart - b.timelineStart);
    let cursor = 0;
    const nextClips = clips.map((c) => {
      const speed = c.speed && c.speed > 0 ? c.speed : 1;
      const sourceDur = Math.max(0.05, c.sourceEnd - c.sourceStart);
      const len = roundTimelineSec(sourceDur / speed);
      const ts = roundTimelineSec(cursor);
      const nc: VideoClip = { ...c, timelineStart: ts };
      cursor = roundTimelineSec(ts + len);
      return nc;
    });
    return { ...t, clips: nextClips };
  });
  const next: TimelineProject = { ...p, tracks };
  const withDur = { ...next, durationSec: computeDurationSec(next) };
  return syncSourceAudioClipsFromVideo(withDur);
}

/** 在 V1 轨末尾追加一段视频素材（整段使用 [0, sourceLen) 源区间） */
export function appendVideoClipToProject(
  project: TimelineProject,
  assetId: string,
  sourceLen: number,
): TimelineProject {
  const len = Math.max(0.05, sourceLen);
  const tracks = project.tracks.map((t) => {
    if (t.type !== 'video') return t;
    let lastEnd = 0;
    for (const c of t.clips) {
      const vc = c as VideoClip;
      const end = vc.timelineStart + (vc.sourceEnd - vc.sourceStart);
      if (end > lastEnd) lastEnd = end;
    }
    const clip: VideoClip = {
      id: `clip_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      assetId,
      sourceStart: 0,
      sourceEnd: len,
      timelineStart: lastEnd,
    };
    return { ...t, clips: [...t.clips, clip] };
  });
  const next: TimelineProject = { ...project, tracks };
  return { ...next, durationSec: computeDurationSec(next) };
}

export function removeClipFromProject(
  project: TimelineProject,
  trackId: string,
  clipId: string,
): TimelineProject {
  const tracks = project.tracks.map((t) => {
    if (t.id !== trackId) return t;
    return { ...t, clips: t.clips.filter((c) => c.id !== clipId) };
  });
  const next: TimelineProject = { ...project, tracks };
  return { ...next, durationSec: computeDurationSec(next) };
}

/** 移除所有引用某 assetId 的视频片段，并吸附原声轨（用于从素材库删除素材时同步工程） */
export function removeVideoClipsByAssetId(project: TimelineProject, assetId: string): TimelineProject {
  const p = normalizeTimelineProject(project);
  const tracks = p.tracks.map((t) => {
    if (t.type !== 'video') return t;
    const clips = (t.clips as VideoClip[]).filter((c) => c.assetId !== assetId);
    return { ...t, clips };
  });
  let next: TimelineProject = { ...p, tracks };
  next = snapVideoClipsSequential(next);
  return withSyncedDuration(next);
}

/** 平移某段在时间轴上的起点（秒），不小于 0（视频/音频轨通用） */
export function moveClipTimelineStart(
  project: TimelineProject,
  trackId: string,
  clipId: string,
  newTimelineStart: number,
): TimelineProject {
  const start = Math.max(0, newTimelineStart);
  const tracks = project.tracks.map((t) => {
    if (t.id !== trackId) return t;
    return {
      ...t,
      clips: t.clips.map((c) => {
        if (c.id !== clipId) return c;
        return { ...c, timelineStart: start };
      }),
    };
  });
  const next: TimelineProject = { ...project, tracks };
  return { ...next, durationSec: computeDurationSec(next) };
}

/** 调整某段在原素材上的入出点（秒），随后吸附时间轴并同步原声轨 */
export function updateVideoClipSourceRange(
  project: TimelineProject,
  clipId: string,
  range: { sourceStart?: number; sourceEnd?: number },
  assetMaxDurSec?: number,
): TimelineProject {
  const p = normalizeTimelineProject(project);
  const tracks = p.tracks.map((t) => {
    if (t.id !== 'v1' || t.type !== 'video') return t;
    const clips = (t.clips as VideoClip[]).map((vc) => {
      if (vc.id !== clipId) return vc;
      let sourceStart = range.sourceStart ?? vc.sourceStart;
      let sourceEnd = range.sourceEnd ?? vc.sourceEnd;
      const cap =
        assetMaxDurSec != null && Number.isFinite(assetMaxDurSec) && assetMaxDurSec > 0.1
          ? assetMaxDurSec
          : Math.max(vc.sourceEnd, sourceEnd, sourceStart + 0.2) + 3600;
      sourceStart = Math.max(0, Math.min(sourceStart, cap - 0.05));
      sourceEnd = Math.max(sourceStart + 0.05, Math.min(sourceEnd, cap));
      return { ...vc, sourceStart, sourceEnd };
    });
    return { ...t, clips };
  });
  const snapped = snapVideoClipsSequential({ ...p, tracks });
  return withSyncedDuration(snapped);
}

/** 在时间轴上交换片段顺序（按当前左右顺序前移/后移一位） */
export function reorderVideoClip(
  project: TimelineProject,
  clipId: string,
  direction: 'up' | 'down',
): TimelineProject {
  const p = normalizeTimelineProject(project);
  const vTrack = p.tracks.find((t) => t.id === 'v1' && t.type === 'video');
  if (!vTrack) return p;
  const ordered = [...(vTrack.clips as VideoClip[])].sort((a, b) => a.timelineStart - b.timelineStart);
  const idx = ordered.findIndex((c) => c.id === clipId);
  if (idx < 0) return p;
  const j = direction === 'up' ? idx - 1 : idx + 1;
  if (j < 0 || j >= ordered.length) return p;
  const nextOrder = [...ordered];
  const a = nextOrder[idx]!;
  const b = nextOrder[j]!;
  nextOrder[idx] = b;
  nextOrder[j] = a;
  const tracks = p.tracks.map((t) => (t.id === 'v1' ? { ...t, clips: nextOrder } : t));
  return withSyncedDuration(snapVideoClipsSequential({ ...p, tracks }));
}

export function setVideoClipTransitionAfter(
  project: TimelineProject,
  clipId: string,
  transitionAfter: ClipTransition | undefined,
): TimelineProject {
  const p = normalizeTimelineProject(project);
  const tracks = p.tracks.map((t) => {
    if (t.id !== 'v1' || t.type !== 'video') return t;
    const clips = (t.clips as VideoClip[]).map((vc) =>
      vc.id === clipId ? { ...vc, transitionAfter } : vc,
    );
    return { ...t, clips };
  });
  return { ...p, tracks };
}

/** 设置片段播放速度（0.25–4），同步修改时间轴时长 */
export function setVideoClipSpeed(
  project: TimelineProject,
  clipId: string,
  speed: number,
): TimelineProject {
  const p = normalizeTimelineProject(project);
  const clamped = Math.min(4, Math.max(0.25, speed));
  const tracks = p.tracks.map((t) => {
    if (t.id !== 'v1' || t.type !== 'video') return t;
    const clips = (t.clips as VideoClip[]).map((vc) =>
      vc.id === clipId ? { ...vc, speed: clamped } : vc,
    );
    return { ...t, clips };
  });
  return withSyncedDuration(snapVideoClipsSequential({ ...p, tracks }));
}

/** 设置片段原声音量（0–200） */
export function setVideoClipVolume(
  project: TimelineProject,
  clipId: string,
  volume: number,
): TimelineProject {
  const p = normalizeTimelineProject(project);
  const clamped = Math.min(200, Math.max(0, volume));
  const tracks = p.tracks.map((t) => {
    if (t.id !== 'v1' || t.type !== 'video') return t;
    const clips = (t.clips as VideoClip[]).map((vc) =>
      vc.id === clipId ? { ...vc, volume: clamped } : vc,
    );
    return { ...t, clips };
  });
  return { ...p, tracks };
}

export function upsertSubtitleCue(project: TimelineProject, cue: SubtitleCue): TimelineProject {
  const list = [...(project.subtitles ?? [])];
  const startSec = Math.max(0, Math.min(cue.startSec, cue.endSec - 0.05));
  const endSec = Math.max(startSec + 0.05, cue.endSec);
  const normalized: SubtitleCue = { ...cue, startSec, endSec, text: cue.text.trim() };
  const i = list.findIndex((x) => x.id === normalized.id);
  if (i >= 0) list[i] = normalized;
  else list.push(normalized);
  list.sort((a, b) => a.startSec - b.startSec);
  return { ...project, subtitles: list };
}

export function removeSubtitleCue(project: TimelineProject, cueId: string): TimelineProject {
  const list = (project.subtitles ?? []).filter((x) => x.id !== cueId);
  return { ...project, subtitles: list.length ? list : undefined };
}

const MIN_CLIP_PART_SEC = 0.12;

/**
 * 在播放头处拆分选中片段（两侧保留最小时长）。成功返回新工程，失败返回 null。
 * 返回的 project 中第二段使用新 clip id，便于调用方更新选中态。
 */
export function splitVideoClipAtPlayhead(
  project: TimelineProject,
  clipId: string,
  playheadT: number,
): { project: TimelineProject; newClipIdRight: string } | null {
  const p = normalizeTimelineProject(project);
  const vTrack = p.tracks.find((t) => t.id === 'v1' && t.type === 'video');
  if (!vTrack) return null;
  const clips = vTrack.clips as VideoClip[];
  const vc = clips.find((c) => c.id === clipId);
  if (!vc) return null;
  const len = vc.sourceEnd - vc.sourceStart;
  const tEnd = vc.timelineStart + len;
  const eps = 1e-3;
  if (playheadT <= vc.timelineStart + eps || playheadT >= tEnd - eps) return null;
  const srcAt = vc.sourceStart + (playheadT - vc.timelineStart);
  if (
    srcAt <= vc.sourceStart + MIN_CLIP_PART_SEC ||
    srcAt >= vc.sourceEnd - MIN_CLIP_PART_SEC
  ) {
    return null;
  }

  const id1 = `clip_${Date.now()}_a_${Math.random().toString(36).slice(2, 6)}`;
  const id2 = `clip_${Date.now()}_b_${Math.random().toString(36).slice(2, 6)}`;
  const c1: VideoClip = {
    ...vc,
    id: id1,
    sourceEnd: srcAt,
    transitionAfter: 'cut',
  };
  const c2: VideoClip = {
    ...vc,
    id: id2,
    sourceStart: srcAt,
    timelineStart: playheadT,
    transitionAfter: vc.transitionAfter,
  };
  const nextClips = clips
    .filter((c) => c.id !== clipId)
    .concat([c1, c2])
    .sort((a, b) => a.timelineStart - b.timelineStart);
  const tracks = p.tracks.map((t) => (t.id === 'v1' ? { ...t, clips: nextClips } : t));
  const out = withSyncedDuration(snapVideoClipsSequential({ ...p, tracks }));
  return { project: out, newClipIdRight: id2 };
}

/** 掐头：播放头作为新入点（左侧丢弃） */
export function trimVideoClipHeadToPlayhead(
  project: TimelineProject,
  clipId: string,
  playheadT: number,
): TimelineProject | null {
  const p = normalizeTimelineProject(project);
  const vTrack = p.tracks.find((t) => t.id === 'v1' && t.type === 'video');
  if (!vTrack) return null;
  const vc = (vTrack.clips as VideoClip[]).find((c) => c.id === clipId);
  if (!vc) return null;
  const tEnd = vc.timelineStart + (vc.sourceEnd - vc.sourceStart);
  const eps = 1e-3;
  if (playheadT <= vc.timelineStart + eps || playheadT >= tEnd - eps) return null;
  const newSourceStart = vc.sourceStart + (playheadT - vc.timelineStart);
  if (vc.sourceEnd - newSourceStart < MIN_CLIP_PART_SEC) return null;
  const updated: VideoClip = {
    ...vc,
    sourceStart: newSourceStart,
    timelineStart: playheadT,
  };
  const clips = (vTrack.clips as VideoClip[]).map((c) => (c.id === clipId ? updated : c));
  const tracks = p.tracks.map((t) => (t.id === 'v1' ? { ...t, clips } : t));
  return withSyncedDuration(snapVideoClipsSequential({ ...p, tracks }));
}

/** 去尾：播放头作为新出点（右侧丢弃） */
export function trimVideoClipTailToPlayhead(
  project: TimelineProject,
  clipId: string,
  playheadT: number,
): TimelineProject | null {
  const p = normalizeTimelineProject(project);
  const vTrack = p.tracks.find((t) => t.id === 'v1' && t.type === 'video');
  if (!vTrack) return null;
  const vc = (vTrack.clips as VideoClip[]).find((c) => c.id === clipId);
  if (!vc) return null;
  const tEnd = vc.timelineStart + (vc.sourceEnd - vc.sourceStart);
  const eps = 1e-3;
  if (playheadT <= vc.timelineStart + eps || playheadT >= tEnd - eps) return null;
  const newSourceEnd = vc.sourceStart + (playheadT - vc.timelineStart);
  if (newSourceEnd - vc.sourceStart < MIN_CLIP_PART_SEC) return null;
  const updated: VideoClip = { ...vc, sourceEnd: newSourceEnd };
  const clips = (vTrack.clips as VideoClip[]).map((c) => (c.id === clipId ? updated : c));
  const tracks = p.tracks.map((t) => (t.id === 'v1' ? { ...t, clips } : t));
  return withSyncedDuration(snapVideoClipsSequential({ ...p, tracks }));
}

// ─── 文字轨工具函数 ───────────────────────────────────────────────

function getTextTrack(project: TimelineProject): Track | undefined {
  return project.tracks.find((t) => t.type === 'text');
}

function clampTextClip(clip: TextClip, durationSec: number): TextClip {
  const start = Math.max(0, clip.timelineStart);
  const end = Math.min(durationSec, Math.max(start + 0.5, clip.timelineEnd));
  return { ...clip, timelineStart: start, timelineEnd: end };
}

/** 添加或更新一个文字片段 */
export function upsertTextClip(
  project: TimelineProject,
  clip: TextClip,
): TimelineProject {
  const p = normalizeTimelineProject(project);
  const tracks = p.tracks.map((t) => {
    if (t.type !== 'text') return t;
    const existing = (t.clips as TextClip[]).find((c) => c.id === clip.id);
    const clamped = clampTextClip(clip, p.durationSec);
    if (existing) {
      return { ...t, clips: (t.clips as TextClip[]).map((c) => c.id === clip.id ? clamped : c) };
    }
    return { ...t, clips: [...t.clips, clamped] };
  });
  return { ...p, tracks };
}

/** 删除一个文字片段 */
export function removeTextClip(
  project: TimelineProject,
  clipId: string,
): TimelineProject {
  const p = normalizeTimelineProject(project);
  const tracks = p.tracks.map((t) => {
    if (t.type !== 'text') return t;
    return { ...t, clips: (t.clips as TextClip[]).filter((c) => c.id !== clipId) };
  });
  return { ...p, tracks };
}

/** 获取某时刻（秒）激活的所有文字片段 */
export function getActiveTextClips(
  project: TimelineProject,
  timeSec: number,
): TextClip[] {
  const t = getTextTrack(project);
  if (!t) return [];
  return (t.clips as TextClip[]).filter(
    (c) => timeSec >= c.timelineStart && timeSec < c.timelineEnd,
  );
}

/** 获取时间轴所有文字片段（排序） */
export function getAllTextClips(project: TimelineProject): TextClip[] {
  const t = getTextTrack(project);
  if (!t) return [];
  return [...(t.clips as TextClip[])].sort((a, b) => a.timelineStart - b.timelineStart);
}

/** 快捷：在时间轴开头加片头 */
export function addIntroTextClip(
  project: TimelineProject,
  text: string,
  subtext: string,
  presetId: TextPresetId,
  durationSec = 3,
): TimelineProject {
  const clip: TextClip = {
    id: `text_${Date.now()}_intro`,
    timelineStart: 0,
    timelineEnd: durationSec,
    text,
    subtext,
    presetId,
  };
  return upsertTextClip(project, clip);
}

/** 快捷：在时间轴末尾加片尾 */
export function addOutroTextClip(
  project: TimelineProject,
  text: string,
  subtext: string,
  presetId: TextPresetId,
  durationSec = 3,
): TimelineProject {
  const start = Math.max(0, project.durationSec - durationSec);
  const clip: TextClip = {
    id: `text_${Date.now()}_outro`,
    timelineStart: start,
    timelineEnd: project.durationSec,
    text,
    subtext,
    presetId,
  };
  return upsertTextClip(project, clip);
}
