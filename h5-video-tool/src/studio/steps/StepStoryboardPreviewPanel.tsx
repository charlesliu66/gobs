import type { BatchJobDto } from '../../api/batchJobs';
import { useLocale } from '../../i18n/LocaleContext.tsx';
import { pickUiText } from '../../i18n/uiText.ts';
import { hasProductionShotPreviewMedia, type ProductionShot, type ProductionShotVideoVersion } from '../productionTypes';
import { VersionTimeline } from '../components/VersionTimeline';
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

export function StepStoryboardPreviewPanel({
  shot,
  shotMediaBusy,
  dreaminaAsync,
  activeJob,
  shotPreviewPlaySrc,
  shotVideoVersions,
  selectedShotVideoVersion,
  onOpenLightbox,
  onKeepOnlyCurrentVersion,
  onSelectVideoVersion,
}: {
  shot: ProductionShot;
  shotMediaBusy: 'frame' | 'video' | null;
  dreaminaAsync: boolean;
  activeJob?: BatchJobDto | null;
  shotPreviewPlaySrc: string | null;
  shotVideoVersions: ProductionShotVideoVersion[];
  selectedShotVideoVersion: ProductionShotVideoVersion | null;
  onOpenLightbox: (src: string) => void;
  onKeepOnlyCurrentVersion: (id: string) => void;
  onSelectVideoVersion: (id: string) => void;
}) {
  const { uiLocale } = useLocale();
  const uiText = <T,>(zh: T, en: T) => pickUiText(uiLocale, zh, en);
  const hasVideo = hasProductionShotPreviewMedia(shot);
  const userStatus = getShotUserStatus({
    hasVideo,
    jobStatus: activeJob?.status as ShotProviderStatus | undefined,
    hasPendingSubmitId: !!shot.pendingVideoSubmitId || shotMediaBusy === 'video',
  });
  const platformQueuePosition = typeof activeJob?.globalQueuePos === 'number' ? activeJob.globalQueuePos + 1 : null;
  const arkQueuePosition = typeof activeJob?.queueInfo?.queue_idx === 'number' ? activeJob.queueInfo.queue_idx + 1 : null;
  const arkQueueSize = typeof activeJob?.queueInfo?.queue_length === 'number' ? activeJob.queueInfo.queue_length : null;
  const hasPendingVideoCard = shotMediaBusy === 'video'
    || (!!activeJob && !shotPreviewPlaySrc && !hasVideo)
    || (!shotPreviewPlaySrc && (userStatus.status === 'waiting_submit' || userStatus.status === 'platform_queueing' || userStatus.status === 'generating'));

  const statusCard = (() => {
    if (shotMediaBusy === 'video') {
      return {
        className: 'border-amber-500/30 bg-amber-500/10 text-amber-100',
        title: uiText('正在加入平台队列', 'Joining the platform queue'),
        detail: uiText(
          '当前分镜正在入队。成功后这里会先显示平台位次，再显示 Ark 的受理和生成状态。',
          'This shot is being queued now. Once accepted, this panel will show the platform position first, then Ark acceptance and rendering states.',
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
          `平台会最多同时向 Ark 提交 3 条任务，预计 ${formatEta(activeJob.etaSec, uiLocale)} 后轮到当前分镜。`,
          `The platform can submit up to 3 jobs to Ark in parallel. Estimated start for this shot: ${formatEta(activeJob.etaSec, uiLocale)}.`,
        ),
      };
    }
    if (activeJob?.status === 'pending') {
      return {
        className: 'border-sky-500/30 bg-sky-500/10 text-sky-100',
        title: uiText('已提交到 Ark', 'Submitted to Ark'),
        detail: uiText(
          '平台已经拿到 Ark task id，正在等待 Ark 受理。',
          'The platform already received the Ark task id and is waiting for Ark to accept the job.',
        ),
      };
    }
    if (activeJob?.status === 'queuing') {
      const queueLabel = arkQueuePosition != null
        ? uiText(
            `Ark 队列第 ${arkQueuePosition}${arkQueueSize ? `/${arkQueueSize}` : ''} 位`,
            `Ark queue #${arkQueuePosition}${arkQueueSize ? `/${arkQueueSize}` : ''}`,
          )
        : uiText('Ark 队列中', 'Queued in Ark');
      return {
        className: 'border-sky-500/30 bg-sky-500/10 text-sky-100',
        title: queueLabel,
        detail: uiText(
          '后端会持续跟进当前任务，完成后自动把视频回写到这个分镜历史里。',
          'Backend tracking continues for this task, and the finished video will sync back into this shot history automatically.',
        ),
      };
    }
    if (activeJob?.status === 'processing') {
      return {
        className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100',
        title: uiText('Ark 正在生成', 'Rendering in Ark'),
        detail: uiText(
          '视频已经进入 Ark 渲染阶段。你可以稍后回来，完成后结果会自动出现在这里。',
          'The video is now rendering in Ark. You can come back later and the result will appear here automatically.',
        ),
      };
    }
    if (!hasVideo && shot.pendingVideoSubmitId) {
      return {
        className: 'border-amber-500/30 bg-amber-500/10 text-amber-100',
        title: uiText('后台仍在跟进', 'Background tracking continues'),
        detail: uiText(
          '系统已经记录这条提交。即使当前页面没有刷新，后端也会继续检查并在完成后自动回写。',
          'The submission is already recorded. Even if this page looks stale, backend polling continues and writes back the result automatically once it is ready.',
        ),
      };
    }
    if (dreaminaAsync) {
      return null;
    }
    return null;
  })();

  return (
    <aside className="w-full shrink-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4 lg:w-72">
      <div className="text-xs font-medium text-[var(--color-text)]">{uiText('本镜预览', 'Shot preview')}</div>
      <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">
        {uiText(
          '分镜图由图片模型生成，分镜视频提交到 Ark。排队和生成状态会显示在这里，完成后可直接播放。',
          'Storyboard stills come from image models, while storyboard videos are submitted to Ark. Queue and render states appear here, and finished videos can be played directly.',
        )}
      </p>
      {shotMediaBusy === 'frame' ? (
        <div className="mt-2 flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-950/20 px-2.5 py-2 text-[11px] text-cyan-100/90">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-cyan-400/30 border-t-cyan-400" />
          <span>{uiText('分镜静帧生成中...', 'Generating storyboard still...')}</span>
        </div>
      ) : null}
      {shot.previewStillDataUrl ? (
        <div className="mt-3">
          <div className="text-[10px] font-medium text-[var(--color-text-muted)]">{uiText('分镜静帧', 'Storyboard still')}</div>
          <img
            src={shot.previewStillDataUrl}
            alt=""
            className="mt-1 max-h-48 w-full cursor-zoom-in rounded-lg border border-[var(--color-border)] object-contain"
            onClick={() => onOpenLightbox(shot.previewStillDataUrl!)}
          />
        </div>
      ) : (
        <p className="mt-3 text-[11px] text-[var(--color-text-muted)]">
          {uiText(
            '暂无首帧；需要图生视频时可在高级工具里先生成首帧。',
            'No first frame yet. Generate one from Advanced tools before using image-to-video.',
          )}
        </p>
      )}
      <div className="mt-3">
        <div className="text-[10px] font-medium text-[var(--color-text-muted)]">{uiText('分镜视频', 'Storyboard video')}</div>
        {statusCard && (
          <div className={`mt-1.5 rounded-lg border px-3 py-2 ${statusCard.className}`}>
            <div className="text-[11px] font-semibold">{statusCard.title}</div>
            <p className="mt-1 text-[10px] leading-relaxed opacity-90">{statusCard.detail}</p>
          </div>
        )}
        {hasPendingVideoCard ? (
          <div className="mt-1.5 overflow-hidden rounded-xl border border-amber-500/35 bg-[linear-gradient(145deg,rgba(120,80,20,0.22),rgba(20,20,28,0.95))] shadow-inner">
            <div className="flex items-center gap-2 border-b border-amber-500/20 px-3 py-2">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
              </span>
              <span className="text-[11px] font-semibold tracking-wide text-amber-100">
                {activeJob?.status === 'awaiting_submit'
                  ? (platformQueuePosition != null
                      ? uiText(`平台排队 #${platformQueuePosition}`, `Platform queue #${platformQueuePosition}`)
                      : uiText('平台排队中', 'In platform queue'))
                  : activeJob?.status === 'pending'
                    ? uiText('已提交到 Ark', 'Submitted to Ark')
                    : activeJob?.status === 'queuing'
                      ? uiText('Ark 队列中', 'Queued in Ark')
                      : activeJob?.status === 'processing'
                        ? uiText('Ark 生成中', 'Rendering in Ark')
                        : shotMediaBusy === 'video'
                          ? uiText('正在加入平台队列', 'Joining the platform queue')
                          : uiText('后台跟进中', 'Background tracking')}
              </span>
            </div>
            <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 px-4 py-8">
              <div
                className="h-11 w-11 animate-spin rounded-full border-2 border-white/15 border-t-amber-400"
                style={shotMediaBusy !== 'video' ? { animationDuration: '2s' } : undefined}
                aria-hidden
              />
              <div className="text-center">
                <p className="text-sm font-medium text-white">{uiText('视频处理中', 'Video is being processed')}</p>
                <p className="mt-1.5 text-[11px] leading-relaxed text-white/55">
                  {activeJob?.status === 'awaiting_submit'
                    ? uiText(
                        `当前在平台队列中等待，预计 ${formatEta(activeJob.etaSec, uiLocale)} 后轮到这个分镜。`,
                        `This shot is waiting in the platform queue. Estimated start: ${formatEta(activeJob.etaSec, uiLocale)}.`,
                      )
                    : activeJob?.status === 'pending'
                      ? uiText(
                          '平台已经提交到 Ark，正在等待 Ark 正式受理。',
                          'The platform submitted the job to Ark and is waiting for Ark acceptance.',
                        )
                      : activeJob?.status === 'queuing'
                        ? uiText(
                            'Ark 已接收当前任务，正在 Ark 队列中等待渲染。',
                            'Ark accepted this task and it is waiting in the Ark queue.',
                          )
                        : activeJob?.status === 'processing'
                          ? uiText(
                              'Ark 正在渲染当前分镜。完成后会自动显示在这里并发出提醒。',
                              'Ark is rendering this shot now. The finished video will appear here automatically with a reminder.',
                            )
                          : shotMediaBusy === 'video'
                            ? uiText(
                                '正在提交入队请求。成功后这里会展示平台和 Ark 的后续状态。',
                                'The queue request is being submitted. This panel will show platform and Ark states once accepted.',
                              )
                            : uiText(
                                '后端仍在检查这条分镜任务。完成后视频会自动显示在这里。',
                                'Backend polling is still tracking this shot. The finished video will appear here automatically.',
                              )}
                </p>
              </div>
            </div>
          </div>
        ) : shotPreviewPlaySrc ? (
          <video
            src={shotPreviewPlaySrc}
            controls
            playsInline
            className="mt-1.5 w-full rounded-lg border border-[var(--color-border)] bg-black"
          />
        ) : (
          <p className="mt-1.5 text-[11px] text-[var(--color-text-muted)]">
            {uiText('暂无成片，点击左侧“生成分镜视频”。', 'No video yet. Use “Generate storyboard video” on the left.')}
          </p>
        )}
        <VersionTimeline
          versions={shotVideoVersions}
          selectedVersionId={selectedShotVideoVersion?.id}
          onSelect={onSelectVideoVersion}
          onKeepOnly={onKeepOnlyCurrentVersion}
        />
      </div>
    </aside>
  );
}
