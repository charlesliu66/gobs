export function StepStoryboardGenerateActions({
  shotMediaBusy,
  dreaminaAsync,
  hasProductionDesign,
  onGenerateShotFrame,
  onGenerateShotVideo,
}: {
  shotMediaBusy: 'frame' | 'video' | null;
  dreaminaAsync: boolean;
  hasProductionDesign: boolean;
  onGenerateShotFrame: () => void;
  onGenerateShotVideo: () => void;
}) {
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
          disabled={shotMediaBusy === 'video'}
          onClick={onGenerateShotVideo}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-text)] disabled:opacity-50"
        >
          {shotMediaBusy === 'video'
            ? dreaminaAsync
              ? '即梦排队/生成中（完成后自动填入预览）…'
              : '视频生成中…'
            : '生成分镜视频'}
        </button>
      </div>
      {dreaminaAsync ? (
        <p className="mt-2 text-[10px] text-[var(--color-text-muted)]">
          已启用即梦异步：提交后轮询直至成片，右侧「本镜预览」会显示视频（与 Studio 创作一致）。
        </p>
      ) : null}
    </>
  );
}

