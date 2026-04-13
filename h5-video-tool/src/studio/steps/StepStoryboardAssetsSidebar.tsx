import type { CharacterSheet, ProductionShot, SceneSheet } from '../productionTypes';
import { ensureCharacterLookTree, getCharacterLookImage } from '../productionAssets';

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
    <aside className="w-full shrink-0 space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3 lg:w-52">
      <div className="text-xs font-semibold text-[var(--color-text)]">角色</div>
      <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto">
        {chSheets.map((ch) => {
          const thumb = getCharacterLookImage(ensureCharacterLookTree(ch));
          const autoMatchId = getAutoMatchStateId(ch, shot);
          const effectiveStateId = shot.characterStateOverrides?.[ch.id] ?? autoMatchId;
          const effectiveState = ch.states?.find((s) => s.id === effectiveStateId);
          const isManual = !!shot.characterStateOverrides?.[ch.id];
          return (
            <div key={ch.id} className="w-16 text-center">
              <div className="mx-auto h-14 w-14 overflow-hidden rounded-full border border-[var(--color-border)] bg-[var(--color-surface-hover)]">
                {thumb ? (
                  <img
                    src={thumb}
                    alt=""
                    className="h-full w-full object-cover cursor-zoom-in"
                    onClick={() => onOpenLightbox(thumb)}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-[10px] text-[var(--color-text-muted)]">
                    —
                  </div>
                )}
              </div>
              <div className="mt-1 truncate text-[10px] text-[var(--color-text)]">{ch.name}</div>
              {ch.states && ch.states.length > 0 ? (
                <div className="mt-0.5 flex flex-col items-center gap-0.5">
                  <span className="text-[9px] leading-tight text-[var(--color-text-muted)]">
                    {effectiveState ? (
                      <span className={isManual ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}>
                        {isManual ? '✎ ' : '⚡ '}
                        {effectiveState.label}
                      </span>
                    ) : (
                      <span>未匹配</span>
                    )}
                  </span>
                  <select
                    className="w-full rounded border border-[var(--color-border)]/50 bg-transparent px-0.5 text-[9px] text-[var(--color-text)]"
                    value={effectiveStateId ?? ''}
                    onChange={(e) => onChangeCharacterStateOverride(ch.id, e.target.value)}
                  >
                    <option value="">（自动）</option>
                    {ch.states.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="text-xs font-semibold text-[var(--color-text)]">场景</div>
      <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
        {scSheets.map((sc) => (
          <div key={sc.id} className="w-20 text-center">
            <div className="h-12 w-full overflow-hidden rounded border border-[var(--color-border)] bg-[var(--color-surface-hover)]">
              {sc.variants[0]?.imageDataUrl ? (
                <img
                  src={sc.variants[0].imageDataUrl}
                  alt=""
                  className="h-full w-full object-cover cursor-zoom-in"
                  onClick={() => onOpenLightbox(sc.variants[0]!.imageDataUrl!)}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-[10px]">—</div>
              )}
            </div>
            <div className="mt-1 truncate text-[10px] text-[var(--color-text)]">{sc.name}</div>
          </div>
        ))}
      </div>
    </aside>
  );
}

