import { apiGet, apiPost, apiDelete } from './client';

export interface BatchJobDto {
  id: string;
  submitId: string;
  taskId: string;
  projectId: string;
  shotIndex: number;
  shotDescription: string;
  model: string;
  source?: 'production' | 'quickfilm';
  status: 'pending' | 'queuing' | 'processing' | 'done' | 'failed' | 'cancelled';
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
