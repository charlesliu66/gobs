import type { BatchJobDto } from '../../api/batchJobs';
import { useLocale } from '../../i18n/LocaleContext.tsx';
import { pickUiText } from '../../i18n/uiText.ts';
import { hasProductionShotPreviewMedia, type ProductionShot, type ProductionShotVideoVersion } from '../productionTypes';
import { VersionTimeline } from '../components/VersionTimeline';

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
  const platformQueuePosition = typeof activeJob?.globalQueuePos === 'number' ? activeJob.globalQueuePos + 1 : null;
  const dreaminaQueuePosition = typeof activeJob?.queueInfo?.queue_idx === 'number' ? activeJob.queueInfo.queue_idx + 1 : null;
  const dreaminaQueueSize = typeof activeJob?.queueInfo?.queue_length === 'number' ? activeJob.queueInfo.queue_length : null;
  const hasPendingVideoCard = shotMediaBusy === 'video'
    || (!!activeJob && !shotPreviewPlaySrc && !hasVideo)
    || (!shotPreviewPlaySrc && !hasVideo && !!shot.pendingVideoSubmitId);

  const statusCard = (() => {
    if (shotMediaBusy === 'video') {
      return {
        className: 'border-amber-500/30 bg-amber-500/10 text-amber-100',
        title: uiText('正在加入平台队列', 'Joining the platform queue'),
        detail: uiText(
          '当前分镜正在入队。入队成功后，这里会显示它在平台共享队列中的具体位次。',
          'This shot is being queued right now. Once queued, this panel will show its exact position in the shared platform queue.',
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
          `系统会自动继续排队，预计 ${formatEta(activeJob.etaSec, uiLocale)} 后轮到你。轮到后会自动开始生成，并把结果回到当前项目的这个分镜历史里。`,
          `The queue will continue automatically, with an estimated start ${formatEta(activeJob.etaSec, uiLocale)} from now. Once it is your turn, rendering begins automatically and the result returns to this shot history.`,
        ),
      };
    }
    if (activeJob?.status === 'pending' || activeJob?.status === 'queuing') {
      const queueLabel = dreaminaQueuePosition != null
        ? (
            dreaminaQueueSize != null
              ? uiText(`即梦队列第 ${dreaminaQueuePosition}/${dreaminaQueueSize} 位`, `Dreamina queue #${dreaminaQueuePosition}/${dreaminaQueueSize}`)
              : uiText(`即梦队列第 ${dreaminaQueuePosition} 位`, `Dreamina queue #${dreaminaQueuePosition}`)
          )
        : uiText('已提交到即梦', 'Submitted to Dreamina');
      return {
        className: 'border-sky-500/30 bg-sky-500/10 text-sky-100',
        title: uiText('平台已排到你，等待生成', 'Platform finished, waiting to render'),
        detail: uiText(
          `${queueLabel}。后端会持续跟进，完成后自动回到当前项目的这个分镜历史里。`,
          `${queueLabel}. Backend tracking will continue, and the finished video will return to this shot history automatically.`,
        ),
      };
    }
    if (activeJob?.status === 'processing') {
      return {
        className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100',
        title: uiText('已经轮到你，正在生成', 'It is your turn now'),
        detail: uiText(
          '即梦正在生成当前分镜。即使你稍后再回来，后端也会继续轮询并把结果自动回写到当前分镜历史里。',
          'Dreamina is rendering this shot now. Even if you come back later, backend polling will continue and write the finished result back to this shot history automatically.',
        ),
      };
    }
    if (!hasVideo && shot.pendingVideoSubmitId) {
      return {
        className: 'border-amber-500/30 bg-amber-500/10 text-amber-100',
        title: uiText('已提交，后台仍在跟进', 'Submitted, backend still tracking'),
        detail: uiText(
          '系统已经记录这条分镜的提交信息。即使界面暂时没有刷新，后端也会继续检查并在完成后自动回写到当前分镜历史里。',
          'The submission is already recorded for this shot. Even if the UI looks stale for a moment, backend polling will continue and write the finished result back to this shot history automatically.',
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
          '分镜图由 Imagen 生成；分镜视频走即梦等接口。生成中的状态会显示在这里，完成后可直接在下方播放。',
          'Storyboard stills come from Imagen, and storyboard videos use Dreamina or similar backends. Active status appears here while rendering, and finished videos can be played below.',
        )}
      </p>
      {shotMediaBusy === 'frame' ? (
        <div className="mt-2 flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-950/20 px-2.5 py-2 text-[11px] text-cyan-100/90">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-cyan-400/30 border-t-cyan-400" />
          <span>{uiText('分镜静帧生成中…', 'Generating storyboard still...')}</span>
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
          {uiText('暂无分镜图，点击“生成分镜图”。', 'No storyboard still yet. Click “Generate storyboard frame”.')}
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
                      ? uiText(`平台排队第 ${platformQueuePosition} 位`, `Platform queue #${platformQueuePosition}`)
                      : uiText('平台排队中', 'Queued on platform'))
                  : activeJob?.status === 'pending' || activeJob?.status === 'queuing'
                    ? uiText('已提交生成队列', 'Submitted for render')
                    : activeJob?.status === 'processing'
                      ? uiText('已经轮到你，正在生成', 'It is your turn now')
                      : shotMediaBusy === 'video'
                        ? uiText('正在加入平台队列', 'Joining the platform queue')
                        : uiText('后台跟进中', 'Backend tracking')}
              </span>
            </div>
            <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 px-4 py-8">
              <div
                className="h-11 w-11 animate-spin rounded-full border-2 border-white/15 border-t-amber-400"
                style={shotMediaBusy !== 'video' ? { animationDuration: '2s' } : undefined}
                aria-hidden
              />
              <div className="text-center">
                <p className="text-sm font-medium text-white">{uiText('视频生成中', 'Video is rendering')}</p>
                <p className="mt-1.5 text-[11px] leading-relaxed text-white/55">
                  {activeJob?.status === 'awaiting_submit'
                    ? uiText(
                        `当前正在平台共享队列中等待，预计 ${formatEta(activeJob.etaSec, uiLocale)} 后轮到你。`,
                        `The shot is waiting in the shared platform queue, with an estimated start ${formatEta(activeJob.etaSec, uiLocale)} from now.`,
                      )
                    : activeJob?.status === 'pending' || activeJob?.status === 'queuing'
                      ? uiText(
                          '平台已经排到你了，当前等待即梦受理或排队。完成后会自动出现在当前分镜历史里。',
                          'The platform queue has already reached your job. Dreamina is now accepting or queueing it, and the finished video will return to this shot history automatically.',
                        )
                      : activeJob?.status === 'processing'
                        ? uiText(
                            '即梦正在生成当前分镜。完成后会自动出现在当前分镜历史里。',
                            'Dreamina is rendering this shot now. The finished video will return to this shot history automatically.',
                          )
                        : shotMediaBusy === 'video'
                          ? uiText(
                              '正在提交入队请求，成功后会显示平台位次，并由系统自动继续排队与生成。',
                              'The queue request is being submitted. Once it succeeds, the platform position will appear here and the system will continue queueing and rendering automatically.',
                            )
                          : uiText(
                              '后端仍在继续检查这条分镜的生成结果，完成后会自动显示在这里。',
                              'Backend polling is still checking this shot. The finished video will appear here automatically once it is ready.',
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
