import type { BatchJobDto } from '../api/batchJobs';
import {
  hasProductionExecutionSegmentPreviewMedia,
  hasProductionShotPreviewMedia,
  type ProductionExecutionSegment,
  type ProductionExecutionSegmentStatus,
  type ProductionShot,
} from './productionTypes.ts';
import {
  getShotUserStatus,
  getShotUserStatusLabelKey,
  type ShotProviderStatus,
  type ShotUserStatus,
} from './shotUserStatus.ts';

export type ExecutionSegmentJobStatusMap = Partial<Record<string, ShotProviderStatus>>;
export type ExecutionSegmentActiveJobMap = Partial<Record<string, BatchJobDto>>;

export type ExecutionSegmentRuntimeState = {
  segment: ProductionExecutionSegment;
  hasVideo: boolean;
  providerStatus?: ShotProviderStatus;
  userStatus: ShotUserStatus;
  labelKey: string;
  activeJob?: BatchJobDto;
  platformQueuePosition?: number;
  dreaminaQueuePosition?: number;
  dreaminaQueueSize?: number;
  etaSec?: number;
  pendingSubmitId?: string;
  failReason?: string;
};

export type ShotExecutionSegmentSummary = {
  totalSegments: number;
  completedSegments: number;
  directSegments: number;
  mergedSegments: number;
  splitSegments: number;
  sharedSegments: number;
  hasPartialCompletion: boolean;
};

export type ShotAggregateStatus = {
  shot: ProductionShot;
  userStatus: ShotUserStatus;
  labelKey: string;
  providerStatus?: ShotProviderStatus;
  hasVideo: boolean;
  runtimeSegments: ExecutionSegmentRuntimeState[];
  summary: ShotExecutionSegmentSummary;
  platformQueuePosition?: number;
  dreaminaQueuePosition?: number;
  dreaminaQueueSize?: number;
  etaSec?: number;
};

function normalizeStoredProviderStatus(
  status: ProductionExecutionSegmentStatus | undefined,
): ShotProviderStatus | undefined {
  if (!status || status === 'idle') return undefined;
  return status === 'done' ? 'done' : status;
}

const ACTIVE_STATUS_RANK: Record<string, number> = {
  processing: 4,
  queuing: 3,
  pending: 2,
  awaiting_submit: 1,
};

function isDirectCompatibleSegment(segment: ProductionExecutionSegment): boolean {
  return segment.mode === 'direct' && segment.sourceShotIndexes.length === 1;
}

export function resolveSegmentStatus(
  segment: ProductionExecutionSegment,
  relatedJobs: BatchJobDto[],
): ProductionExecutionSegmentStatus {
  const priority: Record<BatchJobDto['status'], number> = {
    processing: 6,
    queuing: 5,
    pending: 4,
    awaiting_submit: 3,
    failed: 2,
    cancelled: 2,
    done: 1,
  };
  const activeJob = [...relatedJobs].sort((a, b) => (
    (priority[b.status] ?? 0) - (priority[a.status] ?? 0)
    || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  ))[0];

  if (activeJob?.status) return activeJob.status;
  if (segment.status) return segment.status;
  if (hasProductionExecutionSegmentPreviewMedia(segment)) return 'done';
  if (segment.lastVideoError?.cancelled) return 'cancelled';
  if (segment.failReason || segment.lastVideoError?.reason) return 'failed';
  if (segment.pendingVideoSubmitId?.trim() || segment.submitId?.trim()) return 'processing';
  return 'idle';
}

export function resolveExecutionSegmentRuntimeState(
  shot: ProductionShot,
  segment: ProductionExecutionSegment,
  options: {
    shotBusyMap?: Record<string, 'frame' | 'video'>;
    shotActiveJobMap?: ExecutionSegmentActiveJobMap;
    shotJobStatusMap?: ExecutionSegmentJobStatusMap;
    segmentJobsMap?: Record<string, BatchJobDto[]>;
  } = {},
): ExecutionSegmentRuntimeState {
  const shotKey = String(segment.primaryShotIndex);
  const useShotMaps = isDirectCompatibleSegment(segment);
  const segmentJobs = options.segmentJobsMap?.[segment.id] ?? [];
  const activeJob = [...segmentJobs]
    .filter((job) => ACTIVE_STATUS_RANK[job.status])
    .sort((a, b) => {
      const rankDiff = ACTIVE_STATUS_RANK[b.status] - ACTIVE_STATUS_RANK[a.status];
      if (rankDiff !== 0) return rankDiff;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    })[0]
    ?? (useShotMaps ? options.shotActiveJobMap?.[shotKey] : undefined);
  const latestTerminalJob = [...segmentJobs]
    .filter((job) => job.status === 'done' || job.status === 'failed' || job.status === 'cancelled')
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
  const mappedProviderStatus = useShotMaps
    ? ((activeJob?.status ?? options.shotJobStatusMap?.[shotKey]) as ShotProviderStatus | undefined)
    : undefined;
  const providerStatus = activeJob?.status
    ?? latestTerminalJob?.status
    ?? mappedProviderStatus
    ?? normalizeStoredProviderStatus(segment.status);
  const pendingSubmitId = activeJob?.submitId?.trim()
    || segment.pendingVideoSubmitId?.trim()
    || segment.submitId?.trim()
    || (useShotMaps ? shot.pendingVideoSubmitId?.trim() : undefined)
    || undefined;
  const hasVideo = hasProductionExecutionSegmentPreviewMedia(segment)
    || !!latestTerminalJob?.videoUrl?.trim()
    || (useShotMaps && hasProductionShotPreviewMedia(shot));
  const userStatus = getShotUserStatus({
    hasVideo,
    jobStatus: providerStatus,
    hasPendingSubmitId: !!pendingSubmitId || (useShotMaps && options.shotBusyMap?.[shotKey] === 'video'),
  });

  return {
    segment,
    hasVideo,
    providerStatus,
    userStatus: userStatus.status,
    labelKey: userStatus.labelKey,
    activeJob,
    platformQueuePosition: typeof activeJob?.globalQueuePos === 'number'
      ? activeJob.globalQueuePos + 1
      : typeof segment.globalQueuePos === 'number'
        ? segment.globalQueuePos + 1
        : undefined,
    dreaminaQueuePosition: typeof activeJob?.queueInfo?.queue_idx === 'number'
      ? activeJob.queueInfo.queue_idx + 1
      : typeof segment.queueInfo?.queue_idx === 'number'
        ? segment.queueInfo.queue_idx + 1
        : undefined,
    dreaminaQueueSize: typeof activeJob?.queueInfo?.queue_length === 'number'
      ? activeJob.queueInfo.queue_length
      : typeof segment.queueInfo?.queue_length === 'number'
        ? segment.queueInfo.queue_length
        : undefined,
    etaSec: activeJob?.etaSec ?? segment.etaSec,
    pendingSubmitId,
    failReason: activeJob?.failReason
      || latestTerminalJob?.failReason
      || segment.failReason
      || segment.lastVideoError?.reason
      || (useShotMaps ? shot.lastVideoError?.reason : undefined),
  };
}

function buildSummary(runtimeSegments: ExecutionSegmentRuntimeState[]): ShotExecutionSegmentSummary {
  const summary: ShotExecutionSegmentSummary = {
    totalSegments: runtimeSegments.length,
    completedSegments: 0,
    directSegments: 0,
    mergedSegments: 0,
    splitSegments: 0,
    sharedSegments: 0,
    hasPartialCompletion: false,
  };

  for (const runtime of runtimeSegments) {
    if (runtime.userStatus === 'completed') summary.completedSegments += 1;
    if (runtime.segment.mode === 'direct') summary.directSegments += 1;
    if (runtime.segment.mode === 'merged_short') summary.mergedSegments += 1;
    if (runtime.segment.mode === 'split_long') summary.splitSegments += 1;
    if (runtime.segment.sourceShotIndexes.length > 1) summary.sharedSegments += 1;
  }

  summary.hasPartialCompletion = summary.completedSegments > 0 && summary.completedSegments < summary.totalSegments;
  return summary;
}

function buildFallbackAggregate(
  shot: ProductionShot,
  options: {
    shotBusyMap?: Record<string, 'frame' | 'video'>;
    shotActiveJobMap?: ExecutionSegmentActiveJobMap;
    shotJobStatusMap?: ExecutionSegmentJobStatusMap;
  } = {},
): ShotAggregateStatus {
  const shotKey = String(shot.shotIndex);
  const activeJob = options.shotActiveJobMap?.[shotKey];
  const providerStatus = (activeJob?.status ?? options.shotJobStatusMap?.[shotKey]) as ShotProviderStatus | undefined;
  const hasVideo = hasProductionShotPreviewMedia(shot);
  const userStatus = getShotUserStatus({
    hasVideo,
    jobStatus: providerStatus,
    hasPendingSubmitId: !!shot.pendingVideoSubmitId || options.shotBusyMap?.[shotKey] === 'video',
  });

  return {
    shot,
    userStatus: userStatus.status,
    labelKey: userStatus.labelKey,
    providerStatus,
    hasVideo,
    runtimeSegments: [],
    summary: {
      totalSegments: 0,
      completedSegments: hasVideo ? 1 : 0,
      directSegments: 0,
      mergedSegments: 0,
      splitSegments: 0,
      sharedSegments: 0,
      hasPartialCompletion: false,
    },
    platformQueuePosition: typeof activeJob?.globalQueuePos === 'number' ? activeJob.globalQueuePos + 1 : undefined,
    dreaminaQueuePosition: typeof activeJob?.queueInfo?.queue_idx === 'number' ? activeJob.queueInfo.queue_idx + 1 : undefined,
    dreaminaQueueSize: typeof activeJob?.queueInfo?.queue_length === 'number' ? activeJob.queueInfo.queue_length : undefined,
    etaSec: activeJob?.etaSec,
  };
}

export function resolveShotAggregateStatus(
  shot: ProductionShot,
  segments: ProductionExecutionSegment[],
  options: {
    shotBusyMap?: Record<string, 'frame' | 'video'>;
    shotActiveJobMap?: ExecutionSegmentActiveJobMap;
    shotJobStatusMap?: ExecutionSegmentJobStatusMap;
    segmentJobsMap?: Record<string, BatchJobDto[]>;
  } = {},
): ShotAggregateStatus {
  if (!segments.length) return buildFallbackAggregate(shot, options);

  const runtimeSegments = segments.map((segment) => resolveExecutionSegmentRuntimeState(shot, segment, options));
  const summary = buildSummary(runtimeSegments);
  const counts = runtimeSegments.reduce(
    (acc, runtime) => {
      acc[runtime.userStatus] += 1;
      return acc;
    },
    {
      not_started: 0,
      waiting_submit: 0,
      platform_queueing: 0,
      generating: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
    } as Record<ShotUserStatus, number>,
  );

  let userStatus: ShotUserStatus = 'not_started';
  if (counts.completed === runtimeSegments.length) {
    userStatus = 'completed';
  } else if (counts.generating > 0) {
    userStatus = 'generating';
  } else if (counts.platform_queueing > 0) {
    userStatus = 'platform_queueing';
  } else if (counts.waiting_submit > 0) {
    userStatus = 'waiting_submit';
  } else if (counts.failed > 0) {
    userStatus = 'failed';
  } else if (counts.cancelled === runtimeSegments.length || (counts.cancelled > 0 && counts.completed === 0)) {
    userStatus = 'cancelled';
  }

  const queueLeader = runtimeSegments
    .filter((runtime) => runtime.platformQueuePosition != null || runtime.dreaminaQueuePosition != null)
    .sort((a, b) => (a.platformQueuePosition ?? Number.MAX_SAFE_INTEGER) - (b.platformQueuePosition ?? Number.MAX_SAFE_INTEGER))[0];
  const providerStatus = runtimeSegments.find((runtime) => runtime.providerStatus)?.providerStatus;

  return {
    shot,
    userStatus,
    labelKey: getShotUserStatusLabelKey(userStatus),
    providerStatus,
    hasVideo: summary.completedSegments > 0,
    runtimeSegments,
    summary,
    platformQueuePosition: queueLeader?.platformQueuePosition,
    dreaminaQueuePosition: queueLeader?.dreaminaQueuePosition,
    dreaminaQueueSize: queueLeader?.dreaminaQueueSize,
    etaSec: queueLeader?.etaSec,
  };
}

export function resolveShotAggregateProviderStatus(
  shot: ProductionShot,
  segments: ProductionExecutionSegment[],
): ShotProviderStatus | undefined {
  if (!segments.length) {
    return hasProductionShotPreviewMedia(shot) ? 'done' : undefined;
  }

  const statuses = segments.map((segment) => normalizeStoredProviderStatus(segment.status));
  if (statuses.every((status) => status === 'done')) return 'done';
  if (statuses.some((status) => status === 'processing')) return 'processing';
  if (statuses.some((status) => status === 'queuing' || status === 'pending')) return 'queuing';
  if (statuses.some((status) => status === 'awaiting_submit')) return 'awaiting_submit';
  if (statuses.some((status) => status === 'failed')) return 'failed';
  if (statuses.every((status) => status === 'cancelled')) return 'cancelled';
  return undefined;
}
