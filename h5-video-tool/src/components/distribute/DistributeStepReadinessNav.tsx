import React from 'react';

void React;

export type DistributeStepReadinessStatus = 'ready' | 'attention' | 'blocked';

export interface DistributeStepReadinessItem {
  id: string;
  href: string;
  step: string;
  title: string;
  detail: string;
  status: DistributeStepReadinessStatus;
}

interface DistributeStepReadinessNavLabels {
  title: string;
  completedSummary: string;
  ready: string;
  attention: string;
  blocked: string;
}

interface DistributeStepReadinessNavProps {
  items: DistributeStepReadinessItem[];
  labels: DistributeStepReadinessNavLabels;
}

const STATUS_CLASS: Record<DistributeStepReadinessStatus, string> = {
  ready: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100',
  attention: 'border-amber-500/30 bg-amber-500/10 text-amber-100',
  blocked: 'border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)]',
};

function getStatusLabel(status: DistributeStepReadinessStatus, labels: DistributeStepReadinessNavLabels): string {
  if (status === 'ready') return labels.ready;
  if (status === 'attention') return labels.attention;
  return labels.blocked;
}

export function DistributeStepReadinessNav({ items, labels }: DistributeStepReadinessNavProps) {
  const readyCount = items.filter((item) => item.status === 'ready').length;
  const completedSummary = labels.completedSummary
    .replace('{ready}', String(readyCount))
    .replace('{total}', String(items.length));

  return (
    <nav className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3" aria-label={labels.title}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">{labels.title}</h2>
        <span className="text-xs text-[var(--color-text-muted)]">{completedSummary}</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => {
          const statusLabel = getStatusLabel(item.status, labels);
          return (
            <a
              key={item.id}
              href={item.href}
              aria-label={`${item.title}: ${statusLabel}`}
              className={`min-w-0 rounded-lg border px-3 py-2 transition-colors hover:border-[var(--color-border-focus)] ${STATUS_CLASS[item.status]}`}
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="shrink-0 rounded-full bg-black/10 px-2 py-0.5 text-[10px] font-semibold">
                  {item.step}
                </span>
                <span className="truncate text-[11px]">{statusLabel}</span>
              </div>
              <p className="truncate text-sm font-medium text-[var(--color-text)]">{item.title}</p>
              <p className="mt-0.5 truncate text-xs opacity-80">{item.detail}</p>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
