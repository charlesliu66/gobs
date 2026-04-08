import { useState, useCallback, useEffect, useRef } from 'react';
import type { CharacterSheet, CharacterState } from '../../studio/productionTypes';
import { CHARACTER_STATE_PRESETS } from '../../studio/productionTypes';
import { getCharacterLookImage } from '../../studio/productionAssets';
import { generateFrames, standardizeCharacterImage } from '../../api/storyboard';
import { saveCharacterToLibrary } from '../../api/characterLibrary';

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
  const [savingToLib, setSavingToLib] = useState(false);
  const [savedToLib, setSavedToLib] = useState(false);
  const uploadRefInputRef = useRef<HTMLInputElement>(null);

  // 若基础形象未设置，自动从角色当前定稿形象带入
  useEffect(() => {
    if (!sheet.baseImageDataUrl) {
      const activeImage = getCharacterLookImage(sheet);
      if (activeImage) {
        onUpdate({ ...sheet, baseImageDataUrl: activeImage, baseConfirmed: true });
      }
    }
  // 仅在 sheet.id 变化时触发，避免循环
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet.id]);

  const handleSaveToLibrary = useCallback(async () => {
    setSavingToLib(true);
    try {
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
      });
      setSavedToLib(true);
      setTimeout(() => setSavedToLib(false), 3000);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '保存失败');
    } finally {
      setSavingToLib(false);
    }
  }, [sheet]);

  const states = sheet.states ?? [];

  // 生成基础形象
  const handleGenBase = useCallback(async () => {
    if (!styleRef.trim()) { setErr('请先填写视频风格摘要'); return; }
    setGenningBase(true);
    setErr(null);
    try {
      const prompt = `${styleRef}\n角色：${sheet.name}${sheet.isProtagonist ? '（主角）' : ''}。全身正面，中性表情，标准站姿，白色简洁背景，电影感，高清，无文字。`;
      const res = await generateFrames({ prompt, aspectRatio, shotIndex: 0, ...(styleRefImage ? { globalStyleReferenceFrame: styleRefImage } : {}) });
      onUpdate({ ...sheet, baseImageDataUrl: res.firstFrame, baseConfirmed: true });
    } catch (e) {
      setErr(e instanceof Error ? e.message : '生成失败');
    } finally {
      setGenningBase(false);
    }
  }, [sheet, styleRef, styleRefImage, aspectRatio, onUpdate]);

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
          onUpdate({ ...sheet, baseImageDataUrl: result.imageDataUrl, baseConfirmed: true });
        } catch (e) {
          setErr(e instanceof Error ? e.message : '参考图处理失败');
        } finally {
          setStandardizing(false);
        }
      })();
    };
    reader.readAsDataURL(file);
  }, [sheet, styleRef, onUpdate]);

  // 生成某个状态
  const handleGenState = useCallback(async (state: CharacterState) => {
    if (!sheet.baseImageDataUrl) { setErr('请先生成并确认基础形象'); return; }
    setGenningId(state.id);
    setErr(null);
    try {
      const prompt = `${styleRef}\n角色：${sheet.name}，保持与基础形象完全一致的面部特征和体型。状态：${state.label}。${state.statePrompt ?? ''}`;
      const res = await generateFrames({
        prompt,
        aspectRatio,
        shotIndex: 0,
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

  // 添加状态
  const addState = (label: string) => {
    const newState: CharacterState = { id: genId(), label };
    onUpdate({ ...sheet, states: [...states, newState] });
  };

  // 应用预设
  const applyPreset = (preset: string[]) => {
    const newStates: CharacterState[] = preset.map((label) => ({ id: genId(), label }));
    onUpdate({ ...sheet, states: newStates });
    setShowPresetPicker(false);
  };

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
            {Object.entries(CHARACTER_STATE_PRESETS).map(([name, labels]) => labels.length > 0 && (
              <button
                key={name}
                type="button"
                onClick={() => applyPreset(labels)}
                className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-[var(--color-surface-hover)] transition-colors"
              >
                <span className="font-medium text-[var(--color-text)]">{name}</span>
                <span className="ml-2 text-[var(--color-text-muted)]">{labels.join(' · ')}</span>
              </button>
            ))}
          </div>
        )}

        {showCustomInput && (
          <div className="mb-3 flex gap-2">
            <input
              autoFocus
              value={customLabelInput}
              onChange={(e) => setCustomLabelInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && customLabelInput.trim()) {
                  addState(customLabelInput.trim());
                  setCustomLabelInput('');
                  setShowCustomInput(false);
                }
                if (e.key === 'Escape') setShowCustomInput(false);
              }}
              placeholder="状态名称，如：战斗装束"
              className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs text-[var(--color-text)] focus:border-[var(--color-primary)]/50 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => {
                if (customLabelInput.trim()) {
                  addState(customLabelInput.trim());
                  setCustomLabelInput('');
                  setShowCustomInput(false);
                }
              }}
              className="px-3 py-1.5 rounded-lg text-xs bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] transition-colors"
            >
              添加
            </button>
          </div>
        )}

        {states.length === 0 ? (
          <div className="py-6 text-center text-xs text-[var(--color-text-muted)]">
            选择预设模板或点「+ 自定义」添加状态
          </div>
        ) : (
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
                  {/* 生成中遮罩 */}
                  {genningId === state.id && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    </div>
                  )}
                  {/* 已选激活标记 */}
                  {sheet.activeStateId === state.id && (
                    <div className="absolute top-1 left-1 w-3 h-3 rounded-full bg-[var(--color-primary)]" />
                  )}
                  {/* 删除按钮 */}
                  <button
                    type="button"
                    onClick={() => {
                      const next = { ...sheet, states: (sheet.states ?? []).filter((s) => s.id !== state.id) };
                      onUpdate(next);
                    }}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded text-[10px] text-[var(--color-text-muted)] hover:bg-[var(--color-error)]/15 hover:text-[var(--color-error)]"
                    title="删除此状态"
                  >
                    ✕
                  </button>
                </div>
                {/* 状态名 */}
                <span className="text-[10px] text-[var(--color-text-muted)] text-center leading-tight">{state.label}</span>
                {/* 操作按钮 */}
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => void handleGenState(state)}
                    disabled={!sheet.baseConfirmed || genningId !== null}
                    title={!sheet.baseConfirmed ? '请先确认基础形象' : 'AI 生成'}
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
