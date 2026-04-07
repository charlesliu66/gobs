/**
 * BatchJobsBoard — 即梦批量任务审片看板
 * 展示所有 batch jobs 状态，支持：
 * - 按项目过滤
 * - 实时刷新（30秒自动轮询）
 * - 预览视频（点击展开）
 * - 一键导入到剪辑时间轴
 */
import React, { useState, useEffect, useCallback } from 'react';
import { getBatchJobs, cancelBatchJob, type BatchJobDto } from '../api/batchJobs';

const STATUS_LABEL: Record<BatchJobDto['status'], string> = {
  pending: '⏳ 等待中',
  queuing: '🔄 排队中',
  processing: '⚙️ 生成中',
  done: '✅ 已完成',
  failed: '❌ 失败',
  cancelled: '⊘ 已取消',
};

const STATUS_COLOR: Record<BatchJobDto['status'], string> = {
  pending: 'text-[var(--color-text-muted)]',
  queuing: 'text-amber-400',
  processing: 'text-blue-400',
  done: 'text-green-400',
  failed: 'text-red-400',
  cancelled: 'text-[var(--color-text-muted)]',
};

interface BatchJobsBoardProps {
  projectId?: string;
  onImportVideo?: (job: BatchJobDto) => void; // 一键导入到时间轴
}

export function BatchJobsBoard({ projectId, onImportVideo }: BatchJobsBoardProps) {
  const [jobs, setJobs] = useState<BatchJobDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const { jobs: list } = await getBatchJobs(projectId);
      setJobs(list);
    } catch (e) {
      console.warn('[BatchJobsBoard] refresh error', e);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 30_000);
    return () => clearInterval(timer);
  }, [refresh]);

  const handleCancel = async (id: string) => {
    setCancellingId(id);
    try {
      await cancelBatchJob(id);
      await refresh();
    } finally {
      setCancellingId(null);
    }
  };

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
        <span className="text-4xl">🌙</span>
        <p className="text-sm text-[var(--color-text-muted)]">暂无批量任务</p>
        <p className="text-xs text-[var(--color-text-muted)]/70">
          在「生成视频」步骤点击「夜间批量提交」，即可在这里看到所有分镜的生成进度
        </p>
      </div>
    );
  }

  const done = jobs.filter((j) => j.status === 'done').length;
  const total = jobs.length;

  return (
    <div className="flex flex-col gap-3">
      {/* 汇总栏 */}
      <div className="flex items-center justify-between rounded-xl bg-[var(--color-surface-elevated)] px-4 py-2.5">
        <span className="text-sm font-medium text-[var(--color-text)]">
          批量任务 · {done}/{total} 已完成
        </span>
        <button
          onClick={() => void refresh()}
          className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
        >
          刷新
        </button>
      </div>

      {/* 进度条 */}
      <div className="h-1.5 rounded-full bg-[var(--color-surface-hover)] overflow-hidden">
        <div
          className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-500"
          style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }}
        />
      </div>

      {/* 任务列表 */}
      <div className="flex flex-col gap-2">
        {jobs.map((job) => (
          <div
            key={job.id}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden"
          >
            <div
              className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-[var(--color-surface-hover)] transition-colors"
              onClick={() => setExpandedId(expandedId === job.id ? null : job.id)}
            >
              {/* 序号 */}
              <span className="text-xs font-mono text-[var(--color-text-muted)] w-6 text-center">
                #{job.shotIndex + 1}
              </span>
              {/* 描述 */}
              <span className="flex-1 text-sm text-[var(--color-text)] truncate">
                {job.shotDescription || `分镜 ${job.shotIndex + 1}`}
              </span>
              {/* 状态 */}
              <span className={`text-[11px] font-medium ${STATUS_COLOR[job.status]}`}>
                {STATUS_LABEL[job.status]}
              </span>
              {/* 队列位置 */}
              {job.queueInfo?.queue_idx != null && (
                <span className="text-[10px] text-[var(--color-text-muted)]">
                  队列 #{job.queueInfo.queue_idx}
                </span>
              )}
              {/* 展开箭头 */}
              <span className="text-[var(--color-text-muted)] text-xs">
                {expandedId === job.id ? '▲' : '▼'}
              </span>
            </div>

            {/* 展开详情 */}
            {expandedId === job.id && (
              <div className="border-t border-[var(--color-border)] px-3 py-3 space-y-2.5">
                {/* 失败原因 */}
                {job.status === 'failed' && job.failReason && (
                  <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-2.5 py-1.5">
                    {job.failReason}
                  </p>
                )}

                {/* 视频预览 */}
                {job.status === 'done' && job.videoUrl && (
                  <video
                    src={job.videoUrl}
                    controls
                    className="w-full rounded-lg max-h-[240px] object-contain bg-black"
                    preload="metadata"
                  />
                )}

                {/* 操作按钮 */}
                <div className="flex gap-2">
                  {job.status === 'done' && onImportVideo && (
                    <button
                      onClick={() => onImportVideo(job)}
                      className="flex-1 rounded-lg bg-[var(--color-primary)] text-white text-xs font-medium py-1.5 hover:opacity-90 transition-opacity"
                    >
                      ⬇ 导入到时间轴
                    </button>
                  )}
                  {(job.status === 'pending' || job.status === 'queuing') && (
                    <button
                      onClick={() => void handleCancel(job.id)}
                      disabled={cancellingId === job.id}
                      className="rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] text-xs px-3 py-1.5 hover:text-red-400 hover:border-red-400/30 transition-colors disabled:opacity-50"
                    >
                      {cancellingId === job.id ? '取消中…' : '取消'}
                    </button>
                  )}
                  <span className="text-[9px] text-[var(--color-text-muted)] self-center ml-auto">
                    提交于 {new Date(job.createdAt).toLocaleString('zh-CN')}
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
