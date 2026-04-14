import type { ProductionShot, SceneSheet } from '../productionTypes';

export function StepStoryboardShotStrip({
  shots,
  scSheets,
  selectedShotIdx,
  shotBusyMap,
  onSelectShot,
}: {
  shots: ProductionShot[];
  scSheets: SceneSheet[];
  selectedShotIdx: number;
  shotBusyMap: Record<string, 'frame' | 'video'>;
  onSelectShot: (idx: number) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3">
      <div className="flex min-w-min gap-2">
        {shots.map((s, idx) => {
          const isThisShotBusy = shotBusyMap[String(s.shotIndex)];
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
              {isThisShotBusy === 'video' ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-black/65 backdrop-blur-[1px]">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/25 border-t-amber-400" />
                  <span className="px-1 text-[8px] font-medium text-amber-100">生成中</span>
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

