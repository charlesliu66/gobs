import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { ProductionShot, SceneSheet } from '../productionTypes';
import { ScreeningRoomPlayer } from './ScreeningRoomPlayer';
import { saveEditorProject } from '../../api/editor';
import type { AspectRatioPreset, MediaAsset, VideoClip, Track } from '../../editor/types/timeline';
import { syncSourceAudioClipsFromVideo } from '../../editor/types/timeline';
import { toast } from '../../components/Toast';

export function StepExportStoryboardOverview({
  shots,
  scSheets,
  onBackToStoryboard,
  buildStoryLine,
  resolveVideoSrc,
  projectTitle,
  aspectRatio,
}: {
  shots: ProductionShot[];
  scSheets: SceneSheet[];
  onBackToStoryboard: () => void;
  buildStoryLine: (shot: ProductionShot) => string;
  resolveVideoSrc: (shot: ProductionShot) => string | null;
  projectTitle?: string;
  aspectRatio?: string;
}) {
  const [showScreeningRoom, setShowScreeningRoom] = useState(true);
  const [openingEditor, setOpeningEditor] = useState(false);
  const navigate = useNavigate();

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
          note: buildStoryLine(sh).slice(0, 60),
        });
        cursor += dur;
      }

      const tracks: Track[] = [
        { id: 'v1', type: 'video', label: '视频', clips: videoClips },
        { id: 'a1', type: 'audio', label: '原声', clips: [] },
        { id: 'a2', type: 'audio', label: 'BGM', clips: [] },
        { id: 't1', type: 'text', label: '文字', clips: [] },
      ];
      let project = {
        id: `proj_prod_${Date.now()}`,
        fps: 30,
        durationSec: cursor,
        aspectRatio: ar,
        mix: { sourceAudio: 1, bgm: 0, bgmFadeOut: 2, bgmFadeIn: 1 },
        tracks,
      };
      project = syncSourceAudioClipsFromVideo(project);

      const name = projectTitle ? `${projectTitle}-剪辑` : `制片导入-${new Date().toLocaleDateString('zh-CN')}`;
      const saved = await saveEditorProject({ name, aspectRatio: ar, project, assets });
      navigate(`/editor?project=${saved.id}`);
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
                <p className="line-clamp-2 border-t border-[var(--color-border)] px-2 py-2 text-[10px] leading-relaxed text-[var(--color-text-muted)]">
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

