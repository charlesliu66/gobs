import { useMemo } from 'react';
import { useGlobalJobs } from '../hooks/useGlobalJobs';
import { useLocale } from '../i18n/LocaleContext.tsx';
import { pickUiText } from '../i18n/uiText.ts';

const STATUS_CONFIG: Record<string, { zh: string; en: string; color: string; dot: string; animate?: boolean }> = {
  awaiting_submit: { zh: '平台排队中', en: 'In platform queue', color: 'text-violet-200', dot: 'bg-violet-400', animate: true },
  pending: { zh: '已提交到 Ark', en: 'Submitted to Ark', color: 'text-sky-200', dot: 'bg-sky-400', animate: true },
  queuing: { zh: 'Ark 队列中', en: 'Queued in Ark', color: 'text-amber-200', dot: 'bg-amber-400', animate: true },
  processing: { zh: 'Ark 生成中', en: 'Rendering in Ark', color: 'text-emerald-200', dot: 'bg-emerald-400', animate: true },
  done: { zh: '已完成', en: 'Completed', color: 'text-emerald-300', dot: 'bg-emerald-400' },
  failed: { zh: '生成失败', en: 'Failed', color: 'text-rose-300', dot: 'bg-rose-400' },
  cancelled: { zh: '已停止跟进', en: 'Tracking stopped', color: 'text-slate-300', dot: 'bg-slate-400' },
};

function relativeTime(iso: string, uiLocale: 'zh-CN' | 'en'): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return uiLocale === 'en' ? 'just now' : '刚刚';
  if (diff < 3_600_000) {
    const mins = Math.max(1, Math.floor(diff / 60_000));
    return uiLocale === 'en' ? `${mins} min ago` : `${mins} 分钟前`;
  }
  if (diff < 86_400_000) {
    const hours = Math.max(1, Math.floor(diff / 3_600_000));
    return uiLocale === 'en' ? `${hours} hr ago` : `${hours} 小时前`;
  }
  const days = Math.max(1, Math.floor(diff / 86_400_000));
  return uiLocale === 'en' ? `${days} day ago` : `${days} 天前`;
}

function sourceLabel(source: string | undefined, uiLocale: 'zh-CN' | 'en'): string {
  if (source === 'production') return uiLocale === 'en' ? 'Production' : '高级制片';
  if (source === 'quickfilm') return uiLocale === 'en' ? 'QuickFilm' : '一键成片';
  return uiLocale === 'en' ? 'Video Gen' : '视频生成';
}

function StatusDot({
  status,
}: {
  status: string;
}) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <span className="relative flex h-2.5 w-2.5 shrink-0">
      {cfg.animate && (
        <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${cfg.dot} opacity-50`} />
      )}
      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${cfg.dot}`} />
    </span>
  );
}

export function GlobalJobsPanel() {
  const { jobs, panelOpen, togglePanel, dismissJob, activeCount, snapshot } = useGlobalJobs();
  const { uiLocale } = useLocale();
  const uiText = <T,>(zh: T, en: T) => pickUiText(uiLocale, zh, en);

  const activeJobs = useMemo(
    () => jobs.filter((job) => !['done', 'failed', 'cancelled'].includes(job.status)),
    [jobs],
  );
  const recentDone = useMemo(
    () => jobs.filter((job) => ['done', 'failed', 'cancelled'].includes(job.status)).slice(0, 10),
    [jobs],
  );

  if (!panelOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[290] bg-black/30 backdrop-blur-[2px]"
        onClick={togglePanel}
        role="presentation"
      />

      <div className="fixed bottom-16 right-4 z-[300] flex max-h-[70vh] w-[400px] flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-2xl sm:right-6">
        <div className="border-b border-[var(--color-border)] px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              <span className="text-sm font-semibold text-[var(--color-text)]">
                {uiText('生成队列', 'Generation queue')}
              </span>
              {activeCount > 0 && (
                <span className="rounded-full bg-[var(--color-primary)] px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                  {activeCount}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={togglePanel}
              className="rounded-lg p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
              aria-label={uiText('关闭队列面板', 'Close queue panel')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
            <div className="rounded-xl border border-violet-500/25 bg-violet-500/10 px-3 py-2 text-violet-100">
              <div className="opacity-70">{uiText('平台排队', 'Platform queue')}</div>
              <div className="mt-1 text-base font-semibold">{snapshot.totalWaiting}</div>
            </div>
            <div className="rounded-xl border border-sky-500/25 bg-sky-500/10 px-3 py-2 text-sky-100">
              <div className="opacity-70">{uiText('Ark 并发', 'Ark slots')}</div>
              <div className="mt-1 text-base font-semibold">
                {snapshot.totalActive}/{snapshot.maxConcurrent}
              </div>
            </div>
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-emerald-100">
              <div className="opacity-70">{uiText('空闲槽位', 'Free slots')}</div>
              <div className="mt-1 text-base font-semibold">{snapshot.availableSlots}</div>
            </div>
          </div>
          <p className="mt-2 text-[10px] text-[var(--color-text-muted)]">
            {uiText(
              '平台最多同时向 Ark 提交 3 条视频任务。你不需要停留在当前页面，完成后会自动回写并提醒。',
              'The platform can submit up to 3 Ark video jobs in parallel. You can leave the page; finished results will sync back automatically with a reminder.',
            )}
          </p>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
          {jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-[var(--color-text-muted)]">
                {uiText('暂无生成任务', 'No generation jobs yet')}
              </p>
              <p className="mt-1 text-[11px] text-[var(--color-text-muted)]/70">
                {uiText('发起视频生成后，这里会显示平台排队、Ark 状态和完成结果。', 'Once you start generating, this panel will show platform queue, Ark status, and completion results.')}
              </p>
            </div>
          ) : (
            <>
              {activeJobs.length > 0 && (
                <section className="space-y-2">
                  <div className="px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                    {uiText('进行中', 'Active')}
                  </div>
                  {activeJobs.map((job) => {
                    const cfg = STATUS_CONFIG[job.status] ?? STATUS_CONFIG.pending;
                    return (
                      <div key={job.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3">
                        <div className="flex items-start gap-2.5">
                          <StatusDot status={job.status} />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className={`text-[11px] font-semibold ${cfg.color}`}>
                                {uiText(cfg.zh, cfg.en)}
                              </span>
                              <span className="rounded border border-[var(--color-border)] px-1 py-px text-[9px] text-[var(--color-text-muted)]">
                                {sourceLabel(job.source, uiLocale)}
                              </span>
                            </div>
                            <p className="mt-1 truncate text-[12px] text-[var(--color-text)]">
                              {job.shotDescription || uiText(`镜头 ${job.shotIndex}`, `Shot ${job.shotIndex}`)}
                            </p>
                            <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">
                              {job.status === 'awaiting_submit' && typeof job.globalQueuePos === 'number'
                                ? uiText(`平台队列 #${job.globalQueuePos + 1}`, `Platform queue #${job.globalQueuePos + 1}`)
                                : job.status === 'pending'
                                  ? uiText('已拿到 Ark task id，等待 Ark 受理。', 'Ark task id received, waiting for Ark acceptance.')
                                  : job.status === 'queuing'
                                    ? uiText(
                                        job.queueInfo?.queue_idx != null
                                          ? `Ark 队列 #${job.queueInfo.queue_idx + 1}`
                                          : 'Ark 已接收，正在队列中。',
                                        job.queueInfo?.queue_idx != null
                                          ? `Ark queue #${job.queueInfo.queue_idx + 1}`
                                          : 'Accepted by Ark and waiting in queue.',
                                      )
                                    : uiText('Ark 正在渲染当前视频。', 'Ark is rendering this video.')}
                            </p>
                            {typeof job.etaSec === 'number' && job.status === 'awaiting_submit' && (
                              <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">
                                {uiText(`预计开始：约 ${Math.max(0, Math.round(job.etaSec / 60)) || 1} 分钟内`, `Estimated start: about ${Math.max(0, Math.round(job.etaSec / 60)) || 1} min`)}
                              </p>
                            )}
                            <p className="mt-1 text-[10px] text-[var(--color-text-muted)]/80">
                              {relativeTime(job.updatedAt || job.createdAt, uiLocale)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </section>
              )}

              {recentDone.length > 0 && (
                <section className="space-y-2">
                  <div className="px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                    {uiText('最近结果', 'Recent results')}
                  </div>
                  {recentDone.map((job) => {
                    const cfg = STATUS_CONFIG[job.status] ?? STATUS_CONFIG.done;
                    const reason = job.displayMessageZh || job.displayMessageEn || job.failReason;
                    return (
                      <div key={job.id} className="group flex items-start gap-2.5 rounded-xl border border-transparent px-3 py-2 hover:border-[var(--color-border)] hover:bg-[var(--color-surface)]">
                        <StatusDot status={job.status} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className={`text-[11px] font-medium ${cfg.color}`}>
                              {uiText(cfg.zh, cfg.en)}
                            </span>
                            <span className="text-[9px] text-[var(--color-text-muted)]">
                              {sourceLabel(job.source, uiLocale)}
                            </span>
                          </div>
                          <p className="mt-0.5 truncate text-[11px] text-[var(--color-text-muted)]">
                            {job.shotDescription || uiText(`镜头 ${job.shotIndex}`, `Shot ${job.shotIndex}`)}
                          </p>
                          {reason && job.status !== 'done' && (
                            <p className="mt-1 line-clamp-2 text-[10px] text-rose-300/90">{reason}</p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => dismissJob(job.id)}
                          className="rounded p-0.5 text-[var(--color-text-muted)] opacity-0 transition-opacity hover:text-[var(--color-text)] group-hover:opacity-100"
                          aria-label={uiText('从列表移除', 'Dismiss from list')}
                          title={uiText('从列表移除', 'Dismiss from list')}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

export function GlobalJobsTrigger() {
  const { activeCount, togglePanel, panelOpen } = useGlobalJobs();
  const { uiLocale } = useLocale();
  const uiText = <T,>(zh: T, en: T) => pickUiText(uiLocale, zh, en);

  return (
    <button
      type="button"
      onClick={togglePanel}
      className={`fixed bottom-4 right-4 z-[280] flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-medium shadow-lg transition-all sm:right-6 ${
        panelOpen
          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/20 text-[var(--color-primary)]'
          : activeCount > 0
            ? 'border-[var(--color-primary)]/50 bg-[var(--color-surface-elevated)] text-[var(--color-text)] hover:border-[var(--color-primary)]'
            : 'border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/30 hover:text-[var(--color-text)]'
      }`}
      aria-label={uiText('生成队列', 'Generation queue')}
      title={uiText('生成队列', 'Generation queue')}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
      {activeCount > 0 ? (
        <>
          <span>{uiText(`${activeCount} 个任务`, `${activeCount} jobs`)}</span>
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-primary)] opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--color-primary)]" />
          </span>
        </>
      ) : (
        <span>{uiText('队列', 'Queue')}</span>
      )}
    </button>
  );
}
