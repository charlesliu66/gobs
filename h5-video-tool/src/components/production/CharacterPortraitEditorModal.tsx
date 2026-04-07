import { useCallback, useEffect, useMemo, useState } from 'react';
import { buildCharacterImagePrompt, ensureCharacterLookTree } from '../../studio/productionAssets';
import type { AssetVariant, CharacterSheet, ProductionDesignLayer } from '../../studio/productionTypes';
import type { GenerateCharacterPortraitRequest } from '../../api/storyboard';
import { getPortraitJobKey, type PortraitEditIntent, type PortraitJobState } from './portraitJobKey';

export type { PortraitEditIntent } from './portraitJobKey';

const COMPASS_KEY_STORAGE = 'production_compass_api_key';

export interface CharacterPortraitEditorModalProps {
  onClose: () => void;
  characterSheet: CharacterSheet;
  editIntent: PortraitEditIntent;
  storyBio?: string;
  /** 优先作为「补充描述」默认内容（制作清单 wardrobe 服化道） */
  wardrobeSupplementDefault?: string;
  styleRef: string;
  productionDesign: ProductionDesignLayer | null;
  /** 立项画风参考图，生成预览时多模态锁定全片影调 */
  globalStyleReferenceFrame?: string;
  aspectRatio?: string;
  /** 父组件持有的任务状态（关闭弹窗后仍更新） */
  portraitJob: PortraitJobState | null | undefined;
  /** 发起生成：传入 jobKey 以便关闭弹窗后仍写入同一任务 */
  onStartPortraitGenerate: (jobKey: string, req: GenerateCharacterPortraitRequest) => void;
  onConfirm: (imageDataUrl: string) => void;
}

export function CharacterPortraitEditorModal({
  onClose,
  characterSheet,
  editIntent,
  storyBio,
  wardrobeSupplementDefault,
  styleRef,
  productionDesign,
  globalStyleReferenceFrame,
  aspectRatio = '9:16',
  portraitJob,
  onStartPortraitGenerate,
  onConfirm,
}: CharacterPortraitEditorModalProps) {
  const sheet = useMemo(() => ensureCharacterLookTree(characterSheet), [characterSheet]);
  const lookTree = sheet.lookTree ?? [];

  const [genMode, setGenMode] = useState<'text' | 'reference'>('text');
  const [extraPrompt, setExtraPrompt] = useState('');
  const [refDataUrl, setRefDataUrl] = useState<string | null>(null);
  const [compassKey, setCompassKey] = useState('');

  const busy = portraitJob?.status === 'generating';
  const preview = portraitJob?.status === 'done' ? portraitJob.previewDataUrl : null;
  const jobErr = portraitJob?.status === 'error' ? portraitJob.error : null;

  useEffect(() => {
    try {
      setCompassKey(localStorage.getItem(COMPASS_KEY_STORAGE) ?? '');
    } catch {
      /* ignore */
    }
    setGenMode('text');
    setExtraPrompt(
      wardrobeSupplementDefault?.trim() || storyBio?.trim() || '',
    );

    if (editIntent.mode === 'branch') {
      const parent = lookTree.find((n) => n.id === editIntent.parentNodeId);
      if (parent?.imageDataUrl) {
        setRefDataUrl(parent.imageDataUrl);
        setGenMode('reference');
      } else {
        setRefDataUrl(null);
      }
    } else {
      setRefDataUrl(null);
    }
  }, [characterSheet.id, editIntent, lookTree, storyBio, wardrobeSupplementDefault]);

  const persistKey = useCallback((k: string) => {
    setCompassKey(k);
    try {
      if (k.trim()) localStorage.setItem(COMPASS_KEY_STORAGE, k.trim());
      else localStorage.removeItem(COMPASS_KEY_STORAGE);
    } catch {
      /* ignore */
    }
  }, []);

  /** 用于 buildCharacterImagePrompt 的「基准槽」：重绘=该节点；分支=父节点气质 */
  const promptVariant: AssetVariant | undefined = useMemo(() => {
    if (editIntent.mode === 'replace') {
      const n = lookTree.find((x) => x.id === editIntent.nodeId);
      return n ? { id: n.id, label: n.label, imageDataUrl: n.imageDataUrl } : undefined;
    }
    const n = lookTree.find((x) => x.id === editIntent.parentNodeId);
    return n ? { id: n.id, label: n.label, imageDataUrl: n.imageDataUrl } : undefined;
  }, [editIntent, lookTree]);

  const subtitle =
    editIntent.mode === 'replace'
      ? `重绘节点：${lookTree.find((n) => n.id === editIntent.nodeId)?.label ?? '—'}`
      : `从「${lookTree.find((n) => n.id === editIntent.parentNodeId)?.label ?? '—'}」分支新形象`;

  const runGenerate = useCallback(() => {
    if (!promptVariant) {
      return;
    }
    if (genMode === 'reference' && !refDataUrl) {
      return;
    }
    const styleLock = !!globalStyleReferenceFrame?.trim() && genMode !== 'reference';
    let base = buildCharacterImagePrompt(characterSheet, promptVariant, styleRef, productionDesign, {
      enforceGlobalStyleLock: styleLock,
    });
    if (editIntent.mode === 'branch') {
      base += '\n\n这是同一角色的新版本分支，在保持人物识别度的前提下体现造型或状态变化。';
    }
    const prompt = extraPrompt.trim() ? `${base}\n\n用户补充：${extraPrompt.trim()}` : base;
    const g = globalStyleReferenceFrame?.trim();
    const req: GenerateCharacterPortraitRequest = {
      prompt,
      aspectRatio,
      referenceImage: genMode === 'reference' ? refDataUrl ?? undefined : undefined,
      ...(g && genMode !== 'reference' ? { globalStyleReferenceFrame: g } : {}),
      compassApiKey: compassKey.trim() || undefined,
    };
    onStartPortraitGenerate(getPortraitJobKey(characterSheet.id, editIntent), req);
  }, [
    promptVariant,
    characterSheet,
    styleRef,
    productionDesign,
    extraPrompt,
    aspectRatio,
    genMode,
    refDataUrl,
    compassKey,
    editIntent,
    globalStyleReferenceFrame,
    characterSheet.id,
    onStartPortraitGenerate,
  ]);

  const handleRefFile = (file: File | null) => {
    if (!file || !file.type.startsWith('image/')) {
      setRefDataUrl(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setRefDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleConfirm = () => {
    if (!preview) return;
    onConfirm(preview);
    onClose();
  };

  const localErr =
    !promptVariant
      ? '无法解析形象节点'
      : genMode === 'reference' && !refDataUrl
        ? '参考图模式请先上传一张参考图。'
        : null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="portrait-editor-title"
    >
      <div className="flex max-h-[min(92vh,900px)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] px-4 py-3">
          <div>
            <h2 id="portrait-editor-title" className="text-base font-semibold text-[var(--color-text)]">
              编辑角色形象 · {characterSheet.name}
            </h2>
            <p className="mt-0.5 text-[11px] text-[var(--color-primary)]">{subtitle}</p>
            {storyBio ? (
              <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-[var(--color-text-muted)]">
                {storyBio}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
          >
            关闭
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-3">
              <p className="text-[10px] text-[var(--color-text-muted)]">
                关闭本窗口后生成仍会继续，进度与待确认预览显示在形象树小图上；确认后才会写入形象树。刷新页面将丢弃未确认的预览。
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setGenMode('text')}
                  className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium ${
                    genMode === 'text'
                      ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]'
                      : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] ring-1 ring-[var(--color-border)]'
                  }`}
                >
                  纯文本描述生图
                </button>
                <button
                  type="button"
                  onClick={() => setGenMode('reference')}
                  className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium ${
                    genMode === 'reference'
                      ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]'
                      : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] ring-1 ring-[var(--color-border)]'
                  }`}
                >
                  参考图生图
                </button>
              </div>

              {genMode === 'reference' && (
                <div>
                  <p className="text-[10px] text-[var(--color-text-muted)]">
                    上传参考图（脸型/服装/气质）。分支模式下已自动带入父节点图，可更换。
                  </p>
                  <label className="mt-1 block cursor-pointer rounded-lg border border-dashed border-[var(--color-border)] px-3 py-4 text-center text-xs text-[var(--color-primary)] hover:bg-[var(--color-surface-hover)]">
                    {refDataUrl ? '已选择参考图，点击更换' : '点击上传参考图'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleRefFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                  {refDataUrl && (
                    <img src={refDataUrl} alt="" className="mt-2 max-h-32 rounded-lg object-contain" />
                  )}
                </div>
              )}

              <label className="block text-xs font-medium text-[var(--color-text-muted)]">
                补充描述（可选）
                <textarea
                  value={extraPrompt}
                  onChange={(e) => setExtraPrompt(e.target.value)}
                  rows={4}
                  placeholder="默认带入剧本中的角色简介，可改；例如加：白色礼服、侧光、强调全身…"
                  className="mt-1 w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]"
                />
              </label>
              <p className="text-[9px] text-[var(--color-text-muted)]">
                制作清单已并入主 prompt。纯文本生图时可用立项画风参考做多模态锁定；本页选择「参考图生图」时以你上传的参考为优先，立项画风仅以文字摘要参与，避免与脸型/肤色约束冲突。
              </p>

              <label className="block text-xs font-medium text-[var(--color-text-muted)]">
                Compass API Key（可选）
                <input
                  type="password"
                  autoComplete="off"
                  value={compassKey}
                  onChange={(e) => persistKey(e.target.value)}
                  placeholder="不填则使用服务端配置的 Key"
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-2 font-mono text-xs text-[var(--color-text)]"
                />
              </label>
              <p className="text-[9px] leading-snug text-[var(--color-text-muted)]">
                仅保存在本机浏览器。填写后仅用于本次生图请求覆盖服务端 Key。
              </p>

              {(jobErr || localErr) && <p className="text-xs text-red-400">{jobErr ?? localErr}</p>}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy || !!localErr}
                  onClick={() => runGenerate()}
                  className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {busy ? '生成中…' : preview ? '重新生成' : '生成预览'}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-medium text-[var(--color-text-muted)]">预览（确认前不会写入形象树）</div>
              <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-black ring-1 ring-[var(--color-border)]">
                {preview ? (
                  <img src={preview} alt="预览" className="h-full w-full object-cover" />
                ) : promptVariant?.imageDataUrl ? (
                  <>
                    <img src={promptVariant.imageDataUrl} alt="" className="h-full w-full object-cover opacity-40" />
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-white/80">
                      {busy ? '生成中，可关闭窗口…' : '点击左侧生成预览'}
                    </div>
                  </>
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-[var(--color-text-muted)]">
                    {busy ? '生成中…' : '暂无预览'}
                  </div>
                )}
                {busy && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/55">
                    <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    <span className="text-[10px] text-white/90">生成中</span>
                  </div>
                )}
              </div>
              {preview && (
                <p className="text-[10px] text-[var(--color-text-muted)]">
                  {editIntent.mode === 'branch'
                    ? '确认后将新增子节点并设为定稿；可继续在形象树中迭代。'
                    : '确认后覆盖当前节点图并设为定稿参考。'}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--color-border)] px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]"
          >
            取消
          </button>
          <button
            type="button"
            disabled={!preview}
            onClick={handleConfirm}
            className="rounded-lg bg-[var(--color-primary)] px-5 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            {editIntent.mode === 'branch' ? '确认并加入形象树' : '确认应用此形象'}
          </button>
        </div>
      </div>
    </div>
  );
}
