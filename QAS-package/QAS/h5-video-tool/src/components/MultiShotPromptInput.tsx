/**
 * 多镜头描述输入：镜头 Tab、每镜时长、每镜 Prompt、「+ 镜头」按钮
 * 每镜旁可生成首尾帧预览（文生图，严格依据当前镜头描述；多镜时文案附带衔接提示）
 */
import { useCallback, useState, useEffect, useRef } from 'react';
import type { ShotItem } from '../context/CreateFlowContext';
import { generateFrames } from '../api/storyboard';

const DURATION_OPTIONS = [5, 6, 7, 8] as const;
const PROMPT_MAX_LENGTH = 512;

interface MultiShotPromptInputProps {
  shots: ShotItem[];
  setShots: (v: ShotItem[] | ((prev: ShotItem[]) => ShotItem[])) => void;
  maxTotalDuration: number;
  aspectRatio?: string;
  /** 当此值变化时自动触发「一键生成全部首尾帧」（用于 一键 Prompt / 选择预设 后自动生成分镜预览） */
  triggerGenerateAllFrames?: number;
  /** 首尾帧生成/更新时同步到父组件（如 Context），供视频生成使用 */
  onShotFramesChange?: (frames: Record<number, { first: string; last: string }>) => void;
}

export function MultiShotPromptInput({ shots, setShots, maxTotalDuration, aspectRatio = '16:9', triggerGenerateAllFrames, onShotFramesChange }: MultiShotPromptInputProps) {
  const totalDuration = shots.reduce((sum, s) => sum + s.duration, 0);
  const totalOk = totalDuration <= maxTotalDuration;
  const [loadingFrameIndex, setLoadingFrameIndex] = useState<number | null>(null);
  const [shotFrames, setShotFrames] = useState<Record<number, { first: string; last: string }>>({});
  const [frameError, setFrameError] = useState<string | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  // ESC 关闭 Lightbox
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxSrc(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const lastTriggerRef = useRef(0);
  // 父组件触发时自动生成全部首尾帧（一键 Prompt / 选择预设后）
  useEffect(() => {
    if (!triggerGenerateAllFrames || triggerGenerateAllFrames <= lastTriggerRef.current) return;
    if (!shots.some((s) => s.prompt?.trim())) return;
    lastTriggerRef.current = triggerGenerateAllFrames;
    void handleGenerateAllFrames();
  }, [triggerGenerateAllFrames]); // 仅 trigger 变化时执行

  const handleGenerateFrames = useCallback(
    async (index: number) => {
      const prompt = shots[index]?.prompt?.trim();
      if (!prompt) return;
      setLoadingFrameIndex(index);
      setFrameError(null);
      try {
        const continuity =
          index > 0 ? '（与上一镜头叙事衔接，同一空间与连续动作）' : '';
        const req: Parameters<typeof generateFrames>[0] = {
          prompt: continuity ? `${prompt}${continuity}` : prompt,
          aspectRatio,
        };
        const res = await generateFrames(req);
        const next = { ...shotFrames, [index]: { first: res.firstFrame, last: res.lastFrame } };
        setShotFrames(next);
        onShotFramesChange?.(next);
      } catch (e) {
        setFrameError(e instanceof Error ? e.message : '首尾帧生成失败');
      } finally {
        setLoadingFrameIndex(null);
      }
    },
    [shots, aspectRatio, shotFrames]
  );

  /** 一键生成全部首尾帧（按顺序逐镜请求；衔接靠文案后缀，不传垫图） */
  const handleGenerateAllFrames = useCallback(async () => {
    const indices = shots
      .map((_, i) => i)
      .filter((i) => shots[i]?.prompt?.trim());
    if (indices.length === 0) {
      setFrameError('请先填写至少一个镜头的描述');
      return;
    }
    setLoadingFrameIndex(-1); // -1 表示「全部生成中」
    setFrameError(null);
    try {
      const newFrames: Record<number, { first: string; last: string }> = {};
      for (const i of indices) {
        const base = shots[i].prompt.trim();
        const continuity = i > 0 ? '（与上一镜头叙事衔接，同一空间与连续动作）' : '';
        const req: Parameters<typeof generateFrames>[0] = {
          prompt: continuity ? `${base}${continuity}` : base,
          aspectRatio,
        };
        const res = await generateFrames(req);
        newFrames[i] = { first: res.firstFrame, last: res.lastFrame };
        const next = { ...shotFrames, ...newFrames };
        setShotFrames(next);
        onShotFramesChange?.(next);
      }
    } catch (e) {
      setFrameError(e instanceof Error ? e.message : '首尾帧生成失败');
    } finally {
      setLoadingFrameIndex(null);
    }
  }, [shots, aspectRatio, shotFrames]);

  const addShot = useCallback(() => {
    setShots((prev) => [...prev, { duration: 5, prompt: '' }]);
  }, [setShots]);

  const updateShot = useCallback(
    (index: number, updates: Partial<ShotItem>) => {
      setShots((prev) =>
        prev.map((s, i) => (i === index ? { ...s, ...updates } : s))
      );
    },
    [setShots]
  );

  const removeShot = useCallback(
    (index: number) => {
      if (shots.length <= 1) return;
      setShots((prev) => prev.filter((_, i) => i !== index));
    },
    [setShots, shots.length]
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-[var(--color-text-muted)]">
          当前分镜时长总和:
          <span className={`ml-1.5 font-medium ${totalOk ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'}`}>
            {totalDuration}秒
          </span>
          <span className="text-[var(--color-text-subtle)]"> / {maxTotalDuration}秒</span>
        </span>
        {shots.length > 1 && (
          <button
            type="button"
            onClick={handleGenerateAllFrames}
            disabled={loadingFrameIndex !== null || shots.every((s) => !s.prompt.trim())}
            className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] text-sm hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loadingFrameIndex === -1 ? '生成中…' : '一键生成全部（保持镜头衔接）'}
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {shots.map((shot, i) => (
          <div
            key={i}
            className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2"
          >
            <span className="flex items-center gap-1.5 text-sm text-[var(--color-text)]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="2" width="20" height="20" rx="2" ry="2" />
                <path d="M10 9l5 3-5 3V9z" />
              </svg>
              镜头{i + 1}
            </span>
            <select
              value={shot.duration}
              onChange={(e) => updateShot(i, { duration: Number(e.target.value) })}
              className="rounded border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-2 py-1 text-sm text-[var(--color-text)] focus:outline-none"
            >
              {DURATION_OPTIONS.map((d) => (
                <option key={d} value={d}>{d}s</option>
              ))}
            </select>
            {shots.length > 1 && (
              <button
                type="button"
                onClick={() => removeShot(i)}
                className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-error)]"
              >
                删除
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {shots.map((shot, i) => (
          <div key={i} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
            <label className="block text-xs text-[var(--color-text-muted)] mb-1">镜头{i + 1} 描述</label>
            <textarea
              value={shot.prompt}
              onChange={(e) => updateShot(i, { prompt: e.target.value.slice(0, PROMPT_MAX_LENGTH) })}
              placeholder="描述该分镜的内容"
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text)] text-sm placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-border-focus)] focus:outline-none resize-none"
            />
            <p className="mt-1 text-xs text-[var(--color-text-subtle)]">
              {shot.prompt.length}/{PROMPT_MAX_LENGTH}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <div>
                <button
                  type="button"
                  onClick={() => handleGenerateFrames(i)}
                  disabled={!shot.prompt.trim() || loadingFrameIndex !== null}
                  className="px-3 py-1.5 rounded-lg border border-[var(--color-primary)] text-[var(--color-primary)] text-sm hover:bg-[var(--color-primary)]/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loadingFrameIndex === i ? '生成中…' : '生成首尾帧'}
                </button>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  首尾帧由当前镜头描述生成；多镜头时自动附带与上一镜衔接提示。素材库图片仍可在生成视频时作为参考。
                </p>
              </div>
              {shotFrames[i] && (
                <div className="flex gap-2">
                  <div className="flex flex-col items-center">
                    <span className="text-xs text-[var(--color-text-muted)] mb-1">首帧（点击放大）</span>
                    <button
                      type="button"
                      onClick={() => setLightboxSrc(shotFrames[i].first)}
                      className="block cursor-zoom-in rounded border border-[var(--color-border)] hover:border-[var(--color-primary)]/50 transition-colors"
                    >
                      <img
                        src={shotFrames[i].first}
                        alt={`镜头${i + 1} 首帧`}
                        className="w-24 h-auto object-cover"
                      />
                    </button>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-xs text-[var(--color-text-muted)] mb-1">尾帧（点击放大）</span>
                    <button
                      type="button"
                      onClick={() => setLightboxSrc(shotFrames[i].last)}
                      className="block cursor-zoom-in rounded border border-[var(--color-border)] hover:border-[var(--color-primary)]/50 transition-colors"
                    >
                      <img
                        src={shotFrames[i].last}
                        alt={`镜头${i + 1} 尾帧`}
                        className="w-24 h-auto object-cover"
                      />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {frameError && (
        <p className="text-sm text-[var(--color-error)]">{frameError}</p>
      )}

      <button
        type="button"
        onClick={addShot}
        disabled={totalDuration >= maxTotalDuration}
        className="w-full px-4 py-3 rounded-lg border border-dashed border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
      >
        + 镜头
      </button>

      {/* 图片放大 Lightbox */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 cursor-zoom-out"
          onClick={() => setLightboxSrc(null)}
        >
          <img
            src={lightboxSrc}
            alt="放大预览"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
