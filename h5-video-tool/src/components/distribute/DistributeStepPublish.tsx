import React from 'react';

import {
  getPendingTaskIds,
  type LatestPublishBatch,
  type LatestPublishBatchItem,
} from '../../utils/geelarkPublishBatch.ts';

void React;

export interface DistributeStepPreflightItem {
  key: string;
  label: string;
  ready: boolean;
  value: string;
}

interface LatestBatchLabels {
  title: string;
  meta: string;
  summaryTotal: string;
  summarySuccess: string;
  summaryFailed: string;
  summaryPending: string;
  statusSubmitting: string;
  statusSubmitFailed: string;
  statusSubmitted: string;
  hintSubmitting: string;
  hintRunning: string;
  hintDone: string;
  nextActions: string;
  reviewCurrentBatch: string;
  viewHistory: string;
  refresh: string;
  refreshing: string;
  close: string;
  unknown: string;
  profileLink: string;
  reportPlanName: string;
  taskId: string;
  logs: string;
  shareLink: string;
  failureNextAction: string;
}

interface DistributeStepPublishLabels {
  step: string;
  title: string;
  subtitle: string;
  ready: string;
  missing: string;
  publishOptions: string;
  needShareLink: string;
  markAI: string;
  publish: string;
  publishing: string;
  groupedByPlatform: string;
  latestBatch: LatestBatchLabels;
}

interface DistributeStepPublishProps {
  preflightItems: DistributeStepPreflightItem[];
  needShareLink: boolean;
  markAI: boolean;
  pushing: boolean;
  publishDisabled: boolean;
  pushError: string | null;
  pushErrorGuidance: string | null;
  showGroupedHint: boolean;
  latestBatch: LatestPublishBatch | null;
  batchRefreshing: boolean;
  labels: DistributeStepPublishLabels;
  formatTime: (timestamp: number) => string;
  onNeedShareLinkChange: (checked: boolean) => void;
  onMarkAIChange: (checked: boolean) => void;
  onPublish: () => void;
  onRefreshBatch: (batch: LatestPublishBatch) => void;
  onClearBatch: () => void;
  onReviewCurrentBatch: () => void;
  onViewHistory: () => void;
}

export function DistributeStepPublish({
  preflightItems,
  needShareLink,
  markAI,
  pushing,
  publishDisabled,
  pushError,
  pushErrorGuidance,
  showGroupedHint,
  latestBatch,
  batchRefreshing,
  labels,
  formatTime,
  onNeedShareLinkChange,
  onMarkAIChange,
  onPublish,
  onRefreshBatch,
  onClearBatch,
  onReviewCurrentBatch,
  onViewHistory,
}: DistributeStepPublishProps) {
  return (
    <section className="mb-6 space-y-4 border-b border-[var(--color-border)] pb-6">
      <div className="flex flex-wrap items-start gap-3">
        <span className="rounded-full bg-[var(--color-surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-text-muted)]">
          {labels.step}
        </span>
        <div>
          <h2 className="section-title">{labels.title}</h2>
          <p className="text-xs text-[var(--color-text-muted)]">{labels.subtitle}</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {preflightItems.map((item) => (
          <div key={item.key} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="text-xs text-[var(--color-text-muted)]">{item.label}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] ${item.ready ? 'bg-emerald-500/15 text-emerald-200' : 'bg-amber-500/15 text-amber-100'}`}>
                {item.ready ? labels.ready : labels.missing}
              </span>
            </div>
            <p className="text-sm text-[var(--color-text)]">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <p className="text-xs text-[var(--color-text-muted)]">{labels.publishOptions}</p>
        <label className="flex items-center gap-2 text-sm text-[var(--color-text)]">
          <input
            type="checkbox"
            checked={needShareLink}
            onChange={(event) => onNeedShareLinkChange(event.target.checked)}
          />
          {labels.needShareLink}
        </label>
        <label className="flex items-center gap-2 text-sm text-[var(--color-text)]">
          <input
            type="checkbox"
            checked={markAI}
            onChange={(event) => onMarkAIChange(event.target.checked)}
          />
          {labels.markAI}
        </label>
      </div>

      <div className="space-y-3">
        <button
          type="button"
          onClick={onPublish}
          disabled={publishDisabled}
          className="rounded-lg bg-[var(--color-primary)] px-6 py-2.5 font-medium text-white transition-colors hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pushing ? labels.publishing : labels.publish}
        </button>
        {pushError && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2">
            <p className="text-sm text-[var(--color-error)]">{pushError}</p>
            {pushErrorGuidance && (
              <p className="mt-1 text-xs text-red-200">{pushErrorGuidance}</p>
            )}
          </div>
        )}
        {showGroupedHint && (
          <p className="text-xs text-[var(--color-text-muted)]">
            {labels.groupedByPlatform}
          </p>
        )}
      </div>

      {latestBatch && (
        <LatestBatchPanel
          batch={latestBatch}
          refreshing={batchRefreshing}
          labels={labels.latestBatch}
          formatTime={formatTime}
          onRefresh={() => onRefreshBatch(latestBatch)}
          onClear={onClearBatch}
          onReviewCurrentBatch={onReviewCurrentBatch}
          onViewHistory={onViewHistory}
        />
      )}
    </section>
  );
}

function getDisplayStatus(item: LatestPublishBatchItem, labels: LatestBatchLabels): string {
  if (item.statusText === 'submitting') return labels.statusSubmitting;
  if (item.statusText === 'submit_failed') return labels.statusSubmitFailed;
  if (item.statusText === 'submitted') return labels.statusSubmitted;
  if (item.detail?.statusText) return item.detail.statusText;
  return item.statusText || labels.unknown;
}

function getStatusTone(item: LatestPublishBatchItem): string {
  if (item.statusText === 'submitting') return 'border-sky-500/30 bg-sky-500/10 text-sky-200';
  if (item.submitError) return 'border-red-500/30 bg-red-500/10 text-red-200';
  const status = Number(item.detail?.status ?? 0);
  if (status === 3) return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
  if (status === 4 || status === 7) return 'border-red-500/30 bg-red-500/10 text-red-200';
  if (status === 2) return 'border-sky-500/30 bg-sky-500/10 text-sky-200';
  return 'border-amber-500/30 bg-amber-500/10 text-amber-100';
}

function LatestBatchPanel({
  batch,
  refreshing,
  labels,
  formatTime,
  onRefresh,
  onClear,
  onReviewCurrentBatch,
  onViewHistory,
}: {
  batch: LatestPublishBatch;
  refreshing: boolean;
  labels: LatestBatchLabels;
  formatTime: (timestamp: number) => string;
  onRefresh: () => void;
  onClear: () => void;
  onReviewCurrentBatch: () => void;
  onViewHistory: () => void;
}) {
  const successCount = batch.items.filter((item) => Number(item.detail?.status ?? 0) === 3).length;
  const failedCount = batch.items.filter((item) => item.submitError || [4, 7].includes(Number(item.detail?.status ?? 0))).length;
  const pendingCount = batch.phase === 'submitting' ? batch.items.length : getPendingTaskIds(batch).length;
  const summaryText = `${labels.summaryTotal} ${batch.items.length} 路 ${labels.summarySuccess} ${successCount} 路 ${labels.summaryFailed} ${failedCount} 路 ${labels.summaryPending} ${pendingCount}`;

  return (
    <div className="space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="section-title">{labels.title}</h3>
          <p className="text-xs text-[var(--color-text-muted)]">
            {labels.meta} {formatTime(batch.createdAt)}
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">{summaryText}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing || batch.phase === 'submitting'}
            className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] disabled:opacity-50"
          >
            {refreshing ? labels.refreshing : labels.refresh}
          </button>
          <button
            type="button"
            onClick={onClear}
            className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]"
          >
            {labels.close}
          </button>
        </div>
      </div>

      <p className="text-xs text-[var(--color-text-subtle)]">
        {batch.phase === 'submitting'
          ? labels.hintSubmitting
          : pendingCount > 0
            ? labels.hintRunning
            : labels.hintDone}
      </p>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2">
        <span className="text-xs text-[var(--color-text-muted)]">{labels.nextActions}</span>
        <button
          type="button"
          onClick={onReviewCurrentBatch}
          className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
        >
          {labels.reviewCurrentBatch}
        </button>
        <button
          type="button"
          onClick={onViewHistory}
          className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
        >
          {labels.viewHistory}
        </button>
      </div>

      <div className="space-y-3">
        {batch.items.map((item) => (
          <article
            key={`${item.accountId}:${item.taskId ?? 'missing-task'}`}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-[var(--color-text)]">{item.username}</span>
                  {item.platform && (
                    <span className="rounded bg-[var(--color-surface)] px-2 py-0.5 text-[10px] uppercase text-[var(--color-text-muted)]">
                      {item.platform}
                    </span>
                  )}
                  {item.region && (
                    <span className="text-[10px] text-[var(--color-text-muted)]">{item.region}</span>
                  )}
                  {item.profileUrl && (
                    <a
                      href={item.profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-[var(--color-primary)] hover:underline"
                    >
                      {labels.profileLink}
                    </a>
                  )}
                </div>

                <div className="flex flex-wrap gap-3 text-xs text-[var(--color-text-muted)]">
                  <span>{labels.reportPlanName}: {batch.planName ?? '-'}</span>
                  <span>{labels.taskId}: {item.taskId ?? '-'}</span>
                </div>
              </div>

              <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusTone(item)}`}>
                {getDisplayStatus(item, labels)}
              </span>
            </div>

            {(item.detailError || item.submitError || item.detail?.failDesc) && (
              <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-200">
                <p>{item.detail?.failDesc || item.detailError || item.submitError}</p>
                <p className="mt-1 text-red-100">{labels.failureNextAction}</p>
              </div>
            )}

            {item.detail?.shareLink && (
              <div className="mt-3">
                <a
                  href={item.detail.shareLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[var(--color-primary)] hover:underline"
                >
                  {labels.shareLink}
                </a>
              </div>
            )}

            {item.detail?.resultImages && item.detail.resultImages.length > 0 && (
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {item.detail.resultImages.map((img, index) => (
                  <img
                    key={`${item.accountId}:${index}`}
                    src={img}
                    alt={`${item.username}-result-${index + 1}`}
                    className="max-h-64 w-full rounded-lg border border-[var(--color-border)] bg-black object-contain"
                  />
                ))}
              </div>
            )}

            {item.detail?.logs && item.detail.logs.length > 0 && (
              <div className="mt-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
                <p className="mb-1 text-[10px] uppercase tracking-wide text-[var(--color-text-subtle)]">
                  {labels.logs}
                </p>
                <div className="space-y-1 text-xs text-[var(--color-text-muted)]">
                  {item.detail.logs.slice(-3).map((line, index) => (
                    <p key={`${item.accountId}:log:${index}`} className="break-words">{line}</p>
                  ))}
                </div>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
