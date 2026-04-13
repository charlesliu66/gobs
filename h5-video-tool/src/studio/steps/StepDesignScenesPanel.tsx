import { buildSceneImagePrompt } from '../productionAssets';
import type { ProductionDesignLayer, SceneSheet } from '../productionTypes';

export function StepDesignScenesPanel({
  scSheets,
  styleRefSummary,
  styleRefImageDataUrl,
  productionDesign,
  onOpenSceneModal,
  onOpenLightbox,
  onUploadVariant,
  genKey,
  onGenerateSceneFrame,
  onAddSceneVariant,
}: {
  scSheets: SceneSheet[];
  styleRefSummary: string;
  styleRefImageDataUrl?: string;
  productionDesign: ProductionDesignLayer | null;
  onOpenSceneModal: (args: {
    sheetId: string;
    variantId: string;
    name: string;
    basePrompt: string;
    currentImageDataUrl?: string;
  }) => void;
  onOpenLightbox: (src: string) => void;
  onUploadVariant: (file: File | null, sheetId: string, variantId: string) => void;
  genKey: string | null;
  onGenerateSceneFrame: (prompt: string, sheetId: string, variantId: string) => void;
  onAddSceneVariant: (sheetId: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {scSheets.map((sc) => {
        const vCount = sc.variants.length;
        const cover = sc.variants[0]?.imageDataUrl;
        return (
          <div
            key={sc.id}
            className="flex flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm transition-[box-shadow,transform] hover:-translate-y-0.5 hover:border-[var(--color-primary)]/35 hover:shadow-md"
          >
            <button
              type="button"
              onClick={() => {
                const v0 = sc.variants[0];
                if (!v0) return;
                const prompt = buildSceneImagePrompt(sc, v0, styleRefSummary, productionDesign, {
                  enforceGlobalStyleLock: !!styleRefImageDataUrl?.trim(),
                });
                onOpenSceneModal({
                  sheetId: sc.id,
                  variantId: v0.id,
                  name: sc.name,
                  basePrompt: prompt,
                  currentImageDataUrl: cover,
                });
              }}
              className="relative aspect-video w-full overflow-hidden bg-[var(--color-surface-hover)] cursor-pointer group"
            >
              {cover ? (
                <img
                  src={cover}
                  alt=""
                  className="h-full w-full object-cover cursor-zoom-in"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenLightbox(cover);
                  }}
                />
              ) : (
                <div className="flex h-full items-center justify-center px-2 text-center text-[11px] text-[var(--color-text-muted)]">
                  暂无场景图
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-colors">
                <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-medium">点击生图</span>
              </div>
            </button>
            <div className="border-t border-[var(--color-border)]/60 px-2 py-3 text-center">
              <div className="truncate text-sm font-semibold text-[var(--color-text)]">{sc.name}</div>
              <div className="mt-1 text-xs text-[var(--color-text-muted)]">共{vCount}个变体</div>
            </div>
            <details className="border-t border-[var(--color-border)]/50 bg-[var(--color-surface-elevated)]/50 px-2 py-1.5">
              <summary className="cursor-pointer list-none text-center text-[10px] text-[var(--color-text-muted)] [&::-webkit-details-marker]:hidden">
                变体与 AI 生图
              </summary>
              <div className="mt-2 space-y-2 pb-2">
                {sc.variants.map((v) => (
                  <div
                    key={v.id}
                    className="flex flex-wrap items-center gap-1.5 rounded-lg border border-[var(--color-border)]/50 p-1.5"
                  >
                    <span className="max-w-[5rem] truncate text-[10px] text-[var(--color-text-muted)]">
                      {v.label}
                    </span>
                    {v.imageDataUrl ? (
                      <img src={v.imageDataUrl} alt="" className="h-8 w-12 rounded object-cover" />
                    ) : null}
                    <label className="cursor-pointer text-[10px] text-[var(--color-primary)]">
                      上传
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          onUploadVariant(e.target.files?.[0] ?? null, sc.id, v.id)
                        }
                      />
                    </label>
                    <button
                      type="button"
                      disabled={genKey === `scene:${sc.id}:${v.id}`}
                      onClick={() => {
                        const prompt = buildSceneImagePrompt(
                          sc,
                          v,
                          styleRefSummary,
                          productionDesign,
                          {
                            enforceGlobalStyleLock: !!styleRefImageDataUrl?.trim(),
                          },
                        );
                        onGenerateSceneFrame(prompt, sc.id, v.id);
                      }}
                      className="text-[10px] text-[var(--color-primary)] disabled:opacity-50"
                    >
                      {genKey === `scene:${sc.id}:${v.id}` ? '…' : 'AI'}
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => onAddSceneVariant(sc.id)}
                  className="w-full text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                >
                  + 场景变体
                </button>
              </div>
            </details>
          </div>
        );
      })}
    </div>
  );
}

