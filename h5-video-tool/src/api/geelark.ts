import { apiGet, apiPost } from './client';
import type { PublishBatchResponse } from '../utils/geelarkPublishBatch';

export interface GeelarkAccount {
  id: string;
  username: string;
  region?: string;
  platform?: string;
  remark?: string;
  profileUrl?: string;
  canPost?: boolean;
}

export async function fetchAccounts(): Promise<GeelarkAccount[]> {
  const res = await apiGet<{ accounts: GeelarkAccount[] }>('/api/geelark/accounts');
  return res.accounts || [];
}

export interface PublishResult {
  taskIds: string[];
  planName?: string;
  batch?: PublishBatchResponse;
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
  shareLink?: string;
  logs?: string[];
}

export async function fetchTaskDetail(taskId: string): Promise<TaskDetail> {
  return apiGet<TaskDetail>(`/api/geelark/task/${encodeURIComponent(taskId)}`);
}

export interface TaskHistoryItem {
  id?: string;
  taskId?: string;
  planName?: string;
  plan_name?: string;
  taskType?: number;
  serialName?: string;
  serial_name?: string;
  scheduleAt?: number;
  schedule_at?: number;
  createdAt?: number;
  created_at?: number;
  createTime?: number;
  create_time?: number;
  status?: number;
  taskStatus?: number;
  task_status?: number;
  statusText?: string;
  status_text?: string;
  failDesc?: string;
  fail_desc?: string;
  shareLink?: string;
  shareUrl?: string;
  share_url?: string;
  postUrl?: string;
  post_url?: string;
  videoUrl?: string;
  url?: string;
  resultImages?: string[];
  result_images?: string[];
  images?: string[];
}

export interface TaskHistoryResponse {
  items: TaskHistoryItem[];
}

export interface FetchTaskHistoryOptions {
  size?: number;
}

export function buildTaskHistoryQuery(options?: FetchTaskHistoryOptions): string {
  const size = options?.size;
  if (!size) return '';
  const q = new URLSearchParams();
  q.set('size', String(Math.min(Math.max(size, 1), 100)));
  return `?${q.toString()}`;
}

export async function fetchTaskHistory(options?: FetchTaskHistoryOptions): Promise<TaskHistoryResponse> {
  return apiGet<TaskHistoryResponse>(`/api/geelark/tasks${buildTaskHistoryQuery(options)}`);
}
