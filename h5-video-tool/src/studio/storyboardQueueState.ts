import type { BatchJobDto, QueueSnapshotDto } from '../api/batchJobs';

export type StoryboardSnapshotSource = 'stream' | 'local_fallback';

export interface ResolvedStoryboardQueueSnapshot {
  source: StoryboardSnapshotSource;
  snapshot: QueueSnapshotDto;
}

export interface EnqueueJobState {
  kind: 'queued' | 'submitted' | 'processing' | 'failed' | 'cancelled';
  isError: boolean;
  message: string | null;
}

function isWaitingJob(job: Pick<BatchJobDto, 'status'>): boolean {
  return job.status === 'awaiting_submit';
}

function isActiveJob(job: Pick<BatchJobDto, 'status'>): boolean {
  return job.status === 'pending' || job.status === 'queuing' || job.status === 'processing';
}

export function resolveStoryboardQueueSnapshot(
  snapshot: QueueSnapshotDto,
  jobs: Array<Pick<BatchJobDto, 'status'>>,
): ResolvedStoryboardQueueSnapshot {
  if (snapshot.totalActive > 0 || snapshot.totalWaiting > 0) {
    return { source: 'stream', snapshot };
  }

  const totalWaiting = jobs.filter(isWaitingJob).length;
  const totalActive = jobs.filter(isActiveJob).length;
  if (totalActive === 0 && totalWaiting === 0) {
    return { source: 'stream', snapshot };
  }

  return {
    source: 'local_fallback',
    snapshot: {
      totalActive,
      totalWaiting,
      avgSecPerJob: snapshot.avgSecPerJob || 120,
      recentSuccessAvgSec: snapshot.recentSuccessAvgSec,
      recentSuccessSampleCount: snapshot.recentSuccessSampleCount,
      maxConcurrent: snapshot.maxConcurrent || 3,
      availableSlots: typeof snapshot.availableSlots === 'number'
        ? snapshot.availableSlots
        : Math.max(0, (snapshot.maxConcurrent || 3) - totalActive),
    },
  };
}

export function resolveEnqueueJobState(
  job?: Pick<BatchJobDto, 'status' | 'failReason'> | null,
): EnqueueJobState {
  if (!job) {
    return { kind: 'queued', isError: false, message: null };
  }
  if (job.status === 'failed') {
    return {
      kind: 'failed',
      isError: true,
      message: job.failReason?.trim() || null,
    };
  }
  if (job.status === 'cancelled') {
    return {
      kind: 'cancelled',
      isError: true,
      message: job.failReason?.trim() || null,
    };
  }
  if (job.status === 'processing') {
    return { kind: 'processing', isError: false, message: null };
  }
  if (job.status === 'pending' || job.status === 'queuing') {
    return { kind: 'submitted', isError: false, message: null };
  }
  return { kind: 'queued', isError: false, message: null };
}
