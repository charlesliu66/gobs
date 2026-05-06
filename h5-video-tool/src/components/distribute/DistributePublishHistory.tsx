import React from 'react';
import {
  summarizeTaskHistory,
  type DistributionTaskHistoryItem,
} from './distributeSupport.ts';

void React;

interface DistributePublishHistoryLabels {
  emptyTitle: string;
  emptyHint: string;
  shareLink: string;
  select: string;
}

interface DistributePublishHistoryProps {
  title?: string;
  items: DistributionTaskHistoryItem[];
  activeTaskId?: string | null;
  loading?: boolean;
  onSelectTask?: (item: DistributionTaskHistoryItem) => void;
  formatTime?: (timestamp: number) => string;
  labels?: Partial<DistributePublishHistoryLabels>;
}

const DEFAULT_LABELS: DistributePublishHistoryLabels = {
  emptyTitle: 'No recent publishes yet',
  emptyHint: 'Published tasks from GeeLark will show up here after refresh or revisit.',
  shareLink: 'Open share link',
  select: 'Open details',
};

function formatHistoryTime(timestamp: number, formatTime?: (timestamp: number) => string): string {
  if (!timestamp) return '-';
  if (formatTime) return formatTime(timestamp);
  return new Date(timestamp).toLocaleString();
}

function statusTone(item: DistributionTaskHistoryItem): string {
  if (item.status === 3 || item.statusText === 'success') return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200';
  if (item.status === 4 || item.status === 7 || item.statusText === 'failed' || item.statusText === 'canceled') {
    return 'border-red-500/20 bg-red-500/10 text-red-200';
  }
  return 'border-amber-500/20 bg-amber-500/10 text-amber-100';
}

export function DistributePublishHistory({
  title = 'Recent publishes',
  items,
  activeTaskId,
  loading = false,
  onSelectTask,
  formatTime,
  labels,
}: DistributePublishHistoryProps) {
  const copy = { ...DEFAULT_LABELS, ...labels };
  const summary = summarizeTaskHistory(items);

  return (
    <section className="space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-[var(--color-text)]">{title}</h3>
        <p className="text-xs text-[var(--color-text-muted)]">
          {summary.total} tasks · {summary.success} success · {summary.failed} failed · {summary.pending} pending
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-[var(--color-text-muted)]">Loading publish history…</p>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-center">
          <p className="text-sm font-medium text-[var(--color-text)]">{copy.emptyTitle}</p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">{copy.emptyHint}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const isActive = activeTaskId != null && activeTaskId === item.taskId;
            return (
              <article
                key={item.id}
                className={`rounded-xl border p-3 ${
                  isActive
                    ? 'border-[var(--color-primary)] bg-[var(--color-surface)]'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)]'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-[var(--color-text)]">{item.planName ?? item.taskId}</p>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${statusTone(item)}`}>
                        {item.statusText}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)]">Task: {item.taskId}</p>
                    <p className="text-xs text-[var(--color-text-subtle)]">{formatHistoryTime(item.createdAt, formatTime)}</p>
                  </div>

                  {onSelectTask ? (
                    <button
                      type="button"
                      onClick={() => onSelectTask(item)}
                      className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
                    >
                      {copy.select}
                    </button>
                  ) : null}
                </div>

                {item.failDesc ? (
                  <p className="mt-3 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-200">
                    {item.failDesc}
                  </p>
                ) : null}

                {item.shareLink ? (
                  <div className="mt-3">
                    <a
                      href={item.shareLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[var(--color-primary)] hover:underline"
                    >
                      {copy.shareLink}
                    </a>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
