import { useCallback, useEffect, useMemo, useState } from 'react';

import type { BatchJobDto } from '../api/batchJobs';
import { cancelBatchByProject, cancelBatchJob } from '../api/batchJobs';
import { appendFileAccessToken } from '../api/client';
import { useLocale } from '../i18n/LocaleContext.tsx';
import { formatDateTime } from '../i18n/locale.ts';
import { absoluteApiUrl } from '../utils/absoluteApiUrl';

const BASE = import.meta.env.VITE_API_BASE_URL || '';
const STREAM_RETRY_BASE_MS = 1500;
const STREAM_RETRY_MAX_MS = 10000;

const STATUS_COLOR: Record<BatchJobDto['status'], string> = {
  awaiting_submit: 'text-slate-400',
  pending: 'text-[var(--color-text-muted)]',
  queuing: 'text-amber-400',
  processing: 'text-blue-400',
  done: 'text-green-400',
  failed: 'text-red-400',
  cancelled: 'text-[var(--color-text-muted)]',
};

interface BatchJobsBoardProps {
  projectId?: string;
  onImportVideo?: (job: BatchJobDto) => void;
}

function resolveProtectedVideoUrl(videoUrl?: string): string {
  if (!videoUrl) return '';
  return appendFileAccessToken(absoluteApiUrl(videoUrl));
}

export function BatchJobsBoard({ projectId, onImportVideo }: BatchJobsBoardProps) {
  const { t, uiLocale } = useLocale();
  const text = useCallback(
    (path: string, vars?: Record<string, string | number>) =>
      Object.entries(vars ?? {}).reduce(
        (message, [key, value]) => message.replaceAll(`{${key}}`, String(value)),
        t(path),
      ),
    [t],
  );

  const getStatusLabel = useCallback(
    (status: BatchJobDto['status']) => {
      switch (status) {
        case 'awaiting_submit':
          return t('batchJobs.statusAwaitingSubmit');
        case 'pending':
          return t('batchJobs.statusPending');
        case 'queuing':
          return t('batchJobs.statusQueuing');
        case 'processing':
          return t('batchJobs.statusProcessing');
        case 'done':
          return t('batchJobs.statusDone');
        case 'failed':
          return t('batchJobs.statusFailed');
        case 'cancelled':
          return t('batchJobs.statusCancelled');
        default:
          return status;
      }
    },
    [t],
  );

  const [jobs, setJobs] = useState<BatchJobDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancellingAll, setCancellingAll] = useState(false);
  const [streamState, setStreamState] = useState<'connecting' | 'open' | 'reconnecting'>('connecting');

  useEffect(() => {
    const token = localStorage.getItem('gobs_token') ?? '';
    let disposed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let es: EventSource | null = null;
    let reconnectAttempts = 0;

    const connect = () => {
      if (disposed) return;
      setStreamState(reconnectAttempts === 0 ? 'connecting' : 'reconnecting');
      es = new EventSource(`${BASE}/api/batch-jobs/stream?token=${encodeURIComponent(token)}`);

      es.onopen = () => {
        reconnectAttempts = 0;
        setLoading(false);
        setStreamState('open');
      };

      es.onmessage = (e: MessageEvent) => {
        setLoading(false);
        try {
          const job = JSON.parse(e.data as string) as BatchJobDto;
          setJobs((prev) => {
            const map = new Map(prev.map((row) => [row.id, row]));
            map.set(job.id, job);
            const all = [...map.values()];
            const filtered = projectId ? all.filter((row) => row.projectId === projectId) : all;
            return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          });
        } catch {
          // Ignore malformed stream events.
        }
      };

      es.onerror = () => {
        if (disposed) return;
        setLoading(false);
        setStreamState('reconnecting');
        es?.close();
        const delay = Math.min(STREAM_RETRY_BASE_MS * (2 ** reconnectAttempts), STREAM_RETRY_MAX_MS);
        reconnectAttempts += 1;
        reconnectTimer = setTimeout(connect, delay);
      };
    };

    connect();

    const fallback = setTimeout(() => setLoading(false), 2000);
    return () => {
      disposed = true;
      clearTimeout(fallback);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      es?.close();
    };
  }, [projectId]);

  const handleCancel = useCallback(async (id: string) => {
    setCancellingId(id);
    try {
      await cancelBatchJob(id);
    } finally {
      setCancellingId(null);
    }
  }, []);

  const activeProjectIds = useMemo(() => {
    const ids = new Set<string>();
    for (const job of jobs) {
      if (job.status === 'pending' || job.status === 'queuing' || job.status === 'processing' || job.status === 'awaiting_submit') {
        ids.add(job.projectId);
      }
    }
    return ids;
  }, [jobs]);

  const handleCancelAll = useCallback(async () => {
    if (!confirm(t('batchJobs.confirmCancelAll'))) return;
    setCancellingAll(true);
    try {
      for (const pid of activeProjectIds) {
        await cancelBatchByProject(pid);
      }
    } finally {
      setCancellingAll(false);
    }
  }, [activeProjectIds, t]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-[var(--color-text-muted)]">
        {t('batchJobs.loading')}
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <span className="text-4xl">🎞</span>
        <p className="text-sm text-[var(--color-text-muted)]">{t('batchJobs.emptyTitle')}</p>
        <p className="text-xs text-[var(--color-text-muted)]/70">{t('batchJobs.emptyHint')}</p>
      </div>
    );
  }

  const done = jobs.filter((job) => job.status === 'done').length;
  const total = jobs.length;
  const awaitingCount = jobs.filter((job) => job.status === 'awaiting_submit').length;
  const queuingCount = jobs.filter((job) => job.status === 'queuing' || job.status === 'pending').length;
  const processingCount = jobs.filter((job) => job.status === 'processing').length;
  const failedCount = jobs.filter((job) => job.status === 'failed').length;
  const hasActive = activeProjectIds.size > 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between rounded-xl bg-[var(--color-surface-elevated)] px-4 py-2.5">
        <span className="text-sm font-medium text-[var(--color-text)]">
          {t('batchJobs.title')} · {done}/{total} {t('batchJobs.completed')}
        </span>
        <div className="flex items-center gap-2">
          {hasActive && (
            <button
              onClick={() => void handleCancelAll()}
              disabled={cancellingAll}
              className="rounded-lg border border-red-400/30 px-2.5 py-1 text-[11px] text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
            >
              {cancellingAll ? t('batchJobs.cancelling') : t('batchJobs.cancelAllQueued')}
            </button>
          )}
          <span className="text-[10px] text-[var(--color-text-muted)]">
            {streamState === 'open' ? t('batchJobs.liveSync') : t('batchJobs.reconnecting')}
          </span>
        </div>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-hover)]">
        <div
          className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-500"
          style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }}
        />
      </div>

      <div className="flex gap-3 border-b border-[var(--color-border)] px-3 py-2 text-[10px] text-[var(--color-text-muted)]">
        <span>{t('batchJobs.total')} {total}</span>
        {awaitingCount > 0 && <span className="text-slate-400">{t('batchJobs.awaiting')} {awaitingCount}</span>}
        {queuingCount > 0 && <span className="text-yellow-400">{t('batchJobs.queued')} {queuingCount}</span>}
        {processingCount > 0 && <span className="text-blue-400">{t('batchJobs.processing')} {processingCount}</span>}
        {done > 0 && <span className="text-green-400">{t('batchJobs.done')} {done}</span>}
        {failedCount > 0 && <span className="text-red-400">{t('batchJobs.failed')} {failedCount}</span>}
      </div>

      <div className="flex flex-col gap-2">
        {jobs.map((job) => {
          const protectedVideoUrl = resolveProtectedVideoUrl(job.videoUrl);
          return (
            <div
              key={job.id}
              className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]"
            >
              <div
                className="flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors hover:bg-[var(--color-surface-hover)]"
                onClick={() => setExpandedId(expandedId === job.id ? null : job.id)}
              >
                <span className="w-6 text-center font-mono text-xs text-[var(--color-text-muted)]">
                  #{job.shotIndex + 1}
                </span>
                <span className="flex-1 truncate text-sm text-[var(--color-text)]">
                  {job.shotDescription || text('batchJobs.shotFallback', { index: job.shotIndex + 1 })}
                </span>
                {job.source && (
                  <span className="rounded border border-[var(--color-border)] px-1.5 py-0.5 text-[10px] text-[var(--color-text-subtle)]">
                    {job.source === 'quickfilm' ? t('batchJobs.sourceQuickfilm') : t('batchJobs.sourceProduction')}
                  </span>
                )}
                <span className={`text-[11px] font-medium ${STATUS_COLOR[job.status]}`}>
                  {getStatusLabel(job.status)}
                </span>
                {(job.status === 'queuing' || job.status === 'pending') && job.queueInfo?.queue_idx != null && (
                  <span className="text-[10px] text-yellow-400">
                    {text('batchJobs.queuePosition', { position: job.queueInfo.queue_idx + 1 })}
                    {job.queueInfo.queue_length != null ? `/${job.queueInfo.queue_length}` : ''}
                  </span>
                )}
                <span className="text-xs text-[var(--color-text-muted)]">{expandedId === job.id ? '▾' : '▸'}</span>
              </div>

              {expandedId === job.id && (
                <div className="space-y-2.5 border-t border-[var(--color-border)] px-3 py-3">
                  {job.status === 'failed' && job.failReason && (
                    <p className="rounded-lg bg-red-500/10 px-2.5 py-1.5 text-xs text-red-400">{job.failReason}</p>
                  )}

                  {job.status === 'done' && protectedVideoUrl && (
                    <video
                      src={protectedVideoUrl}
                      controls
                      className="max-h-[240px] w-full rounded-lg bg-black object-contain"
                      preload="metadata"
                    />
                  )}

                  <div className="flex gap-2">
                    {job.status === 'done' && onImportVideo && (
                      <button
                        onClick={() => onImportVideo(job)}
                        className="flex-1 rounded-lg bg-[var(--color-primary)] py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
                      >
                        {t('batchJobs.importToTimeline')}
                      </button>
                    )}
                    {job.status === 'done' && protectedVideoUrl && (
                      <a
                        href={protectedVideoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="self-center text-[10px] text-[var(--color-primary)] hover:underline"
                      >
                        {t('batchJobs.downloadVideo')}
                      </a>
                    )}
                    {(job.status === 'pending' || job.status === 'queuing' || job.status === 'awaiting_submit') && (
                      <button
                        onClick={() => void handleCancel(job.id)}
                        disabled={cancellingId === job.id}
                        className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-muted)] transition-colors hover:border-red-400/30 hover:text-red-400 disabled:opacity-50"
                      >
                        {cancellingId === job.id ? t('batchJobs.cancelling') : t('batchJobs.cancel')}
                      </button>
                    )}
                    <span className="ml-auto self-center text-[9px] text-[var(--color-text-muted)]">
                      {text('batchJobs.submittedAt', {
                        projectId: job.projectId,
                        time: formatDateTime(job.createdAt, uiLocale),
                      })}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
