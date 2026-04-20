/**
 * 版本历史时间线 — 可视化时间轴
 * 替换 StepStoryboardPreviewPanel 中的简单版本列表，
 * 以垂直时间轴展示每个版本的生成时间、来源和状态。
 */
import { useState, useMemo } from 'react';
import type { ProductionShotVideoVersion } from '../productionTypes';

interface VersionTimelineProps {
  versions: ProductionShotVideoVersion[];
  selectedVersionId?: string;
  onSelect: (id: string) => void;
  onKeepOnly: (id: string) => void;
}

function formatTimestamp(ts: number): { date: string; time: string; relative: string } {
  const d = new Date(ts || Date.now());
  const date = d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  const diff = Date.now() - ts;
  let relative: string;
  if (diff < 60_000) relative = '刚刚';
  else if (diff < 3_600_000) relative = `${Math.floor(diff / 60_000)}分钟前`;
  else if (diff < 86_400_000) relative = `${Math.floor(diff / 3_600_000)}小时前`;
  else relative = `${Math.floor(diff / 86_400_000)}天前`;
  return { date, time, relative };
}

function versionSource(v: ProductionShotVideoVersion): { label: string; icon: 'batch' | 'manual' | 'api' } {
  if (v.id.startsWith('batch-')) return { label: '批量生成', icon: 'batch' };
  if (v.taskId?.startsWith('dreamina-')) return { label: '即梦生成', icon: 'api' };
  return { label: '手动上传', icon: 'manual' };
}

export function VersionTimeline({ versions, selectedVersionId, onSelect, onKeepOnly }: VersionTimelineProps) {
  const [expanded, setExpanded] = useState(true);

  const sorted = useMemo(
    () => [...versions].sort((a, b) => b.createdAt - a.createdAt),
    [versions],
  );

  if (sorted.length === 0) return null;

  const selectedId = selectedVersionId ?? sorted[0]?.id;

  return (
    <div className="mt-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between px-3 py-2 text-[10px] font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
          版本时间线（{sorted.length}）
        </span>
        <span className="flex items-center gap-2">
          {selectedId && sorted.length > 1 && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); onKeepOnly(selectedId); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onKeepOnly(selectedId); } }}
              className="rounded border border-[var(--color-border)] px-1.5 py-0.5 hover:bg-[var(--color-surface-hover)] cursor-pointer"
            >
              仅保留当前
            </span>
          )}
          <svg
            width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className={`transition-transform duration-200 ${expanded ? 'rotate-0' : '-rotate-90'}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>

      {/* Timeline body */}
      {expanded && (
        <div className="max-h-52 overflow-y-auto px-3 pb-2">
          {sorted.length >= 5 && (
            <div className="mb-2 rounded border border-amber-500/30 bg-amber-950/20 px-2 py-1 text-[9px] text-amber-200/90">
              已有 {sorted.length} 个版本，建议保留当前版本以释放存储空间
            </div>
          )}

          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[7px] top-3 bottom-3 w-px bg-[var(--color-border)]" />

            {sorted.map((v, idx) => {
              const active = selectedId === v.id;
              const isFirst = idx === 0;
              const { date, time, relative } = formatTimestamp(v.createdAt);
              const source = versionSource(v);
              const vNum = sorted.length - idx;

              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => onSelect(v.id)}
                  className={`group relative flex w-full items-start gap-3 rounded-lg py-1.5 pl-5 pr-2 text-left transition-all ${
                    active
                      ? 'bg-[var(--color-primary)]/8'
                      : 'hover:bg-[var(--color-surface-hover)]'
                  }`}
                >
                  {/* Timeline dot */}
                  <div
                    className={`absolute left-0 top-[10px] z-10 flex h-[15px] w-[15px] items-center justify-center rounded-full border-2 transition-all ${
                      active
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)] shadow-[0_0_8px_rgba(124,141,255,0.4)]'
                        : 'border-[var(--color-border)] bg-[var(--color-surface)] group-hover:border-[var(--color-primary)]/50'
                    }`}
                  >
                    {active && (
                      <span className="h-1.5 w-1.5 rounded-full bg-white" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[11px] font-semibold ${
                        active ? 'text-[var(--color-primary)]' : 'text-[var(--color-text)]'
                      }`}>
                        V{vNum}
                      </span>
                      {isFirst && (
                        <span className="rounded-sm bg-emerald-500/20 px-1 py-px text-[8px] font-medium text-emerald-400">
                          最新
                        </span>
                      )}
                      {active && !isFirst && (
                        <span className="rounded-sm bg-[var(--color-primary)]/20 px-1 py-px text-[8px] font-medium text-[var(--color-primary)]">
                          当前
                        </span>
                      )}
                      <span className={`ml-auto text-[9px] ${
                        active ? 'text-[var(--color-primary)]/70' : 'text-[var(--color-text-muted)]'
                      }`}>
                        {relative}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-[9px] text-[var(--color-text-muted)]">
                      <span>{source.label}</span>
                      <span>·</span>
                      <span>{v.videoPath ? '已持久化' : '临时地址'}</span>
                      <span>·</span>
                      <span>{date} {time}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
