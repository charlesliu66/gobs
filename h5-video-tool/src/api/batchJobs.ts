import { apiDelete, apiGet, apiPost } from './client';
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
  unifiedStatus?: UnifiedJobStatus;
  createdAt: string;
  updatedAt: string;
  videoUrl?: string;
  failReason?: string;
  cancelledAt?: string;
  cancelReason?: 'user' | 'project_deleted' | 'admin';
  globalQueuePos?: number;
  etaSec?: number;
  submitAttempts?: number;
  queueInfo?: {
    queue_idx?: number;
    queue_length?: number;
    queue_status?: string;
  };
}

export interface QueueSnapshotDto {
  totalActive: number;
  totalWaiting: number;
  avgSecPerJob: number;
}

export interface CancelResultDto {
  ok: boolean;
  wasteCredit: boolean;
  note: string;
  reason?: 'not_found' | 'already_terminal' | 'forbidden';
}

export interface BatchSubmitShot {
  submitId: string;
  taskId?: string;
  shotIndex: number;
  shotDescription?: string;
  model?: string;
}

export interface EnqueueProductionShotParams {
  storyboardText?: string;
  prompt?: string;
  aspectRatio: string;
  duration: number;
  model: string;
  imageBase64?: string;
  imageMimeType?: string;
  multimodalImages?: Array<{ base64: string; mimeType?: string }>;
  dreaminaModelVersion?: string;
}

export async function submitBatchJobs(
  projectId: string,
  shots: BatchSubmitShot[],
): Promise<{ added: number; jobs: BatchJobDto[] }> {
  return apiPost('/api/batch-jobs', { projectId, shots });
}

export async function enqueueProductionShot(
  projectId: string,
  shotIndex: number,
  submitParams: EnqueueProductionShotParams,
): Promise<{ jobId: string; globalQueuePos: number; etaSec: number; job?: BatchJobDto }> {
  return apiPost('/api/batch-jobs/enqueue', { projectId, shotIndex, submitParams });
}

export async function getBatchJobs(projectId?: string): Promise<{ jobs: BatchJobDto[] }> {
  const query = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
  return apiGet(`/api/batch-jobs${query}`);
}

export async function cancelBatchJob(id: string): Promise<CancelResultDto> {
  return apiDelete(`/api/batch-jobs/${id}`);
}

export async function cancelBatchByProject(
  projectId: string,
  shotIndexes?: number[],
): Promise<{ cancelled: number; total: number }> {
  const query = shotIndexes?.length
    ? `?shotIndexes=${encodeURIComponent(shotIndexes.join(','))}`
    : '';
  return apiDelete(`/api/batch-jobs/project/${encodeURIComponent(projectId)}${query}`);
}

export async function pollBatchJobNow(id: string): Promise<{ job: BatchJobDto }> {
  return apiPost(`/api/batch-jobs/${id}/poll-now`, {});
}
