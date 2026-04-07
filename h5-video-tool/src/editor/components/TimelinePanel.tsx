import type { ReactNode } from 'react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { TimelineProject, VideoClip, AudioClip, TextClip } from '../types/timeline';
import { computeDurationSec, getAllTextClips } from '../types/timeline';
import { getTextPreset } from '../textPresets';
import { formatTimelineTime } from '../utils/formatTimelineTime';

/** 像素/秒：越大=同屏时间越短（放大细节）；越小=同屏时间越长（压缩概览）。长视频适配需能低于 12。 */
const PX_PER_SEC_DEFAULT = 64;
const PX_PER_SEC_MIN = 2;
const PX_PER_SEC_MAX = 220;

/** 与左侧轨标签一致，播放头/片段须在同一坐标系内累加 */
const LABEL_PX = 40;

/** 滚动容器内、扣掉左右 padding 与轨标签后，标尺+轨道可用的像素宽度 */
function getTimelineContentViewportWidth(scrollEl: HTMLElement): number {
  const cs = window.getComputedStyle(scrollEl);
  const pl = parseFloat(cs.paddingLeft) || 0;
  const pr = parseFloat(cs.paddingRight) || 0;
  const inner = scrollEl.clientWidth - pl - pr;
  return Math.max(48, inner - LABEL_PX);
}

function pickTickStep(secPerPixel: number): number {
  if (secPerPixel < 0.02) return 60;
  if (secPerPixel < 0.05) return 30;
  if (secPerPixel < 0.12) return 10;
  if (secPerPixel < 0.25) return 5;
  return 1;
}

interface TimelinePanelProps {
  project: TimelineProject;
  currentTime: number;
  durationSec: number;
  onSeek: (sec: number) => void;
  onDeleteClip: (trackId: string, clipId: string) => void;
  onMoveClip: (trackId: string, clipId: string, newTimelineStart: number) => void;
  /** 当前选中的视频片段（仅 v1），用于微调面板 */
  selectedVideoClipId?: string | null;
  onSelectVideoClip?: (clipId: string | null) => void;
  /** 视频轨片段拖拽结束：首尾吸附，消除缝隙黑场 */
  onVideoClipDragEnd?: () => void;
  /** 原声 / BGM 音量（与轨标签展开面板联动） */
  onMixChange?: (partial: { sourceAudio?: number; bgm?: number }) => void;
  /** 时间轴工具栏：播放 */
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  canPlay?: boolean;
  /** 预览区进入/退出全屏（由父组件绑定预览容器 ref） */
  onEnterPreviewFullscreen?: () => void;
  previewFullscreen?: boolean;
  /** 时间轴标尺上方：片段工具条（图标栏） */
  clipToolbar?: ReactNode;
  /** 文字轨选中 */
  onSelectTextClip?: (clipId: string | null) => void;
  selectedTextClipId?: string | null;
  /** 双击文字片段时打开编辑面板 */
  onOpenTextEditor?: () => void;
}

const CLIP_DRAG_SELECT_PX = 4;

export function TimelinePanel({
  project,
  currentTime,
  durationSec: durationFallback,
  onSeek,
  onDeleteClip,
  onMoveClip,
  selectedVideoClipId = null,
  onSelectVideoClip,
  onVideoClipDragEnd,
  onMixChange,
  isPlaying,
  onTogglePlay,
  canPlay,
  onEnterPreviewFullscreen,
  previewFullscreen,
  clipToolbar,
  onSelectTextClip,
  selectedTextClipId = null,
  onOpenTextEditor,
}: TimelinePanelProps) {
  const [pxPerSec, setPxPerSec] = useState(PX_PER_SEC_DEFAULT);
  /** 点击「原声」「BGM」轨标签展开音量条 */
  const [expandedMixTrack, setExpandedMixTrack] = useState<'a1' | 'a2' | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const rulerContentRef = useRef<HTMLDivElement>(null);

  const timelineDur = useMemo(() => {
    const d = computeDurationSec(project);
    return d > 0 ? d : durationFallback;
  }, [project, durationFallback]);

  const contentWidthPx = useMemo(
    () => Math.max(timelineDur, 8) * pxPerSec,
    [timelineDur, pxPerSec],
  );
  const totalWidthPx = LABEL_PX + contentWidthPx;

  const playheadContentPx = useMemo(() => {
    const t = Math.min(Math.max(currentTime, 0), timelineDur);
    return t * pxPerSec;
  }, [currentTime, timelineDur, pxPerSec]);

  const tickStep = useMemo(() => pickTickStep(1 / pxPerSec), [pxPerSec]);
  const rulerTicks = useMemo(() => {
    const ticks: number[] = [];
    for (let t = 0; t <= timelineDur + 1e-6; t += tickStep) {
      ticks.push(Math.round(t * 100) / 100);
    }
    if (ticks.length === 0 || ticks[ticks.length - 1]! < timelineDur - 0.01) {
      ticks.push(timelineDur);
    }
    return ticks;
  }, [timelineDur, tickStep]);

  const fitToView = useCallback(() => {
    const el = scrollRef.current;
    if (!el || timelineDur <= 0) return;
    const avail = getTimelineContentViewportWidth(el);
    /** 整段时长刚好铺满可视内容区：contentWidth = timelineDur * pxPerSec ≈ avail */
    const next = avail / timelineDur;
    const clamped = Math.min(PX_PER_SEC_MAX, Math.max(PX_PER_SEC_MIN, next));
    setPxPerSec(clamped);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.scrollLeft = 0;
      });
    });
  }, [timelineDur]);

  /** Shift+Z：适配视图（不在输入框内时） */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.shiftKey || e.key.toLowerCase() !== 'z') return;
      const t = e.target as HTMLElement | null;
      if (t?.closest('input, textarea, select, [contenteditable=true]')) return;
      e.preventDefault();
      fitToView();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fitToView]);

  const dragRef = useRef<{
    trackId: string;
    clipId: string;
    startClientX: number;
    startClientY: number;
    startTimeline: number;
    snapVideoOnEnd: boolean;
    moved: boolean;
  } | null>(null);

  const seekFromClientX = useCallback(
    (clientX: number) => {
      const ruler = rulerContentRef.current;
      if (!ruler) return;
      const rect = ruler.getBoundingClientRect();
      const x = clientX - rect.left;
      const t = (x / pxPerSec) * (x >= 0 ? 1 : 0);
      const clamped = Math.min(Math.max(t, 0), Math.max(timelineDur, 0.01));
      onSeek(clamped);
    },
    [onSeek, pxPerSec, timelineDur],
  );

  const onRulerPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      onSelectVideoClip?.(null);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    seekFromClientX(e.clientX);
    const onMove = (ev: PointerEvent) => {
        seekFromClientX(ev.clientX);
      };
      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [seekFromClientX, onSelectVideoClip],
  );

  const onPlayheadHandlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      if (e.button !== 0) return;
      seekFromClientX(e.clientX);
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      const onMove = (ev: PointerEvent) => seekFromClientX(ev.clientX);
      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [seekFromClientX],
  );

  const onClipMouseDown = useCallback(
    (e: React.MouseEvent, trackId: string, clip: VideoClip | AudioClip) => {
      /** 原声与视频轨锁定同步，不可单独拖拽 */
      if (trackId === 'a1') return;
      if ((e.target as HTMLElement).closest('[data-timeline-delete]')) return;
      e.stopPropagation();
      e.preventDefault();
      const tr = project.tracks.find((t) => t.id === trackId);
      dragRef.current = {
        trackId,
        clipId: clip.id,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startTimeline: clip.timelineStart,
        snapVideoOnEnd: tr?.type === 'video',
        moved: false,
      };
      const onMove = (ev: MouseEvent) => {
        const d = dragRef.current;
        if (!d) return;
        if (
          Math.abs(ev.clientX - d.startClientX) > CLIP_DRAG_SELECT_PX ||
          Math.abs(ev.clientY - d.startClientY) > CLIP_DRAG_SELECT_PX
        ) {
          d.moved = true;
        }
        const dx = ev.clientX - d.startClientX;
        const dSec = dx / pxPerSec;
        onMoveClip(d.trackId, d.clipId, d.startTimeline + dSec);
      };
      const onUp = () => {
        const d = dragRef.current;
        dragRef.current = null;
        if (d?.snapVideoOnEnd) {
          if (!d.moved && d.trackId === 'v1') {
            onSelectVideoClip?.(d.clipId);
          }
          onVideoClipDragEnd?.();
        }
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [onMoveClip, pxPerSec, onVideoClipDragEnd, onSelectVideoClip, project.tracks],
  );

  /** 标尺区域可用宽度（随面板缩放变化） */
  const [viewportContentWidth, setViewportContentWidth] = useState(0);
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const measure = () => setViewportContentWidth(getTimelineContentViewportWidth(el));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const secPerViewportHint = useMemo(() => {
    if (viewportContentWidth <= 0 || pxPerSec <= 0) return '—';
    return (viewportContentWidth / pxPerSec).toFixed(1);
  }, [viewportContentWidth, pxPerSec]);

  const mix = project.mix ?? { sourceAudio: 1, bgm: 0.85 };

  const CATEGORY_COLORS: Record<string, string> = {
    intro: 'bg-purple-500/70 border-purple-400',
    outro: 'bg-orange-500/70 border-orange-400',
    subtitle: 'bg-blue-500/70 border-blue-400',
    title: 'bg-cyan-500/70 border-cyan-400',
  };

  const textClips = useMemo(() => getAllTextClips(project), [project]);

  const toggleMixTrack = useCallback((trackId: 'a1' | 'a2') => {
    setExpandedMixTrack((prev) => (prev === trackId ? null : trackId));
  }, []);

  return (
    <div className="flex min-h-[180px] flex-col border-t border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
      {/* 工具栏：左缩放 | 中播放+时间 | 右适配+全屏 */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--color-border)] px-2 py-1.5">
        <div className="flex min-w-[140px] flex-1 flex-col gap-0.5">
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
              title="压缩时间轴：固定屏幕宽度内显示更长视频（概览）"
              onClick={() => setPxPerSec((p) => Math.max(PX_PER_SEC_MIN, p * 0.85))}
            >
              −
            </button>
            <input
              type="range"
              min={PX_PER_SEC_MIN}
              max={PX_PER_SEC_MAX}
              step={1}
              value={pxPerSec}
              onChange={(e) => setPxPerSec(Number(e.target.value))}
              className="h-1.5 min-w-[72px] flex-1 accent-amber-500"
              title="时间轴比例（像素/秒）。向左拖=同屏显示更长时间；向右=放大、同屏时间更短"
              aria-label="时间轴缩放"
            />
            <button
              type="button"
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
              title="放大时间轴：固定屏幕宽度内显示更短视频（细节）"
              onClick={() => setPxPerSec((p) => Math.min(PX_PER_SEC_MAX, p * 1.15))}
            >
              +
            </button>
          </div>
          <p className="text-[9px] leading-tight text-[var(--color-text-muted)]">
            比例 {pxPerSec} px/秒 · 可视区约 {secPerViewportHint} 秒宽
          </p>
        </div>

        <div className="flex flex-1 items-center justify-center gap-2">
          {onTogglePlay && (
            <button
              type="button"
              disabled={!canPlay}
              onClick={onTogglePlay}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-surface)] text-[var(--color-text)] ring-1 ring-[var(--color-border)] hover:bg-[var(--color-surface-hover)] disabled:opacity-40"
              title={isPlaying ? '暂停' : '播放'}
            >
              {isPlaying ? (
                <span className="inline-block h-3 w-3 border-x-2 border-current" />
              ) : (
                <span className="ml-0.5 inline-block border-y-[6px] border-l-[10px] border-y-transparent border-l-current" />
              )}
            </button>
          )}
          <span className="whitespace-nowrap font-mono text-[11px] tabular-nums text-[var(--color-text)]">
            {formatTimelineTime(currentTime)} / {formatTimelineTime(timelineDur)}
          </span>
        </div>

        <div className="flex flex-1 items-center justify-end gap-1">
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
            title="适配视图：自动缩放使整段工程在可视区内完整显示（Shift+Z）"
            onClick={fitToView}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 12H3M5 9l-3 3 3 3M16 12h5m-3-3l3 3-3 3" />
            </svg>
          </button>
          {onEnterPreviewFullscreen && (
            <button
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
              title={previewFullscreen ? '退出全屏' : '预览区全屏'}
              onClick={onEnterPreviewFullscreen}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {previewFullscreen ? (
                  <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                ) : (
                  <path d="M15 3h6v6M9 21H3v-6M21 9v6h-6M3 15V9h6" />
                )}
              </svg>
            </button>
          )}
        </div>
      </div>

      {clipToolbar}

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden p-2">
        <div style={{ width: totalWidthPx, minHeight: 120 }} className="relative">
          {/* 标尺 */}
          <div className="mb-1 flex">
            <div
              className="flex flex-shrink-0 items-end justify-center pb-0.5 text-[9px] text-[var(--color-text-muted)]"
              style={{ width: LABEL_PX, minWidth: LABEL_PX }}
            >
              时间
            </div>
            <div
              ref={rulerContentRef}
              className="relative h-7 flex-shrink-0 cursor-pointer select-none border-b border-[var(--color-border)] bg-[var(--color-surface)]"
              style={{ width: contentWidthPx }}
              onPointerDown={onRulerPointerDown}
              role="slider"
              aria-valuenow={Math.round(currentTime * 100) / 100}
              aria-valuemin={0}
              aria-valuemax={timelineDur}
              aria-label="时间标尺"
            >
              {rulerTicks.map((t, i) => (
                <div
                  key={`${t}-${i}`}
                  className="absolute bottom-0 border-l border-[var(--color-border)]/60"
                  style={{
                    left: t * pxPerSec,
                    height: i % 2 === 0 ? 12 : 7,
                  }}
                >
                  {i % 2 === 0 && (
                    <span className="absolute -top-3 left-0.5 whitespace-nowrap text-[9px] text-[var(--color-text-muted)]">
                      {formatTimelineTime(t)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 各轨 + 共享播放头（三角在标尺上方叠层） */}
          <div className="relative">
            {project.tracks.map((track) => {
              const isMixTrack = onMixChange && (track.id === 'a1' || track.id === 'a2');
              const mixOpen = isMixTrack && expandedMixTrack === track.id;              return (
                <div key={track.id} className="mb-2">
                  <div className="flex items-stretch">
                    {isMixTrack ? (
                      <button
                        type="button"
                        onClick={() => toggleMixTrack(track.id as 'a1' | 'a2')}
                        aria-expanded={mixOpen}
                        title={mixOpen ? '收起音量' : '展开音量'}
                        className={`flex flex-shrink-0 flex-col items-center justify-center gap-0.5 rounded border border-transparent px-0.5 text-center text-[9px] leading-tight text-[var(--color-text-muted)] hover:border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] ${
                          mixOpen ? 'border-[var(--color-primary)]/50 bg-[var(--color-surface-hover)] text-[var(--color-text)]' : ''
                        }`}
                        style={{ width: LABEL_PX, minWidth: LABEL_PX }}
                      >
                        <span className="font-medium">{track.label}</span>
                        <span className="text-[8px] opacity-80" aria-hidden>
                          {mixOpen ? '▼' : '▶'}
                        </span>
                      </button>
                    ) : (
                      <span
                        className="flex flex-shrink-0 items-center text-[10px] text-[var(--color-text-muted)]"
                        style={{ width: LABEL_PX, minWidth: LABEL_PX }}
                      >
                        {track.label}
                      </span>
                    )}
                    <div
                      className="relative h-10 flex-shrink-0 rounded bg-[var(--color-surface)] ring-1 ring-[var(--color-border)]"
                      style={{ width: contentWidthPx }}
                    >
                      {track.clips.length === 0 && (
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] text-[var(--color-text-muted)]">
                          空
                        </span>
                      )}
                      {track.clips.map((c) => {
                        const isVideo = track.type === 'video';
                        const vc = c as VideoClip;
                        const ac = c as AudioClip;
                        const len = isVideo ? vc.sourceEnd - vc.sourceStart : ac.sourceEnd - ac.sourceStart;
                        const left = c.timelineStart * pxPerSec;
                        const w = len * pxPerSec;
                        return (
                          <div
                            key={c.id}
                            role="button"
                            tabIndex={0}
                            title={isVideo ? `拖拽移动 · ${c.id}` : `音频 ${c.id}`}
                            onMouseDown={(e) => onClipMouseDown(e, track.id, c as VideoClip | AudioClip)}
                            className={`absolute top-1 bottom-1 cursor-grab rounded px-1 text-[10px] text-white active:cursor-grabbing ${
                              isVideo
                                ? selectedVideoClipId === c.id
                                  ? 'bg-blue-600 ring-2 ring-amber-400 ring-offset-1 ring-offset-[var(--color-surface)]'
                                  : 'bg-blue-600/90'
                                : track.id === 'a2'
                                  ? 'bg-violet-600/90'
                                  : 'bg-emerald-600/90'
                            }`}
                            style={{ left, width: Math.max(w, 8), zIndex: 5 }}
                          >
                            <span className="pointer-events-none">{isVideo ? 'V' : '♪'}</span>
                            {track.id !== 'a1' && (
                            <button
                              type="button"
                              data-timeline-delete
                              className="pointer-events-auto absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded bg-red-600 text-[10px] leading-none text-white shadow hover:bg-red-500"
                              title="删除"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteClip(track.id, c.id);
                              }}
                            >
                              ×
                            </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {mixOpen && track.id === 'a1' && (
                    <div
                      className="mt-1 flex items-center gap-2 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5"
                      style={{ marginLeft: LABEL_PX, width: contentWidthPx }}
                    >
                      <span className="flex-shrink-0 text-[9px] text-[var(--color-text-muted)]">原声</span>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={mix.sourceAudio}
                        onChange={(e) => onMixChange?.({ sourceAudio: Number(e.target.value) })}
                        className="h-1.5 min-w-0 flex-1 accent-emerald-500"
                        aria-label="原声音量"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="w-8 flex-shrink-0 text-right font-mono text-[10px] text-[var(--color-text)]">
                        {Math.round(mix.sourceAudio * 100)}%
                      </span>
                    </div>
                  )}
                  {mixOpen && track.id === 'a2' && (
                    <div
                      className="mt-1 flex items-center gap-2 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5"
                      style={{ marginLeft: LABEL_PX, width: contentWidthPx }}
                    >
                      <span className="flex-shrink-0 text-[9px] text-[var(--color-text-muted)]">BGM</span>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={mix.bgm}
                        onChange={(e) => onMixChange?.({ bgm: Number(e.target.value) })}
                        className="h-1.5 min-w-0 flex-1 accent-violet-500"
                        aria-label="BGM 音量"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="w-8 flex-shrink-0 text-right font-mono text-[10px] text-[var(--color-text)]">
                        {Math.round(mix.bgm * 100)}%
                      </span>
                    </div>
                  )}
                </div>
              );
            })}

            {/* 文字轨 */}
            <div className="mb-2">
              <div className="flex items-stretch">
                <span
                  className="flex flex-shrink-0 items-center text-[9px] text-[var(--color-text-muted)] px-1"
                  style={{ width: LABEL_PX, minWidth: LABEL_PX }}
                >
                  文字
                </span>
                <div
                  className="relative h-10 flex-shrink-0 rounded bg-[var(--color-surface)] ring-1 ring-[var(--color-border)]"
                  style={{ width: contentWidthPx }}
                >
                  {textClips.length === 0 && (
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] text-[var(--color-text-muted)] italic">
                      点顶栏「片头」「+ 字幕」「片尾」添加
                    </span>
                  )}
                  {textClips.map((clip: TextClip) => {
                    const preset = getTextPreset(clip.presetId);
                    const category = preset?.category ?? 'subtitle';
                    const colorClass = CATEGORY_COLORS[category] ?? CATEGORY_COLORS['subtitle']!;
                    const left = clip.timelineStart * pxPerSec;
                    const w = Math.max((clip.timelineEnd - clip.timelineStart) * pxPerSec, 8);
                    const isSelected = selectedTextClipId === clip.id;
                    return (
                      <div
                        key={clip.id}
                        role="button"
                        tabIndex={0}
                        title={`文字片段: ${clip.text}`}
                        onClick={() => onSelectTextClip?.(clip.id)}
                        onDoubleClick={() => {
                          onSelectTextClip?.(clip.id);
                          onOpenTextEditor?.();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') onSelectTextClip?.(clip.id);
                        }}
                        className={`absolute top-1 bottom-1 cursor-pointer rounded border px-1 text-[10px] text-white truncate ${colorClass} ${
                          isSelected ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-[var(--color-surface)]' : ''
                        }`}
                        style={{ left, width: w, zIndex: 5 }}
                      >
                        <span className="pointer-events-none text-[9px] leading-none">{clip.text}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 贯穿播放头 */}
            <div
              className="pointer-events-none absolute z-20"
              style={{
                left: LABEL_PX + playheadContentPx,
                top: -32,
                bottom: 0,
                transform: 'translateX(-50%)',
              }}
            >
              <div
                className="pointer-events-auto relative z-30 mx-auto cursor-grab active:cursor-grabbing"
                style={{ touchAction: 'none', width: 18 }}
                onPointerDown={onPlayheadHandlePointerDown}
              >
                <div
                  className="mx-auto h-0 w-0 border-x-[7px] border-x-transparent border-t-[9px] border-t-amber-400 drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]"
                  title="拖拽调整时间"
                />
              </div>
              <div className="absolute top-[11px] bottom-0 left-1/2 w-px -translate-x-1/2 bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.55)]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
