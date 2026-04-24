import { useRef } from 'react';
import { CharacterLibraryPanel } from '../../components/CharacterLibraryPanel';
import { CharacterLookTreeCanvas } from '../../components/production/CharacterLookTreeCanvas';
import { getPortraitJobKey, type PortraitJobState } from '../../components/production/portraitJobKey';
import type { LibraryCharacter } from '../../api/characterLibrary';
import {
  buildCharacterImagePrompt,
  ensureCharacterLookTree,
  getCharacterActiveNode,
  getCharacterLookImage,
} from '../productionAssets';
import { getCharacterAssetStatus, type DesignAssetStatus } from '../designAssetStatus';
import type { CharacterSheet, ProductionDesignLayer } from '../productionTypes';
import type { PortraitEditIntent } from '../../components/production/CharacterPortraitEditorModal';

function statusBadge(status: DesignAssetStatus): { label: string; className: string } {
  switch (status) {
    case 'ready':
      return { label: '已定妆', className: 'bg-emerald-500/90 text-white' };
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
  if (status === 'missing') {
    return 'border-dashed border-[var(--color-primary)]/45';
  }
  if (status === 'failed') {
    return 'border-red-500/40';
  }
  if (status === 'ready') {
    return 'border-emerald-500/25';
  }
  return 'border-[var(--color-border)]';
}

export function StepDesignCharactersPanel({
  showLibraryImport,
  onImportFromLibrary,
  chSheets,
  treeFocusCharacterId,
  onTreeFocusChange,
  portraitJobs,
  onTreeSheetChange,
  onTreeRequestPortrait,
  onOpenWardrobeManager,
  onQuickGenerateMainLook,
  onConfirmMainLook,
  onOpenLightbox,
  onUploadVariant,
  genKey,
  styleRefSummary,
  styleRefImageDataUrl,
  productionDesign,
  onGenerateCharacterFrame,
  onRemoveCharacterVariant,
  onAddCharacterVariant,
}: {
  showLibraryImport: boolean;
  onImportFromLibrary: (char: LibraryCharacter) => void;
  chSheets: CharacterSheet[];
  treeFocusCharacterId: string | null;
  onTreeFocusChange: (id: string) => void;
  portraitJobs: Record<string, PortraitJobState>;
  onTreeSheetChange: (next: CharacterSheet) => void;
  onTreeRequestPortrait: (sheet: CharacterSheet, intent: PortraitEditIntent) => void;
  onOpenWardrobeManager: (sheet: CharacterSheet) => void;
  onQuickGenerateMainLook: (sheet: CharacterSheet) => void;
  onConfirmMainLook: (sheetId: string, nodeId: string) => void;
  onOpenLightbox: (src: string) => void;
  onUploadVariant: (file: File | null, sheetId: string, variantId: string) => void;
  genKey: string | null;
  styleRefSummary: string;
  styleRefImageDataUrl?: string;
  productionDesign: ProductionDesignLayer | null;
  onGenerateCharacterFrame: (prompt: string, sheetId: string, variantId: string) => void;
  onRemoveCharacterVariant: (sheetId: string, variantId: string) => void;
  onAddCharacterVariant: (sheetId: string) => void;
}) {
  const treePanelRef = useRef<HTMLDivElement | null>(null);

  const openVariantEditor = (ch: CharacterSheet) => {
    const sheet = ensureCharacterLookTree(ch);
    const node = getCharacterActiveNode(sheet) ?? sheet.lookTree?.[0];
    if (!node) return;
    onTreeFocusChange(ch.id);
    onTreeRequestPortrait(sheet, { mode: 'replace', nodeId: node.id });
  };

  const showVariantTree = (id: string) => {
    onTreeFocusChange(id);
    window.setTimeout(() => {
      treePanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  };

  return (
    <>
      {showLibraryImport && (
        <div className="mb-4 rounded-xl border border-[var(--color-border)] p-3">
          <CharacterLibraryPanel onImportToProject={onImportFromLibrary} />
        </div>
      )}

      {chSheets.length > 0 && treeFocusCharacterId ? (
        <div ref={treePanelRef} className="mb-6 space-y-3">
          <div>
            <div className="text-xs font-medium text-[var(--color-text-muted)]">角色形象关系</div>
            <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">
              主路径现在可以直接在卡片上生图和确认；这里保留给需要精细管理形象变体的场景。
            </p>
          </div>
          {(() => {
            const focused = chSheets.find((c) => c.id === treeFocusCharacterId);
            if (!focused) return null;
            return (
              <CharacterLookTreeCanvas
                characterSheet={focused}
                characterSheetId={focused.id}
                portraitJobs={portraitJobs}
                onSheetChange={onTreeSheetChange}
                onRequestPortrait={(intent) => {
                  onTreeRequestPortrait(ensureCharacterLookTree(focused), intent);
                }}
              />
            );
          })()}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {chSheets.map((ch) => {
          const ensured = ensureCharacterLookTree(ch);
          const lookCount = ensured.lookTree?.length ?? ch.variants.length;
          const stateCount = ch.states?.length ?? 0;
          const mainImg = getCharacterLookImage(ensured);
          const activeNode = getCharacterActiveNode(ensured) ?? ensured.lookTree?.[0];
          const portraitKey = activeNode
            ? getPortraitJobKey(ch.id, { mode: 'replace', nodeId: activeNode.id })
            : '';
          const portraitJob = portraitKey ? portraitJobs[portraitKey] : undefined;
          const status = getCharacterAssetStatus(ensured, portraitJob);
          const badge = statusBadge(status);

          const handlePrimaryAction = () => {
            if (status === 'missing' || status === 'failed') {
              onQuickGenerateMainLook(ensured);
              return;
            }
            if (status === 'ready') {
              openVariantEditor(ch);
            }
          };

          return (
            <div
              key={ch.id}
              className={`flex flex-col overflow-hidden rounded-2xl border bg-[var(--color-surface)] shadow-sm transition-[box-shadow,transform] hover:-translate-y-0.5 hover:border-[var(--color-primary)]/35 hover:shadow-md ${cardBorder(status)}`}
            >
              <div className="relative">
                <button
                  type="button"
                  onClick={handlePrimaryAction}
                  className="group block aspect-[3/4] w-full overflow-hidden bg-[var(--color-surface-hover)] text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                >
                  {status === 'review' && portraitJob?.status === 'done' ? (
                    <img
                      src={portraitJob.previewDataUrl}
                      alt=""
                      className="h-full w-full object-cover object-top"
                    />
                  ) : mainImg ? (
                    <img
                      src={mainImg}
                      alt=""
                      className="h-full w-full object-cover object-top transition-transform duration-200 group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center">
                      <div className="rounded-full border border-dashed border-[var(--color-primary)]/45 px-3 py-1 text-[10px] font-medium text-[var(--color-primary)]">
                        点击生图
                      </div>
                      <div className="text-xs text-[var(--color-text-muted)]">
                        用默认提示直接生成主形象
                      </div>
                    </div>
                  )}
                </button>

                {ch.isProtagonist ? (
                  <span className="pointer-events-none absolute left-2 top-2 rounded-md bg-[var(--color-primary)] px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm">
                    主角
                  </span>
                ) : null}

                <span className={`pointer-events-none absolute right-2 top-2 rounded-md px-2 py-0.5 text-[10px] font-semibold shadow-sm ${badge.className}`}>
                  {badge.label}
                </span>

                {mainImg ? (
                  <button
                    type="button"
                    className="absolute bottom-2 right-2 z-20 flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-black/45 text-white transition-colors hover:bg-black/65"
                    onClick={() => onOpenLightbox(status === 'review' && portraitJob?.status === 'done' ? portraitJob.previewDataUrl : mainImg)}
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
                    <span className="text-[11px] text-white/95">正在生成主形象</span>
                  </div>
                ) : null}

                {status === 'review' && portraitJob?.status === 'done' && activeNode ? (
                  <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-black/65 p-2">
                    <button
                      type="button"
                      onClick={() => onConfirmMainLook(ch.id, activeNode.id)}
                      className="flex-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-emerald-400"
                    >
                      确认使用
                    </button>
                    <button
                      type="button"
                      onClick={() => onQuickGenerateMainLook(ensured)}
                      className="rounded-lg border border-white/20 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-white/10"
                    >
                      重试
                    </button>
                  </div>
                ) : null}

                {status === 'failed' ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-red-950/72 px-4 text-center">
                    <div className="text-xs font-semibold text-red-100">生图失败</div>
                    <button
                      type="button"
                      onClick={() => onQuickGenerateMainLook(ensured)}
                      className="rounded-lg border border-red-200/30 px-3 py-1.5 text-[11px] font-medium text-red-50 hover:bg-red-200/10"
                    >
                      重新生成
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="border-t border-[var(--color-border)]/60 px-3 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-[var(--color-text)]">{ch.name}</div>
                    <div className="mt-1 text-xs text-[var(--color-text-muted)]">
                      {lookCount} 个形象 · {stateCount} 个状态
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenWardrobeManager(ensured)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-primary)]/40 hover:text-[var(--color-primary)]"
                    title="管理角色状态衣橱"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 6a3 3 0 0 1 6 0c0 1 0 2 3 2s3-1 3-2a3 3 0 0 1 6 0" />
                      <path d="M4 8l8 6" />
                      <path d="M20 8l-8 6" />
                      <path d="M12 14v7" />
                    </svg>
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px]">
                  <button
                    type="button"
                    onClick={() => openVariantEditor(ch)}
                    className="font-medium text-[var(--color-primary)] hover:underline"
                  >
                    编辑形象
                  </button>
                  <button
                    type="button"
                    onClick={() => showVariantTree(ch.id)}
                    className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                  >
                    查看关系
                  </button>
                </div>
              </div>

              <details className="border-t border-[var(--color-border)]/50 bg-[var(--color-surface-elevated)]/50 px-3 py-2">
                <summary className="cursor-pointer list-none text-center text-[10px] text-[var(--color-text-muted)] [&::-webkit-details-marker]:hidden">
                  变体上传 / AI 生图
                </summary>
                <div className="mt-2 space-y-2 pb-2">
                  {ch.variants.map((v) => (
                    <div
                      key={v.id}
                      className="flex flex-wrap items-center gap-1.5 rounded-lg border border-[var(--color-border)]/50 p-1.5"
                    >
                      <span className="max-w-[5rem] truncate text-[10px] text-[var(--color-text-muted)]">
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
                            onUploadVariant(e.target.files?.[0] ?? null, ch.id, v.id)
                          }
                        />
                      </label>
                      <button
                        type="button"
                        disabled={genKey === `char:${ch.id}:${v.id}`}
                        onClick={() => {
                          const prompt = buildCharacterImagePrompt(
                            ch,
                            v,
                            styleRefSummary,
                            productionDesign,
                            {
                              enforceGlobalStyleLock: !!styleRefImageDataUrl?.trim(),
                            },
                          );
                          onGenerateCharacterFrame(prompt, ch.id, v.id);
                        }}
                        className="text-[10px] text-[var(--color-primary)] disabled:opacity-50"
                      >
                        {genKey === `char:${ch.id}:${v.id}` ? '...' : 'AI'}
                      </button>
                      {ch.variants.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => onRemoveCharacterVariant(ch.id, v.id)}
                          className="ml-auto text-[10px] text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-error)]"
                          title="删除此变体"
                        >
                          ×
                        </button>
                      ) : null}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => onAddCharacterVariant(ch.id)}
                    className="w-full text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                  >
                    + 添加状态
                  </button>
                </div>
              </details>
            </div>
          );
        })}
      </div>
    </>
  );
}
