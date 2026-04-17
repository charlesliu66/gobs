import { useState, useCallback, useEffect, useRef } from 'react';
import type { CharacterSheet, CharacterState, StatePresetItem } from '../../studio/productionTypes';
import { CHARACTER_STATE_PRESETS } from '../../studio/productionTypes';
import { ensureCharacterLookTree, getCharacterLookImage, setCharacterLookNodeImage } from '../../studio/productionAssets';
import { generateFrames, standardizeCharacterImage } from '../../api/storyboard';
import { saveCharacterToLibrary } from '../../api/characterLibrary';
import { listAssets, buildAssetFileUrl } from '../../api/assetLibraryApi';
import type { LibraryAsset } from '../../api/assetLibraryApi';
import { RunningStatus } from '../RunningStatus';

// 前端生成简单 id
function genId(): string {
  return `state_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

interface Props {
  sheet: CharacterSheet;
  styleRef: string;
  styleRefImage?: string;
  aspectRatio: string;
  onUpdate: (updated: CharacterSheet) => void;
}

export function CharacterWardrobePanel({ sheet, styleRef, styleRefImage, aspectRatio, onUpdate }: Props) {
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

  // 若基础形象未设置，自动从角色当前定稿形象带入
  useEffect(() => {
    if (!sheet.baseImageDataUrl) {
      const activeImage = getCharacterLookImage(sheet);
      if (activeImage) {
        onUpdate(buildSheetWithBaseImage(activeImage));
      }
    }
  // 仅在 sheet.id 变化时触发，避免循环
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet.id]);

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

  // 从素材库选择（使用新素材中台 API）
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
  }, [onUpdate, buildSheetWithBaseImage]);

  const states = sheet.states ?? [];

  // 生成基础形象
  const handleGenBase = useCallback(async () => {
    if (!styleRef.trim()) { setErr('请先填写视频风格摘要'); return; }
    setGenningBase(true);
    setErr(null);
    try {
      const prompt = `${styleRef}\n角色：${sheet.name}${sheet.isProtagonist ? '（主角）' : ''}。全身正面，中性表情，标准站姿，白色简洁背景，电影感，高清，无文字。`;
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
  }, [sheet, styleRef, styleRefImage, aspectRatio, onUpdate, buildSheetWithBaseImage]);

  /**
   * 上传参考图生成标准角色形象：
   * 用户选择本地图片 → 读取 base64 → 调用后端 /api/character/standardize-image
   * → 返回白底正面全身标准图，写入 baseImageDataUrl
   */
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
  }, [sheet, styleRef, onUpdate, buildSheetWithBaseImage]);

  // 生成某个状态（statePrompt 为核心差异描述，label 为辅助）
  const handleGenState = useCallback(async (state: CharacterState) => {
    if (!sheet.baseImageDataUrl) { setErr('请先生成并确认基础形象'); return; }
    setGenningId(state.id);
    setErr(null);
    try {
      const diffDesc = state.statePrompt?.trim() || state.label;
      const prompt = [
        styleRef,
        `角色：${sheet.name}${sheet.isProtagonist ? '（主角）' : ''}。`,
        '【一致性要求】必须保持与参考图完全一致的面部五官、发型发色、体型比例。',
        `【状态变化】${state.label}：${diffDesc}`,
        '全身正面，白色简洁背景，电影感，高清，无文字。',
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
        states: states.map((s) => s.id === state.id ? { ...s, imageDataUrl: res.firstFrame } : s),
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : '生成失败');
    } finally {
      setGenningId(null);
    }
  }, [sheet, states, styleRef, aspectRatio, onUpdate]);

  // 应用预设（带 statePrompt），展开第一个状态供查看/编辑
  const applyPreset = (preset: StatePresetItem[]) => {
    const newStates: CharacterState[] = preset.map((p) => ({
      id: genId(),
      label: p.label,
      statePrompt: p.statePrompt,
    }));
    onUpdate({ ...sheet, states: newStates });
    setShowPresetPicker(false);
    if (newStates.length > 0) setExpandedStateId(newStates[0]!.id);
  };

  // 更新单个状态的 statePrompt
  const updateStatePrompt = useCallback((stateId: string, prompt: string) => {
    onUpdate({
      ...sheet,
      states: states.map((s) => s.id === stateId ? { ...s, statePrompt: prompt } : s),
    });
  }, [sheet, states, onUpdate]);

  // 更新单个状态的 label
  const updateStateLabel = useCallback((stateId: string, label: string) => {
    onUpdate({
      ...sheet,
      states: states.map((s) => s.id === stateId ? { ...s, label } : s),
    });
  }, [sheet, states, onUpdate]);

  return (
    <div className="space-y-4">
      {err && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-xs text-red-300">{err}</div>
      )}

      {/* 基础形象区域 */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="text-xs font-semibold text-[var(--color-text)]">基础形象</h4>
            <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">所有状态生成的参考基准，必须先确认</p>
          </div>
          {/* 两个并排按钮：AI 生成 | 上传参考图 */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handleGenBase()}
              disabled={genningBase || standardizing}
              className="px-3 py-1.5 rounded-lg text-xs bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50 transition-colors"
            >
              {genningBase ? '生成中…' : sheet.baseImageDataUrl ? '重新生成' : 'AI 生成'}
            </button>
            {/* 上传参考图按钮（隐藏 file input） */}
            <button
              type="button"
              onClick={() => uploadRefInputRef.current?.click()}
              disabled={genningBase || standardizing}
              className="px-3 py-1.5 rounded-lg text-xs border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/50 hover:text-[var(--color-text)] disabled:opacity-50 transition-colors"
              title="上传参考图，AI 自动生成白底正面全身标准形象"
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
              className="px-3 py-1.5 rounded-lg text-xs border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/50 hover:text-[var(--color-text)] disabled:opacity-50 transition-colors"
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
            <img src={sheet.baseImageDataUrl} alt="基础形象" className="w-20 h-20 rounded-lg object-cover border border-[var(--color-border)]" />
            <div className="flex-1">
              {sheet.baseConfirmed ? (
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-xs text-[var(--color-success)]">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                    已确认，可生成其他状态
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleSaveToLibrary()}
                    disabled={savingToLib}
                    className="px-2.5 py-1 rounded-lg text-[10px] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/40 hover:text-[var(--color-text)] transition-colors disabled:opacity-50"
                  >
                    {savingToLib ? '保存中…' : savedToLib ? '✓ 已保存到形象库' : '保存到形象库'}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onUpdate({ ...sheet, baseConfirmed: true })}
                  className="px-3 py-1 rounded-lg text-xs border border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-colors"
                >
                  确认此形象
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="h-20 rounded-lg border-2 border-dashed border-[var(--color-border)] flex items-center justify-center text-xs text-[var(--color-text-muted)]">
            点击「AI 生成」创建基础形象
          </div>
        )}
      </div>

      {/* 状态衣橱 */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-semibold text-[var(--color-text)]">状态衣橱</h4>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowPresetPicker((v) => !v)}
              className="px-2.5 py-1 rounded-lg text-xs border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/40 transition-colors"
            >
              预设模板
            </button>
            <button
              type="button"
              onClick={() => { setShowCustomInput((v) => !v); setShowPresetPicker(false); }}
              className="px-2.5 py-1 rounded-lg text-xs bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
            >
              + 自定义
            </button>
          </div>
        </div>

        {/* 预设选择器 */}
        {showPresetPicker && (
          <div className="mb-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3 space-y-1.5">
            {Object.entries(CHARACTER_STATE_PRESETS).map(([name, items]) => items.length > 0 && (
              <button
                key={name}
                type="button"
                onClick={() => applyPreset(items)}
                className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-[var(--color-surface-hover)] transition-colors"
              >
                <span className="font-medium text-[var(--color-text)]">{name}</span>
                <span className="ml-2 text-[var(--color-text-muted)]">{items.map((i) => i.label).join(' · ')}</span>
              </button>
            ))}
          </div>
        )}

        {showCustomInput && (
          <div className="mb-3 rounded-lg border border-[var(--color-primary)]/30 bg-[var(--color-surface-elevated)] p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--color-text)]">添加自定义状态</span>
              <button type="button" onClick={() => setShowCustomInput(false)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-xs">✕</button>
            </div>
            <input
              autoFocus
              value={customLabelInput}
              onChange={(e) => setCustomLabelInput(e.target.value)}
              placeholder="状态名称，如：童年形象、穿红色旗袍"
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs text-[var(--color-text)] focus:border-[var(--color-primary)]/50 focus:outline-none"
            />
            <textarea
              value={customPromptInput}
              onChange={(e) => setCustomPromptInput(e.target.value)}
              placeholder="描述与基础形象的差异（AI 生成核心依据），如：同一角色的幼年版本，身材矮小，面容稚嫩，穿着简单的布衣"
              rows={3}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-primary)]/50 focus:outline-none resize-none"
            />
            <button
              type="button"
              onClick={() => {
                if (customLabelInput.trim()) {
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
                }
              }}
              disabled={!customLabelInput.trim()}
              className="w-full px-3 py-1.5 rounded-lg text-xs bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50 transition-colors"
            >
              添加状态{customPromptInput.trim() && sheet.baseConfirmed ? '并 AI 生成' : ''}
            </button>
          </div>
        )}

        {states.length === 0 ? (
          <div className="py-6 text-center text-xs text-[var(--color-text-muted)]">
            选择预设模板或点「+ 自定义」添加状态
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-3">
              {states.map((state) => (
                <div key={state.id} className="flex flex-col items-center gap-1.5 w-20">
                  {/* 状态图 */}
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface-hover)]">
                    {state.imageDataUrl ? (
                      <img src={state.imageDataUrl} alt={state.label} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[var(--color-text-subtle)]">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <rect x="3" y="3" width="18" height="18" rx="2"/>
                          <circle cx="8.5" cy="8.5" r="1.5"/>
                          <polyline points="21 15 16 10 5 21"/>
                        </svg>
                      </div>
                    )}
                    {genningId === state.id && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      </div>
                    )}
                    {sheet.activeStateId === state.id && (
                      <div className="absolute top-1 left-1 w-3 h-3 rounded-full bg-[var(--color-primary)]" />
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        const next = { ...sheet, states: (sheet.states ?? []).filter((s) => s.id !== state.id) };
                        if (expandedStateId === state.id) setExpandedStateId(null);
                        onUpdate(next);
                      }}
                      className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded text-[10px] text-[var(--color-text-muted)] hover:bg-[var(--color-error)]/15 hover:text-[var(--color-error)]"
                      title="删除此状态"
                    >
                      ✕
                    </button>
                  </div>
                  {/* 状态名 + prompt 摘要（点击展开编辑） */}
                  <button
                    type="button"
                    onClick={() => setExpandedStateId(expandedStateId === state.id ? null : state.id)}
                    className={`w-full text-[10px] text-center leading-tight transition-colors ${
                      expandedStateId === state.id ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                    }`}
                    title="点击编辑状态描述"
                  >
                    <div className="font-medium">{state.label}</div>
                    {state.statePrompt ? (
                      <div className="text-[9px] text-[var(--color-text-subtle)] truncate mt-0.5 max-w-[80px]">
                        {state.statePrompt.slice(0, 20)}{state.statePrompt.length > 20 ? '…' : ''}
                      </div>
                    ) : (
                      <div className="text-[9px] text-[var(--color-primary)]/60 mt-0.5">+ 添加描述</div>
                    )}
                  </button>
                  {/* 操作按钮 */}
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => void handleGenState(state)}
                      disabled={!sheet.baseConfirmed || genningId !== null}
                      title={!sheet.baseConfirmed ? '请先确认基础形象' : `AI 生成「${state.label}」`}
                      className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--color-primary)]/15 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/25 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {genningId === state.id ? '…' : 'AI'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdate({ ...sheet, activeStateId: state.id })}
                      title="设为分镜默认引用"
                      className={`px-1.5 py-0.5 rounded text-[10px] transition-colors ${
                        sheet.activeStateId === state.id
                          ? 'bg-[var(--color-primary)] text-white'
                          : 'bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                      }`}
                    >
                      ★
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

            {/* 展开的状态编辑面板 */}
            {expandedStateId && (() => {
              const st = states.find((s) => s.id === expandedStateId);
              if (!st) return null;
              return (
                <div className="rounded-lg border border-[var(--color-primary)]/30 bg-[var(--color-surface-elevated)] p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[var(--color-text)]">编辑「{st.label}」</span>
                    <button
                      type="button"
                      onClick={() => setExpandedStateId(null)}
                      className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-xs"
                    >✕</button>
                  </div>
                  <div>
                    <label className="block text-[10px] text-[var(--color-text-muted)] mb-1">状态名称</label>
                    <input
                      value={st.label}
                      onChange={(e) => updateStateLabel(st.id, e.target.value)}
                      className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs text-[var(--color-text)] focus:border-[var(--color-primary)]/50 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[var(--color-text-muted)] mb-1">
                      差异描述 <span className="text-[var(--color-primary)]">（AI 生成核心依据）</span>
                    </label>
                    <textarea
                      value={st.statePrompt ?? ''}
                      onChange={(e) => updateStatePrompt(st.id, e.target.value)}
                      placeholder="详细描述此状态与基础形象的差异，如：身上有明显伤痕和血迹，衣物破损，表情虚弱痛苦"
                      rows={3}
                      className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-primary)]/50 focus:outline-none resize-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleGenState(st)}
                    disabled={!sheet.baseConfirmed || genningId !== null}
                    className="w-full px-3 py-1.5 rounded-lg text-xs bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50 transition-colors"
                  >
                    {genningId === st.id ? '生成中…' : `AI 生成「${st.label}」形象`}
                  </button>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* 素材库选择弹窗 */}
      {showAssetPicker && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowAssetPicker(false)}>
          <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-2xl p-5 max-w-lg w-full max-h-[80vh] flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-[var(--color-text)]">📁 从素材库选择角色</h3>
              <button type="button" onClick={() => setShowAssetPicker(false)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-lg">✕</button>
            </div>
            {loadingAssets ? (
              <div className="py-10 text-center text-xs text-[var(--color-text-muted)]">
                <RunningStatus active={true} label="正在加载素材库" stallAfterSec={15} className="mx-auto" scene="props-room" />
              </div>
            ) : assetList.length === 0 ? (
              <div className="py-10 text-center text-xs text-[var(--color-text-muted)]">素材库中没有图片类型的素材，请先在「素材中台」导入</div>
            ) : (
              <div className="flex-1 overflow-y-auto grid grid-cols-3 sm:grid-cols-4 gap-3">
                {assetList.map((asset) => {
                  const thumbUrl = asset.file_url ?? buildAssetFileUrl(asset.id);
                  const displayName = asset.filename?.replace(/\.[^.]+$/, '') ?? asset.id;
                  return (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => void handleSelectAsset(asset)}
                      className="flex flex-col items-center gap-1.5 p-2 rounded-xl border border-[var(--color-border)] hover:border-[var(--color-primary)]/60 hover:bg-[var(--color-surface-hover)] transition-all"
                    >
                      <div className="w-full aspect-square rounded-lg overflow-hidden bg-[var(--color-surface-hover)] flex items-center justify-center">
                        <img src={thumbUrl} alt={displayName} className="w-full h-full object-cover" />
                      </div>
                      <span className="text-[10px] text-[var(--color-text-muted)] text-center truncate w-full">{displayName}</span>
                      {asset.ai_category && (
                        <span className="text-[9px] text-[var(--color-primary)]/70">{asset.ai_category}</span>
                      )}
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
