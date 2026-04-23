import type { BatchJobDto } from '../api/batchJobs';
import { hasProductionShotPreviewMedia, type ProductionShot } from './productionTypes.ts';
import { getShotUserStatus, type ShotProviderStatus, type ShotUserStatus } from './shotUserStatus.ts';

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
  return shots.map((shot) => {
    const shotKey = String(shot.shotIndex);
    const activeJob = shotActiveJobMap?.[shotKey];
    const providerStatus = (activeJob?.status ?? shotJobStatusMap?.[shotKey]) as ShotProviderStatus | undefined;
    const hasVideo = hasProductionShotPreviewMedia(shot);
    const userStatus = getShotUserStatus({
      hasVideo,
      jobStatus: providerStatus,
      hasPendingSubmitId: !!shot.pendingVideoSubmitId,
    });

    return {
      shot,
      shotKey,
      hasVideo,
      activeJob,
      providerStatus,
      userStatus: userStatus.status,
      labelKey: userStatus.labelKey,
      platformQueuePosition: typeof activeJob?.globalQueuePos === 'number' ? activeJob.globalQueuePos + 1 : undefined,
      dreaminaQueuePosition: typeof activeJob?.queueInfo?.queue_idx === 'number' ? activeJob.queueInfo.queue_idx + 1 : undefined,
      dreaminaQueueSize: typeof activeJob?.queueInfo?.queue_length === 'number' ? activeJob.queueInfo.queue_length : undefined,
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
