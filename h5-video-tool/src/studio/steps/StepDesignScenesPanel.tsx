import { buildSceneImagePrompt } from '../productionAssets';
import { getScenePropAssetStatus, type DesignAssetStatus } from '../designAssetStatus';
import type { ProductionDesignLayer, SceneSheet } from '../productionTypes';

function statusBadge(status: DesignAssetStatus): { label: string; className: string } {
  switch (status) {
    case 'ready':
      return { label: '已出图', className: 'bg-emerald-500/90 text-white' };
    case 'generating':
      return { label: '生成中', className: 'bg-sky-500/90 text-white' };
    case 'review':
      return { label: '待确认', className: 'bg-amber-500/90 text-white' };
    case 'failed':
      return { label: '重试', className: 'bg-red-500/90 text-white' };
    default:
      return { label: '点击生图', className: 'bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)]' };
  }
}

function cardBorder(status: DesignAssetStatus): string {
  if (status === 'missing') return 'border-dashed border-[var(--color-primary)]/45';
  if (status === 'failed') return 'border-red-500/40';
  if (status === 'ready') return 'border-emerald-500/25';
  return 'border-[var(--color-border)]';
}

export function StepDesignScenesPanel({
  scSheets,
  styleRefSummary,
  styleRefImageDataUrl,
  productionDesign,
  sceneModalState,
  sceneModalPreview,
  sceneModalError,
  sceneModalBusy,
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
  sceneModalState: {
    sheetId: string;
    variantId: string;
    name: string;
    basePrompt: string;
    currentImageDataUrl?: string;
  } | null;
  sceneModalPreview: string | null;
  sceneModalError: string | null;
  sceneModalBusy: boolean;
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
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {scSheets.map((sc) => {
        const mainVariant = sc.variants[0];
        const isModalTarget = sceneModalState?.sheetId === sc.id && sceneModalState.variantId === mainVariant?.id;
        const status = getScenePropAssetStatus({
          hasImage: !!mainVariant?.imageDataUrl,
          isGenerating: genKey === `scene:${sc.id}:${mainVariant?.id}` || (isModalTarget && sceneModalBusy),
          hasPreview: Boolean(isModalTarget && sceneModalPreview),
          hasError: Boolean(isModalTarget && sceneModalError),
        });
        const badge = statusBadge(status);
        const vCount = sc.variants.length;
        const cover = (isModalTarget && sceneModalPreview) || mainVariant?.imageDataUrl;

        return (
          <div
            key={sc.id}
            className={`flex flex-col overflow-hidden rounded-2xl border bg-[var(--color-surface)] shadow-sm transition-[box-shadow,transform] hover:-translate-y-0.5 hover:border-[var(--color-primary)]/35 hover:shadow-md ${cardBorder(status)}`}
          >
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  if (!mainVariant) return;
                  const prompt = buildSceneImagePrompt(sc, mainVariant, styleRefSummary, productionDesign, {
                    enforceGlobalStyleLock: !!styleRefImageDataUrl?.trim(),
                  });
                  onOpenSceneModal({
                    sheetId: sc.id,
                    variantId: mainVariant.id,
                    name: sc.name,
                    basePrompt: prompt,
                    currentImageDataUrl: mainVariant.imageDataUrl,
                  });
                }}
                className="group block aspect-video w-full overflow-hidden bg-[var(--color-surface-hover)] text-left"
              >
                {cover ? (
                  <img
                    src={cover}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
                    <div className="rounded-full border border-dashed border-[var(--color-primary)]/45 px-3 py-1 text-[10px] font-medium text-[var(--color-primary)]">
                      点击生图
                    </div>
                    <div className="text-xs text-[var(--color-text-muted)]">打开场景卡片并生成主图</div>
                  </div>
                )}
              </button>

              <span className={`pointer-events-none absolute right-2 top-2 rounded-md px-2 py-0.5 text-[10px] font-semibold shadow-sm ${badge.className}`}>
                {badge.label}
              </span>

              {cover ? (
                <button
                  type="button"
                  onClick={() => onOpenLightbox(cover)}
                  className="absolute bottom-2 right-2 z-20 flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-black/45 text-white transition-colors hover:bg-black/65"
                  title="放大查看"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="7" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </button>
              ) : null}

              {status === 'generating' ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/55">
                  <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  <span className="text-[11px] text-white/95">正在生成场景图</span>
                </div>
              ) : null}

              {status === 'review' ? (
                <div className="absolute inset-x-0 bottom-0 bg-black/65 px-3 py-2 text-[11px] text-white/90">
                  预览已生成，打开弹窗即可确认或重试
                </div>
              ) : null}

              {status === 'failed' ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-red-950/72 px-4 text-center">
                  <div className="text-xs font-semibold text-red-100">主场景生图失败</div>
                  <div className="text-[11px] text-red-100/85">点击卡片可重新打开并重试</div>
                </div>
              ) : null}
            </div>

            <div className="border-t border-[var(--color-border)]/60 px-3 py-3">
              <div className="truncate text-sm font-semibold text-[var(--color-text)]">{sc.name}</div>
              <div className="mt-1 text-xs text-[var(--color-text-muted)]">
                {vCount} 个变体 · {status === 'ready' ? '主场景已就绪' : status === 'review' ? '等待确认主图' : '主场景待补图'}
              </div>
            </div>

            <details className="border-t border-[var(--color-border)]/50 bg-[var(--color-surface-elevated)]/50 px-3 py-2">
              <summary className="cursor-pointer list-none text-center text-[10px] text-[var(--color-text-muted)] [&::-webkit-details-marker]:hidden">
                变体上传 / AI 生图
              </summary>
              <div className="mt-2 space-y-2 pb-2">
                {sc.variants.map((v) => (
                  <div
                    key={v.id}
                    className="flex flex-wrap items-center gap-1.5 rounded-lg border border-[var(--color-border)]/50 p-1.5"
                  >
                    <span className="max-w-[6rem] truncate text-[10px] text-[var(--color-text-muted)]">
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
                      {genKey === `scene:${sc.id}:${v.id}` ? '...' : 'AI'}
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
