import { buildPropImagePrompt } from '../productionAssets';
import { getScenePropAssetStatus, type DesignAssetStatus } from '../designAssetStatus';
import type { ProductionDesignLayer, PropSheet } from '../productionTypes';

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

export function StepDesignPropsPanel({
  propSheets,
  styleRefSummary,
  styleRefImageDataUrl,
  productionDesign,
  propModalState,
  propModalPreview,
  propModalError,
  propModalBusy,
  onOpenPropModal,
  onOpenLightbox,
  onUploadVariant,
  genKey,
  onGeneratePropFrame,
  onAddPropVariant,
}: {
  propSheets: PropSheet[];
  styleRefSummary: string;
  styleRefImageDataUrl?: string;
  productionDesign: ProductionDesignLayer | null;
  propModalState: {
    sheetId: string;
    variantId: string;
    name: string;
    basePrompt: string;
    currentImageDataUrl?: string;
  } | null;
  propModalPreview: string | null;
  propModalError: string | null;
  propModalBusy: boolean;
  onOpenPropModal: (args: {
    sheetId: string;
    variantId: string;
    name: string;
    basePrompt: string;
    currentImageDataUrl?: string;
  }) => void;
  onOpenLightbox: (src: string) => void;
  onUploadVariant: (file: File | null, sheetId: string, variantId: string) => void;
  genKey: string | null;
  onGeneratePropFrame: (prompt: string, sheetId: string, variantId: string) => void;
  onAddPropVariant: (sheetId: string) => void;
}) {
  if (propSheets.length === 0) {
    return (
      <p className="text-sm text-[var(--color-text-muted)]">
        暂无道具卡。请先在上一步生成故事与场景设定，道具清单会自动同步到这里。
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
      {propSheets.map((pr) => {
        const mainVariant = pr.variants[0];
        const isModalTarget = propModalState?.sheetId === pr.id && propModalState.variantId === mainVariant?.id;
        const status = getScenePropAssetStatus({
          hasImage: !!mainVariant?.imageDataUrl,
          isGenerating: genKey === `prop:${pr.id}:${mainVariant?.id}` || (isModalTarget && propModalBusy),
          hasPreview: Boolean(isModalTarget && propModalPreview),
          hasError: Boolean(isModalTarget && propModalError),
        });
        const badge = statusBadge(status);
        const cover = (isModalTarget && propModalPreview) || mainVariant?.imageDataUrl;
        const vCount = pr.variants.length;

        return (
          <div
            key={pr.id}
            className={`group flex flex-col overflow-hidden rounded-2xl border bg-[var(--color-surface)] shadow-sm transition-[box-shadow,transform] hover:-translate-y-0.5 hover:border-[var(--color-primary)]/35 hover:shadow-md ${cardBorder(status)}`}
            title={pr.name}
          >
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  if (!mainVariant) return;
                  const prompt = buildPropImagePrompt(pr, mainVariant, styleRefSummary, productionDesign, {
                    enforceGlobalStyleLock: !!styleRefImageDataUrl?.trim(),
                  });
                  onOpenPropModal({
                    sheetId: pr.id,
                    variantId: mainVariant.id,
                    name: pr.name,
                    basePrompt: prompt,
                    currentImageDataUrl: mainVariant.imageDataUrl,
                  });
                }}
                className="block aspect-square w-full overflow-hidden bg-[var(--color-surface-hover)] text-left"
              >
                {cover ? (
                  <img
                    src={cover}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 px-3 text-center">
                    <div className="rounded-full border border-dashed border-[var(--color-primary)]/45 px-3 py-1 text-[10px] font-medium text-[var(--color-primary)]">
                      点击生图
                    </div>
                    <div className="text-[11px] text-[var(--color-text-muted)]">生成道具主图</div>
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
                  <span className="text-[11px] text-white/95">正在生成道具图</span>
                </div>
              ) : null}

              {status === 'review' ? (
                <div className="absolute inset-x-0 bottom-0 bg-black/65 px-3 py-2 text-[11px] text-white/90">
                  预览已生成，打开弹窗确认即可
                </div>
              ) : null}

              {status === 'failed' ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-red-950/72 px-4 text-center">
                  <div className="text-xs font-semibold text-red-100">道具图生成失败</div>
                  <div className="text-[11px] text-red-100/85">点击卡片可重新打开并重试</div>
                </div>
              ) : null}
            </div>

            <div className="border-t border-[var(--color-border)]/60 px-3 py-3">
              <div className="truncate text-sm font-semibold text-[var(--color-text)]">{pr.name}</div>
              {pr.sceneRef ? (
                <div className="mt-0.5 truncate text-[10px] text-[var(--color-text-muted)]">
                  关联场景：{pr.sceneRef}
                </div>
              ) : null}
              <div className="mt-1 text-xs text-[var(--color-text-muted)]">
                {vCount} 个变体 · {status === 'ready' ? '主道具已就绪' : status === 'review' ? '等待确认主图' : '主道具待补图'}
              </div>
            </div>

            <details className="border-t border-[var(--color-border)]/50 bg-[var(--color-surface-elevated)]/50 px-3 py-2">
              <summary className="cursor-pointer list-none text-center text-[10px] text-[var(--color-text-muted)] [&::-webkit-details-marker]:hidden">
                变体上传 / AI 生图
              </summary>
              <div className="mt-2 space-y-2 pb-2">
                {pr.variants.map((v) => (
                  <div
                    key={v.id}
                    className="flex flex-wrap items-center gap-1.5 rounded-lg border border-[var(--color-border)]/50 p-1.5"
                  >
                    <span className="max-w-[6rem] truncate text-[10px] text-[var(--color-text-muted)]">
                      {v.label}
                    </span>
                    {v.imageDataUrl ? (
                      <img src={v.imageDataUrl} alt="" className="h-8 w-8 rounded object-cover" />
                    ) : null}
                    <label className="cursor-pointer text-[10px] text-[var(--color-primary)]">
                      上传
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          onUploadVariant(e.target.files?.[0] ?? null, pr.id, v.id)
                        }
                      />
                    </label>
                    <button
                      type="button"
                      disabled={genKey === `prop:${pr.id}:${v.id}`}
                      onClick={() => {
                        const prompt = buildPropImagePrompt(
                          pr,
                          v,
                          styleRefSummary,
                          productionDesign,
                          {
                            enforceGlobalStyleLock: !!styleRefImageDataUrl?.trim(),
                          },
                        );
                        onGeneratePropFrame(prompt, pr.id, v.id);
                      }}
                      className="text-[10px] text-[var(--color-primary)] disabled:opacity-50"
                    >
                      {genKey === `prop:${pr.id}:${v.id}` ? '...' : 'AI'}
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => onAddPropVariant(pr.id)}
                  className="w-full text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                >
                  + 道具变体
                </button>
              </div>
            </details>
          </div>
        );
      })}
    </div>
  );
}
