export function StepStoryboardGenerateActions({
  shotMediaBusy,
  dreaminaAsync,
  hasProductionDesign,
  isQueued,
  onGenerateShotFrame,
  onGenerateShotVideo,
}: {
  shotMediaBusy: 'frame' | 'video' | null;
  dreaminaAsync: boolean;
  hasProductionDesign: boolean;
  isQueued?: boolean;
  onGenerateShotFrame: () => void;
  onGenerateShotVideo: () => void;
}) {
  const videoButtonDisabled = shotMediaBusy === 'video' || isQueued;

  function videoButtonLabel() {
    if (isQueued || shotMediaBusy === 'video') {
      return dreaminaAsync ? '即梦提交/生成中（完成后自动填入预览）…' : '视频生成中…';
    }
    return '生成分镜视频';
  }

  return (
    <>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={shotMediaBusy === 'frame' || !hasProductionDesign}
          onClick={onGenerateShotFrame}
          className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          {shotMediaBusy === 'frame' ? '分镜图生成中…' : '生成分镜图'}
        </button>
        <button
          type="button"
          disabled={videoButtonDisabled}
          onClick={onGenerateShotVideo}
          className="rounded-lg border px-3 py-1.5 text-xs font-medium disabled:opacity-50 border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]"
        >
          {videoButtonLabel()}
        </button>
      </div>
      {dreaminaAsync ? (
        <p className="mt-2 text-[10px] text-[var(--color-text-muted)]">
          已启用即梦异步：各分镜依次提交后并发轮询，成片后自动填入预览。
        </p>
      ) : null}
    </>
  );
}

