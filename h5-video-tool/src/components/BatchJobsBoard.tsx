/**
 * BatchJobsBoard - 即梦批量任务审片看板
 * 展示所有 batch jobs 状态，支持：
 * - 按项目过滤
 * - 实时刷新（SSE 实时推送）
 * - 预览视频（点击展开）
 * - 一键导入到剪辑时间轴
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { cancelBatchJob, cancelBatchByProject, type BatchJobDto } from '../api/batchJobs';
import { appendFileAccessToken } from '../api/client';
import { absoluteApiUrl } from '../utils/absoluteApiUrl';

const BASE = import.meta.env.VITE_API_BASE_URL || '';
const STREAM_RETRY_BASE_MS = 1500;
const STREAM_RETRY_MAX_MS = 10000;

const STATUS_LABEL: Record<BatchJobDto['status'], string> = {
  awaiting_submit: '🕒 排队待提交',
  pending: '⏳ 等待中',
  queuing: '📧 排队中',
  processing: '⚙️ 生成中',
  done: '✅ 已完成',
  failed: '❌ 失败',
  cancelled: '🚫 已取消',
};

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
            const map = new Map(prev.map((j) => [j.id, j]));
            map.set(job.id, job);
            const all = [...map.values()];
            const filtered = projectId ? all.filter((j) => j.projectId === projectId) : all;
            return filtered.sort((a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
            );
          });
        } catch {
          // Ignore malformed events.
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
    for (const j of jobs) {
      if (j.status === 'pending' || j.status === 'queuing' || j.status === 'processing' || j.status === 'awaiting_submit') {
        ids.add(j.projectId);
      }
    }
    return ids;
  }, [jobs]);

  const handleCancelAll = useCallback(async () => {
    if (!confirm('确定取消所有排队中的任务？已完成的不受影响。')) return;
    setCancellingAll(true);
    try {
      for (const pid of activeProjectIds) {
        await cancelBatchByProject(pid);
      }
    } finally {
      setCancellingAll(false);
    }
  }, [activeProjectIds]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-[var(--color-text-muted)] text-sm">
        加载批量任务…
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <span className="text-4xl">🎬</span>
        <p className="text-sm text-[var(--color-text-muted)]">暂无批量任务</p>
        <p className="text-xs text-[var(--color-text-muted)]/70">
          在“生成视频”步骤点击“夜间批量提交”，即可在这里看到所有分镜的生成进度
        </p>
      </div>
    );
  }

  const done = jobs.filter((j) => j.status === 'done').length;
  const total = jobs.length;
  const awaitingCount = jobs.filter((j) => j.status === 'awaiting_submit').length;
  const queuingCount = jobs.filter((j) => j.status === 'queuing' || j.status === 'pending').length;
  const processingCount = jobs.filter((j) => j.status === 'processing').length;
  const doneCount = done;
  const failedCount = jobs.filter((j) => j.status === 'failed').length;
  const hasActive = activeProjectIds.size > 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between rounded-xl bg-[var(--color-surface-elevated)] px-4 py-2.5">
        <span className="text-sm font-medium text-[var(--color-text)]">
          批量任务 · {done}/{total} 已完成
        </span>
        <div className="flex items-center gap-2">
          {hasActive && (
            <button
              onClick={() => void handleCancelAll()}
              disabled={cancellingAll}
              className="text-[11px] px-2.5 py-1 rounded-lg border border-red-400/30 text-red-400 hover:bg-red-500/10 disabled:opacity-50 transition-colors"
            >
              {cancellingAll ? '取消中…' : '取消全部排队'}
            </button>
          )}
          <span className="text-[10px] text-[var(--color-text-muted)]">
            {streamState === 'open' ? '实时同步' : '重连中…'}
          </span>
        </div>
      </div>

      <div className="h-1.5 rounded-full bg-[var(--color-surface-hover)] overflow-hidden">
        <div
          className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-500"
          style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }}
        />
      </div>

      {jobs.length > 0 && (
        <div className="flex gap-3 px-3 py-2 text-[10px] text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
          <span>总 {total}</span>
          {awaitingCount > 0 && <span className="text-slate-400">待提交 {awaitingCount}</span>}
          {queuingCount > 0 && <span className="text-yellow-400">排队 {queuingCount}</span>}
          {processingCount > 0 && <span className="text-blue-400">生成中 {processingCount}</span>}
          {doneCount > 0 && <span className="text-green-400">完成 {doneCount}</span>}
          {failedCount > 0 && <span className="text-red-400">失败 {failedCount}</span>}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {jobs.map((job) => {
          const protectedVideoUrl = resolveProtectedVideoUrl(job.videoUrl);
          return (
            <div
              key={job.id}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden"
            >
              <div
                className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-[var(--color-surface-hover)] transition-colors"
                onClick={() => setExpandedId(expandedId === job.id ? null : job.id)}
              >
                <span className="text-xs font-mono text-[var(--color-text-muted)] w-6 text-center">
                  #{job.shotIndex + 1}
                </span>
                <span className="flex-1 text-sm text-[var(--color-text)] truncate">
                  {job.shotDescription || `分镜 ${job.shotIndex + 1}`}
                </span>
                {job.source && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--color-border)] text-[var(--color-text-subtle)]">
                    {job.source === 'quickfilm' ? '一键成片' : '高级制片'}
                  </span>
                )}
                <span className={`text-[11px] font-medium ${STATUS_COLOR[job.status]}`}>
                  {STATUS_LABEL[job.status]}
                </span>
                {(job.status === 'queuing' || job.status === 'pending') &&
                  job.queueInfo?.queue_idx != null && (
                    <span className="text-[10px] text-yellow-400">
                      排队中 #{job.queueInfo.queue_idx + 1}
                      {job.queueInfo.queue_length != null ? `/${job.queueInfo.queue_length}` : ''}
                    </span>
                  )}
                <span className="text-[var(--color-text-muted)] text-xs">
                  {expandedId === job.id ? '▼' : '▶'}
                </span>
              </div>

              {expandedId === job.id && (
                <div className="border-t border-[var(--color-border)] px-3 py-3 space-y-2.5">
                  {job.status === 'failed' && job.failReason && (
                    <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-2.5 py-1.5">
                      {job.failReason}
                    </p>
                  )}

                  {job.status === 'done' && protectedVideoUrl && (
                    <video
                      src={protectedVideoUrl}
                      controls
                      className="w-full rounded-lg max-h-[240px] object-contain bg-black"
                      preload="metadata"
                    />
                  )}

                  <div className="flex gap-2">
                    {job.status === 'done' && onImportVideo && (
                      <button
                        onClick={() => onImportVideo(job)}
                        className="flex-1 rounded-lg bg-[var(--color-primary)] text-white text-xs font-medium py-1.5 hover:opacity-90 transition-opacity"
                      >
                        ↳ 导入到时间轴
                      </button>
                    )}
                    {job.status === 'done' && protectedVideoUrl && (
                      <a
                        href={protectedVideoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-[var(--color-primary)] hover:underline self-center"
                      >
                        下载视频
                      </a>
                    )}
                    {(job.status === 'pending' || job.status === 'queuing' || job.status === 'awaiting_submit') && (
                      <button
                        onClick={() => void handleCancel(job.id)}
                        disabled={cancellingId === job.id}
                        className="rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] text-xs px-3 py-1.5 hover:text-red-400 hover:border-red-400/30 transition-colors disabled:opacity-50"
                      >
                        {cancellingId === job.id ? '取消中…' : '取消'}
                      </button>
                    )}
                    <span className="text-[9px] text-[var(--color-text-muted)] self-center ml-auto">
                      项目 {job.projectId} · 提交于 {new Date(job.createdAt).toLocaleString('zh-CN')}
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
