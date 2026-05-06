import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { QueueSnapshotDto } from '../../api/batchJobs';
import type { ProductionShot, SceneSheet } from '../productionTypes';
import { useLocale } from '../../i18n/LocaleContext.tsx';
import { pickUiText } from '../../i18n/uiText.ts';
import { ScreeningRoomPlayer } from './ScreeningRoomPlayer';
import { listEditorProjects, saveEditorProject } from '../../api/editor';
import type { AspectRatioPreset, MediaAsset, VideoClip, Track, TimelineProject } from '../../editor/types/timeline';
import { syncSourceAudioClipsFromVideo } from '../../editor/types/timeline';
import { toast } from '../../components/Toast';
import {
  buildExportStoryboardShotStatuses,
  type ShotActiveJobMap,
  summarizeExportStoryboardStatus,
  type ShotStatusMap,
} from '../exportStoryboardStatus';
import type { ShotUserStatus } from '../shotUserStatus';

const STATUS_BADGE_CLASS: Record<ShotUserStatus, string> = {
  not_started: 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]',
  waiting_submit: 'border-violet-500/30 bg-violet-500/10 text-violet-200',
  platform_queueing: 'border-sky-500/30 bg-sky-500/10 text-sky-200',
  generating: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  completed: 'border-green-500/30 bg-green-500/10 text-green-200',
  failed: 'border-red-500/30 bg-red-500/10 text-red-200',
  cancelled: 'border-slate-500/30 bg-slate-500/10 text-slate-200',
};

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
  const uiText = <T,>(zh: T, en: T) => pickUiText(uiLocale, zh, en);
  const statusItems = buildExportStoryboardShotStatuses(
    shots,
    shotActiveJobMap,
    shotJobStatusMap,
  );
  const statusSummary = summarizeExportStoryboardStatus(statusItems);
  const totalPlatformQueue = queueSnapshot?.totalWaiting ?? 0;
  const leadingQueuedShot = statusItems.find((item) => item.platformQueuePosition != null);

  const handleOpenInEditor = async () => {
    const shotsWithVideo = shots.filter((sh) => resolveVideoSrc(sh));
    if (shotsWithVideo.length === 0) {
      toast.error('没有已生成的分镜视频，请先在分镜步骤生成视频');
      return;
    }
    setOpeningEditor(true);
    try {
      const ar = (aspectRatio as AspectRatioPreset | undefined) ?? '16:9';
      const assets: Record<string, MediaAsset> = {};
      const videoClips: VideoClip[] = [];
      let cursor = 0;

      for (const sh of shotsWithVideo) {
        const url = resolveVideoSrc(sh)!;
        const assetId = `prod_shot_${sh.shotIndex}`;
        const dur = Math.max(0.5, sh.durationSec ?? 5);
        assets[assetId] = { id: assetId, url, kind: 'video', durationSec: dur };
        videoClips.push({
          id: `clip_prod_${sh.shotIndex}_${Date.now()}`,
          assetId,
          sourceStart: 0,
          sourceEnd: dur,
          timelineStart: cursor,
          shotIndex: sh.shotIndex,
          note: buildStoryLine(sh).slice(0, 120),
          meta: {
            source: 'production',
            productionProjectId: productionProjectId ?? undefined,
            shotScale: sh.shotScale,
            cameraMove: sh.cameraMove,
            subject: sh.subject,
            action: sh.action,
            sceneRef: sh.sceneRef,
            emotion: sh.emotion,
            lighting: sh.lighting,
            dialogue: sh.dialogue,
          },
        });
        cursor += dur;
      }

      const tracks: Track[] = [
        { id: 'v1', type: 'video', label: '视频', clips: videoClips },
        { id: 'a1', type: 'audio', label: '原声', clips: [] },
        { id: 'a2', type: 'audio', label: 'BGM', clips: [] },
        { id: 't1', type: 'text', label: '文字', clips: [] },
      ];
      let project: TimelineProject = {
        id: `proj_prod_${Date.now()}`,
        fps: 30,
        durationSec: cursor,
        aspectRatio: ar,
        mix: { sourceAudio: 1, bgm: 0, bgmFadeOut: 2, bgmFadeIn: 1, bgmPromptHint: bgmPromptHint || undefined },
        tracks,
        sourceProductionProjectId: productionProjectId ?? undefined,
        sourceProductionTitle: projectTitle ?? undefined,
      };
      project = syncSourceAudioClipsFromVideo(project);

      // 去重检查：优先按 sourceProductionProjectId 匹配，其次按名字
      if (productionProjectId) {
        try {
          const { projects } = await listEditorProjects();
          const existing = projects.find((p) => p.sourceProductionProjectId === productionProjectId)
            ?? projects.find((p) => p.name === `${projectTitle}-剪辑`);
          if (existing) {
            const confirmCreate = window.confirm(
              `已存在关联的剪辑项目「${existing.name}」（${new Date(existing.updatedAt).toLocaleString('zh-CN')}）。\n\n点击「确定」创建新项目，点击「取消」打开已有项目。`,
            );
            if (!confirmCreate) {
              navigate(`/editor?project=${existing.id}&from=production&shots=${shotsWithVideo.length}&dur=${Math.round(cursor)}&title=${encodeURIComponent(projectTitle || '')}`);
              return;
            }
          }
        } catch { /* ignore: proceed to create */ }
      }

      const name = projectTitle ? `${projectTitle}-剪辑` : `制片导入-${new Date().toLocaleDateString('zh-CN')}`;
      const saved = await saveEditorProject({ name, aspectRatio: ar, project, assets });
      navigate(`/editor?project=${saved.id}&from=production&shots=${shotsWithVideo.length}&dur=${Math.round(cursor)}&title=${encodeURIComponent(projectTitle || '')}`);
    } catch (e) {
      console.error('[OpenInEditor]', e);
      toast.error('导入剪辑器失败，请重试');
    } finally {
      setOpeningEditor(false);
    }
  };

  return (
    <section className="space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">分镜整合</h2>
        {shots.length > 0 && (
          <button
            type="button"
            onClick={() => setShowScreeningRoom((v) => !v)}
            className="rounded-md px-2.5 py-1 text-[11px] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]"
          >
            {showScreeningRoom ? '切换网格视图' : '切换放映室'}
          </button>
        )}
      </div>
      <p className="text-xs text-[var(--color-text-muted)]">
        汇总全部分镜的静帧与已生成视频（在分镜步骤逐镜生成后会同步出现在此）。成片会自动保存到「生成视频 → 历史内容」。
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-emerald-100">
          <div className="text-[10px] uppercase tracking-[0.18em] opacity-70">
            {uiText('可审片', 'Ready')}
          </div>
          <div className="mt-1 text-lg font-bold">
            {statusSummary.completed}/{statusSummary.all}
          </div>
          <div className="text-[10px] opacity-80">
            {uiText('已生成并会进入当前项目历史', 'Generated and attached to this project history')}
          </div>
        </div>
        <div className="rounded-xl border border-sky-500/25 bg-sky-500/10 px-3 py-2 text-sky-100">
          <div className="text-[10px] uppercase tracking-[0.18em] opacity-70">
            {uiText('排队/生成', 'Queued')}
          </div>
          <div className="mt-1 text-lg font-bold">{statusSummary.queued}</div>
          <div className="text-[10px] opacity-80">
            {leadingQueuedShot?.platformQueuePosition
              ? uiText(
                  `最快一条排在平台第 ${leadingQueuedShot.platformQueuePosition}${totalPlatformQueue ? `/${totalPlatformQueue}` : ''} 位`,
                  `Leading shot is #${leadingQueuedShot.platformQueuePosition}${totalPlatformQueue ? `/${totalPlatformQueue}` : ''} in platform queue`,
                )
              : uiText('后端会持续推进并回写结果', 'Backend keeps advancing and writes results back')}
          </div>
        </div>
        <button
          type="button"
          onClick={onBackToStoryboard}
          className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-left text-amber-100 transition hover:bg-amber-500/15"
        >
          <div className="text-[10px] uppercase tracking-[0.18em] opacity-70">
            {uiText('待处理', 'Needs action')}
          </div>
          <div className="mt-1 text-lg font-bold">{statusSummary.needsAction}</div>
          <div className="text-[10px] opacity-80">
            {uiText('返回分镜页可继续生成/重试', 'Return to Storyboard to generate or retry')}
          </div>
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onBackToStoryboard}
          className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
        >
          返回分镜表编辑 / 生成
        </button>
        <Link
          to="/studio?tab=gallery"
          className="inline-flex items-center rounded-lg bg-[var(--color-primary)]/15 px-4 py-2 text-sm font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary)]/25"
        >
          打开历史内容
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
              导入中…
            </>
          ) : (
            '在剪辑器中打开 →'
          )}
        </button>
      </div>

      {shots.length === 0 ? (
        <p className="text-xs text-[var(--color-text-muted)]">暂无分镜数据。</p>
      ) : showScreeningRoom ? (
        /* 放映室：连续串联播放 */
        <ScreeningRoomPlayer
          shots={shots}
          scSheets={scSheets}
          resolveVideoSrc={resolveVideoSrc}
          buildStoryLine={buildStoryLine}
        />
      ) : (
        /* 网格视图：总览所有分镜卡片 */
        <div className="grid max-h-[min(70vh,520px)] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 md:grid-cols-4">
          {shots.map((sh, idx) => {
            const scImg = scSheets.find((sc) => sc.sceneRef === sh.sceneRef)?.variants[0]?.imageDataUrl;
            const thumb = sh.previewStillDataUrl || scImg;
            const storyLine = buildStoryLine(sh);
            const vSrc = resolveVideoSrc(sh);
            const status = statusItems[idx];
            const statusLabel = status ? t(status.labelKey) : '';
            const queueLine = status?.platformQueuePosition
              ? uiText(
                  `平台队列 #${status.platformQueuePosition}${totalPlatformQueue ? `/${totalPlatformQueue}` : ''}，预计 ${formatEta(status.activeJob?.etaSec, uiLocale)}`,
                  `Platform queue #${status.platformQueuePosition}${totalPlatformQueue ? `/${totalPlatformQueue}` : ''}, ${formatEta(status.activeJob?.etaSec, uiLocale)}`,
                )
              : status?.dreaminaQueuePosition
                ? uiText(
                    `Ark 队列 #${status.dreaminaQueuePosition}${status.dreaminaQueueSize ? `/${status.dreaminaQueueSize}` : ''}`,
                    `Ark queue #${status.dreaminaQueuePosition}${status.dreaminaQueueSize ? `/${status.dreaminaQueueSize}` : ''}`,
                  )
                : status?.userStatus === 'generating'
                  ? uiText('后端正在持续跟进，完成后会回到这条分镜历史', 'Backend is tracking it; the result returns to this shot history')
                  : null;
            return (
              <div
                key={`${sh.shotIndex}-${idx}`}
                className="flex flex-col overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
              >
                {/* 媒体区：有视频用 video（静帧作 poster），无视频用静帧 */}
                <div className="relative aspect-video w-full bg-black/80">
                  {vSrc ? (
                    <video
                      src={vSrc}
                      controls
                      playsInline
                      poster={thumb || undefined}
                      className="h-full w-full object-cover"
                    />
                  ) : thumb ? (
                    <>
                      <img src={thumb} alt="" className="h-full w-full object-cover" />
                      <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-[var(--color-text-muted)]">
                        尚未生成视频
                      </span>
                    </>
                  ) : (
                    <div className="flex h-full items-center justify-center px-1 text-center text-[10px] text-[var(--color-text-muted)]">
                      无静帧
                    </div>
                  )}
                  <span className="absolute left-1 top-1 rounded bg-black/65 px-1.5 py-0.5 text-[10px] text-white">
                    镜{sh.shotIndex}
                  </span>
                </div>
                {/* 描述文字 */}
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
                  {storyLine.length > 120 ? '…' : ''}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

