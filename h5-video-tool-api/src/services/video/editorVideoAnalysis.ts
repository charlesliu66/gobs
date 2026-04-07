/**
 * 编排：音频能量 / 抽帧+Gemini / 混合 → CandidateWindow[]
 */
import {
  segmentsToCandidateWindows,
  type CandidateWindow,
} from '../editorHighlightCandidates.js';
import {
  analyzeAudioEnergySegments,
  findBestAudioFocusWindow,
  type EnergySegment,
} from './audioEnergySegments.js';
import type { LlmUsageSink } from '../editorLlmUsage.js';
import {
  analyzeVisionHighlightSegments,
  type VisionFrameScore,
  type VisionTimeRange,
} from './frameVisionRank.js';

/** 先缩窗再抽帧：manual=以 center 为中心；audio=RMS 滑窗能量最大的一段 */
export type EditorVisionFocus =
  | { kind: 'manual'; centerSec: number; windowSec?: number }
  | { kind: 'audio'; windowSec?: number };

/** 解析 API body 中的 visionFocus */
export function parseEditorVisionFocusBody(raw: unknown): EditorVisionFocus | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as Record<string, unknown>;
  const kind = typeof o.kind === 'string' ? o.kind.trim() : '';
  if (kind === 'manual') {
    const centerSec = Number(o.centerSec);
    if (!Number.isFinite(centerSec)) return undefined;
    const out: EditorVisionFocus = { kind: 'manual', centerSec };
    const windowSec = Number(o.windowSec);
    if (Number.isFinite(windowSec) && windowSec >= 15 && windowSec <= 180) out.windowSec = windowSec;
    return out;
  }
  if (kind === 'audio') {
    const out: EditorVisionFocus = { kind: 'audio' };
    const windowSec = Number(o.windowSec);
    if (Number.isFinite(windowSec) && windowSec >= 15 && windowSec <= 180) out.windowSec = windowSec;
    return out;
  }
  return undefined;
}

function defaultFocusWindowSec(): number {
  const n = Number(process.env.EDITOR_VISION_FOCUS_WINDOW_SEC);
  if (Number.isFinite(n) && n >= 15 && n <= 180) return n;
  return 60;
}

function maxFocusWindowCap(): number {
  const n = Number(process.env.EDITOR_VISION_FOCUS_MAX_SEC);
  if (Number.isFinite(n) && n >= 30 && n <= 300) return n;
  return 120;
}

/**
 * 未传 visionFocus 时，长素材默认自动「音频能量滑窗」缩窗再抽帧（前台不暴露，由服务端适配）。
 * EDITOR_VISION_AUTO_FOCUS=0|false|off|no 可关闭；EDITOR_VISION_AUTO_FOCUS_MIN_DURATION_SEC 控制时长阈值（默认 120s）。
 */
export function shouldAutoAudioFocus(durationSec: number): boolean {
  const raw = (process.env.EDITOR_VISION_AUTO_FOCUS ?? '').trim().toLowerCase();
  if (raw === '0' || raw === 'false' || raw === 'off' || raw === 'no') return false;
  const minDur = Number(process.env.EDITOR_VISION_AUTO_FOCUS_MIN_DURATION_SEC);
  const threshold = Number.isFinite(minDur) && minDur >= 10 ? minDur : 120;
  return durationSec >= threshold;
}

function normalizeManualRange(
  centerSec: number,
  windowSec: number,
  durationSec: number,
): { startSec: number; endSec: number } {
  const d = Math.max(0.2, durationSec);
  const w = Math.min(Math.max(15, windowSec), maxFocusWindowCap(), d);
  const half = w / 2;
  const c = Math.min(Math.max(centerSec, half), d - half);
  return { startSec: c - half, endSec: c + half };
}

async function resolveVisionFocusRange(
  focus: EditorVisionFocus,
  videoPath: string,
  durationSec: number,
  maxAnalyzeSec: number,
): Promise<{ startSec: number; endSec: number; source: 'manual' | 'audio' }> {
  const d = Math.max(0.2, durationSec);
  if (focus.kind === 'manual') {
    const w = focus.windowSec ?? defaultFocusWindowSec();
    return { ...normalizeManualRange(focus.centerSec, w, d), source: 'manual' };
  }
  const w = Math.min(focus.windowSec ?? defaultFocusWindowSec(), maxFocusWindowCap(), d);
  const r = await findBestAudioFocusWindow(videoPath, {
    maxAnalyzeSec,
    videoDurationSec: d,
    windowSec: w,
  });
  return { ...r, source: 'audio' };
}

/** 仅保留与 [start,end] 相交的音频段并钳到区间内 */
function segmentsOverlappingRange(
  segs: EnergySegment[],
  start: number,
  end: number,
): EnergySegment[] {
  const out: EnergySegment[] = [];
  for (const s of segs) {
    if (s.endSec <= start || s.startSec >= end) continue;
    const a = Math.max(s.startSec, start);
    const b = Math.min(s.endSec, end);
    if (b > a + 0.05) out.push({ ...s, startSec: a, endSec: b });
  }
  return out;
}

export type EditorAnalysisMode = 'off' | 'audio' | 'vision' | 'hybrid';

export function resolveEditorAnalysisMode(): EditorAnalysisMode {
  const m = (process.env.EDITOR_ANALYSIS_MODE ?? 'hybrid').toLowerCase().trim();
  if (m === 'off' || m === 'none' || m === '0' || m === 'false') return 'off';
  if (m === 'audio') return 'audio';
  if (m === 'vision') return 'vision';
  return 'hybrid';
}

function round3(x: number): number {
  return Math.round(x * 1000) / 1000;
}

/** 同一素材上合并重叠区间（用于 hybrid：音频 ∪ 视觉） */
function mergeOverlappingCandidates(assetId: string, windows: CandidateWindow[]): CandidateWindow[] {
  const sorted = [...windows].sort((a, b) => a.sourceStart - b.sourceStart);
  const out: CandidateWindow[] = [];
  let i = 0;
  while (i < sorted.length) {
    let s = sorted[i]!.sourceStart;
    let e = sorted[i]!.sourceEnd;
    let j = i + 1;
    while (j < sorted.length && sorted[j]!.sourceStart <= e + 0.85) {
      e = Math.max(e, sorted[j]!.sourceEnd);
      j += 1;
    }
    out.push({
      id: `hy_${assetId.slice(-8)}_${out.length}`,
      assetId,
      sourceStart: round3(s),
      sourceEnd: round3(e),
    });
    i = j;
  }
  return out;
}

export interface AnalyzeSingleAssetVideoResult {
  windows: CandidateWindow[];
  /** 仅在 vision / hybrid 且分析成功时有值 */
  visionDetail?: {
    scores: VisionFrameScore[];
    meta: {
      frameCount: number;
      approxIntervalSec: number;
      durationSec: number;
      analyzedRange?: VisionTimeRange;
    };
    /** 使用 visionFocus 时：实际采用的缩窗区间 */
    focus?: {
      startSec: number;
      endSec: number;
      source: 'manual' | 'audio';
      /** 由环境变量自动启用（非请求体指定） */
      fromAutoEnv?: boolean;
    };
  };
}

/**
 * 对单个本地视频文件生成候选窗（失败则回退均分窗逻辑由调用方处理）。
 */
export async function analyzeSingleAssetVideo(
  videoAbsolutePath: string,
  assetId: string,
  durationSec: number,
  mode: EditorAnalysisMode,
  userIntent: string,
  targetTimelineSec: number,
  usageSink?: LlmUsageSink,
  visionFocus?: EditorVisionFocus,
): Promise<AnalyzeSingleAssetVideoResult> {
  const d = Math.max(0.2, durationSec);
  const maxA = Math.min(900, d);

  if (mode === 'off') return { windows: [] };

  if (mode === 'audio') {
    const segs = await analyzeAudioEnergySegments(videoAbsolutePath, {
      maxAnalyzeSec: maxA,
      targetTotalSec: targetTimelineSec,
    });
    return { windows: segmentsToCandidateWindows(assetId, segs) };
  }

  let resolvedFocus:
    | {
        startSec: number;
        endSec: number;
        source: 'manual' | 'audio';
        fromAutoEnv?: boolean;
      }
    | undefined;
  let visionRange: VisionTimeRange | undefined;

  const autoEnvFocus = !visionFocus && shouldAutoAudioFocus(d);
  const effectiveFocus: EditorVisionFocus | undefined =
    visionFocus ?? (autoEnvFocus ? { kind: 'audio' } : undefined);

  if (effectiveFocus && (mode === 'vision' || mode === 'hybrid')) {
    resolvedFocus = await resolveVisionFocusRange(effectiveFocus, videoAbsolutePath, d, maxA);
    if (autoEnvFocus && resolvedFocus) {
      resolvedFocus = { ...resolvedFocus, fromAutoEnv: true };
      if (process.env.EDITOR_VISION_AUTO_FOCUS_LOG === '1') {
        console.info(
          `[editor] auto audio focus asset=${assetId} dur=${d.toFixed(1)}s → [${resolvedFocus.startSec.toFixed(1)}, ${resolvedFocus.endSec.toFixed(1)}]`,
        );
      }
    }
    visionRange = { startSec: resolvedFocus!.startSec, endSec: resolvedFocus!.endSec };
  }

  if (mode === 'vision') {
    const v = await analyzeVisionHighlightSegments(
      videoAbsolutePath,
      d,
      userIntent,
      targetTimelineSec,
      usageSink,
      visionRange,
    );
    return {
      windows: segmentsToCandidateWindows(assetId, v.segments),
      visionDetail: {
        scores: v.scores,
        meta: v.meta,
        focus: resolvedFocus,
      },
    };
  }

  // hybrid：先做音频（快、便宜），再做视觉，合并重叠区间
  const audioSegs = await analyzeAudioEnergySegments(videoAbsolutePath, {
    maxAnalyzeSec: maxA,
    targetTotalSec: targetTimelineSec,
  });
  const segsForWindows =
    resolvedFocus != null
      ? segmentsOverlappingRange(audioSegs, resolvedFocus.startSec, resolvedFocus.endSec)
      : audioSegs;
  const audioW = segmentsToCandidateWindows(assetId, segsForWindows);

  let visionW: CandidateWindow[] = [];
  let visionDetail: AnalyzeSingleAssetVideoResult['visionDetail'];
  try {
    const v = await analyzeVisionHighlightSegments(
      videoAbsolutePath,
      d,
      userIntent,
      targetTimelineSec,
      usageSink,
      visionRange,
    );
    visionW = segmentsToCandidateWindows(assetId, v.segments);
    visionDetail = {
      scores: v.scores,
      meta: v.meta,
      focus: resolvedFocus,
    };
  } catch {
    /* 视觉失败时仍可用音频 */
  }

  if (visionW.length === 0) return { windows: audioW, visionDetail };
  if (audioW.length === 0) return { windows: visionW, visionDetail };
  return {
    windows: mergeOverlappingCandidates(assetId, [...audioW, ...visionW]),
    visionDetail,
  };
}
