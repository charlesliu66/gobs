import { useState } from 'react';
import type { BatchJobDto, QueueSnapshotDto } from '../../api/batchJobs';
import { useLocale } from '../../i18n/LocaleContext.tsx';
import { pickUiText } from '../../i18n/uiText.ts';
import { hasProductionShotPreviewMedia, type ProductionShot, type SceneSheet } from '../productionTypes';
import {
  getShotUserStatus,
  getShotUserStatusLabelKey,
  type ShotProviderStatus,
  type ShotUserStatus,
} from '../shotUserStatus';

export type ShotJobStatus = Exclude<ShotProviderStatus, 'done'>;
type ShotFilter = ShotUserStatus | 'all';

const FILTERS: ShotFilter[] = [
  'all',
  'not_started',
  'waiting_submit',
  'platform_queueing',
  'generating',
  'completed',
  'failed',
  'cancelled',
];

const STATUS_BADGE_CLASS: Record<ShotUserStatus, string> = {
  not_started: 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]',
  waiting_submit: 'border-violet-500/30 bg-violet-500/10 text-violet-200',
  platform_queueing: 'border-sky-500/30 bg-sky-500/10 text-sky-200',
  generating: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  completed: 'border-green-500/30 bg-green-500/10 text-green-200',
  failed: 'border-red-500/30 bg-red-500/10 text-red-200',
  cancelled: 'border-slate-500/30 bg-slate-500/10 text-slate-200',
};

function formatEta(etaSec: number | undefined, uiLocale: 'zh-CN' | 'en'): string {
  if (!etaSec || etaSec <= 0) return uiLocale === 'en' ? 'starting soon' : '即将开始';
  if (etaSec < 60) {
    return uiLocale === 'en'
      ? `about ${Math.max(1, Math.round(etaSec))} sec`
      : `约 ${Math.max(1, Math.round(etaSec))} 秒`;
  }
  if (etaSec < 3600) {
    return uiLocale === 'en'
      ? `about ${Math.max(1, Math.round(etaSec / 60))} min`
      : `约 ${Math.max(1, Math.round(etaSec / 60))} 分钟`;
  }
  return uiLocale === 'en'
    ? `about ${Math.max(1, Math.round(etaSec / 3600))} hr`
    : `约 ${Math.max(1, Math.round(etaSec / 3600))} 小时`;
}

export function StepStoryboardShotStrip({
  shots,
  scSheets,
  selectedShotIdx,
  shotBusyMap,
  shotActiveJobMap,
  shotJobStatusMap,
  shotJobQueueInfoMap,
  snapshot,
  cancellingJobId,
  onSelectShot,
  onCancelShotJob,
}: {
  shots: ProductionShot[];
  scSheets: SceneSheet[];
  selectedShotIdx: number;
  shotBusyMap: Record<string, 'frame' | 'video'>;
  shotActiveJobMap?: Record<string, BatchJobDto>;
  shotJobStatusMap?: Record<string, ShotJobStatus>;
  shotJobQueueInfoMap?: Record<string, {
    queue_idx?: number;
    queue_length?: number;
    queue_status?: string;
    globalQueuePos?: number;
    etaSec?: number;
  }>;
  snapshot?: QueueSnapshotDto | null;
  cancellingJobId?: string | null;
  onSelectShot: (idx: number) => void;
  onCancelShotJob?: (job: BatchJobDto) => void;
}) {
  const { uiLocale, t } = useLocale();
  const uiText = <T,>(zh: T, en: T) => pickUiText(uiLocale, zh, en);
  const [filter, setFilter] = useState<ShotFilter>('all');
  const totalPlatformQueue = (snapshot?.totalActive ?? 0) + (snapshot?.totalWaiting ?? 0);

  const getFilterLabel = (nextFilter: ShotFilter) => {
    if (nextFilter === 'all') return uiText('全部', 'All');
    return t(getShotUserStatusLabelKey(nextFilter));
  };

  const getStatusLabel = (status: ShotUserStatus) => {
    return t(getShotUserStatusLabelKey(status));
  };

  const formatQueueTip = (key: string, base: string): string => {
    const q = shotJobQueueInfoMap?.[key];
    if (!q) return base;
    const idx = typeof q.queue_idx === 'number' ? q.queue_idx + 1 : null;
    const len = typeof q.queue_length === 'number' ? q.queue_length : null;
    if (idx && len) return uiText(`${base}（即梦队列 #${idx}/${len}）`, `${base} (Dreamina queue #${idx}/${len})`);
    if (idx) return uiText(`${base}（即梦队列 #${idx}）`, `${base} (Dreamina queue #${idx})`);
    if (q.queue_status) return uiText(`${base}（${q.queue_status}）`, `${base} (${q.queue_status})`);
    return base;
  };

  const formatAwaitingTip = (key: string): string => {
    const q = shotJobQueueInfoMap?.[key];
    const pos = typeof q?.globalQueuePos === 'number' ? q.globalQueuePos + 1 : null;
    const total = totalPlatformQueue > 0 ? totalPlatformQueue : null;
    const etaText = formatEta(q?.etaSec, uiLocale);
    if (pos && total) return uiText(`平台队列 #${pos}/${total}，${etaText}后开始`, `Shared queue #${pos}/${total}, ${etaText}`);
    if (pos) return uiText(`平台队列 #${pos}，${etaText}后开始`, `Shared queue #${pos}, ${etaText}`);
    return uiText(`等待平台调度，${etaText}后开始`, `Waiting for scheduler, ${etaText}`);
  };

  const shotItems = shots.map((shot, idx) => {
    const shotKey = String(shot.shotIndex);
    const activeJob = shotActiveJobMap?.[shotKey];
    const providerStatus = (activeJob?.status ?? shotJobStatusMap?.[shotKey]) as ShotProviderStatus | undefined;
    const scene = scSheets.find((sc) => sc.sceneRef === shot.sceneRef || sc.id === shot.sceneRef);
    const hasVideo = hasProductionShotPreviewMedia(shot);
    const isThisShotBusy = shotBusyMap[shotKey];
    const userStatus = getShotUserStatus({
      hasVideo,
      jobStatus: providerStatus,
      hasPendingSubmitId: !!shot.pendingVideoSubmitId || isThisShotBusy === 'video',
    });
    return {
      shot,
      idx,
      shotKey,
      activeJob,
      scene,
      isThisShotBusy,
      userStatus,
    };
  });

  const statusCounts = shotItems.reduce(
    (acc, item) => {
      acc.all += 1;
      acc[item.userStatus.status] += 1;
      return acc;
    },
    {
      all: 0,
      not_started: 0,
      waiting_submit: 0,
      platform_queueing: 0,
      generating: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
    } as Record<ShotFilter, number>,
  );
  const visibleItems = filter === 'all'
    ? shotItems
    : shotItems.filter((item) => item.userStatus.status === filter);
  const selectedShot = shots[selectedShotIdx];
  const selectedItem = shotItems.find((item) => item.idx === selectedShotIdx);
  const selectedStatusLabel = selectedItem ? getStatusLabel(selectedItem.userStatus.status) : '';

  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3 shadow-[0_18px_45px_rgba(0,0,0,0.18)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-xs font-semibold text-[var(--color-text)]">
              {uiText('分镜导航与状态', 'Shot navigation & status')}
            </div>
            {selectedShot && (
              <span className="rounded-full border border-[var(--color-primary)]/45 bg-[var(--color-primary)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--color-primary)]">
                {uiText(`当前 #${selectedShot.shotIndex} · ${selectedStatusLabel}`, `Current #${selectedShot.shotIndex} · ${selectedStatusLabel}`)}
              </span>
            )}
          </div>
          <div className="text-[10px] text-[var(--color-text-muted)]">
            {uiText('先在这里定位镜头，再到下方主按钮生成视频或查看排队位次。', 'Find the shot here first, then use the primary action below to generate or see its queue position.')}
          </div>
        </div>
        <div className="flex max-w-full gap-1.5 overflow-x-auto pb-1">
          {FILTERS.map((nextFilter) => (
            <button
              key={nextFilter}
              type="button"
              aria-pressed={filter === nextFilter}
              onClick={() => setFilter(nextFilter)}
              className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] transition-colors ${
                filter === nextFilter
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/15 text-[var(--color-primary)]'
                  : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]'
              }`}
            >
              {getFilterLabel(nextFilter)}
              <span className="ml-1 opacity-70">{statusCounts[nextFilter]}</span>
            </button>
          ))}
        </div>
      </div>

      {visibleItems.length === 0 ? (
        <div className="mt-3 rounded-lg border border-dashed border-[var(--color-border)] px-4 py-6 text-center">
          <div className="text-sm text-[var(--color-text)]">{uiText('没有符合条件的分镜', 'No matching shots')}</div>
          <button
            type="button"
            onClick={() => setFilter('all')}
            className="mt-2 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]"
          >
            {uiText('切换到全部查看', 'Show all shots')}
          </button>
        </div>
      ) : (
        <div className="mt-3 grid max-h-[340px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
          {visibleItems.map((item) => {
            const { shot, idx, shotKey, activeJob, scene, isThisShotBusy, userStatus } = item;
            const q = shotJobQueueInfoMap?.[shotKey];
            const isSelected = selectedShotIdx === idx;
            const canCancel = !!activeJob && (
              activeJob.status === 'awaiting_submit'
              || activeJob.status === 'pending'
              || activeJob.status === 'queuing'
              || activeJob.status === 'processing'
            );
            const thumb = shot.previewStillDataUrl || scene?.variants[0]?.imageDataUrl;
            const sceneLabel = scene?.name || shot.sceneRef || uiText('未设场景', 'No scene');
            const statusTitle = userStatus.status === 'waiting_submit'
              ? formatAwaitingTip(shotKey)
              : userStatus.status === 'platform_queueing' || userStatus.status === 'generating'
                ? formatQueueTip(shotKey, getStatusLabel(userStatus.status))
                : shot.lastVideoError?.reason || getStatusLabel(userStatus.status);
            const platformQueuePosition = typeof q?.globalQueuePos === 'number' ? q.globalQueuePos + 1 : null;

            return (
              <div
                key={shot.shotIndex}
                className={`group relative rounded-lg border p-2 transition-colors ${
                  isSelected
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelectShot(idx)}
                  className="flex w-full gap-3 text-left"
                  title={statusTitle}
                >
                  <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-md bg-[var(--color-surface-hover)]">
                    {thumb ? (
                      <img src={thumb} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[10px] text-[var(--color-text-muted)]">
                        {uiText('无图', 'No image')}
                      </div>
                    )}
                    {isThisShotBusy === 'frame' ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/55">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/25 border-t-cyan-400" />
                      </div>
                    ) : null}
                    {userStatus.status === 'generating' ? (
                      <div className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_0_3px_rgba(52,211,153,0.20)]" />
                    ) : null}
                    {platformQueuePosition != null ? (
                      <span className="absolute left-1 top-1 rounded-full bg-black/70 px-1.5 py-0.5 text-[8px] font-semibold text-white">
                        #{platformQueuePosition}
                      </span>
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[var(--color-text)]">
                        #{shot.shotIndex} / {shot.durationSec}s
                      </span>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] ${STATUS_BADGE_CLASS[userStatus.status]}`}>
                        {getStatusLabel(userStatus.status)}
                      </span>
                    </div>
                    <div className="mt-1 truncate text-[11px] text-[var(--color-text-muted)]">{sceneLabel}</div>
                    <div className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-[var(--color-text)]/80">
                      {shot.subject || shot.action || uiText('暂无主体描述', 'No subject yet')}
                    </div>
                    {userStatus.status === 'failed' ? (
                      <div className="mt-1 text-[10px] text-red-300">
                        {uiText('选择后可重新生成', 'Select to retry generation')}
                      </div>
                    ) : null}
                  </div>
                </button>

                {canCancel && onCancelShotJob && (
                  <button
                    type="button"
                    title={activeJob.status === 'processing' ? uiText('放弃本次生成', 'Stop this render') : uiText('取消排队', 'Cancel queue')}
                    disabled={cancellingJobId === activeJob.id}
                    onClick={(event) => {
                      event.stopPropagation();
                      onCancelShotJob(activeJob);
                    }}
                    className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border border-black/20 bg-black/65 text-[10px] text-white opacity-0 transition-opacity hover:bg-black/80 disabled:opacity-60 group-hover:opacity-100"
                  >
                    {cancellingJobId === activeJob.id ? '...' : 'x'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
