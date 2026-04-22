import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { useLocale } from '../i18n/LocaleContext.tsx';
import { pickUiText } from '../i18n/uiText.ts';

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
  /** 用户可跳转到的最大步骤（含），超出的步骤灰显不可点击 */
  maxReachableStep?: number;
  onStepChange: (idx: number) => void;
  err: string | null;
  footerHint: string;
  onPrev: () => void;
  onNext: () => void;
  children: ReactNode;
}) {
  const { uiLocale } = useLocale();
  const uiText = <T,>(zh: T, en: T) => pickUiText(uiLocale, zh, en);
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
                placeholder={uiText('项目名称', 'Project title')}
                className="w-full max-w-xl border-0 bg-transparent text-lg font-semibold text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)]"
              />
              {titleSaved && <span className="text-[10px] text-[var(--color-success)]">{uiText('✓ 已保存', '✓ Saved')}</span>}
              <div className="mt-1 flex items-center gap-2">
                <p className="text-xs text-[var(--color-text-muted)]">
                  {uiText(
                    '高级制片 · 故事构思 → 角色场景 → 分镜表 → 生成导出',
                    'Advanced Production · Story Outline → Character & Scene Design → Storyboard → Export',
                  )}
                </p>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[var(--color-primary)]/20 text-[var(--color-primary)]">BETA</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void onOpenProjectList()}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-primary)]/40 transition-colors"
              >
                {uiText('📂 项目列表', '📂 Projects')}
              </button>
              <Link to="/studio" className="text-sm text-[var(--color-primary)] hover:underline">
                ← Studio
              </Link>
              <button
                type="button"
                onClick={onResetDraft}
                className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              >
                {uiText('清空草稿', 'Clear draft')}
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
                      className={`h-0.5 w-8 sm:w-12 transition-colors ${
                        step >= i ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'
                      }`}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => !locked && onStepChange(i)}
                    disabled={locked}
                    className={`flex flex-col items-center gap-1 group ${locked ? 'cursor-not-allowed opacity-40' : ''}`}
                    title={locked ? uiText('请先完成前面的步骤', 'Complete the earlier steps first') : s.label}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
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
                      className={`text-[11px] font-medium whitespace-nowrap transition-colors ${
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
              {uiText('上一步', 'Back')}
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={step >= steps.length - 1}
              className="rounded-lg bg-[var(--color-text)] px-4 py-2 text-sm text-[var(--color-surface)] disabled:opacity-40"
            >
              {uiText('下一步', 'Next')}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

