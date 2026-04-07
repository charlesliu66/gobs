import { useState } from 'react';

export interface ScenePropImageModalProps {
  kind: 'scene' | 'prop';
  name: string;
  basePrompt: string;
  currentImageDataUrl?: string;
  aspectRatio?: string;
  busy: boolean;
  previewDataUrl?: string | null;
  error?: string | null;
  onClose: () => void;
  onGenerate: (extraPrompt: string) => void;
  onConfirm: () => void;
  onReset: () => void;
}

export function ScenePropImageModal({
  kind,
  name,
  basePrompt,
  currentImageDataUrl,
  aspectRatio,
  busy,
  previewDataUrl,
  error,
  onClose,
  onGenerate,
  onConfirm,
  onReset,
}: ScenePropImageModalProps) {
  const [extraPrompt, setExtraPrompt] = useState('');

  const kindLabel = kind === 'scene' ? '场景' : '道具';
  const imgAspectClass = kind === 'scene' ? 'aspect-video' : 'aspect-square';

  const handleGenerate = () => {
    onGenerate(extraPrompt);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="scene-prop-modal-title"
    >
      <div className="flex max-h-[min(92vh,860px)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-4 py-3">
          <div>
            <h2
              id="scene-prop-modal-title"
              className="text-base font-semibold text-[var(--color-text)]"
            >
              {kindLabel}生图 · {name}
            </h2>
            <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
              {aspectRatio ? `比例 ${aspectRatio}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
          >
            关闭
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Left: image preview */}
            <div className="space-y-2">
              <div className={`relative ${imgAspectClass} w-full overflow-hidden rounded-xl bg-black ring-1 ring-[var(--color-border)]`}>
                {/* Current image (background when preview is shown) */}
                {currentImageDataUrl && !previewDataUrl && !busy && (
                  <img
                    src={currentImageDataUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                )}
                {currentImageDataUrl && (previewDataUrl || busy) && (
                  <img
                    src={currentImageDataUrl}
                    alt=""
                    className="h-full w-full object-cover opacity-30"
                  />
                )}
                {/* Preview overlay */}
                {previewDataUrl && !busy && (
                  <img
                    src={previewDataUrl}
                    alt="预览"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                )}
                {/* No image placeholder */}
                {!currentImageDataUrl && !previewDataUrl && !busy && (
                  <div className="flex h-full items-center justify-center text-xs text-[var(--color-text-muted)]">
                    暂无{kindLabel}图
                  </div>
                )}
                {/* Spinner */}
                {busy && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/55">
                    <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    <span className="text-[10px] text-white/90">生成中…</span>
                  </div>
                )}
              </div>
              {previewDataUrl && !busy && (
                <p className="text-[10px] text-[var(--color-text-muted)]">
                  已生成预览，确认后将写入{kindLabel}卡。
                </p>
              )}
            </div>

            {/* Right: controls */}
            <div className="space-y-3">
              {/* Base prompt (collapsible, read-only) */}
              <details className="rounded-lg border border-[var(--color-border)]/70 bg-[var(--color-surface)]/60 px-3 py-2">
                <summary className="cursor-pointer list-none text-xs font-medium text-[var(--color-text-muted)] [&::-webkit-details-marker]:hidden">
                  基础 Prompt（只读）
                </summary>
                <p className="mt-2 whitespace-pre-wrap text-[10px] leading-relaxed text-[var(--color-text-muted)]">
                  {basePrompt}
                </p>
              </details>

              {/* Extra prompt */}
              <label className="block text-xs font-medium text-[var(--color-text-muted)]">
                补充描述（可选）
                <textarea
                  value={extraPrompt}
                  onChange={(e) => setExtraPrompt(e.target.value)}
                  rows={4}
                  placeholder="额外描述、风格、参考…"
                  disabled={busy}
                  className="mt-1 w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] disabled:opacity-50"
                />
              </label>

              {/* Error */}
              {error && <p className="text-xs text-red-400">{error}</p>}

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleGenerate}
                  className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {busy ? '生成中…' : previewDataUrl ? '重新生成' : '生成'}
                </button>
                {previewDataUrl && !busy && (
                  <button
                    type="button"
                    onClick={onConfirm}
                    className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                  >
                    确认使用
                  </button>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={onReset}
                  className="rounded-lg bg-red-600/80 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  重置
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg px-4 py-2 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
