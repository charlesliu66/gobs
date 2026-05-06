import type { BatchJobDto, QueueSnapshotDto } from '../../api/batchJobs';
import { useLocale } from '../../i18n/LocaleContext.tsx';
import { formatMessage } from '../../i18n/locale.ts';
import { hasProductionShotPreviewMedia, type ProductionShot, type SceneSheet } from '../productionTypes';
import type { ShotActiveJobMap, ShotStatusMap } from '../exportStoryboardStatus';
import { resolveFriendlyVideoProgress } from '../storyboardQueueState';

type ShotStatus = 'idle' | 'awaiting_submit' | 'pending' | 'queuing' | 'processing' | 'failed' | 'cancelled' | 'done';
type LocalizePair = (zh: string, en: string) => string;

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
  localizePair: LocalizePair,
  t: (path: string) => string,
  activeJob?: BatchJobDto,
  snapshot?: QueueSnapshotDto,
): { label: string; className: string } {
  if (activeJob) {
    const friendly = resolveFriendlyVideoProgress({ job: activeJob, snapshot });
    switch (friendly.stage) {
      case 'queued':
        return {
          label: localizePair(friendly.shortLabelZh, friendly.shortLabelEn),
          className: 'border-violet-500/40 bg-violet-500/15 text-violet-200',
        };
      case 'starting':
        return {
          label: localizePair(friendly.shortLabelZh, friendly.shortLabelEn),
          className: 'border-sky-500/40 bg-sky-500/15 text-sky-200',
        };
      case 'generating':
      case 'done':
        return {
          label: localizePair(friendly.shortLabelZh, friendly.shortLabelEn),
          className: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200',
        };
      case 'finishing':
        return {
          label: localizePair(friendly.shortLabelZh, friendly.shortLabelEn),
          className: 'border-lime-500/40 bg-lime-500/15 text-lime-200',
        };
      case 'failed':
        return {
          label: localizePair(friendly.shortLabelZh, friendly.shortLabelEn),
          className: 'border-rose-500/40 bg-rose-500/15 text-rose-200',
        };
      case 'cancelled':
        return {
          label: localizePair(friendly.shortLabelZh, friendly.shortLabelEn),
          className: 'border-slate-500/40 bg-slate-500/15 text-slate-200',
        };
      default:
        break;
    }
  }

  switch (status) {
    case 'done':
      return {
        label: t('productionWizard.storyboardShotStrip.done'),
        className: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200',
      };
    case 'failed':
      return {
        label: t('productionWizard.storyboardShotStrip.failed'),
        className: 'border-rose-500/40 bg-rose-500/15 text-rose-200',
      };
    case 'cancelled':
      return {
        label: t('productionWizard.storyboardShotStrip.stopped'),
        className: 'border-slate-500/40 bg-slate-500/15 text-slate-200',
      };
    default:
      return {
        label: t('productionWizard.storyboardShotStrip.idle'),
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
  const { t, uiLocale } = useLocale();
  const tx = (path: string, values?: Record<string, string | number>) => formatMessage(t(path), values);
  const localizePair: LocalizePair = (zh, en) => (uiLocale === 'en' ? en : zh);
  const maxConcurrent = snapshot.maxConcurrent ?? 3;
  const activeJobMap = shotActiveJobMap ?? {};
  const statusMap = shotJobStatusMap ?? {};

  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-xs font-semibold text-[var(--color-text)]">
            {t('productionWizard.storyboardShotStrip.title')}
          </div>
          <div className="text-[10px] text-[var(--color-text-muted)]">
            {tx('productionWizard.storyboardShotStrip.summary', {
              active: snapshot.totalActive,
              waiting: snapshot.totalWaiting,
              maxConcurrent,
            })}
          </div>
        </div>
        <div className="text-[10px] text-[var(--color-text-muted)]">
          {tx('productionWizard.storyboardShotStrip.shotCount', { count: shots.length })}
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1">
        {shots.map((shot, index) => {
          const shotKey = String(shot.shotIndex);
          const sceneName = scSheets.find((sheet) => sheet.sceneRef === shot.sceneRef)?.name
            || shot.sceneRef
            || t('productionWizard.storyboardShotStrip.untitledScene');
          const activeJob = activeJobMap[shotKey];
          const status = resolveShotStatus(shot, shotBusyMap, activeJobMap, statusMap);
          const statusMeta = friendlyStatusMeta(status, localizePair, t, activeJob, snapshot);
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
                      {tx('productionWizard.storyboardShotStrip.shotTitle', { shotIndex: shot.shotIndex })}
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
                  <div>{tx('productionWizard.storyboardShotStrip.duration', { seconds: Math.round(shot.durationSec || 0) })}</div>
                  {queueInfo?.globalQueuePos != null && (
                    <div>
                      {tx('productionWizard.storyboardShotStrip.globalQueuePosition', {
                        position: queueInfo.globalQueuePos + 1,
                      })}
                    </div>
                  )}
                  {queueInfo?.queue_idx != null && (
                    <div>
                      {tx('productionWizard.storyboardShotStrip.renderQueuePosition', {
                        position: queueInfo.queue_idx + 1,
                        suffix: queueInfo.queue_length != null ? ` / ${queueInfo.queue_length}` : '',
                      })}
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
                    ? t('productionWizard.storyboardShotStrip.working')
                    : activeJob.status === 'processing'
                      ? t('productionWizard.storyboardShotStrip.stopTask')
                      : t('productionWizard.storyboardShotStrip.cancelTask')}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
