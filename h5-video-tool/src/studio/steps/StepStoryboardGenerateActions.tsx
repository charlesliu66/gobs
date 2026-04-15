export function StepStoryboardGenerateActions({
  shotMediaBusy,
  dreaminaAsync,
  hasProductionDesign,
  isQueued,
  queueDepth,
  pendingVideoSubmitId,
  checkingProgress,
  onGenerateShotFrame,
  onGenerateShotVideo,
  onCheckVideoProgress,
}: {
  shotMediaBusy: 'frame' | 'video' | null;
  dreaminaAsync: boolean;
  hasProductionDesign: boolean;
  isQueued?: boolean;
  /** How many shots are ahead in the submission queue */
  queueDepth?: number;
  pendingVideoSubmitId?: string;
  checkingProgress?: boolean;
  onGenerateShotFrame: () => void;
  onGenerateShotVideo: () => void;
  onCheckVideoProgress?: () => void;
}) {
  const isSubmitting = shotMediaBusy === 'video' || isQueued;
  const hasPendingBackend = !!pendingVideoSubmitId && !isSubmitting;
  const videoButtonDisabled = isSubmitting || hasPendingBackend;

  function videoButtonLabel() {
    if (isQueued && queueDepth && queueDepth > 0) return `排队等待中…（前方 ${queueDepth} 个）`;
    if (isSubmitting) return '即梦提交中…';
    if (hasPendingBackend) return '后台生成中（等待即梦出片）';
    return '生成分镜视频';
  }

  return (
    <>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={shotMediaBusy === 'frame' || !hasProductionDesign}
          onClick={onGenerateShotFrame}
          className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          {shotMediaBusy === 'frame' ? '分镜图生成中…' : '生成分镜图'}
        </button>
        <button
          type="button"
          disabled={videoButtonDisabled}
          onClick={onGenerateShotVideo}
          className="rounded-lg border px-3 py-1.5 text-xs font-medium disabled:opacity-50 border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]"
        >
          {videoButtonLabel()}
        </button>
        {hasPendingBackend && onCheckVideoProgress && (
          <button
            type="button"
            disabled={checkingProgress}
            onClick={onCheckVideoProgress}
            className="rounded-lg border px-3 py-1.5 text-xs font-medium border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors disabled:opacity-50"
          >
            {checkingProgress ? '检查中…' : '手动检查进度'}
          </button>
        )}
      </div>
      {hasPendingBackend && (
        <p className="mt-2 text-[10px] text-amber-400/80">
          视频已提交到即梦，后台每 5 分钟自动检查一次（首次 10 分钟后开始）。完成后自动填入预览。
        </p>
      )}
      {isSubmitting && dreaminaAsync && (
        <p className="mt-2 text-[10px] text-[var(--color-text-muted)]">
          正在提交到即梦，稍后将转入后台轮询…
        </p>
      )}
    </>
  );
}
