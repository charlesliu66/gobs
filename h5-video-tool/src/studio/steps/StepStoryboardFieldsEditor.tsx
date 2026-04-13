import type { ProductionShot, SceneSheet } from '../productionTypes';

export function StepStoryboardFieldsEditor({
  shot,
  scSheets,
  onPatchShot,
  onOpenLightbox,
}: {
  shot: ProductionShot;
  scSheets: SceneSheet[];
  onPatchShot: (patch: Partial<ProductionShot>) => void;
  onOpenLightbox: (src: string) => void;
}) {
  return (
    <>
      <div className="mt-3 grid gap-3 text-sm sm:grid-cols-[100px_1fr]">
        <div className="text-xs text-[var(--color-text-muted)]">参考</div>
        <div className="flex gap-2">
          {scSheets.find((s) => s.sceneRef === shot.sceneRef || s.id === shot.sceneRef)?.variants[0]
            ?.imageDataUrl ? (
            <img
              src={
                scSheets.find((s) => s.sceneRef === shot.sceneRef || s.id === shot.sceneRef)!
                  .variants[0].imageDataUrl
              }
              alt=""
              className="h-16 w-28 rounded object-cover cursor-zoom-in"
              onClick={() => {
                const url = scSheets.find((s) => s.sceneRef === shot.sceneRef || s.id === shot.sceneRef)?.variants[0]?.imageDataUrl;
                if (url) onOpenLightbox(url);
              }}
            />
          ) : (
            <div className="flex h-16 w-28 items-center justify-center rounded border border-dashed border-[var(--color-border)] text-[10px] text-[var(--color-text-muted)]">
              场景
            </div>
          )}
        </div>
        <label className="text-xs text-[var(--color-text-muted)] sm:col-span-2 sm:grid sm:grid-cols-[100px_1fr] sm:items-center sm:gap-3">
          <span className="block sm:shrink-0">时长（秒）</span>
          <input
            type="number"
            min={1}
            max={120}
            value={shot.durationSec}
            onChange={(e) => onPatchShot({ durationSec: Number(e.target.value) || 1 })}
            className="w-full rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs text-[var(--color-text-muted)] sm:col-span-2 sm:grid sm:grid-cols-[100px_1fr] sm:items-center sm:gap-3">
          <span className="block sm:shrink-0">场景 ref</span>
          <input
            list="production-scene-refs"
            value={shot.sceneRef}
            onChange={(e) => onPatchShot({ sceneRef: e.target.value })}
            className="w-full rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 font-mono text-sm"
          />
          <datalist id="production-scene-refs">
            {scSheets.map((sc) => (
              <option key={sc.id} value={sc.sceneRef ?? sc.id} label={sc.name} />
            ))}
          </datalist>
        </label>
        <label className="text-xs text-[var(--color-text-muted)] sm:col-span-2 sm:grid sm:grid-cols-[100px_1fr] sm:items-center sm:gap-3">
          <span className="block sm:shrink-0">景别</span>
          <input
            value={shot.shotScale}
            onChange={(e) => onPatchShot({ shotScale: e.target.value })}
            className="w-full rounded border border-[var(--color-border)] px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs text-[var(--color-text-muted)] sm:col-span-2 sm:grid sm:grid-cols-[100px_1fr] sm:items-center sm:gap-3">
          <span className="block sm:shrink-0">运镜</span>
          <input
            value={shot.cameraMove}
            onChange={(e) => onPatchShot({ cameraMove: e.target.value })}
            className="w-full rounded border border-[var(--color-border)] px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs text-[var(--color-text-muted)] sm:col-span-2 sm:grid sm:grid-cols-[100px_1fr] sm:items-center sm:gap-3">
          <span className="block sm:shrink-0">镜头质感</span>
          <input
            value={shot.lensFeel}
            onChange={(e) => onPatchShot({ lensFeel: e.target.value })}
            className="w-full rounded border border-[var(--color-border)] px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs text-[var(--color-text-muted)] sm:col-span-2 sm:grid sm:grid-cols-[100px_1fr] sm:items-start sm:gap-3">
          <span className="block pt-1.5 sm:shrink-0">主体</span>
          <input
            value={shot.subject}
            onChange={(e) => onPatchShot({ subject: e.target.value })}
            className="w-full rounded border border-[var(--color-border)] px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs text-[var(--color-text-muted)] sm:col-span-2 sm:grid sm:grid-cols-[100px_1fr] sm:items-start sm:gap-3">
          <span className="block pt-1.5 sm:shrink-0">动作</span>
          <textarea
            value={shot.action}
            onChange={(e) => onPatchShot({ action: e.target.value })}
            rows={2}
            className="w-full rounded border border-[var(--color-border)] px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs text-[var(--color-text-muted)] sm:col-span-2 sm:grid sm:grid-cols-[100px_1fr] sm:items-start sm:gap-3">
          <span className="block pt-1.5 sm:shrink-0">构图</span>
          <textarea
            value={shot.composition}
            onChange={(e) => onPatchShot({ composition: e.target.value })}
            rows={2}
            className="w-full rounded border border-[var(--color-border)] px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs text-[var(--color-text-muted)] sm:col-span-2 sm:grid sm:grid-cols-[100px_1fr] sm:items-start sm:gap-3">
          <span className="block pt-1.5 sm:shrink-0">光线</span>
          <textarea
            value={shot.lighting}
            onChange={(e) => onPatchShot({ lighting: e.target.value })}
            rows={2}
            className="w-full rounded border border-[var(--color-border)] px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs text-[var(--color-text-muted)] sm:col-span-2 sm:grid sm:grid-cols-[100px_1fr] sm:items-start sm:gap-3">
          <span className="block pt-1.5 sm:shrink-0">对白</span>
          <textarea
            value={shot.dialogue}
            onChange={(e) => onPatchShot({ dialogue: e.target.value })}
            rows={2}
            className="w-full rounded border border-[var(--color-border)] px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs text-[var(--color-text-muted)] sm:col-span-2 sm:grid sm:grid-cols-[100px_1fr] sm:items-start sm:gap-3">
          <span className="block pt-1.5 sm:shrink-0">声音提示</span>
          <input
            value={shot.audioCue}
            onChange={(e) => onPatchShot({ audioCue: e.target.value })}
            className="w-full rounded border border-[var(--color-border)] px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs text-[var(--color-text-muted)] sm:col-span-2 sm:grid sm:grid-cols-[100px_1fr] sm:items-start sm:gap-3">
          <span className="block pt-1.5 sm:shrink-0">情绪</span>
          <input
            value={shot.emotion}
            onChange={(e) => onPatchShot({ emotion: e.target.value })}
            className="w-full rounded border border-[var(--color-border)] px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs text-[var(--color-text-muted)] sm:col-span-2 sm:grid sm:grid-cols-[100px_1fr] sm:items-start sm:gap-3">
          <span className="block pt-1.5 sm:shrink-0">衔接</span>
          <textarea
            value={shot.continuity}
            onChange={(e) => onPatchShot({ continuity: e.target.value })}
            rows={2}
            className="w-full rounded border border-[var(--color-border)] px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs text-[var(--color-text-muted)] sm:col-span-2 sm:grid sm:grid-cols-[100px_1fr] sm:items-start sm:gap-3">
          <span className="block pt-1.5 sm:shrink-0">备注</span>
          <textarea
            value={shot.notes}
            onChange={(e) => onPatchShot({ notes: e.target.value })}
            rows={2}
            className="w-full rounded border border-[var(--color-border)] px-2 py-1.5 text-sm"
          />
        </label>
      </div>
      <details className="mt-4 rounded border border-[var(--color-border)]/60 bg-[var(--color-surface-elevated)] p-3 text-xs">
        <summary className="cursor-pointer font-medium text-[var(--color-text)]">
          结构化 Prompt（静帧 / 运动）
        </summary>
        <div className="mt-3 space-y-2">
          {(
            [
              ['sp_subject', '主体'],
              ['sp_environment', '环境'],
              ['sp_style', '风格'],
              ['sp_lighting', '光线'],
              ['sp_camera', '机位'],
              ['sp_composition', '构图'],
              ['sp_continuity', '连续'],
              ['sp_negative', '规避'],
            ] as const
          ).map(([k, lab]) => (
            <label key={k} className="block">
              <span className="text-[var(--color-text-muted)]">{lab}</span>
              <textarea
                value={shot.structuredStill[k as keyof typeof shot.structuredStill] as string}
                onChange={(e) =>
                  onPatchShot({
                    structuredStill: {
                      ...shot.structuredStill,
                      [k]: e.target.value,
                    },
                  })
                }
                rows={2}
                className="mt-0.5 w-full rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-[var(--color-text)]"
              />
            </label>
          ))}
          {(
            [
              ['mp_motion', '运动'],
              ['mp_camera', '摄影机'],
              ['mp_tempo', '节奏'],
              ['mp_transition', '衔接'],
              ['mp_audio', '声画'],
            ] as const
          ).map(([k, lab]) => (
            <label key={k} className="block">
              <span className="text-[var(--color-text-muted)]">{lab}</span>
              <textarea
                value={shot.structuredMotion[k as keyof typeof shot.structuredMotion] as string}
                onChange={(e) =>
                  onPatchShot({
                    structuredMotion: {
                      ...shot.structuredMotion,
                      [k]: e.target.value,
                    },
                  })
                }
                rows={2}
                className="mt-0.5 w-full rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-[var(--color-text)]"
              />
            </label>
          ))}
        </div>
      </details>
    </>
  );
}

