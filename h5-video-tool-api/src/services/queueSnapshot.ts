import type { BatchJob, BatchJobStatus, QueueSnapshot } from './batchJobsQueue.js';

const DEFAULT_AVG_SEC_PER_JOB = 120;
const DONE_SAMPLE_SIZE = 20;

export function isActiveStatus(status: BatchJobStatus): boolean {
  return status === 'pending' || status === 'queuing' || status === 'processing';
}

export function computeSnapshotFromJobs(jobs: BatchJob[]): QueueSnapshot {
  const totalActive = jobs.filter((job) => isActiveStatus(job.status)).length;
  const totalWaiting = jobs.filter((job) => job.status === 'awaiting_submit').length;
  const doneRecent = jobs
    .filter((job) => job.status === 'done')
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, DONE_SAMPLE_SIZE);

  const avgSecPerJob = doneRecent.length > 0
    ? Math.max(
        1,
        Math.round(
          doneRecent.reduce((sum, job) => {
            const ageMs = new Date(job.updatedAt).getTime() - new Date(job.createdAt).getTime();
            return sum + Math.max(0, ageMs);
          }, 0) / doneRecent.length / 1000,
        ),
      )
    : DEFAULT_AVG_SEC_PER_JOB;

  return { totalActive, totalWaiting, avgSecPerJob };
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
    const globalQueuePos = snapshot.totalActive + index;
    const etaSec = Math.max(0, globalQueuePos * snapshot.avgSecPerJob);
    patches.set(job.id, { globalQueuePos, etaSec });
  }

  return patches;
}
