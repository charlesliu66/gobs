import type { BatchJobDto } from '../../api/batchJobs';

function formatEta(etaSec?: number): string {
  if (!etaSec || etaSec <= 0) return '即将开始';
  if (etaSec < 60) return `约 ${Math.max(1, Math.round(etaSec))} 秒`;
  if (etaSec < 3600) return `约 ${Math.max(1, Math.round(etaSec / 60))} 分钟`;
  return `约 ${Math.max(1, Math.round(etaSec / 3600))} 小时`;
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
  const isSubmitting = shotMediaBusy === 'video';
  const hasActiveJob = !!activeJob;
  const hasPendingBackend = (!hasVideo && !!pendingVideoSubmitId) || hasActiveJob;
  const videoButtonDisabled = isSubmitting || hasActiveJob;

  function videoButtonLabel() {
    if (isSubmitting) return '入队中...';
    if (activeJob?.status === 'awaiting_submit') {
      return activeJob.globalQueuePos != null
        ? `等待调度中（前方 ${activeJob.globalQueuePos} 个）`
        : '等待调度中';
    }
    if (activeJob?.status === 'pending' || activeJob?.status === 'queuing') return '后台排队中';
    if (activeJob?.status === 'processing') return '即梦生成中';
    if (!hasVideo && pendingVideoSubmitId) return '后台生成中';
    return '生成分镜视频';
  }

  const canCancel = !!activeJob && (
    activeJob.status === 'awaiting_submit'
    || activeJob.status === 'pending'
    || activeJob.status === 'queuing'
    || activeJob.status === 'processing'
  );

  const cancelLabel = activeJob?.status === 'processing' ? '放弃本次生成' : '取消排队';

  return (
    <>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={shotMediaBusy === 'frame' || !hasProductionDesign}
          onClick={onGenerateShotFrame}
          className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          {shotMediaBusy === 'frame' ? '分镜图生成中...' : '生成分镜图'}
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
            {cancelBusy ? '取消中...' : cancelLabel}
          </button>
        )}
        {!hasActiveJob && hasPendingBackend && shotMediaBusy !== 'video' && onCheckVideoProgress && (
          <button
            type="button"
            disabled={checkingProgress}
            onClick={onCheckVideoProgress}
            className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-400 transition-colors hover:bg-amber-500/20 disabled:opacity-50"
          >
            {checkingProgress ? '检查中...' : '手动检查进度'}
          </button>
        )}
      </div>
      {activeJob?.status === 'awaiting_submit' && (
        <p className="mt-2 text-[10px] text-[var(--color-text-muted)]">
          任务已进入平台统一调度队列，
          {activeJob.globalQueuePos != null ? `前方还有 ${activeJob.globalQueuePos} 个任务，` : ''}
          {formatEta(activeJob.etaSec)}后开始提交到即梦。
        </p>
      )}
      {(activeJob?.status === 'pending' || activeJob?.status === 'queuing') && (
        <p className="mt-2 text-[10px] text-sky-300/80">
          任务已提交到后台队列，正在等待即梦侧排队或受理。
        </p>
      )}
      {activeJob?.status === 'processing' && (
        <p className="mt-2 text-[10px] text-green-300/80">
          即梦正在渲染本镜头；现在取消会停止后续跟进，但积分通常无法追回。
        </p>
      )}
      {!activeJob && !hasVideo && pendingVideoSubmitId && (
        <p className="mt-2 text-[10px] text-amber-400/80">
          视频已提交到即梦，后台会继续轮询；如果状态滞后，可以手动检查一次。
        </p>
      )}
      {isSubmitting && dreaminaAsync && (
        <p className="mt-2 text-[10px] text-[var(--color-text-muted)]">
          正在把当前镜头加入平台调度队列，稍后会自动进入后台轮询。
        </p>
      )}
    </>
  );
}
