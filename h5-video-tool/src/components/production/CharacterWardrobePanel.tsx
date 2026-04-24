import { useState, useCallback, useEffect, useRef } from 'react';
import type { CharacterSheet, CharacterState, StatePresetItem } from '../../studio/productionTypes';
import { CHARACTER_STATE_PRESETS } from '../../studio/productionTypes';
import { ensureCharacterLookTree, getCharacterLookImage, setCharacterLookNodeImage } from '../../studio/productionAssets';
import { generateFrames, standardizeCharacterImage } from '../../api/storyboard';
import { saveCharacterToLibrary } from '../../api/characterLibrary';
import { listAssets, buildAssetFileUrl } from '../../api/assetLibraryApi';
import type { LibraryAsset } from '../../api/assetLibraryApi';
import { RunningStatus } from '../RunningStatus';

function genId(): string {
  return `state_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

interface Props {
  sheet: CharacterSheet;
  styleRef: string;
  styleRefImage?: string;
  aspectRatio: string;
  onOpenLightbox?: (src: string) => void;
  onUpdate: (updated: CharacterSheet) => void;
}

export function CharacterWardrobePanel({
  sheet,
  styleRef,
  styleRefImage,
  aspectRatio,
  onOpenLightbox,
  onUpdate,
}: Props) {
  const [genningId, setGenningId] = useState<string | null>(null);
  const [genningBase, setGenningBase] = useState(false);
  const [standardizing, setStandardizing] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showPresetPicker, setShowPresetPicker] = useState(false);
  const [customLabelInput, setCustomLabelInput] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customPromptInput, setCustomPromptInput] = useState('');
  const [savingToLib, setSavingToLib] = useState(false);
  const [savedToLib, setSavedToLib] = useState(false);
  const uploadRefInputRef = useRef<HTMLInputElement>(null);
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const [assetList, setAssetList] = useState<LibraryAsset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [expandedStateId, setExpandedStateId] = useState<string | null>(null);

  const buildSheetWithBaseImage = useCallback((imageUrl: string): CharacterSheet => {
    const ensured = ensureCharacterLookTree(sheet);
    const root = ensured.lookTree?.find((n) => n.parentId === null) ?? ensured.lookTree?.[0];
    const withRoot = root ? setCharacterLookNodeImage(ensured, root.id, imageUrl) : ensured;
    return {
      ...withRoot,
      baseImageDataUrl: imageUrl,
      baseConfirmed: true,
      activeLookId: withRoot.activeLookId ?? root?.id,
    };
  }, [sheet]);

  useEffect(() => {
    if (!sheet.baseImageDataUrl) {
      const activeImage = getCharacterLookImage(sheet);
      if (activeImage) {
        onUpdate(buildSheetWithBaseImage(activeImage));
      }
    }
  }, [buildSheetWithBaseImage, onUpdate, sheet, sheet.baseImageDataUrl]);

  const handleSaveToLibrary = useCallback(async () => {
    setSavingToLib(true);
    try {
      const ensured = ensureCharacterLookTree(sheet);
      await saveCharacterToLibrary({
        name: sheet.name,
        isProtagonist: sheet.isProtagonist,
        baseImageDataUrl: sheet.baseImageDataUrl,
        baseConfirmed: sheet.baseConfirmed,
        states: (sheet.states ?? []).map((s) => ({
          id: s.id,
          label: s.label,
          imageDataUrl: s.imageDataUrl,
          statePrompt: s.statePrompt,
          notes: s.notes,
        })),
        lookTree: ensured.lookTree?.map((n) => ({
          id: n.id,
          parentId: n.parentId,
          label: n.label,
          imageDataUrl: n.imageDataUrl,
          note: n.note,
        })),
        activeLookId: ensured.activeLookId,
      });
      setSavedToLib(true);
      setTimeout(() => setSavedToLib(false), 3000);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '保存失败');
    } finally {
      setSavingToLib(false);
    }
  }, [sheet]);

  const handleOpenAssetPicker = useCallback(async () => {
    setShowAssetPicker(true);
    setLoadingAssets(true);
    try {
      const result = await listAssets({ type: 'image', pageSize: '100' });
      const images = result.assets.filter((a) => {
        const mime = a.mimetype ?? a.mime_type ?? '';
        return mime.startsWith('image/');
      });
      setAssetList(images);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '加载素材库失败');
      setShowAssetPicker(false);
    } finally {
      setLoadingAssets(false);
    }
  }, []);

  const handleSelectAsset = useCallback(async (asset: LibraryAsset) => {
    try {
      const fileUrl = asset.file_url ?? buildAssetFileUrl(asset.id);
      const resp = await fetch(fileUrl);
      const blob = await resp.blob();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      onUpdate(buildSheetWithBaseImage(dataUrl));
      setShowAssetPicker(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '获取素材图片失败');
    }
  }, [buildSheetWithBaseImage, onUpdate]);

  const states = sheet.states ?? [];

  const handleGenBase = useCallback(async () => {
    if (!styleRef.trim()) {
      setErr('请先填写视频风格摘要');
      return;
    }
    setGenningBase(true);
    setErr(null);
    try {
      const prompt = `${styleRef}\n角色：${sheet.name}${sheet.isProtagonist ? '（主角）' : ''}。全身正面，中性表情，标准站姿，白色简洁背景，电影感，高质量，无文字。`;
      const res = await generateFrames({
        prompt,
        aspectRatio,
        shotIndex: 0,
        singleFrameOnly: true,
        ...(styleRefImage ? { globalStyleReferenceFrame: styleRefImage } : {}),
      });
      onUpdate(buildSheetWithBaseImage(res.firstFrame));
    } catch (e) {
      setErr(e instanceof Error ? e.message : '生成失败');
    } finally {
      setGenningBase(false);
    }
  }, [aspectRatio, buildSheetWithBaseImage, onUpdate, sheet.isProtagonist, sheet.name, styleRef, styleRefImage]);

  const handleUploadRefImage = useCallback((file: File | null) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setStandardizing(true);
      setErr(null);
      void (async () => {
        try {
          const result = await standardizeCharacterImage({
            imageDataUrl: dataUrl,
            characterName: sheet.name,
            styleRef: styleRef.trim() || undefined,
          });
          onUpdate(buildSheetWithBaseImage(result.imageDataUrl));
        } catch (e) {
          setErr(e instanceof Error ? e.message : '参考图处理失败');
        } finally {
          setStandardizing(false);
        }
      })();
    };
    reader.readAsDataURL(file);
  }, [buildSheetWithBaseImage, onUpdate, sheet.name, styleRef]);

  const handleGenState = useCallback(async (state: CharacterState) => {
    if (!sheet.baseImageDataUrl) {
      setErr('请先生成并确认基础形象');
      return;
    }
    setGenningId(state.id);
    setErr(null);
    try {
      const diffDesc = state.statePrompt?.trim() || state.label;
      const prompt = [
        styleRef,
        `角色：${sheet.name}${sheet.isProtagonist ? '（主角）' : ''}。`,
        '【一致性要求】必须保持与参考图完全一致的五官、发型发色和体型比例。',
        `【状态变化】${state.label}：${diffDesc}`,
        '全身正面，白色简洁背景，电影感，高质量，无文字。',
      ].filter(Boolean).join('\n');
      const res = await generateFrames({
        prompt,
        aspectRatio,
        shotIndex: 0,
        singleFrameOnly: true,
        globalStyleReferenceFrame: sheet.baseImageDataUrl,
      });
      onUpdate({
        ...sheet,
        states: states.map((s) => (s.id === state.id ? { ...s, imageDataUrl: res.firstFrame } : s)),
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : '生成失败');
    } finally {
      setGenningId(null);
    }
  }, [aspectRatio, onUpdate, sheet, states, styleRef]);

  const applyPreset = useCallback((preset: StatePresetItem[]) => {
    const newStates: CharacterState[] = preset.map((p) => ({
      id: genId(),
      label: p.label,
      statePrompt: p.statePrompt,
    }));
    onUpdate({ ...sheet, states: newStates });
    setShowPresetPicker(false);
    if (newStates.length > 0) setExpandedStateId(newStates[0]!.id);
  }, [onUpdate, sheet]);

  const updateStatePrompt = useCallback((stateId: string, prompt: string) => {
    onUpdate({
      ...sheet,
      states: states.map((s) => (s.id === stateId ? { ...s, statePrompt: prompt } : s)),
    });
  }, [onUpdate, sheet, states]);

  const updateStateLabel = useCallback((stateId: string, label: string) => {
    onUpdate({
      ...sheet,
      states: states.map((s) => (s.id === stateId ? { ...s, label } : s)),
    });
  }, [onUpdate, sheet, states]);

  const addCustomState = useCallback(() => {
    if (!customLabelInput.trim()) return;
    const newId = genId();
    const newState: CharacterState = {
      id: newId,
      label: customLabelInput.trim(),
      statePrompt: customPromptInput.trim() || undefined,
    };
    onUpdate({ ...sheet, states: [...states, newState] });
    setExpandedStateId(newId);
    setCustomLabelInput('');
    setCustomPromptInput('');
    setShowCustomInput(false);
  }, [customLabelInput, customPromptInput, onUpdate, sheet, states]);

  return (
    <div className="space-y-4">
      {err && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {err}
        </div>
      )}

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h4 className="text-xs font-semibold text-[var(--color-text)]">基础形象</h4>
            <p className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">
              所有状态生成都会以这张基础形象为参考，所以需要先确认。
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handleGenBase()}
              disabled={genningBase || standardizing}
              className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs text-white transition-colors hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
            >
              {genningBase ? '生成中…' : sheet.baseImageDataUrl ? '重新生成' : 'AI 生成'}
            </button>
            <button
              type="button"
              onClick={() => uploadRefInputRef.current?.click()}
              disabled={genningBase || standardizing}
              className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-primary)]/50 hover:text-[var(--color-text)] disabled:opacity-50"
              title="上传参考图，AI 会生成标准化的基础形象"
            >
              {standardizing ? '处理中…' : '上传参考图'}
            </button>
            <input
              ref={uploadRefInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleUploadRefImage(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={() => void handleOpenAssetPicker()}
              disabled={genningBase || standardizing}
              className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-primary)]/50 hover:text-[var(--color-text)] disabled:opacity-50"
              title="从素材库选择角色图片作为基础形象"
            >
              从素材库选择
            </button>
            <RunningStatus
              active={genningBase || standardizing}
              label={genningBase ? '正在生成基础形象' : '正在处理参考图'}
              stallAfterSec={25}
              scene="props-room"
            />
          </div>
        </div>

        {sheet.baseImageDataUrl ? (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onOpenLightbox?.(sheet.baseImageDataUrl!)}
              className="group relative overflow-hidden rounded-lg border border-[var(--color-border)]"
              title="点击放大基础形象"
            >
              <img src={sheet.baseImageDataUrl} alt="基础形象" className="h-20 w-20 object-cover transition-transform group-hover:scale-105" />
              <span className="absolute inset-x-0 bottom-0 bg-black/55 py-0.5 text-center text-[9px] text-white/90 opacity-0 transition-opacity group-hover:opacity-100">
                放大
              </span>
            </button>
            <div className="flex-1">
              {sheet.baseConfirmed ? (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1 text-xs text-[var(--color-success)]">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    已确认，可生成其他状态
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleSaveToLibrary()}
                    disabled={savingToLib}
                    className="rounded-lg border border-[var(--color-border)] px-2.5 py-1 text-[10px] text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-primary)]/40 hover:text-[var(--color-text)] disabled:opacity-50"
                  >
                    {savingToLib ? '保存中…' : savedToLib ? '已保存到形象库' : '保存到形象库'}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onUpdate({ ...sheet, baseConfirmed: true })}
                  className="rounded-lg border border-[var(--color-primary)] px-3 py-1 text-xs text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)]/10"
                >
                  确认此基础形象
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex h-20 items-center justify-center rounded-lg border-2 border-dashed border-[var(--color-border)] text-xs text-[var(--color-text-muted)]">
            点击“AI 生成”创建基础形象
          </div>
        )}
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h4 className="text-xs font-semibold text-[var(--color-text)]">状态衣橱</h4>
            <p className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">
              设为默认的状态会作为分镜默认参考，后续也可以在单个分镜里单独覆盖。
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowPresetPicker((v) => !v)}
              className="rounded-lg border border-[var(--color-border)] px-2.5 py-1 text-xs text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-primary)]/40"
            >
              预设模板
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCustomInput((v) => !v);
                setShowPresetPicker(false);
              }}
              className="rounded-lg bg-[var(--color-surface-hover)] px-2.5 py-1 text-xs text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
            >
              + 自定义
            </button>
          </div>
        </div>

        {showPresetPicker && (
          <div className="mb-3 space-y-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3">
            {Object.entries(CHARACTER_STATE_PRESETS).map(([name, items]) => items.length > 0 && (
              <button
                key={name}
                type="button"
                onClick={() => applyPreset(items)}
                className="w-full rounded-lg px-3 py-2 text-left text-xs transition-colors hover:bg-[var(--color-surface-hover)]"
              >
                <span className="font-medium text-[var(--color-text)]">{name}</span>
                <span className="ml-2 text-[var(--color-text-muted)]">{items.map((i) => i.label).join(' · ')}</span>
              </button>
            ))}
          </div>
        )}

        {showCustomInput && (
          <div className="mb-3 space-y-2 rounded-lg border border-[var(--color-primary)]/30 bg-[var(--color-surface-elevated)] p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--color-text)]">添加自定义状态</span>
              <button
                type="button"
                onClick={() => setShowCustomInput(false)}
                className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              >
                ×
              </button>
            </div>
            <input
              autoFocus
              value={customLabelInput}
              onChange={(e) => setCustomLabelInput(e.target.value)}
              placeholder="状态名称，例如：童年形象、礼服造型"
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs text-[var(--color-text)] focus:border-[var(--color-primary)]/50 focus:outline-none"
            />
            <textarea
              value={customPromptInput}
              onChange={(e) => setCustomPromptInput(e.target.value)}
              placeholder="描述这个状态与基础形象的差异，例如：更年轻、衣着更朴素、神情更稚嫩"
              rows={3}
              className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-primary)]/50 focus:outline-none"
            />
            <button
              type="button"
              onClick={addCustomState}
              disabled={!customLabelInput.trim()}
              className="w-full rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs text-white transition-colors hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
            >
              添加状态
            </button>
          </div>
        )}

        {states.length === 0 ? (
          <div className="py-6 text-center text-xs text-[var(--color-text-muted)]">
            选择预设模板，或者点击“自定义”添加状态。
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-3">
              {states.map((state) => (
                <div key={state.id} className="flex w-20 flex-col items-center gap-1.5">
                  <div className="relative h-20 w-20 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-hover)]">
                    <button
                      type="button"
                      onClick={() => state.imageDataUrl && onOpenLightbox?.(state.imageDataUrl)}
                      className="h-full w-full"
                      title={state.imageDataUrl ? `放大查看 ${state.label}` : `${state.label} 暂无图片`}
                    >
                      {state.imageDataUrl ? (
                        <img src={state.imageDataUrl} alt={state.label} className="h-full w-full object-cover transition-transform hover:scale-105" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[var(--color-text-subtle)]">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21 15 16 10 5 21" />
                          </svg>
                        </div>
                      )}
                    </button>

                    {genningId === state.id && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      </div>
                    )}

                    {sheet.activeStateId === state.id && (
                      <div className="absolute left-1 top-1 rounded bg-[var(--color-primary)] px-1 py-0.5 text-[8px] font-medium text-white">
                        默认
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        const next = { ...sheet, states: (sheet.states ?? []).filter((s) => s.id !== state.id) };
                        if (expandedStateId === state.id) setExpandedStateId(null);
                        onUpdate(next);
                      }}
                      className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded text-[10px] text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-error)]/15 hover:text-[var(--color-error)]"
                      title="删除此状态"
                    >
                      ×
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setExpandedStateId(expandedStateId === state.id ? null : state.id)}
                    className={`w-full text-center text-[10px] leading-tight transition-colors ${
                      expandedStateId === state.id ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                    }`}
                    title="点击编辑状态描述"
                  >
                    <div className="font-medium">{state.label}</div>
                    {state.statePrompt ? (
                      <div className="mt-0.5 max-w-[80px] truncate text-[9px] text-[var(--color-text-subtle)]">
                        {state.statePrompt.slice(0, 20)}{state.statePrompt.length > 20 ? '…' : ''}
                      </div>
                    ) : (
                      <div className="mt-0.5 text-[9px] text-[var(--color-primary)]/60">+ 添加描述</div>
                    )}
                  </button>

                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => void handleGenState(state)}
                      disabled={!sheet.baseConfirmed || genningId !== null}
                      title={!sheet.baseConfirmed ? '请先确认基础形象' : `AI 生成「${state.label}」`}
                      className="rounded bg-[var(--color-primary)]/15 px-1.5 py-0.5 text-[10px] text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)]/25 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {genningId === state.id ? '…' : 'AI'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdate({ ...sheet, activeStateId: state.id })}
                      title="设为分镜默认状态"
                      className={`rounded px-1.5 py-0.5 text-[10px] transition-colors ${
                        sheet.activeStateId === state.id
                          ? 'bg-[var(--color-primary)] text-white'
                          : 'bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                      }`}
                    >
                      默认
                    </button>
                  </div>

                  <RunningStatus
                    active={genningId === state.id}
                    label={`正在生成状态：${state.label}`}
                    stallAfterSec={25}
                    scene="props-room"
                  />
                </div>
              ))}
            </div>

            {expandedStateId && (() => {
              const st = states.find((s) => s.id === expandedStateId);
              if (!st) return null;
              return (
                <div className="space-y-2 rounded-lg border border-[var(--color-primary)]/30 bg-[var(--color-surface-elevated)] p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[var(--color-text)]">编辑「{st.label}」</span>
                    <button
                      type="button"
                      onClick={() => setExpandedStateId(null)}
                      className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                    >
                      ×
                    </button>
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] text-[var(--color-text-muted)]">状态名称</label>
                    <input
                      value={st.label}
                      onChange={(e) => updateStateLabel(st.id, e.target.value)}
                      className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs text-[var(--color-text)] focus:border-[var(--color-primary)]/50 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] text-[var(--color-text-muted)]">
                      差异描述 <span className="text-[var(--color-primary)]">(AI 生成核心依据)</span>
                    </label>
                    <textarea
                      value={st.statePrompt ?? ''}
                      onChange={(e) => updateStatePrompt(st.id, e.target.value)}
                      placeholder="详细描述此状态与基础形象的差异，例如：身上有明显伤痕和血迹，衣物破损，表情虚弱痛苦"
                      rows={3}
                      className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-primary)]/50 focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleGenState(st)}
                    disabled={!sheet.baseConfirmed || genningId !== null}
                    className="w-full rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs text-white transition-colors hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
                  >
                    {genningId === st.id ? '生成中…' : `AI 生成「${st.label}」形象`}
                  </button>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {showAssetPicker && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowAssetPicker(false)}
        >
          <div
            className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--color-text)]">从素材库选择角色图</h3>
              <button
                type="button"
                onClick={() => setShowAssetPicker(false)}
                className="text-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              >
                ×
              </button>
            </div>

            {loadingAssets ? (
              <div className="py-10 text-center text-xs text-[var(--color-text-muted)]">
                <RunningStatus active={true} label="正在加载素材库" stallAfterSec={15} className="mx-auto" scene="props-room" />
              </div>
            ) : assetList.length === 0 ? (
              <div className="py-10 text-center text-xs text-[var(--color-text-muted)]">
                素材库中还没有图片，请先去素材中心导入。
              </div>
            ) : (
              <div className="grid flex-1 grid-cols-3 gap-3 overflow-y-auto sm:grid-cols-4">
                {assetList.map((asset) => {
                  const thumbUrl = asset.file_url ?? buildAssetFileUrl(asset.id);
                  const displayName = asset.filename?.replace(/\.[^.]+$/, '') ?? asset.id;
                  return (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => void handleSelectAsset(asset)}
                      className="flex flex-col items-center gap-1.5 rounded-xl border border-[var(--color-border)] p-2 transition-all hover:border-[var(--color-primary)]/60 hover:bg-[var(--color-surface-hover)]"
                    >
                      <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg bg-[var(--color-surface-hover)]">
                        <img src={thumbUrl} alt={displayName} className="h-full w-full object-cover" />
                      </div>
                      <span className="w-full truncate text-center text-[10px] text-[var(--color-text-muted)]">{displayName}</span>
                      {asset.ai_category ? (
                        <span className="text-[9px] text-[var(--color-primary)]/70">{asset.ai_category}</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
