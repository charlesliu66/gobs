import type { BatchJobDto, QueueSnapshotDto } from '../../api/batchJobs';
import { useLocale } from '../../i18n/LocaleContext.tsx';
import { pickUiText } from '../../i18n/uiText.ts';
import { getShotUserStatus, type ShotProviderStatus } from '../shotUserStatus';
import { resolveFriendlyVideoProgress } from '../storyboardQueueState';

function bannerClassForStage(stage: string): string {
  switch (stage) {
    case 'queued':
      return 'border-violet-500/30 bg-violet-500/10 text-violet-100';
    case 'starting':
      return 'border-sky-500/30 bg-sky-500/10 text-sky-100';
    case 'generating':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100';
    case 'finishing':
      return 'border-lime-500/30 bg-lime-500/10 text-lime-100';
    case 'failed':
      return 'border-rose-500/30 bg-rose-500/10 text-rose-100';
    case 'cancelled':
      return 'border-slate-500/30 bg-slate-500/10 text-slate-100';
    case 'done':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100';
    default:
      return 'border-amber-500/30 bg-amber-500/10 text-amber-100';
  }
}

export function StepStoryboardGenerateActions({
  shotMediaBusy,
  dreaminaAsync,
  hasProductionDesign,
  hasVideo,
  hasStill,
  showAdvancedTools,
  shotVideoDreaminaModel,
  activeJob,
  queueSnapshot,
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
  hasStill?: boolean;
  showAdvancedTools?: boolean;
  shotVideoDreaminaModel?: string;
  activeJob?: BatchJobDto | null;
  queueSnapshot?: QueueSnapshotDto | null;
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
  const userStatus = getShotUserStatus({
    hasVideo: !!hasVideo,
    jobStatus: activeJob?.status as ShotProviderStatus | undefined,
    hasPendingSubmitId: !!pendingVideoSubmitId,
  });
  const hasPendingBackend = userStatus.status !== 'not_started' && userStatus.status !== 'completed';
  const videoButtonDisabled = isSubmitting || hasActiveJob;
  const needsImageToVideoStill = shotVideoDreaminaModel === 'dreamina-image2video' && !hasStill;
  const friendlyProgress = activeJob
    ? resolveFriendlyVideoProgress({ job: activeJob, snapshot: queueSnapshot ?? undefined })
    : null;

  const videoButtonHint = (() => {
    if (isSubmitting) {
      return uiText(
        '正在提交当前分镜。成功后，这里会继续显示排队位置和最新进度。',
        'Submitting this shot now. Once it succeeds, this card will keep showing queue position and progress.',
      );
    }
    if (friendlyProgress) {
      return uiText(friendlyProgress.detailZh, friendlyProgress.detailEn);
    }
    if (!hasVideo && pendingVideoSubmitId) {
      return uiText(
        '系统已经记住这次提交。即使你离开当前页面，也会继续跟进并自动回写结果。',
        'This submission is already recorded. Even if you leave the page, the system will keep following it and sync the result back automatically.',
      );
    }
    if (hasVideo) {
      return uiText(
        '重新生成会新增一个视频版本，已有版本仍然可以保留和切换。',
        'Regenerating creates another video version while keeping the existing versions available.',
      );
    }
    return uiText(
      '提交当前分镜后，系统会自动排队并开始生成，不需要你一直停留在这个页面。',
      'After you submit this shot, the system will queue it and start generation automatically. You do not need to stay on this page.',
    );
  })();

  const primaryButtonClass = (() => {
    if (friendlyProgress?.stage === 'generating' || friendlyProgress?.stage === 'done') {
      return 'border-emerald-400/55 bg-emerald-500/20 text-emerald-50 shadow-[0_0_32px_rgba(16,185,129,0.14)]';
    }
    if (friendlyProgress?.stage === 'finishing') {
      return 'border-lime-400/55 bg-lime-500/18 text-lime-50 shadow-[0_0_32px_rgba(132,204,22,0.14)]';
    }
    if (friendlyProgress?.stage === 'queued') {
      return 'border-violet-400/55 bg-violet-500/20 text-violet-50 shadow-[0_0_32px_rgba(139,92,246,0.14)]';
    }
    if (friendlyProgress?.stage === 'starting' || pendingVideoSubmitId) {
      return 'border-sky-400/55 bg-sky-500/20 text-sky-50 shadow-[0_0_32px_rgba(14,165,233,0.14)]';
    }
    return 'border-amber-300/70 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-300 text-slate-950 shadow-[0_0_34px_rgba(251,191,36,0.22)] hover:brightness-110';
  })();

  function videoButtonLabel() {
    if (isSubmitting) return uiText('入队中...', 'Queueing...');
    if (friendlyProgress) return uiText(friendlyProgress.shortLabelZh, friendlyProgress.shortLabelEn);
    if (!hasVideo && pendingVideoSubmitId) return uiText('等待结果中', 'Waiting for result');
    if (hasVideo) return uiText('重新生成分镜视频', 'Regenerate storyboard video');
    return uiText('生成分镜视频', 'Generate storyboard video');
  }

  const canCancel = !!activeJob && (
    activeJob.status === 'awaiting_submit'
    || activeJob.status === 'pending'
    || activeJob.status === 'queuing'
    || activeJob.status === 'processing'
  );

  const cancelLabel = activeJob?.status === 'processing'
    ? uiText('停止本次任务', 'Stop this task')
    : uiText('取消排队', 'Cancel queue');

  const statusBanner = (() => {
    if (isSubmitting) {
      return {
        className: 'border-amber-500/30 bg-amber-500/10 text-amber-100',
        title: uiText('正在加入系统队列', 'Joining the system queue'),
        detail: uiText(
          '系统正在创建这条分镜任务。成功后会继续显示排队位置、开始时间和完成提醒。',
          'The system is creating this shot task now. Once accepted, it will keep showing the queue position, start timing, and completion reminder.',
        ),
      };
    }
    if (friendlyProgress) {
      return {
        className: bannerClassForStage(friendlyProgress.stage),
        title: uiText(friendlyProgress.titleZh, friendlyProgress.titleEn),
        detail: uiText(friendlyProgress.detailZh, friendlyProgress.detailEn),
      };
    }
    if (!hasVideo && pendingVideoSubmitId) {
      return {
        className: 'border-amber-500/30 bg-amber-500/10 text-amber-100',
        title: uiText('系统仍在跟进', 'Still being tracked'),
        detail: uiText(
          '这条提交已经被系统记录。即使你离开当前页面，结果出来后也会自动回写并提醒。',
          'This submission is already recorded. Even if you leave the page, the result will sync back automatically with a reminder.',
        ),
      };
    }
    if (dreaminaAsync) {
      return null;
    }
    return null;
  })();

  return (
    <>
      <div className="mt-4 rounded-2xl border border-amber-400/25 bg-gradient-to-br from-amber-500/12 via-[var(--color-surface-elevated)] to-[var(--color-surface)] p-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold text-amber-100">
              {uiText('当前分镜主操作', 'Primary shot action')}
            </div>
            <div className="text-[10px] text-[var(--color-text-muted)]">
              {uiText('先选中分镜，再生成或查看它的最新进度。', 'Select a shot, then generate it or check its latest progress.')}
            </div>
          </div>
          {!hasVideo && !hasPendingBackend && (
            <span className="rounded-full border border-amber-400/35 bg-amber-400/10 px-2 py-1 text-[10px] font-semibold text-amber-200">
              {uiText('推荐下一步', 'Recommended')}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-2 lg:flex-row lg:items-stretch">
          <button
            type="button"
            disabled={videoButtonDisabled}
            onClick={onGenerateShotVideo}
            className={`flex min-h-[74px] flex-1 flex-col items-start justify-center rounded-xl border px-4 py-3 text-left transition disabled:cursor-not-allowed ${primaryButtonClass}`}
          >
            <span className="text-base font-bold leading-tight">
              {videoButtonLabel()}
            </span>
            <span className="mt-1 text-[11px] leading-relaxed opacity-80">
              {videoButtonHint}
            </span>
          </button>
          <div className="flex flex-wrap items-center gap-2 lg:max-w-[360px] lg:justify-end">
            {showAdvancedTools && (
              <button
                type="button"
                disabled={shotMediaBusy === 'frame' || !hasProductionDesign}
                onClick={onGenerateShotFrame}
                className="rounded-lg border border-cyan-500/35 bg-cyan-500/10 px-3 py-2 text-xs font-medium text-cyan-200 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {shotMediaBusy === 'frame'
                  ? uiText('首帧生成中...', 'Generating first frame...')
                  : uiText('生成首帧', 'Generate first frame')}
              </button>
            )}
            {canCancel && onCancelActiveJob && (
              <button
                type="button"
                disabled={cancelBusy}
                onClick={onCancelActiveJob}
                className={
                  activeJob?.status === 'processing'
                    ? 'rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/20 disabled:opacity-50'
                    : 'rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-300 transition-colors hover:bg-amber-500/20 disabled:opacity-50'
                }
              >
                {cancelBusy ? uiText('处理中...', 'Working...') : cancelLabel}
              </button>
            )}
            {!hasActiveJob && hasPendingBackend && shotMediaBusy !== 'video' && onCheckVideoProgress && (
              <button
                type="button"
                disabled={checkingProgress}
                onClick={onCheckVideoProgress}
                className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-300 transition-colors hover:bg-amber-500/20 disabled:opacity-50"
              >
                {checkingProgress ? uiText('检查中...', 'Checking...') : uiText('刷新最新进度', 'Refresh progress')}
              </button>
            )}
          </div>
        </div>
      </div>
      {needsImageToVideoStill && (
        <p className="mt-2 rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-3 py-2 text-[11px] leading-relaxed text-cyan-100">
          {uiText(
            '图生视频需要当前分镜先有首帧。请展开高级工具生成首帧，或切换为文生视频。',
            'Image-to-video needs a first frame for this shot. Open Advanced tools to generate one, or switch back to text-to-video.',
          )}
        </p>
      )}
      {statusBanner && (
        <div className={`mt-3 rounded-xl border px-3 py-2.5 ${statusBanner.className}`}>
          <div className="text-xs font-semibold">{statusBanner.title}</div>
          <p className="mt-1 text-[11px] leading-relaxed opacity-90">{statusBanner.detail}</p>
        </div>
      )}
    </>
  );
}
