import {
  submitDreaminaMultimodalVideo,
  submitDreaminaVideo,
} from './dreaminaVideo.js';
import { isActiveStatus, resolveBatchQueueMaxConcurrent } from './queueSnapshot.js';
import type { BatchJob, BatchJobSubmitParams } from './batchJobsQueue.js';

export interface SchedulerOps {
  listJobs: () => Promise<BatchJob[]>;
  getJob: (id: string) => Promise<BatchJob | undefined>;
  markSubmitted: (
    id: string,
    payload: { submitId: string; taskId: string },
  ) => Promise<BatchJob | null>;
  markRetry: (id: string, attempts: number) => Promise<BatchJob | null>;
  markFailed: (id: string, failReason: string, attempts: number) => Promise<BatchJob | null>;
  onProductionSubmitted?: (job: BatchJob) => Promise<void>;
}

function getMaxConcurrent(): number {
  return resolveBatchQueueMaxConcurrent();
}

function is1310Error(message: string): boolean {
  return /ret[=:]\s*1310|ExceedConcurrencyLimit/i.test(message);
}

async function submitWaitingJob(params: BatchJobSubmitParams): Promise<{ submitId: string; taskId: string }> {
  const prompt = params.storyboardText ?? params.prompt ?? '';
  if (params.model === 'dreamina-multimodal') {
    return submitDreaminaMultimodalVideo({
      prompt,
      aspectRatio: params.aspectRatio,
      duration: params.duration,
      images: params.multimodalImages ?? [],
      videos: [],
      audios: [],
      modelVersion: params.dreaminaModelVersion,
    });
  }
  return submitDreaminaVideo({
    prompt,
    aspectRatio: params.aspectRatio as '9:16' | '16:9' | '1:1',
    duration: params.duration,
    model: params.model,
    imageBase64: params.imageBase64,
    imageMimeType: params.imageMimeType,
    modelVersion: params.dreaminaModelVersion,
  });
}

export async function scheduleTick(ops: SchedulerOps): Promise<boolean> {
  const maxConcurrent = getMaxConcurrent();
  let changed = false;

  while (true) {
    const jobs = await ops.listJobs();
    const activeCount = jobs.filter((job) => isActiveStatus(job.status)).length;
    if (activeCount >= maxConcurrent) return changed;

    const waiting = jobs
      .filter((job) => job.status === 'awaiting_submit' && job.submitParams && job.source !== 'quickfilm')
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));

    const next = waiting[0];
    if (!next) return changed;

    const fresh = await ops.getJob(next.id);
    if (!fresh || fresh.status !== 'awaiting_submit' || !fresh.submitParams) {
      continue;
    }

    try {
      const { submitId, taskId } = await submitWaitingJob(fresh.submitParams);
      const updated = await ops.markSubmitted(fresh.id, {
        submitId,
        taskId: taskId || `dreamina-${submitId}`,
      });
      if (updated?.source === 'production') {
        await ops.onProductionSubmitted?.(updated);
      }
      changed = true;
      continue;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (is1310Error(message)) {
        return changed;
      }
      const attempts = (fresh.submitAttempts ?? 0) + 1;
      if (attempts >= 10) {
        await ops.markFailed(fresh.id, `提交失败 ${attempts} 次：${message}`, attempts);
      } else {
        await ops.markRetry(fresh.id, attempts);
      }
      changed = true;
      return changed;
    }
  }
}
