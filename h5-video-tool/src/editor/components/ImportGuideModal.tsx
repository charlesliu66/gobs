import { useCallback } from 'react';
import { useLocale } from '../../i18n/LocaleContext.tsx';
import { pickUiText } from '../../i18n/uiText.ts';

interface ImportGuideModalProps {
  shotCount: number;
  totalDurationSec: number;
  sourceTitle?: string;
  bgmPromptHint?: string;
  onGenerateBgm: () => void;
  onPreview: () => void;
  onDismiss: () => void;
}

export function ImportGuideModal({
  shotCount,
  totalDurationSec,
  sourceTitle,
  bgmPromptHint,
  onGenerateBgm,
  onPreview,
  onDismiss,
}: ImportGuideModalProps) {
  const { uiLocale } = useLocale();
  const uiText = <T,>(zh: T, en: T) => pickUiText(uiLocale, zh, en);
  const formatDur = useCallback((sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    return m > 0
      ? uiText(`${m}分${s}秒`, `${m}m ${s}s`)
      : uiText(`${s}秒`, `${s}s`);
  }, [uiLocale]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onDismiss(); }}
    >
      <div className="w-[420px] max-w-[90vw] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-4 flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-lg">
            ✅
          </span>
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-text)]">
              {uiText(
                `已导入 ${shotCount} 个分镜（共 ${formatDur(totalDurationSec)}）`,
                `Imported ${shotCount} storyboard shots (${formatDur(totalDurationSec)} total)`,
              )}
            </h3>
            {sourceTitle && (
              <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
                {uiText(`来自制片项目「${sourceTitle}」`, `From production project “${sourceTitle}”`)}
              </p>
            )}
          </div>
        </div>

        <div className="mb-4 h-px bg-[var(--color-border)]" />

        <p className="mb-3 text-xs font-medium text-[var(--color-text-muted)]">{uiText('推荐下一步：', 'Recommended next step:')}</p>

        <div className="space-y-2.5">
          {/* 一键配乐 */}
          <button
            type="button"
            onClick={() => { onGenerateBgm(); onDismiss(); }}
            className="group flex w-full items-start gap-3 rounded-xl border border-[var(--color-border)] p-3 text-left transition hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-primary)]/5"
          >
            <span className="mt-0.5 text-base">🎵</span>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-medium text-[var(--color-text)] group-hover:text-[var(--color-primary)]">
                {uiText('一键生成配乐', 'Generate music')}
              </span>
              {bgmPromptHint ? (
                <p className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">
                  {uiText(
                    `已预填风格：「${bgmPromptHint.slice(0, 40)}${bgmPromptHint.length > 40 ? '…' : ''}」`,
                    `Prefilled style: “${bgmPromptHint.slice(0, 40)}${bgmPromptHint.length > 40 ? '…' : ''}”`,
                  )}
                </p>
              ) : (
                <p className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">
                  {uiText('用 AI 生成匹配画面内容的背景音乐', 'Use AI to create background music that matches the visuals')}
                </p>
              )}
            </div>
            <span className="mt-1 text-[10px] text-[var(--color-primary)] opacity-0 group-hover:opacity-100">
              {uiText('开始 →', 'Start →')}
            </span>
          </button>

          {/* 先预览 */}
          <button
            type="button"
            onClick={() => { onPreview(); onDismiss(); }}
            className="group flex w-full items-start gap-3 rounded-xl border border-[var(--color-border)] p-3 text-left transition hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-primary)]/5"
          >
            <span className="mt-0.5 text-base">▶</span>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-medium text-[var(--color-text)] group-hover:text-[var(--color-primary)]">
                {uiText('先预览一遍', 'Preview first')}
              </span>
              <p className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">
                {uiText('看看整体节奏再决定下一步操作', 'Check the pacing first, then decide what to do next')}
              </p>
            </div>
            <span className="mt-1 text-[10px] text-[var(--color-primary)] opacity-0 group-hover:opacity-100">
              {uiText('播放 →', 'Play →')}
            </span>
          </button>
        </div>

        <div className="mt-4 h-px bg-[var(--color-border)]" />

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-lg px-4 py-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition"
          >
            {uiText('跳过，直接编辑', 'Skip and edit directly')}
          </button>
        </div>
      </div>
    </div>
  );
}
