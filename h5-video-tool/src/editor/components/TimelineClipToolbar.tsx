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
  /** 当前选中片段的 sourceStart/sourceEnd（秒），用于精确 Trim */
  clipSourceStart?: number;
  clipSourceEnd?: number;
  /** 当前片段速度 (1.0 = 正常) */
  clipSpeed?: number;
  /** 当前片段音量 (100 = 原声) */
  clipVolume?: number;
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
  /** 精确 Trim：设置片段入出点（秒） */
  onSetSourceRange?: (start: number, end: number) => void;
  /** 设置播放速度 */
  onSetSpeed?: (speed: number) => void;
  /** 设置原声音量 (0-200) */
  onSetVolume?: (volume: number) => void;
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
  clipSourceStart,
  clipSourceEnd,
  clipSpeed = 1,
  clipVolume = 100,
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
  onSetSourceRange,
  onSetSpeed,
  onSetVolume,
}: TimelineClipToolbarProps) {
  const [infoOpen, setInfoOpen] = useState(false);
  const [subOpen, setSubOpen] = useState(false);
  const [trimOpen, setTrimOpen] = useState(false);
  const [speedOpen, setSpeedOpen] = useState(false);
  const [subText, setSubText] = useState('');
  // 精确 Trim 本地编辑状态
  const [trimStart, setTrimStart] = useState('');
  const [trimEnd, setTrimEnd] = useState('');

  // 打开精确 Trim 面板时同步当前值
  const handleOpenTrim = useCallback(() => {
    setTrimStart(clipSourceStart !== undefined ? String(clipSourceStart.toFixed(2)) : '0');
    setTrimEnd(clipSourceEnd !== undefined ? String(clipSourceEnd.toFixed(2)) : '');
    setTrimOpen((o) => !o);
    setSpeedOpen(false);
  }, [clipSourceStart, clipSourceEnd]);

  const handleApplyTrim = useCallback(() => {
    const s = parseFloat(trimStart);
    const e = parseFloat(trimEnd);
    if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return;
    onSetSourceRange?.(s, e);
    setTrimOpen(false);
  }, [trimStart, trimEnd, onSetSourceRange]);

  const SPEED_OPTIONS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4] as const;
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

        {/* 精确 Trim 入出点 */}
        <div className="relative flex flex-shrink-0">
          <button
            type="button"
            disabled={dis || !onSetSourceRange}
            title="精确设置入出点（秒）"
            onClick={handleOpenTrim}
            className={`flex h-8 items-center gap-1 rounded-md border px-2 text-[10px] font-medium transition-colors disabled:pointer-events-none disabled:opacity-35 ${
              trimOpen
                ? 'border-[var(--color-primary)]/50 bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                : 'border-transparent text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]'
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 3L3 21M10.5 3H3v7.5M13.5 21H21v-7.5"/></svg>
            Trim
          </button>
          {trimOpen && hasSelection && (
            <div className="absolute bottom-full left-0 z-50 mb-1 w-64 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3 shadow-xl">
              <p className="mb-2 text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">精确入出点（秒）</p>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1">
                  <label className="block text-[9px] text-[var(--color-text-muted)] mb-0.5">入点</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={trimStart}
                    onChange={(e) => setTrimStart(e.target.value)}
                    className="w-full rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 font-mono text-[11px] text-[var(--color-text)] focus:border-[var(--color-primary)]/50 focus:outline-none"
                  />
                </div>
                <span className="text-[var(--color-text-muted)] mt-4">→</span>
                <div className="flex-1">
                  <label className="block text-[9px] text-[var(--color-text-muted)] mb-0.5">出点</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={trimEnd}
                    onChange={(e) => setTrimEnd(e.target.value)}
                    className="w-full rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 font-mono text-[11px] text-[var(--color-text)] focus:border-[var(--color-primary)]/50 focus:outline-none"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleApplyTrim}
                className="w-full rounded bg-[var(--color-primary)] py-1.5 text-[11px] font-medium text-white hover:bg-[var(--color-primary-hover)] transition-colors"
              >
                应用
              </button>
            </div>
          )}
        </div>

        {/* 播放速度 */}
        <div className="relative flex flex-shrink-0">
          <button
            type="button"
            disabled={dis || !onSetSpeed}
            title="播放速度"
            onClick={() => { setSpeedOpen((o) => !o); setTrimOpen(false); }}
            className={`flex h-8 items-center gap-1 rounded-md border px-2 text-[10px] font-medium transition-colors disabled:pointer-events-none disabled:opacity-35 ${
              speedOpen || clipSpeed !== 1
                ? 'border-[var(--color-primary)]/50 bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                : 'border-transparent text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]'
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            {clipSpeed !== 1 ? `${clipSpeed}×` : '速度'}
          </button>
          {speedOpen && hasSelection && (
            <div className="absolute bottom-full left-0 z-50 mb-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-2 shadow-xl">
              <p className="mb-1.5 text-[9px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">播放速度</p>
              <div className="flex flex-wrap gap-1">
                {SPEED_OPTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => { onSetSpeed?.(s); setSpeedOpen(false); }}
                    className={`rounded px-2 py-1 text-[10px] font-medium transition-colors ${
                      clipSpeed === s
                        ? 'bg-[var(--color-primary)] text-white'
                        : 'bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                    }`}
                  >
                    {s}×
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 原声音量 */}
        <div className="flex flex-shrink-0 items-center gap-1 rounded-md border border-transparent px-1">
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={clipVolume === 0 ? 'var(--color-error)' : 'var(--color-text-muted)'}
            strokeWidth="2" className={dis ? 'opacity-35' : ''}
          >
            {clipVolume === 0
              ? <><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></>
              : <><path d="M11 5L6 9H2v6h4l5 4V5z"/>{clipVolume > 50 && <path d="M19.07 4.93a10 10 0 010 14.14"/>}<path d="M15.54 8.46a5 5 0 010 7.07"/></>
            }
          </svg>
          <input
            type="range"
            min={0}
            max={200}
            step={5}
            value={clipVolume}
            disabled={dis || !onSetVolume}
            onChange={(e) => onSetVolume?.(Number(e.target.value))}
            className="h-1.5 w-16 cursor-pointer accent-[var(--color-primary)] disabled:opacity-35"
            title={`原声音量 ${clipVolume}%`}
          />
          <span className={`w-7 text-right font-mono text-[9px] ${dis ? 'opacity-35' : ''} text-[var(--color-text-muted)]`}>
            {clipVolume}%
          </span>
        </div>

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
          <IconBtn title="从播放头添加字幕" disabled={dis} onClick={() => { setSubOpen((o) => !o); setTrimOpen(false); setSpeedOpen(false); }}>
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
        <div className="flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 px-2.5 py-1.5">
          <span className="text-[var(--color-primary)] text-sm">👆</span>
          <p className="text-[10px] leading-snug text-[var(--color-primary)]/80 font-medium">
            点击时间轴上的视频片段即可选中，然后使用上方的速度 / Trim / 音量工具
          </p>
        </div>
      )}
    </div>
  );
}
