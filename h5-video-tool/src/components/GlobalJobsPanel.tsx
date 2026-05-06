import { useMemo } from 'react';
import { useGlobalJobs } from '../hooks/useGlobalJobs';
import { useLocale } from '../i18n/LocaleContext.tsx';
import { pickUiText } from '../i18n/uiText.ts';
import { resolveFriendlyVideoProgress } from '../studio/storyboardQueueState';

const TERMINAL_STATUS_CONFIG: Record<string, { zh: string; en: string; color: string; dot: string }> = {
  done: { zh: '已完成', en: 'Completed', color: 'text-emerald-300', dot: 'bg-emerald-400' },
  failed: { zh: '生成失败', en: 'Failed', color: 'text-rose-300', dot: 'bg-rose-400' },
  cancelled: { zh: '已停止', en: 'Stopped', color: 'text-slate-300', dot: 'bg-slate-400' },
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
  color,
  animate,
}: {
  color: string;
  animate?: boolean;
}) {
  return (
    <span className="relative flex h-2.5 w-2.5 shrink-0">
      {animate && (
        <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${color} opacity-50`} />
      )}
      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${color}`} />
    </span>
  );
}

function stageVisual(stage: string): { color: string; dot: string; animate?: boolean } {
  switch (stage) {
    case 'queued':
      return { color: 'text-violet-200', dot: 'bg-violet-400', animate: true };
    case 'starting':
      return { color: 'text-sky-200', dot: 'bg-sky-400', animate: true };
    case 'generating':
      return { color: 'text-emerald-200', dot: 'bg-emerald-400', animate: true };
    case 'finishing':
      return { color: 'text-lime-200', dot: 'bg-lime-400', animate: true };
    default:
      return { color: 'text-slate-300', dot: 'bg-slate-400' };
  }
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
                {uiText('视频进度', 'Video progress')}
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
              aria-label={uiText('关闭进度面板', 'Close progress panel')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
            <div className="rounded-xl border border-violet-500/25 bg-violet-500/10 px-3 py-2 text-violet-100">
              <div className="opacity-70">{uiText('排队中', 'Queued')}</div>
              <div className="mt-1 text-base font-semibold">{snapshot.totalWaiting}</div>
            </div>
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-emerald-100">
              <div className="opacity-70">{uiText('正在生成', 'Generating')}</div>
              <div className="mt-1 text-base font-semibold">{snapshot.totalActive}</div>
            </div>
            <div className="rounded-xl border border-sky-500/25 bg-sky-500/10 px-3 py-2 text-sky-100">
              <div className="opacity-70">{uiText('可立即开始', 'Can start now')}</div>
              <div className="mt-1 text-base font-semibold">{snapshot.availableSlots}</div>
            </div>
          </div>
          <p className="mt-2 text-[10px] text-[var(--color-text-muted)]">
            {uiText(
              `系统最多同时处理 ${snapshot.maxConcurrent} 条视频。你可以离开当前页面，完成后会自动回写并提醒。`,
              `The system can handle up to ${snapshot.maxConcurrent} videos at once. You can leave this page and come back when the reminder arrives.`,
            )}
          </p>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
          {jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-[var(--color-text-muted)]">
                {uiText('暂时还没有视频任务', 'No video jobs yet')}
              </p>
              <p className="mt-1 text-[11px] text-[var(--color-text-muted)]/70">
                {uiText('开始生成后，这里会持续显示排队、生成和完成结果。', 'Once you start generating, this panel will keep showing queue, progress, and finished results.')}
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
                    const friendly = resolveFriendlyVideoProgress({ job, snapshot });
                    const visual = stageVisual(friendly.stage);
                    return (
                      <div key={job.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3">
                        <div className="flex items-start gap-2.5">
                          <StatusDot color={visual.dot} animate={visual.animate} />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className={`text-[11px] font-semibold ${visual.color}`}>
                                {uiText(friendly.shortLabelZh, friendly.shortLabelEn)}
                              </span>
                              <span className="rounded border border-[var(--color-border)] px-1 py-px text-[9px] text-[var(--color-text-muted)]">
                                {sourceLabel(job.source, uiLocale)}
                              </span>
                            </div>
                            <p className="mt-1 truncate text-[12px] text-[var(--color-text)]">
                              {job.shotDescription || uiText(`镜头 ${job.shotIndex}`, `Shot ${job.shotIndex}`)}
                            </p>
                            <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">
                              {uiText(friendly.detailZh, friendly.detailEn)}
                            </p>
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
                    const cfg = TERMINAL_STATUS_CONFIG[job.status] ?? TERMINAL_STATUS_CONFIG.done;
                    const reason = uiLocale === 'en'
                      ? job.displayMessageEn || job.displayMessageZh || job.failReason
                      : job.displayMessageZh || job.displayMessageEn || job.failReason;
                    return (
                      <div key={job.id} className="group flex items-start gap-2.5 rounded-xl border border-transparent px-3 py-2 hover:border-[var(--color-border)] hover:bg-[var(--color-surface)]">
                        <StatusDot color={cfg.dot} />
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
      aria-label={uiText('视频进度', 'Video progress')}
      title={uiText('视频进度', 'Video progress')}
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
        <span>{uiText('进度', 'Progress')}</span>
      )}
    </button>
  );
}
