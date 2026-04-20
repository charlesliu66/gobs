import type { ProductionShot, SceneSheet } from '../productionTypes';

export function StepStoryboardShotStrip({
  shots,
  scSheets,
  selectedShotIdx,
  shotBusyMap,
  shotQueuedMap,
  onSelectShot,
}: {
  shots: ProductionShot[];
  scSheets: SceneSheet[];
  selectedShotIdx: number;
  shotBusyMap: Record<string, 'frame' | 'video'>;
  shotQueuedMap?: Record<string, boolean>;
  onSelectShot: (idx: number) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3">
      <div className="flex min-w-min gap-2">
        {shots.map((s, idx) => {
          const shotKey = String(s.shotIndex);
          const isThisShotBusy = shotBusyMap[shotKey];
          const isQueued = shotQueuedMap?.[shotKey] ?? false;
          return (
          <button
            key={s.shotIndex}
            type="button"
            onClick={() => onSelectShot(idx)}
            className={`w-24 shrink-0 rounded-lg border p-1 text-left transition-colors ${
              selectedShotIdx === idx
                ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                : 'border-[var(--color-border)] hover:bg-[var(--color-surface-hover)]'
            }`}
          >
            <div className="relative aspect-video w-full overflow-hidden rounded bg-[var(--color-surface-hover)]">
              {s.previewStillDataUrl ? (
                <img src={s.previewStillDataUrl} alt="" className="h-full w-full object-cover" />
              ) : scSheets.find((sc) => sc.sceneRef === s.sceneRef)?.variants[0]?.imageDataUrl ? (
                <img
                  src={scSheets.find((sc) => sc.sceneRef === s.sceneRef)!.variants[0].imageDataUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : null}
              {isQueued ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-black/55 backdrop-blur-[1px]">
                  <span className="h-4 w-4 rounded-full border-2 border-white/25 border-t-amber-400 animate-pulse" />
                  <span className="px-1 text-[8px] font-medium text-amber-200">排队中</span>
                </div>
              ) : isThisShotBusy === 'video' ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-black/65 backdrop-blur-[1px]">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/25 border-t-amber-400" />
                  <span className="px-1 text-[8px] font-medium text-amber-100">提交中</span>
                </div>
              ) : s.pendingVideoSubmitId ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-black/50">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/25 border-t-green-400" style={{ animationDuration: '2s' }} />
                  <span className="px-1 text-[8px] font-medium text-green-200">即梦生成</span>
                </div>
              ) : s.lastSubmitError && !s.previewVideoUrl && !s.previewVideoPath && !(s.previewVideoVersions && s.previewVideoVersions.length > 0) ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-red-900/70 backdrop-blur-[1px]" title={s.lastSubmitError}>
                  <span className="px-1 text-[10px] font-bold text-red-200">✕ 失败</span>
                  <span className="px-1 text-[8px] font-medium text-red-200">点击重试</span>
                </div>
              ) : null}

              {isThisShotBusy === 'frame' ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-black/60">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/25 border-t-cyan-400" />
                  <span className="px-1 text-[8px] font-medium text-cyan-100">静帧中</span>
                </div>
              ) : null}
            </div>
            <div className="mt-1 truncate px-1 text-[10px] text-[var(--color-text)]">
              #{s.shotIndex} {s.durationSec}s
            </div>
          </button>
          );
        })}
      </div>
    </div>
  );
}

