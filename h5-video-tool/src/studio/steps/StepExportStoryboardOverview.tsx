import { Link } from 'react-router-dom';
import type { ProductionShot, SceneSheet } from '../productionTypes';

export function StepExportStoryboardOverview({
  shots,
  scSheets,
  onBackToStoryboard,
  buildStoryLine,
  resolveVideoSrc,
}: {
  shots: ProductionShot[];
  scSheets: SceneSheet[];
  onBackToStoryboard: () => void;
  buildStoryLine: (shot: ProductionShot) => string;
  resolveVideoSrc: (shot: ProductionShot) => string | null;
}) {
  return (
    <section className="space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5">
      <h2 className="text-sm font-semibold">分镜整合</h2>
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
      </div>
      {shots.length === 0 ? (
        <p className="text-xs text-[var(--color-text-muted)]">暂无分镜数据。</p>
      ) : (
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

