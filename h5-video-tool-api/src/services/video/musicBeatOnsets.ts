/**
 * 剪辑「卡点」预备：从 PCM 做 onset（瞬态）峰值检测。
 * 说明：当前实现偏**通用打击/瞬态**（含音效与鼓点），与**纯人声**或**仅 BGM 旋律线**不同。
 * 要做「只听背景音乐鼓点」需在后续加 HPSS（谐波/打击乐分离）或单独音轨；本模块为可迭代基线。
 */
import { extractMonoPcmS16leHead } from './audioEnergySegments.js';

/** 50ms 帧上的能量包络，取一阶差分正值为 onset 强度 */
function onsetStrengthSeries(samples: Int16Array, sampleRate: number): { t: number[]; strength: number[] } {
  const frame = Math.floor(sampleRate * 0.05);
  const hop = Math.floor(sampleRate * 0.025);
  const t: number[] = [];
  const env: number[] = [];
  for (let off = 0; off + frame <= samples.length; off += hop) {
    let s = 0;
    for (let i = 0; i < frame; i++) {
      const x = samples[off + i]! / 32768;
      s += x * x;
    }
    t.push(off / sampleRate + 0.025);
    env.push(Math.sqrt(s / frame));
  }
  const strength: number[] = [];
  for (let i = 1; i < env.length; i++) {
    const d = env[i]! - env[i - 1]!;
    strength.push(Math.max(0, d));
  }
  const t2 = t.slice(1);
  return { t: t2, strength };
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(p * (sorted.length - 1))));
  return sorted[idx]!;
}

/**
 * 返回若干「适合下刀」的时间点（秒），可与画面分析结果求交或单独输出给前端。
 */
export function pickBeatCutPointsFromSamples(
  samples: Int16Array,
  sampleRate: number,
  opts?: { maxPoints?: number; minGapSec?: number },
): number[] {
  const { t, strength } = onsetStrengthSeries(samples, sampleRate);
  if (strength.length === 0) return [];
  const sorted = [...strength].sort((a, b) => a - b);
  const th = percentile(sorted, 0.82) * Number(process.env.EDITOR_BEAT_ONSET_THRESHOLD_MUL || 0.95);
  const minGap = opts?.minGapSec ?? Math.max(0.35, Number(process.env.EDITOR_BEAT_MIN_GAP_SEC || 0.45));
  const maxP = opts?.maxPoints ?? 80;

  const idxs: number[] = [];
  for (let i = 0; i < strength.length; i++) {
    if (strength[i]! >= th) idxs.push(i);
  }

  const peaks: number[] = [];
  let lastT = -999;
  for (const i of idxs) {
    const tt = t[i]!;
    if (tt - lastT < minGap) continue;
    const prev = strength[i - 1] ?? 0;
    const next = strength[i + 1] ?? 0;
    if (strength[i]! >= prev && strength[i]! >= next) {
      peaks.push(tt);
      lastT = tt;
      if (peaks.length >= maxP) break;
    }
  }
  return peaks;
}

/** 将时间点转为极短候选窗（供后续与高光段对齐） */
export function beatPointsToMicroWindows(
  points: number[],
  halfWidthSec: number,
): Array<{ startSec: number; endSec: number; score: number }> {
  const w = Math.max(0.08, halfWidthSec);
  return points.map((c, i) => ({
    startSec: Math.max(0, c - w),
    endSec: c + w,
    score: 0.5,
  }));
}

const SAMPLE_RATE = 16000;

/** 从视频抽音频后做 onset 峰值，得到适合对齐剪辑的时间点（秒）。 */
export async function analyzeBeatOnsetCuts(
  videoPath: string,
  maxAnalyzeSec?: number,
): Promise<number[]> {
  const maxA = Math.min(
    900,
    maxAnalyzeSec ?? Number(process.env.EDITOR_ANALYSIS_MAX_SEC || 900),
  );
  const { pcm } = await extractMonoPcmS16leHead(videoPath, maxA);
  const n = Math.floor(pcm.length / 2);
  const samples = new Int16Array(n);
  for (let i = 0; i < n; i++) {
    samples[i] = pcm.readInt16LE(i * 2);
  }
  return pickBeatCutPointsFromSamples(samples, SAMPLE_RATE, {});
}
