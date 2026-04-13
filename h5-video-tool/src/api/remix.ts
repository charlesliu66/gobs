import { apiGet, apiPost } from './client';

export interface RemixSubmitResponse {
  taskId: string;
  status: string;
}

export type RemixTaskStatusValue = 'pending' | 'rendering' | 'done' | 'failed';

export interface RemixTaskStatus {
  taskId: string;
  status: RemixTaskStatusValue;
  error?: string;
  /** 成品相对工作区路径，如 output/remix/merge_xxx.mp4，供 GET /api/video/file?path= */
  outputPath?: string;
  createdAt: number;
  updatedAt: number;
}

export async function submitRemixMerge(body: {
  clipUrls: string[];
  introUrl?: string;
  outroUrl?: string;
  subtitles?: string;
}): Promise<RemixSubmitResponse> {
  return apiPost('/api/remix', body);
}

export async function getRemixTask(taskId: string): Promise<RemixTaskStatus> {
  return apiGet(`/api/remix/${encodeURIComponent(taskId)}`);
}

/** 轮询直到完成或失败（合并/烧录可能较慢，默认约 3 分钟） */
export async function pollRemixUntilDone(taskId: string, maxMs = 180000): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const st = await getRemixTask(taskId);
    if (st.status === 'done' && st.outputPath) return st.outputPath;
    if (st.status === 'failed') throw new Error(st.error || '任务失败');
    await new Promise((r) => setTimeout(r, 800));
  }
  throw new Error('处理超时，请稍后在服务器 output/remix 目录查看是否已生成');
}

export interface AovDslPlan {
  game: 'aov';
  durationSec: number;
  aspectRatio: '9:16' | '16:9';
  structure: Array<'hook' | 'buildup' | 'climax' | 'outro'>;
  style: string[];
  mustEvents: string[];
  preferredMode?: string;
  fallbackApplied: boolean;
}

export interface AovPlanResponse {
  game: 'aov';
  rulesetVersion: string;
  plan: AovDslPlan;
  trace: string[];
  warnings: string[];
}

export async function planAovRemix(userMessage: string, forceAov = false): Promise<AovPlanResponse> {
  return apiPost('/api/remix/aov/plan', { userMessage, forceAov });
}

export async function getAovRuleset(): Promise<{
  ruleset: {
    version: string;
    publishedAt: string;
    note?: string;
  };
}> {
  return apiGet('/api/remix/aov/rules');
}
