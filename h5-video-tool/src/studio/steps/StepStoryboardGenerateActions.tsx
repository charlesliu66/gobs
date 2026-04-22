import type { BatchJobDto } from '../../api/batchJobs';
import { useLocale } from '../../i18n/LocaleContext.tsx';
import { pickUiText } from '../../i18n/uiText.ts';

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

export function StepStoryboardGenerateActions({
  shotMediaBusy,
  dreaminaAsync,
  hasProductionDesign,
  hasVideo,
  activeJob,
  cancelBusy,
  pendingVideoSubmitId,
  checkingProgress,
  onGenerateShotFrame,
  onGenerateShotVideo,
  onCheckVideoProgress,
  onCancelActiveJob,
}: {
  shotMediaBusy: 'frame' | 'video' | null;
  dreaminaAsync: boolean;
  hasProductionDesign: boolean;
  hasVideo?: boolean;
  activeJob?: BatchJobDto | null;
  cancelBusy?: boolean;
  pendingVideoSubmitId?: string;
  checkingProgress?: boolean;
  onGenerateShotFrame: () => void;
  onGenerateShotVideo: () => void;
  onCheckVideoProgress?: () => void;
  onCancelActiveJob?: () => void;
}) {
  const { uiLocale } = useLocale();
  const uiText = <T,>(zh: T, en: T) => pickUiText(uiLocale, zh, en);
  const isSubmitting = shotMediaBusy === 'video';
  const hasActiveJob = !!activeJob;
  const hasPendingBackend = (!hasVideo && !!pendingVideoSubmitId) || hasActiveJob;
  const videoButtonDisabled = isSubmitting || hasActiveJob;

  function videoButtonLabel() {
    if (isSubmitting) return uiText('入队中...', 'Queueing...');
    if (activeJob?.status === 'awaiting_submit') {
      return activeJob.globalQueuePos != null
        ? uiText(`等待调度中（前方 ${activeJob.globalQueuePos} 个）`, `Waiting for scheduler (${activeJob.globalQueuePos} ahead)`)
        : uiText('等待调度中', 'Waiting for scheduler');
    }
    if (activeJob?.status === 'pending' || activeJob?.status === 'queuing') return uiText('后台排队中', 'Queued in backend');
    if (activeJob?.status === 'processing') return uiText('即梦生成中', 'Rendering in Dreamina');
    if (!hasVideo && pendingVideoSubmitId) return uiText('后台生成中', 'Rendering in backend');
    return uiText('生成分镜视频', 'Generate storyboard video');
  }

  const canCancel = !!activeJob && (
    activeJob.status === 'awaiting_submit'
    || activeJob.status === 'pending'
    || activeJob.status === 'queuing'
    || activeJob.status === 'processing'
  );

  const cancelLabel = activeJob?.status === 'processing'
    ? uiText('放弃本次生成', 'Stop this render')
    : uiText('取消排队', 'Cancel queue');

  return (
    <>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={shotMediaBusy === 'frame' || !hasProductionDesign}
          onClick={onGenerateShotFrame}
          className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          {shotMediaBusy === 'frame'
            ? uiText('分镜图生成中...', 'Generating storyboard frame...')
            : uiText('生成分镜图', 'Generate storyboard frame')}
        </button>
        <button
          type="button"
          disabled={videoButtonDisabled}
          onClick={onGenerateShotVideo}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-text)] disabled:opacity-50"
        >
          {videoButtonLabel()}
        </button>
        {canCancel && onCancelActiveJob && (
          <button
            type="button"
            disabled={cancelBusy}
            onClick={onCancelActiveJob}
            className={
              activeJob?.status === 'processing'
                ? 'rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/20 disabled:opacity-50'
                : 'rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-300 transition-colors hover:bg-amber-500/20 disabled:opacity-50'
            }
          >
            {cancelBusy ? uiText('取消中...', 'Cancelling...') : cancelLabel}
          </button>
        )}
        {!hasActiveJob && hasPendingBackend && shotMediaBusy !== 'video' && onCheckVideoProgress && (
          <button
            type="button"
            disabled={checkingProgress}
            onClick={onCheckVideoProgress}
            className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-400 transition-colors hover:bg-amber-500/20 disabled:opacity-50"
          >
            {checkingProgress ? uiText('检查中...', 'Checking...') : uiText('手动检查进度', 'Check progress manually')}
          </button>
        )}
      </div>
      {activeJob?.status === 'awaiting_submit' && (
        <p className="mt-2 text-[10px] text-[var(--color-text-muted)]">
          {uiText('任务已进入平台统一调度队列，', 'This shot is now in the shared scheduling queue. ')}
          {activeJob.globalQueuePos != null
            ? uiText(`前方还有 ${activeJob.globalQueuePos} 个任务，`, `${activeJob.globalQueuePos} jobs are ahead, `)
            : ''}
          {uiText(
            `${formatEta(activeJob.etaSec, uiLocale)}后开始提交到即梦。`,
            `submission to Dreamina starts ${formatEta(activeJob.etaSec, uiLocale)}.`,
          )}
        </p>
      )}
      {(activeJob?.status === 'pending' || activeJob?.status === 'queuing') && (
        <p className="mt-2 text-[10px] text-sky-300/80">
          {uiText(
            '任务已提交到后台队列，正在等待即梦侧排队或受理。',
            'The job is in the backend queue and is waiting for Dreamina to accept it.',
          )}
        </p>
      )}
      {activeJob?.status === 'processing' && (
        <p className="mt-2 text-[10px] text-green-300/80">
          {uiText(
            '即梦正在渲染本镜头；现在取消会停止后续跟进，但积分通常无法追回。',
            'Dreamina is rendering this shot now. Cancelling stops follow-up polling, but consumed credits usually cannot be recovered.',
          )}
        </p>
      )}
      {!activeJob && !hasVideo && pendingVideoSubmitId && (
        <p className="mt-2 text-[10px] text-amber-400/80">
          {uiText(
            '视频已提交到即梦，后台会继续轮询；如果状态滞后，可以手动检查一次。',
            'The video has been submitted to Dreamina. Backend polling will continue, and you can manually check once if the status looks stale.',
          )}
        </p>
      )}
      {isSubmitting && dreaminaAsync && (
        <p className="mt-2 text-[10px] text-[var(--color-text-muted)]">
          {uiText(
            '正在把当前镜头加入平台调度队列，稍后会自动进入后台轮询。',
            'This shot is being added to the shared scheduling queue and will enter backend polling automatically.',
          )}
        </p>
      )}
    </>
  );
}
