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
  const arkQueuePosition = typeof activeJob?.queueInfo?.queue_idx === 'number' ? activeJob.queueInfo.queue_idx + 1 : null;
  const arkQueueSize = typeof activeJob?.queueInfo?.queue_length === 'number' ? activeJob.queueInfo.queue_length : null;
  const needsImageToVideoStill = shotVideoDreaminaModel === 'dreamina-image2video' && !hasStill;

  const videoButtonHint = (() => {
    if (isSubmitting) {
      return uiText(
        '正在提交当前分镜。入队成功后，这里会先显示平台排队，再显示 Ark 状态。',
        'Submitting this shot now. This panel will first show platform queue, then Ark status.',
      );
    }
    if (activeJob?.status === 'awaiting_submit') {
      return platformQueuePosition != null
        ? uiText(
            `当前排在平台队列第 ${platformQueuePosition} 位，预计 ${formatEta(activeJob.etaSec, uiLocale)} 后轮到你。`,
            `Currently #${platformQueuePosition} in the platform queue. Estimated start: ${formatEta(activeJob.etaSec, uiLocale)}.`,
          )
        : uiText(
            '当前正在平台队列中，平台会最多同时向 Ark 提交 3 条视频任务。',
            'This shot is in the platform queue. The platform can submit up to 3 Ark video jobs in parallel.',
          );
    }
    if (activeJob?.status === 'pending') {
      return uiText(
        '平台已经拿到 Ark task id，正在等待 Ark 正式受理。',
        'The platform already received an Ark task id and is waiting for Ark acceptance.',
      );
    }
    if (activeJob?.status === 'queuing') {
      return arkQueuePosition != null
        ? uiText(
            `Ark 已接收，当前在 Ark 队列第 ${arkQueuePosition}${arkQueueSize ? `/${arkQueueSize}` : ''} 位。`,
            `Accepted by Ark and currently #${arkQueuePosition}${arkQueueSize ? `/${arkQueueSize}` : ''} in the Ark queue.`,
          )
        : uiText(
            'Ark 已接收该任务，正在 Ark 队列中等待渲染。',
            'Ark accepted this task and it is waiting in the Ark queue.',
          );
    }
    if (activeJob?.status === 'processing') {
      return uiText(
        'Ark 正在生成当前分镜。你可以离开页面，完成后会自动回写并提醒。',
        'Ark is rendering this shot. You can leave the page; the result will sync back automatically with a reminder.',
      );
    }
    if (!hasVideo && pendingVideoSubmitId) {
      return uiText(
        '已有提交记录。若页面状态没有刷新，可以手动检查一次最新进度。',
        'A submission is already recorded. If the page looks stale, you can manually fetch the latest progress.',
      );
    }
    if (hasVideo) {
      return uiText(
        '重新生成会为当前分镜增加一个新视频版本，历史版本仍可在右侧切换。',
        'Regenerating creates a new video version for this shot while keeping existing versions selectable.',
      );
    }
    return uiText(
      '提交当前分镜到平台队列。平台会按最多 3 并发依次把任务送入 Ark。',
      'Submit this shot to the platform queue. The platform will feed jobs into Ark with up to 3 concurrent slots.',
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
        ? uiText(`平台排队 #${platformQueuePosition}`, `Platform queue #${platformQueuePosition}`)
        : uiText('平台排队中', 'In platform queue');
    }
    if (activeJob?.status === 'pending') return uiText('已提交到 Ark', 'Submitted to Ark');
    if (activeJob?.status === 'queuing') return uiText('Ark 队列中', 'Queued in Ark');
    if (activeJob?.status === 'processing') return uiText('Ark 生成中', 'Rendering in Ark');
    if (!hasVideo && pendingVideoSubmitId) return uiText('后台跟进中', 'Background tracking');
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
    ? uiText('停止本次跟进', 'Stop tracking')
    : uiText('取消排队', 'Cancel queue');

  const statusBanner = (() => {
    if (isSubmitting) {
      return {
        className: 'border-amber-500/30 bg-amber-500/10 text-amber-100',
        title: uiText('正在加入平台队列', 'Joining the platform queue'),
        detail: uiText(
          '系统正在创建这条分镜任务。成功后会先显示平台排队位次，再显示 Ark 的受理和渲染状态。',
          'The system is creating this shot job. Once accepted, you will first see the platform queue position, then Ark acceptance and rendering states.',
        ),
      };
    }
    if (activeJob?.status === 'awaiting_submit') {
      return {
        className: 'border-violet-500/30 bg-violet-500/10 text-violet-100',
        title: platformQueuePosition != null
          ? uiText(`平台排队第 ${platformQueuePosition} 位`, `Platform queue #${platformQueuePosition}`)
          : uiText('平台排队中', 'In platform queue'),
        detail: uiText(
          `平台会最多同时向 Ark 提交 3 条视频任务。预计 ${formatEta(activeJob.etaSec, uiLocale)} 后轮到你。`,
          `The platform can submit up to 3 Ark video jobs in parallel. Estimated start: ${formatEta(activeJob.etaSec, uiLocale)}.`,
        ),
      };
    }
    if (activeJob?.status === 'pending') {
      return {
        className: 'border-sky-500/30 bg-sky-500/10 text-sky-100',
        title: uiText('已提交到 Ark', 'Submitted to Ark'),
        detail: uiText(
          '平台已经拿到 Ark task id，正在等待 Ark 受理并进入 Ark 队列。',
          'The platform already received the Ark task id and is waiting for Ark to accept the job into its queue.',
        ),
      };
    }
    if (activeJob?.status === 'queuing') {
      const queueDetail = arkQueuePosition != null
        ? uiText(
            `当前在 Ark 队列第 ${arkQueuePosition}${arkQueueSize ? `/${arkQueueSize}` : ''} 位。`,
            `Currently #${arkQueuePosition}${arkQueueSize ? `/${arkQueueSize}` : ''} in the Ark queue.`,
          )
        : uiText('Ark 已接收，当前在 Ark 队列中等待。', 'Ark accepted the job and it is now waiting in the Ark queue.');
      return {
        className: 'border-sky-500/30 bg-sky-500/10 text-sky-100',
        title: uiText('Ark 队列中', 'Queued in Ark'),
        detail: uiText(
          `${queueDetail} 后端会持续跟进，完成后自动回写到这个分镜。`,
          `${queueDetail} Backend tracking will continue, and the result will sync back to this shot automatically.`,
        ),
      };
    }
    if (activeJob?.status === 'processing') {
      return {
        className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100',
        title: uiText('Ark 正在生成', 'Rendering in Ark'),
        detail: uiText(
          '视频已经进入 Ark 渲染阶段。现在停止只会停止本地跟进，通常无法追回已消耗额度。',
          'The video is already rendering in Ark. Stopping now only stops local tracking, and consumed credits usually cannot be recovered.',
        ),
      };
    }
    if (!hasVideo && pendingVideoSubmitId) {
      return {
        className: 'border-amber-500/30 bg-amber-500/10 text-amber-100',
        title: uiText('后台仍在跟进', 'Background tracking continues'),
        detail: uiText(
          '系统已经记录这条提交。即使你离开页面，后端也会继续检查并在完成后自动回写。',
          'The submission is already recorded. Even if you leave the page, backend polling continues and writes the result back automatically when ready.',
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
                {checkingProgress ? uiText('检查中...', 'Checking...') : uiText('手动检查进度', 'Check progress manually')}
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
