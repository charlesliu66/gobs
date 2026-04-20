/**
 * 纯音频能量切段：单声道 16kHz PCM → 滑窗 RMS → 阈值连通域 → 候选高光区间。
 * 不依赖 GPU，适合长视频与服务器批处理。
 */
import { spawn } from 'child_process';
import { getFfmpegPath } from './ffmpegPaths.js';

export interface EnergySegment {
  startSec: number;
  endSec: number;
  /** 0–1 相对强度 */
  score: number;
}

const SAMPLE_RATE = 16000;
/** 分析窗口（秒） */
const WINDOW_SEC = 0.45;
/** 步进（秒） */
export const AUDIO_RMS_HOP_SEC = 0.2;
const HOP_SEC = AUDIO_RMS_HOP_SEC;

function rmsInt16(buf: Buffer, offset: number, length: number): number {
  const n = Math.floor(length / 2);
  if (n <= 0) return 0;
  let s = 0;
  for (let i = 0; i < n; i++) {
    const x = buf.readInt16LE(offset + i * 2);
    s += x * x;
  }
  return Math.sqrt(s / n) / 32768;
}

/** 抽取前 maxSec 秒为 s16le 单声道 16kHz */
export async function extractMonoPcmS16leHead(
  videoPath: string,
  maxSec: number,
): Promise<{ pcm: Buffer; sampleRate: number }> {
  const ffmpeg = getFfmpegPath();
  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    const ff = spawn(
      ffmpeg,
      [
        '-hide_banner',
        '-loglevel',
        'error',
        '-i',
        videoPath,
        '-t',
        String(maxSec),
        '-vn',
        '-ac',
        '1',
        '-ar',
        String(SAMPLE_RATE),
        '-f',
        's16le',
        '-acodec',
        'pcm_s16le',
        'pipe:1',
      ],
      { windowsHide: true },
    );
    let errBuf = '';
    ff.stdout.on('data', (c: Buffer) => chunks.push(c));
    ff.stderr.on('data', (c: Buffer) => {
      errBuf += c.toString();
    });
    ff.on('close', (code) => {
      if (code !== 0) {
        // 源视频没有音频流时 ffmpeg 常返回 code 234，stderr 会出现
        // "Output file does not contain any stream" 或 "does not contain any stream"。
        // 这是正常情况（无背景音的素材），用可识别的错误类型抛出，上层可以静默跳过。
        const errSnippet = errBuf.slice(-400);
        if (/does not contain any stream|Invalid argument/i.test(errSnippet) && code === 234) {
          const err = new Error('素材无音频轨，已跳过音频分析');
          (err as Error & { code?: string }).code = 'NO_AUDIO_STREAM';
          reject(err);
          return;
        }
        reject(new Error(`ffmpeg 抽取音频失败 (code ${code}): ${errSnippet}`));
        return;
      }
      const pcm = Buffer.concat(chunks);
      if (pcm.length < 256) {
        const err = new Error('音频数据过短或无有效声道，已跳过音频分析');
        (err as Error & { code?: string }).code = 'NO_AUDIO_STREAM';
        reject(err);
        return;
      }
      resolve();
    });
    ff.on('error', reject);
  });
  return { pcm: Buffer.concat(chunks), sampleRate: SAMPLE_RATE };
}

function buildRmsSeries(pcm: Buffer, sampleRate: number): { t: number[]; rms: number[] } {
  const windowSamples = Math.max(256, Math.floor(sampleRate * WINDOW_SEC));
  const hopSamples = Math.max(128, Math.floor(sampleRate * HOP_SEC));
  const t: number[] = [];
  const rms: number[] = [];
  for (let off = 0; off + windowSamples * 2 <= pcm.length; off += hopSamples * 2) {
    const r = rmsInt16(pcm, off, windowSamples * 2);
    const timeSec = off / 2 / sampleRate;
    t.push(timeSec + WINDOW_SEC / 2);
    rms.push(r);
  }
  return { t, rms };
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(p * (sorted.length - 1))));
  return sorted[idx]!;
}

/**
 * 从 RMS 序列得到高能量区间，合并小间隙，截断到 targetTotalSec 内总覆盖的若干段（按能量排序贪心取）。
 */
export function energySegmentsFromRms(
  t: number[],
  rms: number[],
  opts?: {
    /** 成片目标总时长（秒），用于限制输出段数量与长度 */
    targetTotalSec?: number;
    maxSegments?: number;
  },
): EnergySegment[] {
  if (t.length === 0 || rms.length === 0) return [];
  const sorted = [...rms].sort((a, b) => a - b);
  const p60 = percentile(sorted, 0.6);
  const p95 = percentile(sorted, 0.95);
  const threshold = p60 + Math.max(0.02, (p95 - p60) * 0.35);

  type Run = { i0: number; i1: number };
  const runs: Run[] = [];
  let i = 0;
  while (i < rms.length) {
    if (rms[i]! < threshold) {
      i += 1;
      continue;
    }
    const i0 = i;
    while (i < rms.length && rms[i]! >= threshold) i += 1;
    runs.push({ i0, i1: i - 1 });
  }

  const merged: Run[] = [];
  const maxGapIdx = Math.ceil(1.2 / HOP_SEC);
  for (const r of runs) {
    const last = merged[merged.length - 1];
    if (last && r.i0 - last.i1 <= maxGapIdx) {
      last.i1 = r.i1;
    } else {
      merged.push({ ...r });
    }
  }

  const raw: EnergySegment[] = merged.map((run) => {
    const startSec = Math.max(0, t[run.i0]! - WINDOW_SEC / 2);
    const endSec = Math.max(startSec + 0.25, t[run.i1]! + WINDOW_SEC / 2);
    let sum = 0;
    for (let k = run.i0; k <= run.i1; k++) sum += rms[k]!;
    const mean = sum / (run.i1 - run.i0 + 1);
    return { startSec, endSec, score: mean };
  });

  const maxR = Math.max(...raw.map((s) => s.score), 1e-6);
  const normalized = raw.map((s) => ({
    ...s,
    score: Math.min(1, s.score / maxR),
  }));

  const target = opts?.targetTotalSec ?? 30;
  const maxSeg = opts?.maxSegments ?? 12;
  return pickNonOverlappingByScore(normalized, target, maxSeg);
}

function overlaps(a: EnergySegment, b: EnergySegment): boolean {
  return !(a.endSec <= b.startSec || a.startSec >= b.endSec);
}

/** 按分数贪心选取互不重叠区间，总长接近 targetTotalSec */
function pickNonOverlappingByScore(
  segments: EnergySegment[],
  targetTotalSec: number,
  maxCount: number,
): EnergySegment[] {
  const sorted = [...segments].sort((a, b) => b.score - a.score);
  const picked: EnergySegment[] = [];
  let total = 0;
  for (const s of sorted) {
    if (picked.length >= maxCount || total >= targetTotalSec * 1.02) break;
    const len = Math.min(14, Math.max(0.3, s.endSec - s.startSec));
    const adj: EnergySegment = {
      startSec: s.startSec,
      endSec: s.startSec + len,
      score: s.score,
    };
    if (picked.some((p) => overlaps(p, adj))) continue;
    picked.push(adj);
    total += len;
  }
  picked.sort((a, b) => a.startSec - b.startSec);
  return picked;
}

export async function analyzeAudioEnergySegments(
  videoPath: string,
  opts?: {
    maxAnalyzeSec?: number;
    targetTotalSec?: number;
  },
): Promise<EnergySegment[]> {
  const maxA = Math.min(900, Math.max(30, Number(process.env.EDITOR_ANALYSIS_MAX_SEC || 900)));
  const maxSec = Math.min(opts?.maxAnalyzeSec ?? maxA, maxA);
  const { pcm } = await extractMonoPcmS16leHead(videoPath, maxSec);
  const { t, rms } = buildRmsSeries(pcm, SAMPLE_RATE);
  return energySegmentsFromRms(t, rms, {
    targetTotalSec: opts?.targetTotalSec ?? 30,
    maxSegments: 14,
  });
}

/**
 * 在 RMS 序列上做定长滑窗，求总能量最大的约 windowSec 秒区间，用于「先缩窗再抽帧」。
 * 返回 [startSec, endSec] 钳在 [0, videoDurationSec]。
 */
export async function findBestAudioFocusWindow(
  videoPath: string,
  opts: {
    maxAnalyzeSec: number;
    videoDurationSec: number;
    /** 目标窗口时长（秒），如 60 */
    windowSec: number;
  },
): Promise<{ startSec: number; endSec: number }> {
  const d = Math.max(0.5, opts.videoDurationSec);
  const windowSec = Math.min(Math.max(15, opts.windowSec), Math.min(180, d));
  const maxA = Math.min(900, Math.max(30, Number(process.env.EDITOR_ANALYSIS_MAX_SEC || 900)));
  const maxSec = Math.min(opts.maxAnalyzeSec, maxA, d);
  const { pcm } = await extractMonoPcmS16leHead(videoPath, maxSec);
  const { t, rms } = buildRmsSeries(pcm, SAMPLE_RATE);
  if (rms.length === 0) {
    return { startSec: 0, endSec: Math.min(windowSec, d) };
  }
  const winHops = Math.max(1, Math.round(windowSec / HOP_SEC));
  if (rms.length <= winHops) {
    const endT = t[rms.length - 1] ?? 0;
    return { startSec: 0, endSec: Math.min(d, Math.max(windowSec * 0.5, endT + WINDOW_SEC)) };
  }
  let sum = 0;
  for (let i = 0; i < winHops; i++) sum += rms[i]!;
  let bestSum = sum;
  let bestStart = 0;
  for (let i = winHops; i < rms.length; i++) {
    sum += rms[i]! - rms[i - winHops]!;
    if (sum > bestSum) {
      bestSum = sum;
      bestStart = i - winHops + 1;
    }
  }
  const i0 = bestStart;
  let startSec = Math.max(0, (t[i0] ?? 0) - WINDOW_SEC / 2);
  let endSec = Math.min(d, startSec + windowSec);
  startSec = Math.max(0, endSec - windowSec);
  return { startSec, endSec };
}
