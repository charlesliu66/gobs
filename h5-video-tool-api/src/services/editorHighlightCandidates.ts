/**
 * 智能剪辑「规则层」：长视频先切成候选时间段，再交给 LLM 只负责选段与排序。
 * 无 FFmpeg/抽帧时无法用真实视觉高光，此处用可解释的启发式（均匀切段 + 战斗类偏好中段）。
 */

export interface CandidateWindow {
  /** 全局唯一，便于在 prompt 里引用 */
  id: string;
  assetId: string;
  sourceStart: number;
  sourceEnd: number;
}

/** 从用户话里解析目标成片时长（时间轴总长约多少秒） */
export function parseTargetTimelineSec(userMessage: string): number | null {
  const s = userMessage.trim();
  const patterns: RegExp[] = [
    /(?:最终|成片|总|输出)?(?:时长|长度)?\s*(?:约|大概|大约)?\s*(\d+(?:\.\d+)?)\s*秒/,
    /(\d+(?:\.\d+)?)\s*秒\s*(?:成片|总长|视频|版本)?/,
    /(\d+(?:\.\d+)?)\s*s(?:ec)?\b/i,
  ];
  for (const re of patterns) {
    const m = s.match(re);
    if (m) {
      const v = parseFloat(m[1]);
      if (Number.isFinite(v) && v > 0) return Math.min(Math.max(v, 1), 600);
    }
  }
  return null;
}

const COMBAT_LIKE = /战斗|打斗|高光|精彩|BOSS|Boss|boss|击杀|连招|对决|激战/i;

export function isCombatLikeIntent(userMessage: string): boolean {
  return COMBAT_LIKE.test(userMessage);
}

function round3(x: number): number {
  return Math.round(x * 1000) / 1000;
}

/**
 * 将单条素材沿时间轴均分为若干候选窗（可再排序）。
 * 长素材约每 8–12 秒一扇，扇数上限 14，便于 LLM 在多段中选子集。
 */
export function buildUniformCandidateWindows(
  assetId: string,
  durationSec: number,
  opts?: { maxWindows?: number },
): CandidateWindow[] {
  const d = Math.max(0.2, durationSec);
  const maxW = opts?.maxWindows ?? 14;
  const n = Math.min(maxW, Math.max(6, Math.ceil(d / 10)));
  const windowLen = d / n;
  const out: CandidateWindow[] = [];
  for (let i = 0; i < n; i++) {
    const sourceStart = round3(i * windowLen);
    const sourceEnd = round3(i === n - 1 ? d : (i + 1) * windowLen);
    if (sourceEnd - sourceStart < 0.15) continue;
    out.push({
      id: `c_${assetId.slice(-8)}_${i}`,
      assetId,
      sourceStart,
      sourceEnd,
    });
  }
  return out;
}

/** 将能量/视觉分析得到的区间转为候选窗（供 Agent 与 sanitize 使用） */
export function segmentsToCandidateWindows(
  assetId: string,
  segments: Array<{ startSec: number; endSec: number }>,
): CandidateWindow[] {
  return segments.map((s, i) => ({
    id: `seg_${assetId.slice(-8)}_${i}`,
    assetId,
    sourceStart: round3(Math.max(0, s.startSec)),
    sourceEnd: round3(Math.max(s.startSec + 0.1, s.endSec)),
  }));
}

/** 战斗/高光类：把更接近视频几何中心的候选窗排在前面，便于 LLM 优先选（游戏战斗常在中后段）。 */
export function prioritizeCenterWindows(windows: CandidateWindow[], durationSec: number): CandidateWindow[] {
  const mid = durationSec / 2;
  return [...windows].sort((a, b) => {
    const ac = (a.sourceStart + a.sourceEnd) / 2;
    const bc = (b.sourceStart + b.sourceEnd) / 2;
    return Math.abs(ac - mid) - Math.abs(bc - mid);
  });
}
