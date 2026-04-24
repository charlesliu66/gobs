import type { BatchJobDto } from '../api/batchJobs';
import type { ProductionShot } from './productionTypes.ts';
import { type ShotProviderStatus, type ShotUserStatus } from './shotUserStatus.ts';
import { getStoredExecutionSegmentsForShots } from './productionWizardStorage.ts';
import { getSegmentsForShot } from './executionSegments.ts';
import { resolveShotAggregateStatus } from './executionSegmentStatus.ts';

export type ShotStatusMap = Partial<Record<string, ShotProviderStatus>>;
export type ShotActiveJobMap = Partial<Record<string, BatchJobDto>>;

export type ExportStoryboardShotStatus = {
  shot: ProductionShot;
  shotKey: string;
  hasVideo: boolean;
  activeJob?: BatchJobDto;
  providerStatus?: ShotProviderStatus;
  userStatus: ShotUserStatus;
  labelKey: string;
  platformQueuePosition?: number;
  dreaminaQueuePosition?: number;
  dreaminaQueueSize?: number;
};

export type ExportStoryboardStatusSummary = {
  all: number;
  completed: number;
  queued: number;
  needsAction: number;
  notStarted: number;
  failed: number;
  cancelled: number;
  waitingSubmit: number;
  platformQueueing: number;
  generating: number;
};

export function buildExportStoryboardShotStatuses(
  shots: ProductionShot[],
  shotActiveJobMap?: ShotActiveJobMap,
  shotJobStatusMap?: ShotStatusMap,
): ExportStoryboardShotStatus[] {
  const storedExecutionSegments = getStoredExecutionSegmentsForShots(shots);
  return shots.map((shot) => {
    const shotKey = String(shot.shotIndex);
    const activeJob = shotActiveJobMap?.[shotKey];
    const aggregateStatus = resolveShotAggregateStatus(
      shot,
      getSegmentsForShot({ executionSegments: storedExecutionSegments ?? [] }, shot),
      {
        shotActiveJobMap,
        shotJobStatusMap,
      },
    );

    return {
      shot,
      shotKey,
      hasVideo: aggregateStatus.hasVideo,
      activeJob,
      providerStatus: aggregateStatus.providerStatus,
      userStatus: aggregateStatus.userStatus,
      labelKey: aggregateStatus.labelKey,
      platformQueuePosition: aggregateStatus.platformQueuePosition,
      dreaminaQueuePosition: aggregateStatus.dreaminaQueuePosition,
      dreaminaQueueSize: aggregateStatus.dreaminaQueueSize,
    };
  });
}

export function summarizeExportStoryboardStatus(
  items: ExportStoryboardShotStatus[],
): ExportStoryboardStatusSummary {
  const summary: ExportStoryboardStatusSummary = {
    all: items.length,
    completed: 0,
    queued: 0,
    needsAction: 0,
    notStarted: 0,
    failed: 0,
    cancelled: 0,
    waitingSubmit: 0,
    platformQueueing: 0,
    generating: 0,
  };

  for (const item of items) {
    if (item.userStatus === 'completed') summary.completed += 1;
    if (item.userStatus === 'waiting_submit') summary.waitingSubmit += 1;
    if (item.userStatus === 'platform_queueing') summary.platformQueueing += 1;
    if (item.userStatus === 'generating') summary.generating += 1;
    if (item.userStatus === 'not_started') summary.notStarted += 1;
    if (item.userStatus === 'failed') summary.failed += 1;
    if (item.userStatus === 'cancelled') summary.cancelled += 1;
  }

  summary.queued = summary.waitingSubmit + summary.platformQueueing + summary.generating;
  summary.needsAction = summary.notStarted + summary.failed + summary.cancelled;
  return summary;
}
