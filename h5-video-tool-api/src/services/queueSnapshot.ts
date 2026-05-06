import type { BatchJob, BatchJobStatus, QueueSnapshot } from './batchJobsQueue.js';
import { getArkSeedanceMaxConcurrent, isArkSeedanceEnabled } from './arkSeedanceVideo.js';

const DEFAULT_AVG_SEC_PER_JOB = 120;
const RECENT_SUCCESS_SAMPLE_SIZE = 10;

function getDreaminaMaxConcurrentFallback(): number {
  const raw = Number.parseInt(process.env.DREAMINA_MAX_CONCURRENT ?? '1', 10);
  return Number.isFinite(raw) && raw >= 1 ? raw : 1;
}

export function resolveBatchQueueMaxConcurrent(): number {
  return isArkSeedanceEnabled() ? getArkSeedanceMaxConcurrent() : getDreaminaMaxConcurrentFallback();
}

export function isActiveStatus(status: BatchJobStatus): boolean {
  return status === 'pending' || status === 'queuing' || status === 'processing';
}

export function computeSnapshotFromJobs(jobs: BatchJob[]): QueueSnapshot {
  const maxConcurrent = resolveBatchQueueMaxConcurrent();
  const totalActive = jobs.filter((job) => isActiveStatus(job.status)).length;
  const totalWaiting = jobs.filter((job) => job.status === 'awaiting_submit').length;
  const doneRecent = jobs
    .filter((job) => job.status === 'done')
    .sort((a, b) => (b.completedAt ?? b.updatedAt).localeCompare(a.completedAt ?? a.updatedAt))
    .slice(0, RECENT_SUCCESS_SAMPLE_SIZE);

  const recentSuccessAvgSec = doneRecent.length > 0
    ? Math.max(
        1,
        Math.round(
          doneRecent.reduce((sum, job) => {
            if (typeof job.actualDurationSec === 'number' && Number.isFinite(job.actualDurationSec)) {
              return sum + Math.max(0, job.actualDurationSec * 1000);
            }
            const startedAt = job.submittedAt ?? job.createdAt;
            const endedAt = job.completedAt ?? job.updatedAt;
            const ageMs = new Date(endedAt).getTime() - new Date(startedAt).getTime();
            return sum + Math.max(0, ageMs);
          }, 0) / doneRecent.length / 1000,
        ),
      )
    : DEFAULT_AVG_SEC_PER_JOB;

  return {
    totalActive,
    totalWaiting,
    avgSecPerJob: recentSuccessAvgSec,
    recentSuccessAvgSec,
    recentSuccessSampleCount: doneRecent.length,
    maxConcurrent,
    availableSlots: Math.max(0, maxConcurrent - totalActive),
  };
}

export function deriveQueuePositionPatches(
  jobs: BatchJob[],
): Map<string, { globalQueuePos?: number; etaSec?: number }> {
  const patches = new Map<string, { globalQueuePos?: number; etaSec?: number }>();
  const snapshot = computeSnapshotFromJobs(jobs);
  const waiting = jobs
    .filter((job) => job.status === 'awaiting_submit')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));

  for (let index = 0; index < waiting.length; index += 1) {
    const job = waiting[index];
    if (!job) continue;
    const globalQueuePos = index;
    const startsAhead = Math.max(0, index - snapshot.availableSlots + 1);
    const etaSec = Math.max(
      0,
      Math.ceil((startsAhead * snapshot.avgSecPerJob) / Math.max(1, snapshot.maxConcurrent)),
    );
    patches.set(job.id, { globalQueuePos, etaSec });
  }

  return patches;
}
