import React from 'react';

import type { DistributionRecentContext } from './distributionRecentContext.ts';

void React;

interface DistributeRecentContextPanelLabels {
  title: string;
  subtitle: string;
  packageLabel: string;
  assetLabel: string;
  accountCount: string;
  platforms: string;
  needShareLink: string;
  markAI: string;
  updatedAt: string;
  useAgain: string;
}

interface DistributeRecentContextPanelProps {
  contexts: DistributionRecentContext[];
  labels: DistributeRecentContextPanelLabels;
  formatTime: (timestamp: number) => string;
  onRestore: (context: DistributionRecentContext) => void;
}

export function DistributeRecentContextPanel({
  contexts,
  labels,
  formatTime,
  onRestore,
}: DistributeRecentContextPanelProps) {
  if (contexts.length === 0) return null;

  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="mb-3">
        <h2 className="section-title">{labels.title}</h2>
        <p className="text-xs text-[var(--color-text-muted)]">{labels.subtitle}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {contexts.map((context) => (
          <article
            key={context.id}
            className="flex min-h-full flex-col justify-between gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3"
          >
            <div className="space-y-2">
              <div>
                <p className="text-sm font-medium text-[var(--color-text)]">
                  {context.packageTitle || context.assetTitle || context.id}
                </p>
                <p className="text-[11px] text-[var(--color-text-muted)]">
                  {labels.updatedAt} {formatTime(context.savedAt)}
                </p>
              </div>

              <dl className="space-y-1 text-xs text-[var(--color-text-muted)]">
                {context.packageTitle && (
                  <div className="flex justify-between gap-2">
                    <dt>{labels.packageLabel}</dt>
                    <dd className="max-w-[70%] truncate text-[var(--color-text)]">{context.packageTitle}</dd>
                  </div>
                )}
                {context.assetTitle && (
                  <div className="flex justify-between gap-2">
                    <dt>{labels.assetLabel}</dt>
                    <dd className="max-w-[70%] truncate text-[var(--color-text)]">{context.assetTitle}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-2">
                  <dt>{labels.accountCount}</dt>
                  <dd className="text-[var(--color-text)]">{context.accountCount}</dd>
                </div>
                {context.platforms.length > 0 && (
                  <div className="flex justify-between gap-2">
                    <dt>{labels.platforms}</dt>
                    <dd className="max-w-[70%] truncate text-[var(--color-text)]">
                      {context.platforms.join(', ')}
                    </dd>
                  </div>
                )}
              </dl>

              <div className="flex flex-wrap gap-1.5">
                {context.needShareLink && (
                  <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] text-sky-200">
                    {labels.needShareLink}
                  </span>
                )}
                {context.markAI && (
                  <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-100">
                    {labels.markAI}
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => onRestore(context)}
              className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-hover)]"
            >
              {labels.useAgain}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
