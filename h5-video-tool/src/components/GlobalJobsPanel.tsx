/**
 * 全局生成队列看板 — 浮动面板
 * 从 Layout 右下角触发，实时展示所有生成任务状态。
 */
import { useGlobalJobs } from '../hooks/useGlobalJobs';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; animate?: boolean }> = {
  pending:          { label: '排队中',  color: 'text-amber-300',  bg: 'bg-amber-500/15', animate: true },
  awaiting_submit:  { label: '待提交',  color: 'text-slate-400',  bg: 'bg-slate-500/15' },
  queuing:          { label: '排队中',  color: 'text-amber-300',  bg: 'bg-amber-500/15', animate: true },
  processing:       { label: '生成中',  color: 'text-cyan-300',   bg: 'bg-cyan-500/15', animate: true },
  done:             { label: '已完成',  color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
  failed:           { label: '失败',    color: 'text-red-400',    bg: 'bg-red-500/15' },
  cancelled:        { label: '已取消',  color: 'text-slate-500',  bg: 'bg-slate-500/10' },
};

function StatusDot({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <span className="relative flex h-2 w-2 shrink-0">
      {cfg.animate && (
        <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-50 ${cfg.bg}`} />
      )}
      <span className={`relative inline-flex h-2 w-2 rounded-full ${cfg.bg}`} />
    </span>
  );
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return '刚刚';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}小时前`;
  return `${Math.floor(diff / 86_400_000)}天前`;
}

function sourceLabel(source?: string): string {
  if (source === 'production') return '高级制片';
  if (source === 'quickfilm') return '一键成片';
  return '视频生成';
}

export function GlobalJobsPanel() {
  const { jobs, panelOpen, togglePanel, dismissJob, activeCount } = useGlobalJobs();

  if (!panelOpen) return null;

  const activeJobs = jobs.filter((j) => !['done', 'failed', 'cancelled'].includes(j.status));
  const recentDone = jobs.filter((j) => ['done', 'failed', 'cancelled'].includes(j.status)).slice(0, 10);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[290] bg-black/30 backdrop-blur-[2px]"
        onClick={togglePanel}
        role="presentation"
      />

      {/* Panel */}
      <div className="fixed bottom-16 right-4 z-[300] w-[380px] max-h-[70vh] flex flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-2xl overflow-hidden animate-fade-in-up sm:right-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            <span className="text-sm font-semibold text-[var(--color-text)]">生成队列</span>
            {activeCount > 0 && (
              <span className="rounded-full bg-[var(--color-primary)] px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
                {activeCount}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={togglePanel}
            className="rounded-lg p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
            aria-label="关闭面板"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          {jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-text-muted)] opacity-40">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className="mt-3 text-xs text-[var(--color-text-muted)]">暂无生成任务</p>
              <p className="mt-1 text-[10px] text-[var(--color-text-muted)] opacity-60">在高级制片或一键成片中发起生成后，任务将实时显示在这里</p>
            </div>
          ) : (
            <>
              {/* Active jobs */}
              {activeJobs.length > 0 && (
                <div className="space-y-1">
                  <div className="px-1 pt-1 text-[10px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]">进行中</div>
                  {activeJobs.map((job) => {
                    const cfg = STATUS_CONFIG[job.status] ?? STATUS_CONFIG.pending;
                    return (
                      <div key={job.id} className="flex items-start gap-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5">
                        <StatusDot status={job.status} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[10px] font-semibold ${cfg.color}`}>{cfg.label}</span>
                            <span className="text-[9px] rounded border border-[var(--color-border)] px-1 py-px text-[var(--color-text-muted)]">{sourceLabel(job.source)}</span>
                          </div>
                          <p className="mt-0.5 text-[11px] text-[var(--color-text)] truncate">{job.shotDescription || `镜头 ${job.shotIndex + 1}`}</p>
                          <p className="mt-0.5 text-[9px] text-[var(--color-text-muted)]">{relativeTime(job.updatedAt || job.createdAt)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Completed jobs */}
              {recentDone.length > 0 && (
                <div className="space-y-1">
                  <div className="px-1 pt-2 text-[10px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]">最近完成</div>
                  {recentDone.map((job) => {
                    const cfg = STATUS_CONFIG[job.status] ?? STATUS_CONFIG.done;
                    return (
                      <div key={job.id} className="group flex items-start gap-2.5 rounded-lg border border-transparent px-3 py-2 hover:border-[var(--color-border)] hover:bg-[var(--color-surface)]">
                        <StatusDot status={job.status} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[10px] ${cfg.color}`}>{cfg.label}</span>
                            <span className="text-[9px] text-[var(--color-text-muted)]">{sourceLabel(job.source)}</span>
                          </div>
                          <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)] truncate">{job.shotDescription || `镜头 ${job.shotIndex + 1}`}</p>
                          {job.status === 'failed' && job.failReason && (
                            <p className="mt-0.5 text-[9px] text-red-400/80 truncate">{job.failReason}</p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => dismissJob(job.id)}
                          className="opacity-0 group-hover:opacity-100 rounded p-0.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-opacity"
                          aria-label="移除"
                          title="从列表移除"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

/** 浮动触发按钮（放在 Layout 右下角） */
export function GlobalJobsTrigger() {
  const { activeCount, togglePanel, panelOpen } = useGlobalJobs();

  return (
    <button
      type="button"
      onClick={togglePanel}
      className={`fixed bottom-4 right-4 z-[280] flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-medium shadow-lg transition-all sm:right-6 ${
        panelOpen
          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/20 text-[var(--color-primary)]'
          : activeCount > 0
            ? 'border-[var(--color-primary)]/50 bg-[var(--color-surface-elevated)] text-[var(--color-text)] hover:border-[var(--color-primary)]'
            : 'border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-primary)]/30'
      }`}
      aria-label="生成队列"
      title="生成队列"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
      {activeCount > 0 ? (
        <>
          <span>{activeCount} 个任务</span>
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-primary)] opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--color-primary)]" />
          </span>
        </>
      ) : (
        <span>队列</span>
      )}
    </button>
  );
}
