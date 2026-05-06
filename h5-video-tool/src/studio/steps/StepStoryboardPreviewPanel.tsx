import type { BatchJobDto, QueueSnapshotDto } from '../../api/batchJobs';
import { useLocale } from '../../i18n/LocaleContext.tsx';
import { pickUiText } from '../../i18n/uiText.ts';
import { hasProductionShotPreviewMedia, type ProductionShot, type ProductionShotVideoVersion } from '../productionTypes';
import { VersionTimeline } from '../components/VersionTimeline';
import { getShotUserStatus, type ShotProviderStatus } from '../shotUserStatus';
import { resolveFriendlyVideoProgress } from '../storyboardQueueState';

function statusCardClass(stage: string): string {
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
    default:
      return 'border-amber-500/30 bg-amber-500/10 text-amber-100';
  }
}

export function StepStoryboardPreviewPanel({
  shot,
  shotMediaBusy,
  dreaminaAsync,
  activeJob,
  queueSnapshot,
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
  queueSnapshot?: QueueSnapshotDto | null;
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
  const hasPendingVideoCard = shotMediaBusy === 'video'
    || (!!activeJob && !shotPreviewPlaySrc && !hasVideo)
    || (!shotPreviewPlaySrc && (userStatus.status === 'waiting_submit' || userStatus.status === 'platform_queueing' || userStatus.status === 'generating'));
  const friendlyProgress = activeJob
    ? resolveFriendlyVideoProgress({ job: activeJob, snapshot: queueSnapshot ?? undefined })
    : null;

  const statusCard = (() => {
    if (shotMediaBusy === 'video') {
      return {
        className: 'border-amber-500/30 bg-amber-500/10 text-amber-100',
        title: uiText('正在加入系统队列', 'Joining the system queue'),
        detail: uiText(
          '当前分镜正在入队。成功后，这里会继续显示排队位置、预计开始时间和最新进度。',
          'This shot is joining the queue now. Once accepted, this panel will keep showing the queue position, estimated start time, and latest progress.',
        ),
      };
    }
    if (friendlyProgress) {
      return {
        className: statusCardClass(friendlyProgress.stage),
        title: uiText(friendlyProgress.titleZh, friendlyProgress.titleEn),
        detail: uiText(friendlyProgress.detailZh, friendlyProgress.detailEn),
      };
    }
    if (!hasVideo && shot.pendingVideoSubmitId) {
      return {
        className: 'border-amber-500/30 bg-amber-500/10 text-amber-100',
        title: uiText('系统仍在跟进', 'Still being tracked'),
        detail: uiText(
          '系统已经记住这次提交。即使当前页面还没刷新，结果出来后也会自动回写到这里。',
          'This submission is already recorded. Even if this page has not refreshed yet, the result will sync back here automatically.',
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
          '这里会显示当前分镜的首帧、视频进度和最终成片。视频生成过程中，状态会自动更新。',
          'This panel shows the still frame, video progress, and final result for the current shot. Progress updates here automatically while the video is being generated.',
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
            '暂无首帧；如果要用图生视频，可以先在高级工具里生成首帧。',
            'No first frame yet. If you want image-to-video, generate a first frame from Advanced tools first.',
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
                {shotMediaBusy === 'video'
                  ? uiText('正在加入系统队列', 'Joining the system queue')
                  : friendlyProgress
                    ? uiText(friendlyProgress.shortLabelZh, friendlyProgress.shortLabelEn)
                    : uiText('等待结果中', 'Waiting for result')}
              </span>
            </div>
            <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 px-4 py-8">
              <div
                className="h-11 w-11 animate-spin rounded-full border-2 border-white/15 border-t-amber-400"
                style={shotMediaBusy !== 'video' ? { animationDuration: '2s' } : undefined}
                aria-hidden
              />
              <div className="text-center">
                <p className="text-sm font-medium text-white">
                  {shotMediaBusy === 'video'
                    ? uiText('视频正在排队', 'Video is joining the queue')
                    : friendlyProgress
                      ? uiText(friendlyProgress.titleZh, friendlyProgress.titleEn)
                      : uiText('系统仍在处理', 'The system is still processing')}
                </p>
                <p className="mt-1.5 text-[11px] leading-relaxed text-white/55">
                  {shotMediaBusy === 'video'
                    ? uiText(
                        '系统正在提交请求。成功后，这里会继续显示预计开始时间和完成进度。',
                        'The system is submitting your request now. Once accepted, this panel will continue showing the estimated start time and progress.',
                      )
                    : friendlyProgress
                      ? uiText(friendlyProgress.detailZh, friendlyProgress.detailEn)
                      : uiText(
                          '系统仍在检查这条分镜任务。结果出来后会自动显示在这里。',
                          'The system is still checking this shot task. The result will appear here automatically once it is ready.',
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
