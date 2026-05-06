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

export type FriendlyVideoProgressStage =
  | 'idle'
  | 'queued'
  | 'starting'
  | 'generating'
  | 'finishing'
  | 'done'
  | 'failed'
  | 'cancelled';

export interface FriendlyVideoProgress {
  stage: FriendlyVideoProgressStage;
  shortLabelZh: string;
  shortLabelEn: string;
  titleZh: string;
  titleEn: string;
  detailZh: string;
  detailEn: string;
}

type FriendlyProgressJob = Pick<
  BatchJobDto,
  'status' | 'globalQueuePos' | 'etaSec' | 'queueInfo' | 'submittedAt' | 'createdAt'
>;

type FriendlyProgressSnapshot = Pick<
  QueueSnapshotDto,
  'avgSecPerJob' | 'recentSuccessAvgSec' | 'recentSuccessSampleCount'
>;

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

export function formatFriendlyEta(
  etaSec: number | undefined,
  uiLocale: 'zh-CN' | 'en',
): string {
  if (!etaSec || etaSec <= 0) {
    return uiLocale === 'en' ? 'starting soon' : '即将开始';
  }
  if (etaSec < 60) {
    return uiLocale === 'en' ? 'less than 1 min' : '不到 1 分钟';
  }
  if (etaSec < 3600) {
    const mins = Math.max(1, Math.round(etaSec / 60));
    return uiLocale === 'en' ? `about ${mins} min` : `约 ${mins} 分钟`;
  }
  const hours = Math.max(1, Math.round(etaSec / 3600));
  return uiLocale === 'en' ? `about ${hours} hr` : `约 ${hours} 小时`;
}

export function resolveFriendlyVideoProgress(input: {
  job?: FriendlyProgressJob | null;
  snapshot?: FriendlyProgressSnapshot | null;
  nowMs?: number;
}): FriendlyVideoProgress {
  const job = input.job;
  const snapshot = input.snapshot;
  const nowMs = input.nowMs ?? Date.now();
  const recentAvgSec = Math.max(
    1,
    Math.round(snapshot?.recentSuccessAvgSec ?? snapshot?.avgSecPerJob ?? 120),
  );

  if (!job) {
    return {
      stage: 'idle',
      shortLabelZh: '未开始',
      shortLabelEn: 'Not started',
      titleZh: '还没有开始生成',
      titleEn: 'Generation has not started yet',
      detailZh: '准备好后点击生成，系统会自动排队并处理。',
      detailEn: 'Start generation when ready and the system will queue and process it automatically.',
    };
  }

  if (job.status === 'failed') {
    return {
      stage: 'failed',
      shortLabelZh: '生成失败',
      shortLabelEn: 'Failed',
      titleZh: '这条视频生成失败了',
      titleEn: 'This video failed to generate',
      detailZh: '可以直接重试，或先调整文案与素材后再生成。',
      detailEn: 'You can retry now, or adjust the prompt and materials before trying again.',
    };
  }

  if (job.status === 'cancelled') {
    return {
      stage: 'cancelled',
      shortLabelZh: '已停止',
      shortLabelEn: 'Stopped',
      titleZh: '这条任务已经停止',
      titleEn: 'This task has been stopped',
      detailZh: '如果还需要视频，可以重新发起生成。',
      detailEn: 'If you still need the video, start generation again.',
    };
  }

  if (job.status === 'done') {
    return {
      stage: 'done',
      shortLabelZh: '已完成',
      shortLabelEn: 'Done',
      titleZh: '视频已经生成完成',
      titleEn: 'The video is ready',
      detailZh: '可以直接预览、选版本，或继续生成新版本。',
      detailEn: 'You can preview it now, choose a version, or generate another version.',
    };
  }

  if (job.status === 'awaiting_submit') {
    const queuePosition = typeof job.globalQueuePos === 'number' ? job.globalQueuePos + 1 : null;
    const aheadCount = queuePosition != null ? Math.max(0, queuePosition - 1) : null;
    const etaZh = formatFriendlyEta(job.etaSec, 'zh-CN');
    const etaEn = formatFriendlyEta(job.etaSec, 'en');

    return {
      stage: 'queued',
      shortLabelZh: '排队中',
      shortLabelEn: 'Queued',
      titleZh: '当前视频正在排队',
      titleEn: 'This video is waiting in line',
      detailZh: aheadCount != null
        ? `前面还有 ${aheadCount} 条，预计${etaZh}后开始。`
        : `正在等待轮到当前视频，预计${etaZh}后开始。`,
      detailEn: aheadCount != null
        ? `${aheadCount} ahead in the queue. Estimated start: ${etaEn}.`
        : `Waiting for its turn. Estimated start: ${etaEn}.`,
    };
  }

  if (job.status === 'pending') {
    return {
      stage: 'starting',
      shortLabelZh: '即将开始',
      shortLabelEn: 'Starting soon',
      titleZh: '已经轮到当前视频',
      titleEn: 'This video is up next',
      detailZh: '系统已经接手，正在准备开始生成。',
      detailEn: 'The system has picked it up and is getting ready to start.',
    };
  }

  if (job.status === 'queuing') {
    const queuePosition = typeof job.queueInfo?.queue_idx === 'number' ? job.queueInfo.queue_idx + 1 : null;
    const aheadCount = queuePosition != null ? Math.max(0, queuePosition - 1) : null;
    return {
      stage: 'starting',
      shortLabelZh: '即将开始',
      shortLabelEn: 'Starting soon',
      titleZh: '已经进入生成队列',
      titleEn: 'This video is in the render queue',
      detailZh: aheadCount != null
        ? `生成已经排到前面了，前面还有 ${aheadCount} 条，通常很快开始。`
        : '生成已经排到前面了，通常很快开始。',
      detailEn: aheadCount != null
        ? `It is already in the render queue with ${aheadCount} ahead, and should start soon.`
        : 'It is already in the render queue and should start soon.',
    };
  }

  const startedAt = new Date(job.submittedAt ?? job.createdAt ?? nowMs).getTime();
  const elapsedSec = Math.max(0, Math.round((nowMs - startedAt) / 1000));
  const remainingSec = Math.max(0, recentAvgSec - elapsedSec);
  if (elapsedSec >= Math.max(45, Math.round(recentAvgSec * 0.8))) {
    return {
      stage: 'finishing',
      shortLabelZh: '即将完成',
      shortLabelEn: 'Finishing soon',
      titleZh: '已经生成一会儿了',
      titleEn: 'It is close to finishing',
      detailZh: '当前视频已经生成一会儿了，预计很快完成。',
      detailEn: 'This video has been generating for a while and should finish soon.',
    };
  }

  return {
    stage: 'generating',
    shortLabelZh: '正在生成',
    shortLabelEn: 'Generating',
    titleZh: '当前视频正在生成',
    titleEn: 'This video is generating now',
    detailZh: `已经开始生成，通常还需 ${formatFriendlyEta(remainingSec, 'zh-CN')}。`,
    detailEn: `Generation has started and usually needs ${formatFriendlyEta(remainingSec, 'en')} more.`,
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
