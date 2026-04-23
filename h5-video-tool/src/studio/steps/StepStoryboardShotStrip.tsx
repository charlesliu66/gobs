import type { BatchJobDto, QueueSnapshotDto } from '../../api/batchJobs';
import { useLocale } from '../../i18n/LocaleContext.tsx';
import { pickUiText } from '../../i18n/uiText.ts';
import { hasProductionShotPreviewMedia, type ProductionShot, type SceneSheet } from '../productionTypes';

export type ShotJobStatus = 'awaiting_submit' | 'queuing' | 'processing' | 'failed' | 'cancelled';

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
  const { uiLocale } = useLocale();
  const uiText = <T,>(zh: T, en: T) => pickUiText(uiLocale, zh, en);
  const totalPlatformQueue = (snapshot?.totalActive ?? 0) + (snapshot?.totalWaiting ?? 0);

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

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3">
      <div className="flex min-w-min gap-2">
        {shots.map((s, idx) => {
          const shotKey = String(s.shotIndex);
          const isThisShotBusy = shotBusyMap[shotKey];
          const activeJob = shotActiveJobMap?.[shotKey];
          const jobStatus = shotJobStatusMap?.[shotKey];
          const queueInfo = shotJobQueueInfoMap?.[shotKey];
          const platformQueuePosition = typeof queueInfo?.globalQueuePos === 'number' ? queueInfo.globalQueuePos + 1 : null;
          const hasVideo = hasProductionShotPreviewMedia(s);
          const showFailed = !hasVideo && jobStatus === 'failed';
          const showCancelled = !hasVideo && jobStatus === 'cancelled';
          const canCancel = !!activeJob && (
            activeJob.status === 'awaiting_submit'
            || activeJob.status === 'pending'
            || activeJob.status === 'queuing'
            || activeJob.status === 'processing'
          );

          return (
            <div key={s.shotIndex} className="group relative w-24 shrink-0">
              <button
                type="button"
                onClick={() => onSelectShot(idx)}
                className={`w-full rounded-lg border p-1 text-left transition-colors ${
                  selectedShotIdx === idx
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                    : 'border-[var(--color-border)] hover:bg-[var(--color-surface-hover)]'
                }`}
              >
                <div className="relative aspect-video w-full overflow-hidden rounded bg-[var(--color-surface-hover)]">
                  {jobStatus === 'awaiting_submit' && platformQueuePosition != null && (
                    <span className="absolute left-1.5 top-1.5 z-10 rounded-full border border-violet-400/35 bg-violet-950/80 px-1.5 py-0.5 text-[8px] font-semibold text-violet-100 shadow-sm">
                      {uiText(`平台#${platformQueuePosition}`, `Queue #${platformQueuePosition}`)}
                    </span>
                  )}
                  {s.previewStillDataUrl ? (
                    <img src={s.previewStillDataUrl} alt="" className="h-full w-full object-cover" />
                  ) : scSheets.find((sc) => sc.sceneRef === s.sceneRef)?.variants[0]?.imageDataUrl ? (
                    <img
                      src={scSheets.find((sc) => sc.sceneRef === s.sceneRef)!.variants[0].imageDataUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                  {showFailed ? (
                    <div
                      className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-red-950/60 backdrop-blur-[1px]"
                      title={s.lastVideoError?.reason || uiText('生成失败，点击可重试', 'Generation failed. Click to retry.')}
                    >
                      <span className="text-base leading-none text-red-300">×</span>
                      <span className="px-1 text-[8px] font-medium text-red-200">{uiText('生成失败', 'Failed')}</span>
                    </div>
                  ) : showCancelled ? (
                    <div
                      className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-slate-950/60 backdrop-blur-[1px]"
                      title={s.lastVideoError?.reason || uiText('任务已取消', 'Job cancelled')}
                    >
                      <span className="text-base leading-none text-slate-200">×</span>
                      <span className="px-1 text-[8px] font-medium text-slate-200">{uiText('已取消', 'Cancelled')}</span>
                    </div>
                  ) : isThisShotBusy === 'video' ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-black/65 backdrop-blur-[1px]">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/25 border-t-amber-400" />
                      <span className="px-1 text-[8px] font-medium text-amber-100">{uiText('入队中', 'Queueing')}</span>
                    </div>
                  ) : jobStatus === 'processing' ? (
                    <div
                      className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-black/50"
                      title={formatQueueTip(shotKey, uiText('即梦正在渲染', 'Rendering in Dreamina'))}
                    >
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/25 border-t-green-400" />
                      <span className="px-1 text-[8px] font-medium text-green-200">{uiText('生成中', 'Rendering')}</span>
                    </div>
                  ) : jobStatus === 'queuing' ? (
                    <div
                      className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-black/45"
                      title={formatQueueTip(shotKey, uiText('即梦队列排队中', 'Queued in Dreamina'))}
                    >
                      <span className="h-4 w-4 rounded-full border-2 border-white/20 border-t-sky-400 animate-pulse" />
                      <span className="px-1 text-[8px] font-medium text-sky-200">{uiText('排队中', 'Queued')}</span>
                    </div>
                  ) : jobStatus === 'awaiting_submit' ? (
                    <div
                      className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-black/45"
                      title={formatAwaitingTip(shotKey)}
                    >
                      <span className="h-4 w-4 rounded-full border-2 border-white/20 border-t-violet-400 animate-pulse" />
                      <span className="px-1 text-[8px] font-medium text-violet-200">{uiText('等待调度', 'Waiting')}</span>
                    </div>
                  ) : !hasVideo && s.pendingVideoSubmitId ? (
                    <div
                      className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-black/50"
                      title={uiText('后台已记录 submitId，等待状态同步', 'submitId is recorded in backend and is waiting for status sync')}
                    >
                      <span
                        className="h-4 w-4 animate-spin rounded-full border-2 border-white/25 border-t-green-400"
                        style={{ animationDuration: '2s' }}
                      />
                      <span className="px-1 text-[8px] font-medium text-green-200">{uiText('生成中', 'Rendering')}</span>
                    </div>
                  ) : null}

                  {isThisShotBusy === 'frame' ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-black/60">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/25 border-t-cyan-400" />
                      <span className="px-1 text-[8px] font-medium text-cyan-100">{uiText('静帧中', 'Still')}</span>
                    </div>
                  ) : null}
                </div>
                <div className="mt-1 truncate px-1 text-[10px] text-[var(--color-text)]">
                  #{s.shotIndex} {s.durationSec}s
                </div>
              </button>
              {canCancel && onCancelShotJob && (
                <button
                  type="button"
                  title={activeJob?.status === 'processing' ? uiText('放弃本次生成', 'Stop this render') : uiText('取消排队', 'Cancel queue')}
                  disabled={cancellingJobId === activeJob.id}
                  onClick={(event) => {
                    event.stopPropagation();
                    onCancelShotJob(activeJob);
                  }}
                  className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-black/20 bg-black/65 text-[10px] text-white opacity-0 transition-opacity hover:bg-black/80 disabled:opacity-60 group-hover:opacity-100"
                >
                  {cancellingJobId === activeJob.id ? '...' : '×'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
