import React, { useMemo, useState } from 'react';
import {
  filterTaskHistoryItems,
  getTaskHistoryPlatformOptions,
  getTaskHistoryShareLink,
  getTaskHistoryStatusBucket,
  groupTaskHistoryItemsByDate,
  summarizeTaskHistory,
  type DistributionTaskHistoryItem,
  type DistributionTaskHistoryStatusFilter,
} from './distributeSupport.ts';

void React;

interface DistributePublishHistoryLabels {
  emptyTitle: string;
  emptyHint: string;
  filteredEmptyTitle: string;
  filteredEmptyHint: string;
  shareLink: string;
  select: string;
  loading: string;
  statusAll: string;
  statusSuccess: string;
  statusFailed: string;
  statusPending: string;
  allPlatforms: string;
  platformFilter: string;
  searchLabel: string;
  searchPlaceholder: string;
  filteredSummary: string;
  taskLabel: string;
  accountCount: string;
  unknownDate: string;
}

interface DistributePublishHistoryProps {
  title?: string;
  items: DistributionTaskHistoryItem[];
  activeTaskId?: string | null;
  loading?: boolean;
  onSelectTask?: (item: DistributionTaskHistoryItem) => void;
  selectLabel?: (item: DistributionTaskHistoryItem) => string;
  formatTime?: (timestamp: number) => string;
  headerAction?: React.ReactNode;
  labels?: Partial<DistributePublishHistoryLabels>;
}

const DEFAULT_LABELS: DistributePublishHistoryLabels = {
  emptyTitle: 'No recent publishes yet',
  emptyHint: 'Published tasks from GeeLark will show up here after refresh or revisit.',
  filteredEmptyTitle: 'No matching publishes',
  filteredEmptyHint: 'Clear the filters or refresh history to see more tasks.',
  shareLink: 'Open share link',
  select: 'Open details',
  loading: 'Loading publish history...',
  statusAll: 'All',
  statusSuccess: 'Success',
  statusFailed: 'Failed',
  statusPending: 'Pending',
  allPlatforms: 'All platforms',
  platformFilter: 'Platform',
  searchLabel: 'Search',
  searchPlaceholder: 'Search plan, task, account, status...',
  filteredSummary: '{visible} of {total} tasks',
  taskLabel: 'Task',
  accountCount: '{count} accounts',
  unknownDate: 'Unknown date',
};

function formatHistoryTime(timestamp: number, formatTime?: (timestamp: number) => string): string {
  if (!timestamp) return '-';
  if (formatTime) return formatTime(timestamp);
  return new Date(timestamp).toLocaleString();
}

function statusTone(item: DistributionTaskHistoryItem): string {
  const bucket = getTaskHistoryStatusBucket(item);
  if (bucket === 'success') return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200';
  if (bucket === 'failed') {
    return 'border-red-500/20 bg-red-500/10 text-red-200';
  }
  return 'border-amber-500/20 bg-amber-500/10 text-amber-100';
}

function interpolate(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (current, [key, value]) => current.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

const STATUS_FILTERS: DistributionTaskHistoryStatusFilter[] = ['all', 'success', 'failed', 'pending'];

export function DistributePublishHistory({
  title = 'Recent publishes',
  items,
  activeTaskId,
  loading = false,
  onSelectTask,
  selectLabel,
  formatTime,
  headerAction,
  labels,
}: DistributePublishHistoryProps) {
  const copy = { ...DEFAULT_LABELS, ...labels };
  const [statusFilter, setStatusFilter] = useState<DistributionTaskHistoryStatusFilter>('all');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [query, setQuery] = useState('');

  const platformOptions = useMemo(() => getTaskHistoryPlatformOptions(items), [items]);
  const effectivePlatformFilter = platformFilter === 'all' || platformOptions.includes(platformFilter)
    ? platformFilter
    : 'all';
  const filteredItems = useMemo(() => filterTaskHistoryItems(items, {
    status: statusFilter,
    platform: effectivePlatformFilter,
    query,
  }), [effectivePlatformFilter, items, query, statusFilter]);
  const groups = useMemo(() => groupTaskHistoryItemsByDate(
    filteredItems,
    (timestamp) => new Date(timestamp).toLocaleDateString(),
    copy.unknownDate,
  ), [copy.unknownDate, filteredItems]);
  const summary = summarizeTaskHistory(filteredItems);

  return (
    <section className="space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-[var(--color-text)]">{title}</h3>
          <p className="text-xs text-[var(--color-text-muted)]">
            {interpolate(copy.filteredSummary, { visible: filteredItems.length, total: items.length })} · {summary.success} {copy.statusSuccess.toLowerCase()} · {summary.failed} {copy.statusFailed.toLowerCase()} · {summary.pending} {copy.statusPending.toLowerCase()}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {headerAction}
          {STATUS_FILTERS.map((status) => {
            const active = statusFilter === status;
            const label = status === 'all'
              ? copy.statusAll
              : status === 'success'
                ? copy.statusSuccess
                : status === 'failed'
                  ? copy.statusFailed
                  : copy.statusPending;
            return (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`rounded-full border px-3 py-1 text-xs ${
                  active
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                    : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
        <label className="flex min-w-0 flex-col gap-1 text-xs text-[var(--color-text-muted)]">
          <span>{copy.platformFilter}</span>
          <select
            value={effectivePlatformFilter}
            onChange={(event) => setPlatformFilter(event.target.value)}
            className="min-h-10 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
          >
            <option value="all">{copy.allPlatforms}</option>
            {platformOptions.map((platform) => (
              <option key={platform} value={platform}>{platform}</option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 flex-col gap-1 text-xs text-[var(--color-text-muted)]">
          <span>{copy.searchLabel}</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={copy.searchPlaceholder}
            className="min-h-10 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)]"
          />
        </label>
      </div>

      {loading ? (
        <p className="text-sm text-[var(--color-text-muted)]">{copy.loading}</p>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-center">
          <p className="text-sm font-medium text-[var(--color-text)]">{copy.emptyTitle}</p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">{copy.emptyHint}</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-center">
          <p className="text-sm font-medium text-[var(--color-text)]">{copy.filteredEmptyTitle}</p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">{copy.filteredEmptyHint}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.id} className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-text-muted)]">
                <span>{group.label}</span>
                <span className="h-px flex-1 bg-[var(--color-border)]" />
              </div>
              {group.items.map((item) => {
                const isActive = activeTaskId != null && (activeTaskId === item.taskId || activeTaskId === item.id);
                const shareLink = getTaskHistoryShareLink(item);
                const platformList = getTaskHistoryPlatformOptions([item]);
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
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase ${statusTone(item)}`}>
                            {item.statusText}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--color-text-muted)]">{copy.taskLabel}: {item.taskId}</p>
                        <div className="flex flex-wrap gap-2 text-xs text-[var(--color-text-subtle)]">
                          <span>{formatHistoryTime(item.createdAt, formatTime)}</span>
                          {platformList.length > 0 ? <span>{platformList.join(' / ')}</span> : null}
                          {item.accountCount ? <span>{interpolate(copy.accountCount, { count: item.accountCount })}</span> : null}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {onSelectTask ? (
                          <button
                            type="button"
                            onClick={() => onSelectTask(item)}
                            className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
                          >
                            {selectLabel?.(item) ?? copy.select}
                          </button>
                        ) : null}
                        {shareLink ? (
                          <a
                            href={shareLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-[var(--color-primary)] hover:underline"
                          >
                            {copy.shareLink}
                          </a>
                        ) : null}
                      </div>
                    </div>

                    {item.failDesc ? (
                      <p className="mt-3 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-200">
                        {item.failDesc}
                      </p>
                    ) : null}
                  </article>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
