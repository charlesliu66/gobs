import React from 'react';

void React;

export interface PlatformCopyDraft {
  caption: string;
  hashtags: string;
}

interface PlatformCopyCardsLabels {
  defaultDraft: string;
  activeDraft: string;
  accountCount: string;
  noAccounts: string;
  caption: string;
  captionPlaceholder: string;
  hashtags: string;
  hashtagsPlaceholder: string;
  inheritedFallback: string;
}

interface PlatformCopyCardsProps {
  draftKeys: string[];
  defaultDraftKey: string;
  drafts: Record<string, PlatformCopyDraft>;
  activeDraftKey: string;
  accountCounts: Record<string, number>;
  onSetActiveDraft: (draftKey: string) => void;
  onUpdateDraft: (draftKey: string, next: Partial<PlatformCopyDraft>) => void;
  labels: PlatformCopyCardsLabels;
}

const EMPTY_DRAFT: PlatformCopyDraft = { caption: '', hashtags: '' };

function displayPlatformName(draftKey: string, defaultDraftKey: string, defaultLabel: string): string {
  if (draftKey === defaultDraftKey) return defaultLabel;
  return draftKey.toUpperCase();
}

export function PlatformCopyCards({
  draftKeys,
  defaultDraftKey,
  drafts,
  activeDraftKey,
  accountCounts,
  onSetActiveDraft,
  onUpdateDraft,
  labels,
}: PlatformCopyCardsProps) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {draftKeys.map((draftKey) => {
        const isActive = draftKey === activeDraftKey;
        const draft = drafts[draftKey] ?? drafts[defaultDraftKey] ?? EMPTY_DRAFT;
        const usesFallback = !drafts[draftKey] && draftKey !== defaultDraftKey && Boolean(drafts[defaultDraftKey]);
        const accountCount = accountCounts[draftKey] ?? 0;
        return (
          <article
            key={draftKey}
            className={`space-y-3 rounded-xl border p-4 ${
              isActive
                ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                : 'border-[var(--color-border)] bg-[var(--color-surface-elevated)]'
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-[var(--color-text)]">
                    {displayPlatformName(draftKey, defaultDraftKey, labels.defaultDraft)}
                  </h3>
                  {isActive ? (
                    <span className="rounded-full bg-[var(--color-primary)] px-2 py-0.5 text-[10px] font-medium text-white">
                      {labels.activeDraft}
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {accountCount > 0
                    ? labels.accountCount.replace('{count}', String(accountCount))
                    : labels.noAccounts}
                </p>
                {usesFallback ? (
                  <p className="text-xs text-[var(--color-text-subtle)]">{labels.inheritedFallback}</p>
                ) : null}
              </div>
              {!isActive ? (
                <button
                  type="button"
                  onClick={() => onSetActiveDraft(draftKey)}
                  className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
                >
                  {labels.activeDraft}
                </button>
              ) : null}
            </div>

            <label className="space-y-1">
              <span className="text-xs text-[var(--color-text-muted)]">{labels.caption}</span>
              <textarea
                value={draft.caption}
                onFocus={() => onSetActiveDraft(draftKey)}
                onChange={(event) => onUpdateDraft(draftKey, { caption: event.target.value })}
                placeholder={labels.captionPlaceholder}
                rows={3}
                className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-border-focus)] focus:outline-none"
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs text-[var(--color-text-muted)]">{labels.hashtags}</span>
              <input
                type="text"
                value={draft.hashtags}
                onFocus={() => onSetActiveDraft(draftKey)}
                onChange={(event) => onUpdateDraft(draftKey, { hashtags: event.target.value })}
                placeholder={labels.hashtagsPlaceholder}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-border-focus)] focus:outline-none"
              />
            </label>
          </article>
        );
      })}
    </div>
  );
}
