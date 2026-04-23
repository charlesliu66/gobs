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
import type { CharacterSheet, ProductionDesignLayer } from '../productionTypes';
import type { PortraitEditIntent } from '../../components/production/CharacterPortraitEditorModal';

export function StepDesignCharactersPanel({
  showLibraryImport,
  onImportFromLibrary,
  chSheets,
  treeFocusCharacterId,
  onTreeFocusChange,
  portraitJobs,
  onTreeSheetChange,
  onTreeRequestPortrait,
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
        <div className="border border-[var(--color-border)] rounded-xl p-3 mb-4">
          <CharacterLibraryPanel onImportToProject={onImportFromLibrary} />
        </div>
      )}
      {chSheets.length > 0 && treeFocusCharacterId ? (
        <div ref={treePanelRef} className="mb-6 space-y-3">
          <div>
            <div className="text-xs font-medium text-[var(--color-text-muted)]">角色形象变体（高级）</div>
            <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">
              用于查看形象变体关系；主流程只需要确认当前形象即可。
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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {chSheets.map((ch) => {
          const ensured = ensureCharacterLookTree(ch);
          const lookCount = ensured.lookTree?.length ?? ch.variants.length;
          const mainImg = getCharacterLookImage(ensured);
          const activeNode = getCharacterActiveNode(ensured);
          const gridPortraitKey = activeNode
            ? getPortraitJobKey(ch.id, { mode: 'replace', nodeId: activeNode.id })
            : '';
          const gridPj = gridPortraitKey ? portraitJobs[gridPortraitKey] : undefined;
          return (
            <div
              key={ch.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm transition-[box-shadow,transform] hover:-translate-y-0.5 hover:border-[var(--color-primary)]/35 hover:shadow-md"
            >
              <button
                type="button"
                onClick={() => {
                  openVariantEditor(ch);
                }}
                className="group relative aspect-[3/4] w-full cursor-pointer overflow-hidden bg-[var(--color-surface-hover)] text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
              >
                {mainImg ? (
                  <>
                    <img
                      src={mainImg}
                      alt=""
                      className="h-full w-full object-cover object-top"
                    />
                    <button
                      type="button"
                      className="absolute right-1.5 top-1.5 z-20 flex h-6 w-6 items-center justify-center rounded-md bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenLightbox(mainImg);
                      }}
                      title="放大"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                    </button>
                  </>
                ) : (
                  <div className="flex h-full w-full items-center justify-center px-2 text-center text-[11px] text-[var(--color-text-muted)]">
                    暂无定妆
                  </div>
                )}
                {gridPj?.status === 'generating' && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 bg-black/55">
                    <span className="h-7 w-7 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    <span className="text-[10px] text-white/95">生成中</span>
                  </div>
                )}
                {gridPj?.status === 'done' && (
                  <div className="absolute inset-0 z-10 overflow-hidden">
                    <img
                      src={gridPj.previewDataUrl}
                      alt=""
                      className="h-full w-full object-cover object-top"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-amber-600/90 py-1 text-center text-[10px] font-medium text-white">
                      待确认
                    </div>
                  </div>
                )}
                {gridPj?.status === 'error' && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-red-950/80 px-2 text-center text-[10px] leading-snug text-red-100">
                    生成失败
                  </div>
                )}
                {ch.isProtagonist ? (
                  <span className="pointer-events-none absolute left-2 top-2 rounded-md bg-[var(--color-primary)] px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm">
                    主角
                  </span>
                ) : null}
              </button>
              <div className="border-t border-[var(--color-border)]/60 px-2 py-3 text-center">
                <div className="truncate text-sm font-semibold text-[var(--color-text)]">{ch.name}</div>
                <div className="mt-1 text-xs text-[var(--color-text-muted)]">共{lookCount}个形象</div>
                <button
                  type="button"
                  onClick={() => openVariantEditor(ch)}
                  className="mt-1 text-[11px] font-medium text-[var(--color-primary)] hover:underline"
                >
                  编辑形象变体
                </button>
                <button
                  type="button"
                  onClick={() => showVariantTree(ch.id)}
                  className="ml-2 mt-1 text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                >
                  查看变体关系
                </button>
              </div>
              <details className="border-t border-[var(--color-border)]/50 bg-[var(--color-surface-elevated)]/50 px-2 py-1.5">
                <summary className="cursor-pointer list-none text-center text-[10px] text-[var(--color-text-muted)] [&::-webkit-details-marker]:hidden">
                  变体与 AI 生图
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
                        {genKey === `char:${ch.id}:${v.id}` ? '…' : 'AI'}
                      </button>
                      {ch.variants.length > 1 && (
                        <button
                          type="button"
                          onClick={() => onRemoveCharacterVariant(ch.id, v.id)}
                          className="ml-auto text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-error)] transition-colors"
                          title="删除此变体"
                        >
                          ✕
                        </button>
                      )}
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
