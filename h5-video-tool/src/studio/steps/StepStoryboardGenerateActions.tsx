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
      <div className="mt-3 flex flex-wrap gap-2">
        {showAdvancedTools && (
          <button
            type="button"
            disabled={shotMediaBusy === 'frame' || !hasProductionDesign}
            onClick={onGenerateShotFrame}
            className="rounded-lg border border-cyan-500/35 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-200 disabled:opacity-50"
          >
            {shotMediaBusy === 'frame'
              ? uiText('首帧生成中...', 'Generating first frame...')
              : uiText('生成首帧', 'Generate first frame')}
          </button>
        )}
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
