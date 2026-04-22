import { useLocale } from '../../i18n/LocaleContext.tsx';
import { pickUiText } from '../../i18n/uiText.ts';
import { hasProductionShotPreviewMedia, type ProductionShot, type ProductionShotVideoVersion } from '../productionTypes';
import { VersionTimeline } from '../components/VersionTimeline';

export function StepStoryboardPreviewPanel({
  shot,
  shotMediaBusy,
  dreaminaAsync,
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

  return (
    <aside className="w-full shrink-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4 lg:w-72">
      <div className="text-xs font-medium text-[var(--color-text)]">{uiText('本镜预览', 'Shot preview')}</div>
      <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">
        {uiText(
          '分镜图由 Imagen 生成；分镜视频走即梦等接口。生成中会显示状态，完成后可直接在下方播放。',
          'Storyboard stills come from Imagen, and storyboard videos use Dreamina or similar backends. Active status appears here while rendering, and finished videos can be played below.',
        )}
      </p>
      {shotMediaBusy === 'frame' ? (
        <div className="mt-2 flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-950/20 px-2.5 py-2 text-[11px] text-cyan-100/90">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-cyan-400/30 border-t-cyan-400" />
          <span>{uiText('分镜静帧生成中…', 'Generating storyboard still…')}</span>
        </div>
      ) : null}
      {shot.previewStillDataUrl ? (
        <div className="mt-3">
          <div className="text-[10px] font-medium text-[var(--color-text-muted)]">{uiText('分镜静帧', 'Storyboard still')}</div>
          <img
            src={shot.previewStillDataUrl}
            alt=""
            className="mt-1 max-h-48 w-full rounded-lg border border-[var(--color-border)] object-contain cursor-zoom-in"
            onClick={() => onOpenLightbox(shot.previewStillDataUrl!)}
          />
        </div>
      ) : (
        <p className="mt-3 text-[11px] text-[var(--color-text-muted)]">
          {uiText('暂无分镜图，点击「生成分镜图」。', 'No storyboard still yet. Click “Generate storyboard frame”.')}
        </p>
      )}
      <div className="mt-3">
        <div className="text-[10px] font-medium text-[var(--color-text-muted)]">{uiText('分镜视频', 'Storyboard video')}</div>
        {(shotMediaBusy === 'video' || (!shotPreviewPlaySrc && !hasVideo && shot.pendingVideoSubmitId)) ? (
          <div className="mt-1.5 overflow-hidden rounded-xl border border-amber-500/35 bg-[linear-gradient(145deg,rgba(120,80,20,0.22),rgba(20,20,28,0.95))] shadow-inner">
            <div className="flex items-center gap-2 border-b border-amber-500/20 px-3 py-2">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
              </span>
              <span className="text-[11px] font-semibold tracking-wide text-amber-100">
                {shotMediaBusy === 'video'
                  ? uiText('正在生成中', 'Generating now')
                  : uiText('即梦生成中（后台轮询）', 'Dreamina rendering (backend polling)')}
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
                  {shotMediaBusy !== 'video'
                    ? uiText(
                        '后端正在轮询即梦，完成后将自动出现在此处',
                        'Backend polling is still running. The finished video will appear here automatically.',
                      )
                    : dreaminaAsync
                      ? uiText(
                          '已提交至即梦，排队与渲染完成后将自动出现在此处，请勿关闭本页',
                          'Submitted to Dreamina. Once queueing and render finish, the video will appear here automatically. Keep this page open.',
                        )
                      : uiText('渲染完成后将自动出现在此处', 'The finished video will appear here automatically.')}
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
            {uiText('暂无成片，点击左侧「生成分镜视频」。', 'No video yet. Use “Generate storyboard video” on the left.')}
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
