/**
 * 用户偏好学习服务（基础版）
 * 在剪辑器导出时收集行为统计，下次 LLM 排片时注入偏好上下文。
 */
import { mkdir, readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { resolvePath } from '../infra/storage/resolver.js';
import { sanitizeUsername } from '../utils/safeUsername.js';

export interface UserPreference {
  username: string;
  updatedAt: number;
  totalExports: number;
  avgClipDurationSec: number;
  preferFastCut: boolean;
  /** activity 类型保留频率（高→偏好） */
  activityFrequency: Record<string, number>;
  /** 偏好的前 5 个 activity */
  topActivities: string[];
  /** 最近 3 次导出的平均片段数 */
  avgClipCount: number;
}

export interface ExportBehaviorReport {
  clips: Array<{
    activityPrimary?: string;
    activitySecondary?: string;
    durationSec: number;
    wasAgentGenerated: boolean;
  }>;
  totalDurationSec: number;
  bgmChanged: boolean;
}

function preferencePath(username: string): string {
  return join(resolvePath('.data'), 'preferences', `${sanitizeUsername(username)}.json`);
}

export async function loadPreference(username: string): Promise<UserPreference | null> {
  try {
    const raw = await readFile(preferencePath(username), 'utf-8');
    return JSON.parse(raw) as UserPreference;
  } catch {
    return null;
  }
}

export async function savePreference(pref: UserPreference): Promise<void> {
  const fp = preferencePath(pref.username);
  await mkdir(dirname(fp), { recursive: true });
  await writeFile(fp, JSON.stringify(pref, null, 2), 'utf-8');
}

/**
 * 根据导出时的行为报告，更新用户偏好画像。
 * 采用指数移动平均（EMA）平滑，避免单次导出覆盖历史偏好。
 */
export async function updatePreferenceFromExport(
  username: string,
  report: ExportBehaviorReport,
): Promise<UserPreference> {
  const existing = await loadPreference(username);
  const alpha = 0.3; // EMA 平滑因子

  const clipDurations = report.clips.map((c) => c.durationSec);
  const avgDur = clipDurations.length
    ? clipDurations.reduce((a, b) => a + b, 0) / clipDurations.length
    : 3;

  const freq: Record<string, number> = { ...(existing?.activityFrequency ?? {}) };
  for (const clip of report.clips) {
    const key = clip.activityPrimary || 'unknown';
    freq[key] = (freq[key] || 0) + 1;
  }

  const totalExports = (existing?.totalExports ?? 0) + 1;
  const prevAvgDur = existing?.avgClipDurationSec ?? avgDur;
  const smoothedAvgDur = prevAvgDur * (1 - alpha) + avgDur * alpha;

  const prevAvgCount = existing?.avgClipCount ?? report.clips.length;
  const smoothedAvgCount = prevAvgCount * (1 - alpha) + report.clips.length * alpha;

  const topActivities = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([k]) => k);

  const pref: UserPreference = {
    username,
    updatedAt: Date.now(),
    totalExports,
    avgClipDurationSec: Math.round(smoothedAvgDur * 10) / 10,
    preferFastCut: smoothedAvgDur < 2.5,
    activityFrequency: freq,
    topActivities,
    avgClipCount: Math.round(smoothedAvgCount),
  };

  await savePreference(pref);
  return pref;
}

/**
 * 生成注入 LLM prompt 的偏好片段。
 * 返回空字符串表示暂无偏好数据。
 */
export async function buildPreferencePromptSnippet(username: string): Promise<string> {
  const pref = await loadPreference(username);
  if (!pref || pref.totalExports < 1) return '';

  const lines: string[] = [
    '## 用户历史偏好（基于过往导出行为统计）',
  ];

  if (pref.topActivities.length > 0) {
    lines.push(`- 偏好的内容类型：${pref.topActivities.join('、')}`);
  }

  lines.push(`- 平均片段时长：${pref.avgClipDurationSec}秒（${pref.preferFastCut ? '偏好快切' : '偏好长镜头'}）`);
  lines.push(`- 平均片段数量：约${pref.avgClipCount}段`);
  lines.push('- **以上为参考，用户当前指令优先级高于历史偏好**');

  return lines.join('\n');
}
