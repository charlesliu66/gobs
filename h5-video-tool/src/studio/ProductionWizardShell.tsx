import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { useLocale } from '../i18n/LocaleContext.tsx';

export interface ProductionWizardStepItem {
  id: number;
  label: string;
}

export function ProductionWizardShell({
  projectTitle,
  onProjectTitleChange,
  titleSaved,
  onOpenProjectList,
  onResetDraft,
  steps,
  step,
  maxReachableStep,
  onStepChange,
  err,
  footerHint,
  onPrev,
  onNext,
  children,
}: {
  projectTitle: string;
  onProjectTitleChange: (nextTitle: string) => void;
  titleSaved: boolean;
  onOpenProjectList: () => void | Promise<void>;
  onResetDraft: () => void;
  steps: readonly ProductionWizardStepItem[];
  step: number;
  maxReachableStep?: number;
  onStepChange: (idx: number) => void;
  err: string | null;
  footerHint: string;
  onPrev: () => void;
  onNext: () => void;
  children: ReactNode;
}) {
  const { t } = useLocale();
  const maxStep = maxReachableStep ?? steps.length - 1;

  return (
    <div className="flex h-full min-h-0 flex-col bg-[radial-gradient(circle_at_top,rgba(124,141,255,0.1),transparent_35%)]">
      <div className="gobs-glass shrink-0 border-b border-[var(--color-border)]/80 px-6 py-4">
        <div className="mx-auto flex max-w-6xl flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <input
                value={projectTitle}
                onChange={(e) => onProjectTitleChange(e.target.value)}
                placeholder={t('productionWizard.projectTitlePlaceholder')}
                className="w-full max-w-xl border-0 bg-transparent text-lg font-semibold text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)]"
              />
              {titleSaved && (
                <span className="text-[10px] text-[var(--color-success)]">✓ {t('productionWizard.savedBadge')}</span>
              )}
              <div className="mt-1 flex items-center gap-2">
                <p className="text-xs text-[var(--color-text-muted)]">{t('productionWizard.subtitle')}</p>
                <span className="rounded bg-[var(--color-primary)]/20 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-primary)]">
                  BETA
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void onOpenProjectList()}
                className="rounded-lg border border-[var(--color-border)] px-2.5 py-1.5 text-xs text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-primary)]/40 hover:text-[var(--color-text)]"
              >
                📨 {t('productionWizard.projects')}
              </button>
              <Link to="/studio" className="text-sm text-[var(--color-primary)] hover:underline">
                {t('productionWizard.studioLink')}
              </Link>
              <button
                type="button"
                onClick={onResetDraft}
                className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              >
                {t('productionWizard.clearDraft')}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-0">
            {steps.map((s, i) => {
              const locked = i > maxStep;
              return (
                <div key={s.id} className="flex items-center">
                  {i > 0 && (
                    <div
                      className={`h-0.5 w-8 transition-colors sm:w-12 ${
                        step >= i ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'
                      }`}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => !locked && onStepChange(i)}
                    disabled={locked}
                    className={`group flex flex-col items-center gap-1 ${locked ? 'cursor-not-allowed opacity-40' : ''}`}
                    title={locked ? t('productionWizard.lockedStepHint') : s.label}
                  >
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                        step === i
                          ? 'bg-[var(--color-primary)] text-white ring-2 ring-[var(--color-primary)]/30 ring-offset-1 ring-offset-[var(--color-surface-elevated)]'
                          : step > i
                            ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]'
                            : locked
                              ? 'bg-[var(--color-surface-hover)] text-[var(--color-text-subtle)]'
                              : 'bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] group-hover:bg-[var(--color-border)]'
                      }`}
                    >
                      {step > i ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : locked ? (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <rect x="3" y="11" width="18" height="11" rx="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                      ) : (
                        i + 1
                      )}
                    </div>
                    <span
                      className={`whitespace-nowrap text-[11px] font-medium transition-colors ${
                        step === i
                          ? 'text-[var(--color-primary)]'
                          : step > i
                            ? 'text-[var(--color-text-muted)]'
                            : 'text-[var(--color-text-subtle)]'
                      }`}
                    >
                      {s.label}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto w-full max-w-6xl">
          {err && (
            <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {err}
            </div>
          )}
          {children}
        </div>
      </div>

      <footer className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-6 py-3">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-[var(--color-text-muted)]">{footerHint}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onPrev}
              disabled={step === 0}
              className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm disabled:opacity-40"
            >
              {t('productionWizard.back')}
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={step >= steps.length - 1}
              className="rounded-lg bg-[var(--color-text)] px-4 py-2 text-sm text-[var(--color-surface)] disabled:opacity-40"
            >
              {t('productionWizard.next')}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
