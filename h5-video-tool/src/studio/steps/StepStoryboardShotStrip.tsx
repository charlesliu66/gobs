import type { BatchJobDto, QueueSnapshotDto } from '../../api/batchJobs';
import { useLocale } from '../../i18n/LocaleContext.tsx';
import { pickUiText } from '../../i18n/uiText.ts';
import { hasProductionShotPreviewMedia, type ProductionShot, type SceneSheet } from '../productionTypes';
import type { ShotActiveJobMap, ShotStatusMap } from '../exportStoryboardStatus';
import { resolveFriendlyVideoProgress } from '../storyboardQueueState';

type ShotStatus = 'idle' | 'awaiting_submit' | 'pending' | 'queuing' | 'processing' | 'failed' | 'cancelled' | 'done';

function resolveShotStatus(
  shot: ProductionShot,
  shotBusyMap: Record<string, 'frame' | 'video'>,
  shotActiveJobMap: ShotActiveJobMap,
  shotJobStatusMap: ShotStatusMap,
): ShotStatus {
  const shotKey = String(shot.shotIndex);
  if (hasProductionShotPreviewMedia(shot)) return 'done';
  if (shotBusyMap[shotKey] === 'video') return 'processing';

  const activeJob = shotActiveJobMap[shotKey];
  if (activeJob) {
    if (activeJob.status === 'awaiting_submit') return 'awaiting_submit';
    if (activeJob.status === 'pending') return 'pending';
    if (activeJob.status === 'queuing') return 'queuing';
    if (activeJob.status === 'processing') return 'processing';
    if (activeJob.status === 'failed') return 'failed';
    if (activeJob.status === 'cancelled') return 'cancelled';
    if (activeJob.status === 'done') return 'done';
  }

  const mapped = shotJobStatusMap[shotKey];
  if (
    mapped === 'awaiting_submit'
    || mapped === 'pending'
    || mapped === 'queuing'
    || mapped === 'processing'
    || mapped === 'failed'
    || mapped === 'cancelled'
    || mapped === 'done'
  ) {
    return mapped;
  }

  if (shot.lastVideoError?.cancelled) return 'cancelled';
  if (shot.lastVideoError?.reason) return 'failed';
  return 'idle';
}

function friendlyStatusMeta(
  status: ShotStatus,
  uiText: <T,>(zh: T, en: T) => T,
  activeJob?: BatchJobDto,
  snapshot?: QueueSnapshotDto,
): { label: string; className: string } {
  if (activeJob) {
    const friendly = resolveFriendlyVideoProgress({ job: activeJob, snapshot });
    switch (friendly.stage) {
      case 'queued':
        return {
          label: uiText(friendly.shortLabelZh, friendly.shortLabelEn),
          className: 'border-violet-500/40 bg-violet-500/15 text-violet-200',
        };
      case 'starting':
        return {
          label: uiText(friendly.shortLabelZh, friendly.shortLabelEn),
          className: 'border-sky-500/40 bg-sky-500/15 text-sky-200',
        };
      case 'generating':
      case 'done':
        return {
          label: uiText(friendly.shortLabelZh, friendly.shortLabelEn),
          className: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200',
        };
      case 'finishing':
        return {
          label: uiText(friendly.shortLabelZh, friendly.shortLabelEn),
          className: 'border-lime-500/40 bg-lime-500/15 text-lime-200',
        };
      case 'failed':
        return {
          label: uiText(friendly.shortLabelZh, friendly.shortLabelEn),
          className: 'border-rose-500/40 bg-rose-500/15 text-rose-200',
        };
      case 'cancelled':
        return {
          label: uiText(friendly.shortLabelZh, friendly.shortLabelEn),
          className: 'border-slate-500/40 bg-slate-500/15 text-slate-200',
        };
      default:
        break;
    }
  }

  switch (status) {
    case 'done':
      return {
        label: uiText('已完成', 'Done'),
        className: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200',
      };
    case 'failed':
      return {
        label: uiText('生成失败', 'Failed'),
        className: 'border-rose-500/40 bg-rose-500/15 text-rose-200',
      };
    case 'cancelled':
      return {
        label: uiText('已停止', 'Stopped'),
        className: 'border-slate-500/40 bg-slate-500/15 text-slate-200',
      };
    default:
      return {
        label: uiText('未开始', 'Idle'),
        className: 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]',
      };
  }
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
  shotActiveJobMap?: ShotActiveJobMap;
  shotJobStatusMap?: ShotStatusMap;
  shotJobQueueInfoMap?: Record<string, {
    queue_idx?: number;
    queue_length?: number;
    queue_status?: string;
    globalQueuePos?: number;
    etaSec?: number;
  }>;
  snapshot: QueueSnapshotDto;
  cancellingJobId: string | null;
  onSelectShot: (idx: number) => void;
  onCancelShotJob?: (job: BatchJobDto) => void;
}) {
  const { uiLocale } = useLocale();
  const uiText = <T,>(zh: T, en: T) => pickUiText(uiLocale, zh, en);
  const maxConcurrent = snapshot.maxConcurrent ?? 3;
  const activeJobMap = shotActiveJobMap ?? {};
  const statusMap = shotJobStatusMap ?? {};

  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-xs font-semibold text-[var(--color-text)]">
            {uiText('分镜状态条', 'Storyboard strip')}
          </div>
          <div className="text-[10px] text-[var(--color-text-muted)]">
            {uiText(
              `当前有 ${snapshot.totalActive} 条视频正在生成，${snapshot.totalWaiting} 条在排队，最多同时处理 ${maxConcurrent} 条。`,
              `${snapshot.totalActive} videos are generating, ${snapshot.totalWaiting} are waiting, and the system handles up to ${maxConcurrent} at once.`,
            )}
          </div>
        </div>
        <div className="text-[10px] text-[var(--color-text-muted)]">
          {uiText(`共 ${shots.length} 镜`, `${shots.length} shots`)}
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1">
        {shots.map((shot, index) => {
          const shotKey = String(shot.shotIndex);
          const sceneName = scSheets.find((sheet) => sheet.sceneRef === shot.sceneRef)?.name
            || shot.sceneRef
            || uiText('未命名场景', 'Untitled scene');
          const activeJob = activeJobMap[shotKey];
          const status = resolveShotStatus(shot, shotBusyMap, activeJobMap, statusMap);
          const statusMeta = friendlyStatusMeta(status, uiText, activeJob, snapshot);
          const queueInfo = shotJobQueueInfoMap?.[shotKey];
          const selected = index === selectedShotIdx;

          return (
            <div
              key={`${shot.shotIndex}-${index}`}
              className={`min-w-[228px] max-w-[228px] rounded-xl border p-3 transition-colors ${
                selected
                  ? 'border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_14%,transparent)]'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)]'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectShot(index)}
                className="w-full text-left"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs font-semibold text-[var(--color-text)]">
                      {uiText(`第 ${shot.shotIndex} 镜`, `Shot ${shot.shotIndex}`)}
                    </div>
                    <div className="mt-1 line-clamp-1 text-[11px] text-[var(--color-text-muted)]">
                      {sceneName}
                    </div>
                  </div>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] ${statusMeta.className}`}>
                    {statusMeta.label}
                  </span>
                </div>

                <div className="mt-3 space-y-1 text-[10px] text-[var(--color-text-muted)]">
                  <div>{uiText(`时长 ${Math.round(shot.durationSec || 0)}s`, `${Math.round(shot.durationSec || 0)}s`)}</div>
                  {queueInfo?.globalQueuePos != null && (
                    <div>{uiText(`当前排第 ${queueInfo.globalQueuePos + 1} 位`, `Queue position ${queueInfo.globalQueuePos + 1}`)}</div>
                  )}
                  {queueInfo?.queue_idx != null && (
                    <div>
                      {uiText(
                        `已进入生成队列，当前排第 ${queueInfo.queue_idx + 1}${queueInfo.queue_length != null ? ` / ${queueInfo.queue_length}` : ''} 位`,
                        `In render queue, position ${queueInfo.queue_idx + 1}${queueInfo.queue_length != null ? ` / ${queueInfo.queue_length}` : ''}`,
                      )}
                    </div>
                  )}
                  {shot.lastVideoError?.reason && status === 'failed' && (
                    <div className="line-clamp-2 text-rose-200">{shot.lastVideoError.reason}</div>
                  )}
                </div>
              </button>

              {activeJob && onCancelShotJob && (
                <button
                  type="button"
                  onClick={() => onCancelShotJob(activeJob)}
                  disabled={cancellingJobId === activeJob.id}
                  className="mt-3 w-full rounded-lg border border-[var(--color-border)] px-2 py-1 text-[10px] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {cancellingJobId === activeJob.id
                    ? uiText('处理中...', 'Working...')
                    : activeJob.status === 'processing'
                      ? uiText('停止本次任务', 'Stop this task')
                      : uiText('取消本次任务', 'Cancel this task')}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
