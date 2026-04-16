import { apiGet, apiPost, apiDelete } from './client';
import type { UnifiedJobStatus } from '../types/jobStatus';

export interface BatchJobDto {
  id: string;
  submitId: string;
  taskId: string;
  projectId: string;
  shotIndex: number;
  shotDescription: string;
  model: string;
  source?: 'production' | 'quickfilm';
  status: 'pending' | 'queuing' | 'processing' | 'done' | 'failed' | 'cancelled' | 'awaiting_submit';
  /** 统一状态（后端自动附加），新代码优先使用此字段 */
  unifiedStatus?: UnifiedJobStatus;
  createdAt: string;
  updatedAt: string;
  videoUrl?: string;
  failReason?: string;
  queueInfo?: {
    queue_idx?: number;
    queue_length?: number;
    queue_status?: string;
  };
}

export interface BatchSubmitShot {
  submitId: string;
  taskId?: string;
  shotIndex: number;
  shotDescription?: string;
  model?: string;
}

export async function submitBatchJobs(
  projectId: string,
  shots: BatchSubmitShot[],
): Promise<{ added: number; jobs: BatchJobDto[] }> {
  return apiPost('/api/batch-jobs', { projectId, shots });
}

export async function getBatchJobs(projectId?: string): Promise<{ jobs: BatchJobDto[] }> {
  const q = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
  return apiGet(`/api/batch-jobs${q}`);
}

export async function cancelBatchJob(id: string): Promise<{ ok: boolean }> {
  return apiDelete(`/api/batch-jobs/${id}`);
}

/** 批量取消项目内所有未完成任务 */
export async function cancelBatchByProject(projectId: string): Promise<{ cancelled: number; total: number }> {
  return apiDelete(`/api/batch-jobs/project/${encodeURIComponent(projectId)}`);
}

/** 手动立即轮询某个 batch-job（用户点「检查进度」） */
export async function pollBatchJobNow(id: string): Promise<{ job: BatchJobDto }> {
  return apiPost(`/api/batch-jobs/${id}/poll-now`, {});
}
