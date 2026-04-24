import type { CharacterSheet, ProductionShot, SceneSheet } from '../productionTypes';
import { getCharacterShotImage } from '../productionAssets';

export function StepStoryboardAssetsSidebar({
  chSheets,
  scSheets,
  shot,
  onOpenLightbox,
  getAutoMatchStateId,
  onChangeCharacterStateOverride,
}: {
  chSheets: CharacterSheet[];
  scSheets: SceneSheet[];
  shot: ProductionShot;
  onOpenLightbox: (src: string) => void;
  getAutoMatchStateId: (ch: CharacterSheet, shot: ProductionShot) => string | null;
  onChangeCharacterStateOverride: (characterId: string, stateId: string) => void;
}) {
  return (
    <aside className="w-full shrink-0 space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3 lg:w-64">
      <div>
        <div className="text-xs font-semibold text-[var(--color-text)]">角色参考</div>
        <div className="mt-1 text-[10px] text-[var(--color-text-muted)]">
          默认来自状态衣橱里的“默认状态”，也可以在这里按镜头单独覆盖。
        </div>
      </div>

      <div className="space-y-2">
        {chSheets.map((ch) => {
          const manualStateId = shot.characterStateOverrides?.[ch.id] ?? '';
          const defaultStateId = ch.activeStateId ?? '';
          const effectiveStateId = manualStateId || defaultStateId;
          const effectiveState = effectiveStateId ? ch.states?.find((s) => s.id === effectiveStateId) ?? null : null;
          const suggestedStateId = getAutoMatchStateId(ch, shot);
          const suggestedState = suggestedStateId && suggestedStateId !== effectiveStateId
            ? ch.states?.find((s) => s.id === suggestedStateId) ?? null
            : null;
          const thumb = getCharacterShotImage(ch, shot);
          const sourceLabel = manualStateId ? '手动' : effectiveState ? '默认' : '未设';

          return (
            <div key={ch.id} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5">
              <div className="flex items-start gap-2">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-hover)]">
                  {thumb ? (
                    <button type="button" onClick={() => onOpenLightbox(thumb)} className="h-full w-full">
                      <img src={thumb} alt="" className="h-full w-full object-cover" />
                    </button>
                  ) : (
                    <div className="flex h-full items-center justify-center text-[10px] text-[var(--color-text-muted)]">
                      无图
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[11px] font-semibold text-[var(--color-text)]">{ch.name}</div>
                  <div className="mt-1 flex items-center gap-1">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${
                        manualStateId
                          ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]'
                          : effectiveState
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : 'bg-[var(--color-surface-hover)] text-[var(--color-text-muted)]'
                      }`}
                    >
                      {sourceLabel}
                    </span>
                    <span className="truncate text-[10px] text-[var(--color-text-muted)]">
                      {effectiveState?.label ?? (defaultStateId ? '默认状态缺图' : '未设置状态')}
                    </span>
                  </div>
                  {suggestedState ? (
                    <button
                      type="button"
                      onClick={() => onChangeCharacterStateOverride(ch.id, suggestedState.id)}
                      className="mt-1 text-[10px] text-amber-300 hover:text-amber-200"
                      title="将建议状态应用到当前分镜"
                    >
                      建议：{suggestedState.label}
                    </button>
                  ) : null}
                </div>
              </div>

              {ch.states && ch.states.length > 0 ? (
                <select
                  className="mt-2 w-full rounded-lg border border-[var(--color-border)] bg-transparent px-2 py-1.5 text-[10px] text-[var(--color-text)]"
                  value={manualStateId}
                  onChange={(e) => onChangeCharacterStateOverride(ch.id, e.target.value)}
                >
                  <option value="">跟随默认状态</option>
                  {ch.states.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="mt-2 text-[10px] text-[var(--color-text-muted)]">状态衣橱里还没有可选状态</div>
              )}
            </div>
          );
        })}
      </div>

      <div className="pt-1">
        <div className="text-xs font-semibold text-[var(--color-text)]">场景参考</div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {scSheets.map((sc) => (
            <div key={sc.id} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2">
              <div className="h-12 w-full overflow-hidden rounded border border-[var(--color-border)] bg-[var(--color-surface-hover)]">
                {sc.variants[0]?.imageDataUrl ? (
                  <button type="button" onClick={() => onOpenLightbox(sc.variants[0]!.imageDataUrl!)} className="h-full w-full">
                    <img
                      src={sc.variants[0].imageDataUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </button>
                ) : (
                  <div className="flex h-full items-center justify-center text-[10px] text-[var(--color-text-muted)]">无图</div>
                )}
              </div>
              <div className="mt-1 truncate text-[10px] text-[var(--color-text)]">{sc.name}</div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
