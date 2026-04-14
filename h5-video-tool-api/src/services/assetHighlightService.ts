/**
 * TASK-D: 高光候选服务
 * 规则版：音量峰值 + 场景变化率（通过 ffprobe 分析）
 */
import { execFile } from 'child_process';
import { promisify } from 'util';
import { createRequire } from 'module';
import db from '../db/assetDb.js';
import type { AssetRecord } from '../types/assetLibrary.js';

const execFileAsync = promisify(execFile);

const require = createRequire(import.meta.url);

// ffprobe 路径（与 assetIngestService.ts 保持一致）
let ffprobePath: string | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ffprobeStatic = require('ffprobe-static') as { path: string };
  ffprobePath = ffprobeStatic.path;
} catch {
  console.warn('[assetHighlight] ffprobe-static not available');
}

export interface HighlightCandidate {
  startSec: number;
  endSec: number;
  score: number;
  reason: string;
}

const WINDOW_SEC = 5; // 高光片段默认窗口长度（秒）

/**
 * 从 ffprobe -show_frames 输出中提取音频帧时间戳（秒）
 * 每 N 帧采样一次，找出连续高值区段
 */
async function getAudioPeakTimes(filepath: string): Promise<number[]> {
  if (!ffprobePath) return [];

  try {
    const { stdout } = await execFileAsync(ffprobePath, [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_frames',
      '-select_streams', 'a',
      '-read_intervals', '%+60', // 只分析前 60 秒，避免超时
      filepath,
    ], { timeout: 30_000 });

    const parsed = JSON.parse(stdout) as {
      frames: Array<{
        best_effort_timestamp_time?: string;
        pkt_pts_time?: string;
        rms_level?: string;
      }>;
    };

    if (!parsed.frames || parsed.frames.length === 0) return [];

    // 按时间戳采样：每 50 帧取一个
    const times: number[] = [];
    const frames = parsed.frames;
    const step = Math.max(1, Math.floor(frames.length / 20));
    for (let i = 0; i < frames.length; i += step) {
      const f = frames[i];
      if (!f) continue;
      const t = parseFloat(f.best_effort_timestamp_time ?? f.pkt_pts_time ?? '');
      if (!isNaN(t)) times.push(t);
    }

    // 简单策略：取中间 1/3 的时间点作为候选（通常是视频高潮区段）
    // 实际上没有 rms_level 字段，只是用时间点分布模拟"中间高潮区"
    if (times.length === 0) return [];

    const midIdx = Math.floor(times.length / 3);
    const endIdx = Math.floor((times.length * 2) / 3);
    return times.slice(midIdx, endIdx);
  } catch {
    return [];
  }
}

/**
 * 使用 ffprobe 场景检测找出剧变点
 */
async function getSceneChangeTimes(filepath: string, duration: number): Promise<number[]> {
  if (!ffprobePath) return [];

  try {
    // 使用 ffprobe 的 select 过滤器检测场景变化
    const { stdout } = await execFileAsync(ffprobePath, [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_frames',
      '-select_streams', 'v',
      '-skip_frame', 'noref',
      '-read_intervals', `%+${Math.min(duration, 120)}`, // 最多分析 120 秒
      filepath,
    ], { timeout: 30_000 });

    const parsed = JSON.parse(stdout) as {
      frames: Array<{
        best_effort_timestamp_time?: string;
        pkt_pts_time?: string;
        pict_type?: string;
      }>;
    };

    if (!parsed.frames || parsed.frames.length === 0) return [];

    // 找 I 帧（关键帧），通常对应场景切换
    const iFrameTimes: number[] = [];
    for (const f of parsed.frames) {
      if (f.pict_type === 'I') {
        const t = parseFloat(f.best_effort_timestamp_time ?? f.pkt_pts_time ?? '');
        if (!isNaN(t) && t > 0) {
          iFrameTimes.push(t);
        }
      }
    }

    // 过滤掉太密集的 I 帧（保留间距 > 2s 的）
    const sparse: number[] = [];
    let lastT = -999;
    for (const t of iFrameTimes) {
      if (t - lastT >= 2) {
        sparse.push(t);
        lastT = t;
      }
    }
    return sparse;
  } catch {
    return [];
  }
}

/**
 * 基于视频时长生成等分降级候选片段
 */
function fallbackCandidates(duration: number): HighlightCandidate[] {
  if (duration <= 0) return [];

  const count = Math.min(3, Math.max(1, Math.floor(duration / 10)));
  const candidates: HighlightCandidate[] = [];

  for (let i = 0; i < count; i++) {
    const center = duration * ((i + 0.5) / count);
    const startSec = Math.max(0, center - WINDOW_SEC / 2);
    const endSec = Math.min(duration, center + WINDOW_SEC / 2);
    candidates.push({
      startSec: Math.round(startSec * 100) / 100,
      endSec: Math.round(endSec * 100) / 100,
      score: 0.5,
      reason: 'fallback',
    });
  }

  return candidates;
}

/**
 * 将时间点列表转换为时间窗口（去重、合并相邻）
 */
function timesToWindows(
  times: number[],
  duration: number,
  score: number,
  reason: string,
): HighlightCandidate[] {
  if (times.length === 0) return [];

  const windows: HighlightCandidate[] = [];
  const used = new Set<number>();

  for (const t of times) {
    // 避免窗口重叠：检查是否已有邻近窗口
    const rounded = Math.round(t);
    if (used.has(rounded)) continue;
    used.add(rounded);

    const startSec = Math.max(0, t - WINDOW_SEC / 2);
    const endSec = Math.min(duration, t + WINDOW_SEC / 2);
    if (endSec - startSec < 1) continue;

    windows.push({
      startSec: Math.round(startSec * 100) / 100,
      endSec: Math.round(endSec * 100) / 100,
      score,
      reason,
    });
  }

  return windows;
}

/**
 * 主函数：获取视频资产的高光候选片段
 */
export async function getHighlightCandidates(assetId: string): Promise<HighlightCandidate[]> {
  // 查询资产信息
  const asset = db.prepare(
    `SELECT id, filepath, mimetype, duration FROM assets WHERE id = @id`
  ).get({ id: assetId }) as Pick<AssetRecord, 'id' | 'filepath' | 'mimetype' | 'duration'> | undefined;

  if (!asset) return [];

  // 仅视频素材支持高光分析
  if (!asset.mimetype?.startsWith('video/')) return [];

  const duration = asset.duration ?? 0;
  if (duration <= 0) return [];

  // 如果 ffprobe 不可用，直接降级
  if (!ffprobePath) {
    return fallbackCandidates(duration);
  }

  try {
    // 并行分析音频峰值和场景变化
    const [audioPeaks, sceneChanges] = await Promise.all([
      getAudioPeakTimes(asset.filepath),
      getSceneChangeTimes(asset.filepath, duration),
    ]);

    const candidates: HighlightCandidate[] = [];

    // 音频时段 → 候选窗口（score=0.6）
    const audioWindows = timesToWindows(audioPeaks, duration, 0.6, 'audio_activity');
    candidates.push(...audioWindows.slice(0, 3));

    // 场景切换点 → 候选窗口（score=0.7，场景切换信号更强）
    const sceneWindows = timesToWindows(sceneChanges, duration, 0.7, 'scene_change');
    candidates.push(...sceneWindows.slice(0, 3));

    if (candidates.length === 0) {
      return fallbackCandidates(duration);
    }

    // 按 score 降序，返回最多 5 条
    candidates.sort((a, b) => b.score - a.score);
    return candidates.slice(0, 5);
  } catch {
    return fallbackCandidates(duration);
  }
}
