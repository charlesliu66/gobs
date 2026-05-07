import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import type { QueueSnapshotDto } from '../../api/batchJobs';
import { listEditorProjects, saveEditorProject } from '../../api/editor';
import { toast } from '../../components/Toast';
import type { AspectRatioPreset, MediaAsset, Track, TimelineProject, VideoClip } from '../../editor/types/timeline';
import { syncSourceAudioClipsFromVideo } from '../../editor/types/timeline';
import { useLocale } from '../../i18n/LocaleContext.tsx';
import { formatDate, formatDateTime, formatMessage, type UiLocale } from '../../i18n/locale.ts';
import {
  buildExportStoryboardShotStatuses,
  summarizeExportStoryboardStatus,
  type ShotActiveJobMap,
  type ShotStatusMap,
} from '../exportStoryboardStatus';
import type { ProductionShot, SceneSheet } from '../productionTypes';
import type { ShotUserStatus } from '../shotUserStatus';
import { ScreeningRoomPlayer } from './ScreeningRoomPlayer';

const STATUS_BADGE_CLASS: Record<ShotUserStatus, string> = {
  not_started: 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]',
  waiting_submit: 'border-violet-500/30 bg-violet-500/10 text-violet-200',
  platform_queueing: 'border-sky-500/30 bg-sky-500/10 text-sky-200',
  generating: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  completed: 'border-green-500/30 bg-green-500/10 text-green-200',
  failed: 'border-red-500/30 bg-red-500/10 text-red-200',
  cancelled: 'border-slate-500/30 bg-slate-500/10 text-slate-200',
};

const LEGACY_EDITOR_PROJECT_SUFFIXES = ['-剪辑', '-Edit'] as const;

function formatEta(etaSec: number | undefined, uiLocale: UiLocale): string {
  if (!etaSec || etaSec <= 0) {
    return uiLocale === 'en' ? 'starting soon' : '即将开始';
  }
  if (etaSec < 60) {
    const seconds = Math.max(1, Math.round(etaSec));
    return uiLocale === 'en' ? `about ${seconds} sec` : `约 ${seconds} 秒`;
  }
  if (etaSec < 3600) {
    const minutes = Math.max(1, Math.round(etaSec / 60));
    return uiLocale === 'en' ? `about ${minutes} min` : `约 ${minutes} 分钟`;
  }
  const hours = Math.max(1, Math.round(etaSec / 3600));
  return uiLocale === 'en' ? `about ${hours} hr` : `约 ${hours} 小时`;
}

function buildEditorProjectName(
  projectTitle: string | undefined,
  uiLocale: UiLocale,
  text: (path: string, values?: Record<string, string | number>) => string,
): string {
  if (projectTitle) {
    return `${projectTitle}${uiLocale === 'en' ? '-Edit' : '-剪辑'}`;
  }
  return text('productionWizard.exportOverview.importedProjectFallback', {
    date: formatDate(new Date(), uiLocale),
  });
}

export function StepExportStoryboardOverview({
  shots,
  scSheets,
  onBackToStoryboard,
  buildStoryLine,
  resolveVideoSrc,
  projectTitle,
  aspectRatio,
  bgmPromptHint,
  productionProjectId,
  shotActiveJobMap,
  shotJobStatusMap,
  queueSnapshot,
}: {
  shots: ProductionShot[];
  scSheets: SceneSheet[];
  onBackToStoryboard: () => void;
  buildStoryLine: (shot: ProductionShot) => string;
  resolveVideoSrc: (shot: ProductionShot) => string | null;
  projectTitle?: string;
  aspectRatio?: string;
  bgmPromptHint?: string;
  productionProjectId?: string;
  shotActiveJobMap?: ShotActiveJobMap;
  shotJobStatusMap?: ShotStatusMap;
  queueSnapshot?: QueueSnapshotDto | null;
}) {
  const [showScreeningRoom, setShowScreeningRoom] = useState(true);
  const [openingEditor, setOpeningEditor] = useState(false);
  const navigate = useNavigate();
  const { uiLocale, t } = useLocale();

  const text = (path: string, values?: Record<string, string | number>) =>
    formatMessage(t(path), values);

  const statusItems = buildExportStoryboardShotStatuses(
    shots,
    shotActiveJobMap,
    shotJobStatusMap,
  );
  const statusSummary = summarizeExportStoryboardStatus(statusItems);
  const totalPlatformQueue = queueSnapshot?.totalWaiting ?? 0;
  const leadingQueuedShot = statusItems.find((item) => item.platformQueuePosition != null);

  const handleOpenInEditor = async () => {
    const shotsWithVideo = shots.filter((shot) => resolveVideoSrc(shot));
    if (shotsWithVideo.length === 0) {
      toast.error(t('productionWizard.exportOverview.noGeneratedVideosError'));
      return;
    }

    setOpeningEditor(true);
    try {
      const ar = (aspectRatio as AspectRatioPreset | undefined) ?? '16:9';
      const assets: Record<string, MediaAsset> = {};
      const videoClips: VideoClip[] = [];
      let cursor = 0;

      for (const shot of shotsWithVideo) {
        const url = resolveVideoSrc(shot);
        if (!url) continue;

        const assetId = `prod_shot_${shot.shotIndex}`;
        const durationSec = Math.max(0.5, shot.durationSec ?? 5);
        assets[assetId] = { id: assetId, url, kind: 'video', durationSec };
        videoClips.push({
          id: `clip_prod_${shot.shotIndex}_${Date.now()}`,
          assetId,
          sourceStart: 0,
          sourceEnd: durationSec,
          timelineStart: cursor,
          shotIndex: shot.shotIndex,
          note: buildStoryLine(shot).slice(0, 120),
          meta: {
            source: 'production',
            productionProjectId: productionProjectId ?? undefined,
            shotScale: shot.shotScale,
            cameraMove: shot.cameraMove,
            subject: shot.subject,
            action: shot.action,
            sceneRef: shot.sceneRef,
            emotion: shot.emotion,
            lighting: shot.lighting,
            dialogue: shot.dialogue,
          },
        });
        cursor += durationSec;
      }

      const tracks: Track[] = [
        { id: 'v1', type: 'video', label: t('productionWizard.exportOverview.videoTrack'), clips: videoClips },
        { id: 'a1', type: 'audio', label: t('productionWizard.exportOverview.sourceAudioTrack'), clips: [] },
        { id: 'a2', type: 'audio', label: t('productionWizard.exportOverview.bgmTrack'), clips: [] },
        { id: 't1', type: 'text', label: t('productionWizard.exportOverview.textTrack'), clips: [] },
      ];

      let project: TimelineProject = {
        id: `proj_prod_${Date.now()}`,
        fps: 30,
        durationSec: cursor,
        aspectRatio: ar,
        mix: {
          sourceAudio: 1,
          bgm: 0,
          bgmFadeOut: 2,
          bgmFadeIn: 1,
          bgmPromptHint: bgmPromptHint || undefined,
        },
        tracks,
        sourceProductionProjectId: productionProjectId ?? undefined,
        sourceProductionTitle: projectTitle ?? undefined,
      };
      project = syncSourceAudioClipsFromVideo(project);

      const preferredProjectName = buildEditorProjectName(projectTitle, uiLocale, text);

      if (productionProjectId) {
        try {
          const { projects } = await listEditorProjects();
          const candidateNames = projectTitle
            ? Array.from(
                new Set([preferredProjectName, ...LEGACY_EDITOR_PROJECT_SUFFIXES.map((suffix) => `${projectTitle}${suffix}`)]),
              )
            : [preferredProjectName];
          const existing = projects.find((item) => item.sourceProductionProjectId === productionProjectId)
            ?? projects.find((item) => candidateNames.includes(item.name));

          if (existing) {
            const confirmCreate = window.confirm(
              text('productionWizard.exportOverview.existingProjectConfirm', {
                name: existing.name,
                updatedAt: formatDateTime(existing.updatedAt, uiLocale),
              }),
            );
            if (!confirmCreate) {
              navigate(
                `/editor?project=${existing.id}&from=production&shots=${shotsWithVideo.length}&dur=${Math.round(cursor)}&title=${encodeURIComponent(projectTitle || '')}`,
              );
              return;
            }
          }
        } catch {
          /* ignore and continue creating a new project */
        }
      }

      const saved = await saveEditorProject({
        name: preferredProjectName,
        aspectRatio: ar,
        project,
        assets,
      });
      navigate(
        `/editor?project=${saved.id}&from=production&shots=${shotsWithVideo.length}&dur=${Math.round(cursor)}&title=${encodeURIComponent(projectTitle || '')}`,
      );
    } catch (error) {
      console.error('[OpenInEditor]', error);
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : t('productionWizard.exportOverview.importFailed'),
      );
    } finally {
      setOpeningEditor(false);
    }
  };

  return (
    <section className="space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{t('productionWizard.exportOverview.title')}</h2>
        {shots.length > 0 && (
          <button
            type="button"
            onClick={() => setShowScreeningRoom((value) => !value)}
            className="rounded-md px-2.5 py-1 text-[11px] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]"
          >
            {showScreeningRoom
              ? t('productionWizard.exportOverview.toggleGridView')
              : t('productionWizard.exportOverview.toggleScreeningRoom')}
          </button>
        )}
      </div>

      <p className="text-xs text-[var(--color-text-muted)]">
        {t('productionWizard.exportOverview.intro')}
      </p>

      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-emerald-100">
          <div className="text-[10px] uppercase tracking-[0.18em] opacity-70">
            {t('productionWizard.exportOverview.ready')}
          </div>
          <div className="mt-1 text-lg font-bold">
            {statusSummary.completed}/{statusSummary.all}
          </div>
          <div className="text-[10px] opacity-80">
            {t('productionWizard.exportOverview.readyHint')}
          </div>
        </div>

        <div className="rounded-xl border border-sky-500/25 bg-sky-500/10 px-3 py-2 text-sky-100">
          <div className="text-[10px] uppercase tracking-[0.18em] opacity-70">
            {t('productionWizard.exportOverview.queued')}
          </div>
          <div className="mt-1 text-lg font-bold">{statusSummary.queued}</div>
          <div className="text-[10px] opacity-80">
            {leadingQueuedShot?.platformQueuePosition
              ? text('productionWizard.exportOverview.queuedLeadingShot', {
                  position: leadingQueuedShot.platformQueuePosition,
                  total: totalPlatformQueue ? `/${totalPlatformQueue}` : '',
                })
              : t('productionWizard.exportOverview.queuedFallbackHint')}
          </div>
        </div>

        <button
          type="button"
          onClick={onBackToStoryboard}
          className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-left text-amber-100 transition hover:bg-amber-500/15"
        >
          <div className="text-[10px] uppercase tracking-[0.18em] opacity-70">
            {t('productionWizard.exportOverview.needsAction')}
          </div>
          <div className="mt-1 text-lg font-bold">{statusSummary.needsAction}</div>
          <div className="text-[10px] opacity-80">
            {t('productionWizard.exportOverview.needsActionHint')}
          </div>
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onBackToStoryboard}
          className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
        >
          {t('productionWizard.exportOverview.backToStoryboard')}
        </button>

        <Link
          to="/studio?tab=gallery"
          className="inline-flex items-center rounded-lg bg-[var(--color-primary)]/15 px-4 py-2 text-sm font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary)]/25"
        >
          {t('productionWizard.exportOverview.openHistory')}
        </Link>

        <button
          type="button"
          onClick={() => void handleOpenInEditor()}
          disabled={openingEditor}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {openingEditor ? (
            <>
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              {t('productionWizard.exportOverview.openingInEditor')}
            </>
          ) : (
            t('productionWizard.exportOverview.openInEditor')
          )}
        </button>
      </div>

      {shots.length === 0 ? (
        <p className="text-xs text-[var(--color-text-muted)]">
          {t('productionWizard.exportOverview.noShots')}
        </p>
      ) : showScreeningRoom ? (
        <ScreeningRoomPlayer
          shots={shots}
          scSheets={scSheets}
          resolveVideoSrc={resolveVideoSrc}
          buildStoryLine={buildStoryLine}
        />
      ) : (
        <div className="grid max-h-[min(70vh,520px)] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 md:grid-cols-4">
          {shots.map((shot, index) => {
            const scImg = scSheets.find((sc) => sc.sceneRef === shot.sceneRef)?.variants[0]?.imageDataUrl;
            const thumb = shot.previewStillDataUrl || scImg;
            const storyLine = buildStoryLine(shot);
            const videoSrc = resolveVideoSrc(shot);
            const status = statusItems[index];
            const statusLabel = status ? t(status.labelKey) : '';
            const queueLine = status?.platformQueuePosition
              ? text('productionWizard.exportOverview.platformQueueWithEta', {
                  position: status.platformQueuePosition,
                  total: totalPlatformQueue ? `/${totalPlatformQueue}` : '',
                  eta: formatEta(status.activeJob?.etaSec, uiLocale),
                })
              : status?.dreaminaQueuePosition
                ? text('productionWizard.exportOverview.arkQueue', {
                    position: status.dreaminaQueuePosition,
                    total: status.dreaminaQueueSize ? `/${status.dreaminaQueueSize}` : '',
                  })
                : status?.userStatus === 'generating'
                  ? t('productionWizard.exportOverview.backendTracking')
                  : null;

            return (
              <div
                key={`${shot.shotIndex}-${index}`}
                className="flex flex-col overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
              >
                <div className="relative aspect-video w-full bg-black/80">
                  {videoSrc ? (
                    <video
                      src={videoSrc}
                      controls
                      playsInline
                      poster={thumb || undefined}
                      className="h-full w-full object-cover"
                    />
                  ) : thumb ? (
                    <>
                      <img src={thumb} alt="" className="h-full w-full object-cover" />
                      <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-[var(--color-text-muted)]">
                        {t('productionWizard.exportOverview.noVideoYet')}
                      </span>
                    </>
                  ) : (
                    <div className="flex h-full items-center justify-center px-1 text-center text-[10px] text-[var(--color-text-muted)]">
                      {t('productionWizard.exportOverview.noStill')}
                    </div>
                  )}

                  <span className="absolute left-1 top-1 rounded bg-black/65 px-1.5 py-0.5 text-[10px] text-white">
                    {text('productionWizard.exportOverview.shotLabel', { shotIndex: shot.shotIndex })}
                  </span>
                </div>

                {status && (
                  <div className="border-t border-[var(--color-border)] px-2 pt-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`rounded-full border px-1.5 py-0.5 text-[9px] ${STATUS_BADGE_CLASS[status.userStatus]}`}>
                        {statusLabel}
                      </span>
                      {status.platformQueuePosition && (
                        <span className="text-[10px] font-semibold text-sky-200">
                          #{status.platformQueuePosition}
                        </span>
                      )}
                    </div>
                    {queueLine && (
                      <p className="mt-1 rounded-md bg-sky-500/10 px-1.5 py-1 text-[10px] leading-snug text-sky-200">
                        {queueLine}
                      </p>
                    )}
                  </div>
                )}

                <p className={`${status ? 'border-t-0 pt-1' : 'border-t'} border-[var(--color-border)] px-2 py-2 text-[10px] leading-relaxed text-[var(--color-text-muted)] line-clamp-2`}>
                  {storyLine.slice(0, 120)}
                  {storyLine.length > 120 ? '...' : ''}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
