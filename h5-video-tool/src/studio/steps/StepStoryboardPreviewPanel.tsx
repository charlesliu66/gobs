import type { ProductionShot, ProductionShotVideoVersion } from '../productionTypes';

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
  return (
    <aside className="w-full shrink-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4 lg:w-72">
      <div className="text-xs font-medium text-[var(--color-text)]">本镜预览</div>
      <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">
        分镜图由 Imagen 生成；分镜视频走即梦等接口。生成中会显示状态，完成后可直接在下方播放。
      </p>
      {shotMediaBusy === 'frame' ? (
        <div className="mt-2 flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-950/20 px-2.5 py-2 text-[11px] text-cyan-100/90">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-cyan-400/30 border-t-cyan-400" />
          <span>分镜静帧生成中…</span>
        </div>
      ) : null}
      {shot.previewStillDataUrl ? (
        <div className="mt-3">
          <div className="text-[10px] font-medium text-[var(--color-text-muted)]">分镜静帧</div>
          <img
            src={shot.previewStillDataUrl}
            alt=""
            className="mt-1 max-h-48 w-full rounded-lg border border-[var(--color-border)] object-contain cursor-zoom-in"
            onClick={() => onOpenLightbox(shot.previewStillDataUrl!)}
          />
        </div>
      ) : (
        <p className="mt-3 text-[11px] text-[var(--color-text-muted)]">暂无分镜图，点击「生成分镜图」。</p>
      )}
      <div className="mt-3">
        <div className="text-[10px] font-medium text-[var(--color-text-muted)]">分镜视频</div>
        {(shotMediaBusy === 'video' || (!shotPreviewPlaySrc && shot.pendingVideoSubmitId)) ? (
          <div className="mt-1.5 overflow-hidden rounded-xl border border-amber-500/35 bg-[linear-gradient(145deg,rgba(120,80,20,0.22),rgba(20,20,28,0.95))] shadow-inner">
            <div className="flex items-center gap-2 border-b border-amber-500/20 px-3 py-2">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
              </span>
              <span className="text-[11px] font-semibold tracking-wide text-amber-100">
                {shotMediaBusy === 'video' ? '正在生成中' : '即梦生成中（后台轮询）'}
              </span>
            </div>
            <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 px-4 py-8">
              <div
                className="h-11 w-11 animate-spin rounded-full border-2 border-white/15 border-t-amber-400"
                style={shotMediaBusy !== 'video' ? { animationDuration: '2s' } : undefined}
                aria-hidden
              />
              <div className="text-center">
                <p className="text-sm font-medium text-white">视频生成中</p>
                <p className="mt-1.5 text-[11px] leading-relaxed text-white/55">
                  {shotMediaBusy !== 'video'
                    ? '后端正在轮询即梦，完成后将自动出现在此处'
                    : dreaminaAsync
                      ? '已提交至即梦，排队与渲染完成后将自动出现在此处，请勿关闭本页'
                      : '渲染完成后将自动出现在此处'}
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
          <p className="mt-1.5 text-[11px] text-[var(--color-text-muted)]">暂无成片，点击左侧「生成分镜视频」。</p>
        )}
        {shotVideoVersions.length > 0 ? (
          <div className="mt-2 space-y-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2">
            {shotVideoVersions.length >= 5 && (
              <div className="rounded border border-amber-500/30 bg-amber-950/20 px-2 py-1.5 text-[10px] text-amber-200/90">
                版本已达 {shotVideoVersions.length} 个，建议点击「仅保留当前」清理旧版本以节省磁盘空间
              </div>
            )}
            <div className="flex items-center justify-between text-[10px] text-[var(--color-text-muted)]">
              <span>版本记录（{shotVideoVersions.length}）</span>
              {selectedShotVideoVersion ? (
                <button
                  type="button"
                  onClick={() => onKeepOnlyCurrentVersion(selectedShotVideoVersion.id)}
                  className="rounded border border-[var(--color-border)] px-1.5 py-0.5 hover:bg-[var(--color-surface-hover)]"
                >
                  仅保留当前
                </button>
              ) : null}
            </div>
            <div className="max-h-28 space-y-1 overflow-y-auto">
              {shotVideoVersions.map((v, idx) => {
                const active = selectedShotVideoVersion?.id === v.id;
                const ts = new Date(v.createdAt || Date.now()).toLocaleString('zh-CN');
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => onSelectVideoVersion(v.id)}
                    className={`flex w-full items-center justify-between rounded border px-2 py-1 text-left text-[10px] ${
                      active
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                        : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]'
                    }`}
                  >
                    <span>V{shotVideoVersions.length - idx}</span>
                    <span>{v.videoPath ? '云端文件' : '临时地址'}</span>
                    <span className="truncate pl-2">{ts}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

