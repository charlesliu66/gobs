import type { ReactNode } from 'react';
import { useCallback, useId, useMemo, useState } from 'react';
import type { SubtitleCue } from '../types/timeline';
import { formatTimelineTime } from '../utils/formatTimelineTime';

export interface TimelineClipToolbarProps {
  /** 是否选中了视频轨片段 */
  hasSelection: boolean;
  canSplit: boolean;
  canTrimHead: boolean;
  canTrimTail: boolean;
  canMoveEarlier: boolean;
  canMoveLater: boolean;
  transition: 'cut' | 'crossfade';
  /** 一行溯源：文件名 + 镜号 */
  summaryLine: string;
  currentTime: number;
  timelineDuration: number;
  onSplit: () => void;
  onTrimHead: () => void;
  onTrimTail: () => void;
  onDelete: () => void;
  onMoveEarlier: () => void;
  onMoveLater: () => void;
  onTransitionChange: (t: 'cut' | 'crossfade') => void;
  onAddSubtitle: (text: string, startSec: number, endSec: number) => void;
  subtitleCueCount: number;
  subtitleCues: SubtitleCue[];
  onRemoveSubtitle: (id: string) => void;
}

function IconBtn({
  title,
  disabled,
  onClick,
  children,
}: {
  title: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border border-transparent text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] disabled:pointer-events-none disabled:opacity-35"
    >
      {children}
    </button>
  );
}

export function TimelineClipToolbar({
  hasSelection,
  canSplit,
  canTrimHead,
  canTrimTail,
  canMoveEarlier,
  canMoveLater,
  transition,
  summaryLine,
  currentTime,
  timelineDuration,
  onSplit,
  onTrimHead,
  onTrimTail,
  onDelete,
  onMoveEarlier,
  onMoveLater,
  onTransitionChange,
  onAddSubtitle,
  subtitleCueCount,
  subtitleCues,
  onRemoveSubtitle,
}: TimelineClipToolbarProps) {
  const [infoOpen, setInfoOpen] = useState(false);
  const [subOpen, setSubOpen] = useState(false);
  const [subText, setSubText] = useState('');
  const [subEndRel, setSubEndRel] = useState('2');
  const infoId = useId();

  const subEndSec = useMemo(() => {
    const n = Number(String(subEndRel).replace(',', '.'));
    return Number.isFinite(n) ? Math.max(0.2, n) : 2;
  }, [subEndRel]);

  const addSubtitle = useCallback(() => {
    const text = subText.trim();
    if (!text) return;
    const startSec = currentTime;
    const endSec = Math.min(currentTime + subEndSec, Math.max(timelineDuration, currentTime + 0.2));
    onAddSubtitle(text, startSec, endSec);
    setSubText('');
    setSubOpen(false);
  }, [subText, currentTime, subEndSec, timelineDuration, onAddSubtitle]);

  const dis = !hasSelection;

  return (
    <div className="flex flex-col gap-1 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5">
      <div className="flex min-h-[32px] items-center gap-0.5 overflow-x-auto">
        <span className="mr-1 flex-shrink-0 text-[10px] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
          片段
        </span>

        {/* 拆分 */}
        <IconBtn title="在播放头处拆分 (两侧需留足时长)" disabled={dis || !canSplit} onClick={onSplit}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="6" cy="6" r="3" />
            <circle cx="6" cy="18" r="3" />
            <path d="M20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12" />
          </svg>
        </IconBtn>

        {/* 掐头 */}
        <IconBtn title="掐头：播放头之前丢弃" disabled={dis || !canTrimHead} onClick={onTrimHead}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 7V5a2 2 0 012-2h2M4 17v2a2 2 0 002 2h2M15 5h4a2 2 0 012 2v2M15 19h4a2 2 0 002-2v-2" />
            <path d="M9 12h6" />
          </svg>
        </IconBtn>

        {/* 去尾 */}
        <IconBtn title="去尾：播放头之后丢弃" disabled={dis || !canTrimTail} onClick={onTrimTail}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 7V5a2 2 0 00-2-2h-2M20 17v2a2 2 0 01-2 2h-2M9 5H5a2 2 0 00-2 2v2M9 19H5a2 2 0 01-2-2v-2" />
            <path d="M9 12h6" />
          </svg>
        </IconBtn>

        <div className="mx-1 h-5 w-px flex-shrink-0 bg-[var(--color-border)]" aria-hidden />

        <IconBtn title="前移一段" disabled={dis || !canMoveEarlier} onClick={onMoveEarlier}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </IconBtn>
        <IconBtn title="后移一段" disabled={dis || !canMoveLater} onClick={onMoveLater}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </IconBtn>

        <IconBtn title="删除此片段" disabled={dis} onClick={onDelete}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
          </svg>
        </IconBtn>

        <div className="mx-1 h-5 w-px flex-shrink-0 bg-[var(--color-border)]" aria-hidden />

        <div className="flex flex-shrink-0 items-center gap-0.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-0.5">
          <button
            type="button"
            disabled={dis}
            title="硬切"
            onClick={() => onTransitionChange('cut')}
            className={`rounded px-2 py-1 text-[10px] font-medium ${
              transition === 'cut' ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            } disabled:opacity-35`}
          >
            切
          </button>
          <button
            type="button"
            disabled={dis}
            title="交叉淡化（导出生效）"
            onClick={() => onTransitionChange('crossfade')}
            className={`rounded px-2 py-1 text-[10px] font-medium ${
              transition === 'crossfade'
                ? 'bg-[var(--color-primary)] text-white'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            } disabled:opacity-35`}
          >
            叠
          </button>
        </div>

        <div className="relative flex flex-shrink-0">
          <IconBtn title="从播放头添加字幕" disabled={dis} onClick={() => setSubOpen((o) => !o)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 7h16M4 12h10M4 17h14" />
            </svg>
            {subtitleCueCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-amber-500 px-0.5 text-[8px] font-bold text-black">
                {subtitleCueCount > 9 ? '9+' : subtitleCueCount}
              </span>
            )}
          </IconBtn>
          {subOpen && hasSelection && (
            <div className="absolute bottom-full left-0 z-50 mb-1 w-[min(280px,85vw)] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-2 shadow-xl">
              <p className="mb-1 text-[10px] text-[var(--color-text-muted)]">
                自 {formatTimelineTime(currentTime)} 起，时长 {subEndRel}s
              </p>
              <input
                value={subText}
                onChange={(e) => setSubText(e.target.value)}
                placeholder="字幕文案"
                className="mb-1 w-full rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-[11px] text-[var(--color-text)]"
              />
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 text-[10px] text-[var(--color-text-muted)]">
                  时长(s)
                  <input
                    value={subEndRel}
                    onChange={(e) => setSubEndRel(e.target.value)}
                    className="w-14 rounded border border-[var(--color-border)] px-1 py-0.5 font-mono text-[10px]"
                  />
                </label>
                <button
                  type="button"
                  onClick={addSubtitle}
                  className="ml-auto rounded bg-[var(--color-primary)] px-2 py-1 text-[10px] font-medium text-white"
                >
                  添加
                </button>
              </div>
              {subtitleCues.length > 0 && (
                <ul className="mt-2 max-h-[100px] space-y-1 overflow-y-auto border-t border-[var(--color-border)] pt-2">
                  {subtitleCues.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-start justify-between gap-1 text-[10px] text-[var(--color-text)]"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="font-mono text-[var(--color-text-muted)]">
                          {formatTimelineTime(s.startSec)}–{formatTimelineTime(s.endSec)}
                        </span>{' '}
                        {s.text}
                      </span>
                      <button
                        type="button"
                        className="flex-shrink-0 text-red-500 hover:underline"
                        onClick={() => onRemoveSubtitle(s.id)}
                      >
                        删
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="relative ml-auto flex flex-shrink-0 items-center">
          <button
            type="button"
            id={infoId}
            title="原素材信息"
            disabled={!hasSelection}
            onClick={() => setInfoOpen((o) => !o)}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] disabled:opacity-35"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
          </button>
          {infoOpen && hasSelection && (
            <div
              role="tooltip"
              className="absolute bottom-full right-0 z-50 mb-1 w-[min(260px,85vw)] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-2 text-left shadow-xl"
            >
              <p className="text-[10px] leading-relaxed text-[var(--color-text)]">{summaryLine}</p>
            </div>
          )}
        </div>
      </div>
      {!hasSelection && (
        <p className="text-[9px] leading-tight text-[var(--color-text-muted)]">
          轻点视频轨上的片段以选中，再用上方工具在播放头处拆分、掐头去尾或调序。
        </p>
      )}
    </div>
  );
}
