import { useCallback } from 'react';
import { useLocale } from '../../i18n/LocaleContext.tsx';
import { formatMessage } from '../../i18n/locale.ts';

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
  const { uiLocale, t } = useLocale();
  const formatDur = useCallback((sec: number) => {
    const minutes = Math.floor(sec / 60);
    const seconds = Math.round(sec % 60);
    if (uiLocale === 'en') {
      return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
    }
    return minutes > 0 ? `${minutes}\u5206${seconds}\u79d2` : `${seconds}\u79d2`;
  }, [uiLocale]);

  const hintPreview = bgmPromptHint
    ? `${bgmPromptHint.slice(0, 40)}${bgmPromptHint.length > 40 ? '...' : ''}`
    : '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) onDismiss();
      }}
    >
      <div className="w-[420px] max-w-[90vw] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6 shadow-2xl">
        <div className="mb-4 flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-lg">
            OK
          </span>
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-text)]">
              {formatMessage(t('importGuideModal.importedSummary'), {
                shotCount,
                duration: formatDur(totalDurationSec),
              })}
            </h3>
            {sourceTitle && (
              <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
                {formatMessage(t('importGuideModal.source'), { title: sourceTitle })}
              </p>
            )}
          </div>
        </div>

        <div className="mb-4 h-px bg-[var(--color-border)]" />

        <p className="mb-3 text-xs font-medium text-[var(--color-text-muted)]">
          {t('importGuideModal.recommendedNextStep')}
        </p>

        <div className="space-y-2.5">
          <button
            type="button"
            onClick={() => {
              onGenerateBgm();
              onDismiss();
            }}
            className="group flex w-full items-start gap-3 rounded-xl border border-[var(--color-border)] p-3 text-left transition hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-primary)]/5"
          >
            <span className="mt-0.5 text-base">BGM</span>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-medium text-[var(--color-text)] group-hover:text-[var(--color-primary)]">
                {t('importGuideModal.generateMusic')}
              </span>
              {bgmPromptHint ? (
                <p className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">
                  {formatMessage(t('importGuideModal.prefilledStyle'), { hint: hintPreview })}
                </p>
              ) : (
                <p className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">
                  {t('importGuideModal.useAiMusic')}
                </p>
              )}
            </div>
            <span className="mt-1 text-[10px] text-[var(--color-primary)] opacity-0 group-hover:opacity-100">
              {t('importGuideModal.start')}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              onPreview();
              onDismiss();
            }}
            className="group flex w-full items-start gap-3 rounded-xl border border-[var(--color-border)] p-3 text-left transition hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-primary)]/5"
          >
            <span className="mt-0.5 text-base">Play</span>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-medium text-[var(--color-text)] group-hover:text-[var(--color-primary)]">
                {t('importGuideModal.previewFirst')}
              </span>
              <p className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">
                {t('importGuideModal.previewHint')}
              </p>
            </div>
            <span className="mt-1 text-[10px] text-[var(--color-primary)] opacity-0 group-hover:opacity-100">
              {t('importGuideModal.play')}
            </span>
          </button>
        </div>

        <div className="mt-4 h-px bg-[var(--color-border)]" />

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-lg px-4 py-1.5 text-xs text-[var(--color-text-muted)] transition hover:text-[var(--color-text)]"
          >
            {t('importGuideModal.skipAndEditDirectly')}
          </button>
        </div>
      </div>
    </div>
  );
}
