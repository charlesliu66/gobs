/**
 * TextOverlayRenderer — CSS 时间驱动动画预览引擎
 *
 * 根据当前播放时间（timeSec），渲染所有激活的文字片段到视频上层。
 * 每个版式有独立的入场/出场动画，用 CSS keyframes + 计时控制。
 */
import { useEffect, useRef } from 'react';
import type { TextClip, TextPresetId } from '../types/timeline';
import { getTextPreset } from '../textPresets';
import type { TextPreset } from '../textPresets';

interface TextOverlayRendererProps {
  /** 当前激活的文字片段列表 */
  activeClips: TextClip[];
  /** 当前播放时间（秒）——用于计算动画进度 */
  timeSec: number;
  /** 容器尺寸比例（影响字体缩放） */
  aspectRatio?: string;
}

// ─── 动画样式生成 ─────────────────────────────────────────────────────────────

interface AnimState {
  opacity: number;
  transform: string;
  filter?: string;
}

function getAnimState(
  preset: TextPreset,
  /** 片段内已播放时长（秒） */
  elapsed: number,
  /** 片段总时长（秒） */
  total: number,
): AnimState {
  const inDur = preset.css.animationDuration / 1000; // 入场时长（秒）
  const outDur = Math.min(inDur, 0.4);               // 出场时长（秒）
  const outStart = total - outDur;

  // 进度 0→1（入场） / 1（中间） / 1→0（出场）
  let progress: number;
  if (elapsed < inDur) {
    progress = elapsed / inDur;
  } else if (elapsed > outStart) {
    progress = 1 - (elapsed - outStart) / outDur;
  } else {
    progress = 1;
  }
  progress = Math.max(0, Math.min(1, progress));

  const ease = easeOutCubic(progress);

  switch (preset.css.animation) {
    case 'fade':
      return { opacity: ease, transform: 'none' };

    case 'slide-up':
      return {
        opacity: ease,
        transform: `translateY(${(1 - ease) * 24}px)`,
      };

    case 'zoom':
      return {
        opacity: ease,
        transform: `scale(${0.7 + ease * 0.3})`,
      };

    case 'shake': {
      // 入场时震动，之后静止
      const shake = elapsed < inDur
        ? Math.sin(elapsed * 60) * (1 - progress) * 8
        : 0;
      return {
        opacity: ease,
        transform: `translateX(${shake}px)`,
      };
    }

    case 'highlight':
      return {
        opacity: ease,
        transform: 'none',
        filter: progress > 0.5 ? `brightness(${1 + (progress - 0.5) * 0.6})` : 'none',
      };

    default:
      return { opacity: ease, transform: 'none' };
  }
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

// ─── 位置样式 ─────────────────────────────────────────────────────────────────

function getPositionStyle(preset: TextPreset): React.CSSProperties {
  const base: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column',
    alignItems:
      preset.css.align === 'left'
        ? 'flex-start'
        : preset.css.align === 'right'
          ? 'flex-end'
          : 'center',
    pointerEvents: 'none',
  };

  switch (preset.css.position) {
    case 'top':
      return { ...base, top: 0 };
    case 'bottom':
      return { ...base, bottom: 0 };
    case 'center':
    default:
      return { ...base, top: '50%', transform: 'translateY(-50%)' };
  }
}

// ─── 单片段渲染 ───────────────────────────────────────────────────────────────

function TextClipLayer({
  clip,
  timeSec,
}: {
  clip: TextClip;
  timeSec: number;
}) {
  const preset = getTextPreset(clip.presetId);
  if (!preset) return null;

  const elapsed = timeSec - clip.timelineStart;
  const total = clip.timelineEnd - clip.timelineStart;
  const anim = getAnimState(preset, elapsed, total);

  const posStyle = getPositionStyle(preset);
  // center 位置的 transform 和动画 transform 合并
  const isCenter = preset.css.position === 'center';
  const transformValue = isCenter
    ? `translateY(-50%) ${anim.transform !== 'none' ? anim.transform : ''}`
    : anim.transform;

  const containerStyle: React.CSSProperties = {
    ...posStyle,
    opacity: anim.opacity,
    transform: transformValue,
    filter: anim.filter,
    willChange: 'opacity, transform',
  };

  const innerStyle: React.CSSProperties = {
    background: preset.css.bg,
    color: preset.css.color,
    fontSize: preset.css.fontSize,
    fontWeight: preset.css.fontWeight,
    padding: preset.css.padding,
    borderRadius: preset.css.borderRadius ?? '0px',
    textAlign: preset.css.align,
    lineHeight: 1.3,
    maxWidth: '90%',
    wordBreak: 'break-word',
    fontFamily: '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif',
  };

  return (
    <div style={containerStyle}>
      <div style={innerStyle}>
        <div>{clip.text}</div>
        {clip.subtext && (
          <div
            style={{
              color: preset.css.subColor ?? 'rgba(255,255,255,0.6)',
              fontSize: preset.css.subFontSize ?? '0.75em',
              marginTop: '0.3em',
              fontWeight: 'normal',
            }}
          >
            {clip.subtext}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 主组件（RAF 驱动） ────────────────────────────────────────────────────────

export function TextOverlayRenderer({
  activeClips,
  timeSec,
}: TextOverlayRendererProps) {
  if (activeClips.length === 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      {activeClips.map((clip) => (
        <TextClipLayer key={clip.id} clip={clip} timeSec={timeSec} />
      ))}
    </div>
  );
}

// ─── 版式选择器面板 ────────────────────────────────────────────────────────────

import { TEXT_PRESETS } from '../textPresets';
import type { TextPreset as TextPresetType } from '../textPresets';

interface TextPresetPickerProps {
  selected?: TextPresetId;
  onSelect: (id: TextPresetId) => void;
  onClose: () => void;
}

const CATEGORY_LABELS: Record<TextPresetType['category'], string> = {
  intro: '片头',
  outro: '片尾',
  subtitle: '字幕',
  title: '标题卡',
};

export function TextPresetPicker({ selected, onSelect, onClose }: TextPresetPickerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const categories = ['intro', 'outro', 'subtitle', 'title'] as const;

  return (
    <div
      ref={ref}
      className="absolute bottom-full left-0 z-50 mb-2 w-[320px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3 shadow-2xl"
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">选择版式</p>
        <button type="button" onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-xs">✕</button>
      </div>

      <div className="space-y-3">
        {categories.map((cat) => {
          const presets = TEXT_PRESETS.filter((p) => p.category === cat);
          return (
            <div key={cat}>
              <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-text-subtle)] mb-1.5">
                {CATEGORY_LABELS[cat]}
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {presets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => { onSelect(preset.id); onClose(); }}
                    className={`relative rounded-lg overflow-hidden border transition-all text-left ${
                      selected === preset.id
                        ? 'border-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/40'
                        : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/40'
                    }`}
                    style={{ height: '52px', background: preset.previewBg }}
                  >
                    {/* 预览色块 */}
                    <div
                      className="absolute inset-0 flex items-center justify-center"
                      style={{ background: preset.previewBg }}
                    >
                      <span
                        className="text-[9px] font-bold truncate px-2"
                        style={{ color: preset.previewText }}
                      >
                        {preset.defaultText}
                      </span>
                    </div>
                    {/* 标签 */}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1.5 py-0.5">
                      <p className="text-[9px] text-white/80 truncate">{preset.label}</p>
                    </div>
                    {selected === preset.id && (
                      <div className="absolute top-1 right-1 w-3 h-3 rounded-full bg-[var(--color-primary)] flex items-center justify-center">
                        <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
