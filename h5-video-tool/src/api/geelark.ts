import { apiGet, apiPost } from './client';

export interface GeelarkAccount {
  id: string;
  username: string;
  region?: string;
  platform?: string;
  remark?: string;
  canPost?: boolean;
}

export async function fetchAccounts(): Promise<GeelarkAccount[]> {
  const res = await apiGet<{ accounts: GeelarkAccount[] }>('/api/geelark/accounts');
  return res.accounts || [];
}

export interface PublishResult {
  taskIds: string[];
  planName?: string;
}

export async function publishVideo(params: {
  /** 视频 URL（base64 或 HTTP），当无 videoPath 时使用 */
  videoUrl?: string;
  /** 服务器本地路径（如 output/xxx.mp4），优先使用，避免 base64 传输 */
  videoPath?: string;
  accountIds: string[];
  caption?: string;
  hashtags?: string;
  markAI?: boolean;
  needShareLink?: boolean;
}): Promise<PublishResult> {
  return apiPost<PublishResult>('/api/geelark/publish', params);
}

export interface TaskDetail {
  id: string;
  planName?: string;
  taskType?: number;
  serialName?: string;
  envId?: string;
  scheduleAt?: number;
  status?: number;
  statusText?: string;
  failCode?: number;
  failDesc?: string;
  cost?: number;
  resultImages?: string[];
  logs?: string[];
}

export async function fetchTaskDetail(taskId: string): Promise<TaskDetail> {
  return apiGet<TaskDetail>(`/api/geelark/task/${encodeURIComponent(taskId)}`);
}
