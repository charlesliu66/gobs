import type { BatchJobDto } from '../../api/batchJobs';
import { useLocale } from '../../i18n/LocaleContext.tsx';
import { pickUiText } from '../../i18n/uiText.ts';
import { getShotUserStatus, type ShotProviderStatus } from '../shotUserStatus';

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
  hasStill,
  showAdvancedTools,
  shotVideoDreaminaModel,
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
  hasStill?: boolean;
  showAdvancedTools?: boolean;
  shotVideoDreaminaModel?: string;
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
  const userStatus = getShotUserStatus({
    hasVideo: !!hasVideo,
    jobStatus: activeJob?.status as ShotProviderStatus | undefined,
    hasPendingSubmitId: !!pendingVideoSubmitId,
  });
  const hasPendingBackend = userStatus.status !== 'not_started' && userStatus.status !== 'completed';
  const videoButtonDisabled = isSubmitting || hasActiveJob;
  const platformQueuePosition = typeof activeJob?.globalQueuePos === 'number' ? activeJob.globalQueuePos + 1 : null;
  const dreaminaQueuePosition = typeof activeJob?.queueInfo?.queue_idx === 'number' ? activeJob.queueInfo.queue_idx + 1 : null;
  const dreaminaQueueSize = typeof activeJob?.queueInfo?.queue_length === 'number' ? activeJob.queueInfo.queue_length : null;
  const needsImageToVideoStill = shotVideoDreaminaModel === 'dreamina-image2video' && !hasStill;
  const videoButtonHint = (() => {
    if (isSubmitting) {
      return uiText(
        '正在提交当前分镜，入队成功后会显示平台排队位次。',
        'Submitting this shot now. The platform queue position will appear once queued.',
      );
    }
    if (activeJob?.status === 'awaiting_submit') {
      return platformQueuePosition != null
        ? uiText(
            `当前排在平台第 ${platformQueuePosition} 位；轮到后会自动开始生成并回写到本分镜。`,
            `Currently #${platformQueuePosition} in the shared queue. Rendering starts automatically and returns to this shot.`,
          )
        : uiText(
            '当前正在平台统一队列中等待，系统会持续推进。',
            'This shot is waiting in the shared platform queue and will keep advancing.',
          );
    }
    if (activeJob?.status === 'pending' || activeJob?.status === 'queuing') {
      return dreaminaQueuePosition != null
        ? uiText(
            `已进入即梦队列第 ${dreaminaQueuePosition}${dreaminaQueueSize ? `/${dreaminaQueueSize}` : ''} 位，完成后自动回到当前项目。`,
            `Now in Dreamina queue #${dreaminaQueuePosition}${dreaminaQueueSize ? `/${dreaminaQueueSize}` : ''}; the result returns to this project automatically.`,
          )
        : uiText(
            '已提交到即梦队列，后端会继续跟进结果。',
            'Submitted to Dreamina. Backend tracking will continue.',
          );
    }
    if (activeJob?.status === 'processing') {
      return uiText(
        '已经轮到当前分镜，正在生成中，请保持在本项目查看回写结果。',
        'This shot is rendering now. Stay in this project to see the returned result.',
      );
    }
    if (!hasVideo && pendingVideoSubmitId) {
      return uiText(
        '已有提交记录，点击手动检查可主动拉取最新进度。',
        'A submission is already recorded. Use Check progress to fetch the latest status.',
      );
    }
    if (hasVideo) {
      return uiText(
        '重新生成会为当前分镜增加新视频版本，历史版本仍可在右侧选择。',
        'Regenerating creates a new video version for this shot; existing versions remain selectable.',
      );
    }
    return uiText(
      '提交当前分镜到平台队列，入队后这里会显示你排在第几位。',
      'Submit this shot to the platform queue. Your queue position will appear here after it joins.',
    );
  })();

  const primaryButtonClass = (() => {
    if (activeJob?.status === 'processing') {
      return 'border-emerald-400/55 bg-emerald-500/20 text-emerald-50 shadow-[0_0_32px_rgba(16,185,129,0.14)]';
    }
    if (activeJob?.status === 'awaiting_submit') {
      return 'border-violet-400/55 bg-violet-500/20 text-violet-50 shadow-[0_0_32px_rgba(139,92,246,0.14)]';
    }
    if (activeJob?.status === 'pending' || activeJob?.status === 'queuing' || pendingVideoSubmitId) {
      return 'border-sky-400/55 bg-sky-500/20 text-sky-50 shadow-[0_0_32px_rgba(14,165,233,0.14)]';
    }
    return 'border-amber-300/70 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-300 text-slate-950 shadow-[0_0_34px_rgba(251,191,36,0.22)] hover:brightness-110';
  })();

  function videoButtonLabel() {
    if (isSubmitting) return uiText('入队中...', 'Queueing...');
    if (activeJob?.status === 'awaiting_submit') {
      return platformQueuePosition != null
        ? uiText(`平台排队第 ${platformQueuePosition} 位`, `Platform queue #${platformQueuePosition}`)
        : uiText('平台排队中', 'Queued on platform');
    }
    if (activeJob?.status === 'pending' || activeJob?.status === 'queuing') {
      return uiText('已提交生成队列', 'Submitted for render');
    }
    if (activeJob?.status === 'processing') return uiText('轮到你了，生成中', 'Rendering now');
    if (!hasVideo && pendingVideoSubmitId) return uiText('后台跟进中', 'Backend tracking');
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
    ? uiText('放弃本次生成', 'Stop this render')
    : uiText('取消排队', 'Cancel queue');

  const statusBanner = (() => {
    if (isSubmitting) {
      return {
        className: 'border-amber-500/30 bg-amber-500/10 text-amber-100',
        title: uiText('正在加入平台队列', 'Joining the platform queue'),
        detail: uiText(
          '系统正在把当前分镜加入平台统一调度队列。入队成功后，这里会显示你当前排在平台第几位。',
          'This shot is being added to the shared platform queue. Once queued, this panel will show the exact platform position.',
        ),
      };
    }
    if (activeJob?.status === 'awaiting_submit') {
      return {
        className: 'border-violet-500/30 bg-violet-500/10 text-violet-100',
        title: platformQueuePosition != null
          ? uiText(`平台排队第 ${platformQueuePosition} 位`, `Platform queue #${platformQueuePosition}`)
          : uiText('平台排队中', 'Queued on platform'),
        detail: uiText(
          `任务已进入平台统一调度队列，系统会自动继续排队。预计 ${formatEta(activeJob.etaSec, uiLocale)} 后轮到你，开始后会自动生成并回到当前项目的这个分镜历史里。`,
          `This shot is in the shared platform queue and will keep advancing automatically. Estimated start: ${formatEta(activeJob.etaSec, uiLocale)}. Once it is your turn, rendering starts automatically and the finished video returns to this shot history.`,
        ),
      };
    }
    if (activeJob?.status === 'pending' || activeJob?.status === 'queuing') {
      const queueDetail = dreaminaQueuePosition != null
        ? (
            dreaminaQueueSize != null
              ? uiText(`当前已进入即梦队列第 ${dreaminaQueuePosition}/${dreaminaQueueSize} 位。`, `The job is now in Dreamina queue #${dreaminaQueuePosition}/${dreaminaQueueSize}.`)
              : uiText(`当前已进入即梦队列第 ${dreaminaQueuePosition} 位。`, `The job is now in Dreamina queue #${dreaminaQueuePosition}.`)
          )
        : uiText('当前已提交到即梦，正在等待受理或排队。', 'The job has been submitted to Dreamina and is waiting to be accepted or queued.');
      return {
        className: 'border-sky-500/30 bg-sky-500/10 text-sky-100',
        title: uiText('平台已排到你，等待生成', 'Platform finished, waiting to render'),
        detail: uiText(
          `${queueDetail} 后端会持续跟进，完成后自动回到当前项目的这个分镜历史里。`,
          `${queueDetail} Backend tracking will continue, and the finished video will return to this shot history automatically.`,
        ),
      };
    }
    if (activeJob?.status === 'processing') {
      return {
        className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100',
        title: uiText('已经轮到你，正在生成', 'It is your turn now'),
        detail: uiText(
          '即梦正在生成当前分镜，后端会继续轮询并自动回写结果。现在取消会停止继续跟进，但通常无法追回已消耗积分。',
          'Dreamina is rendering this shot now. Backend polling continues and writes the result back automatically. Cancelling now stops follow-up tracking, but consumed credits usually cannot be recovered.',
        ),
      };
    }
    if (!hasVideo && pendingVideoSubmitId) {
      return {
        className: 'border-amber-500/30 bg-amber-500/10 text-amber-100',
        title: uiText('已提交，后台仍在跟进', 'Submitted, backend still tracking'),
        detail: uiText(
          '系统已经记录这条分镜的提交信息，即使页面暂时没刷新，后端也会继续检查并在完成后自动回写到当前分镜历史里。',
          'The submission is already recorded for this shot. Even if the page looks stale for a moment, backend polling will continue and write the finished video back to this shot history automatically.',
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
              {uiText('先选中分镜，再生成或查看它的排队状态。', 'Select a shot, then generate or track its queue state.')}
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
                {cancelBusy ? uiText('取消中...', 'Cancelling...') : cancelLabel}
              </button>
            )}
            {!hasActiveJob && hasPendingBackend && shotMediaBusy !== 'video' && onCheckVideoProgress && (
              <button
                type="button"
                disabled={checkingProgress}
                onClick={onCheckVideoProgress}
                className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-300 transition-colors hover:bg-amber-500/20 disabled:opacity-50"
              >
                {checkingProgress ? uiText('检查中...', 'Checking...') : uiText('手动检查进度', 'Check progress manually')}
              </button>
            )}
          </div>
        </div>
      </div>
      {needsImageToVideoStill && (
        <p className="mt-2 rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-3 py-2 text-[11px] leading-relaxed text-cyan-100">
          {uiText(
            '图生视频需要当前分镜先有首帧。请展开高级工具生成首帧，或切换为文本生成视频。',
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
