/**
 * 多镜头描述输入：镜头 Tab、每镜时长、每镜 Prompt、「+ 镜头」按钮
 * 首镜：生成首帧+尾帧；后续镜：首帧=上一镜尾帧，生成中间帧+尾帧；画风锁定首镜首帧
 */
import { useCallback, useState, useEffect, useRef } from 'react';
import type { ShotItem, ShotFramePreview } from '../context/CreateFlowContext';
import { generateFrames } from '../api/storyboard';
import { RunningStatus } from './RunningStatus';

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
  onShotFramesChange?: (frames: Record<number, ShotFramePreview>) => void;
}

type FrameModels = {
  first: string | null;
  middle: string | null;
  last: string | null;
};

export function MultiShotPromptInput({
  shots,
  setShots,
  maxTotalDuration,
  aspectRatio = '16:9',
  triggerGenerateAllFrames,
  onShotFramesChange,
}: MultiShotPromptInputProps) {
  const totalDuration = shots.reduce((sum, s) => sum + s.duration, 0);
  const totalOk = totalDuration <= maxTotalDuration;
  const [loadingFrameIndex, setLoadingFrameIndex] = useState<number | null>(null);
  const [shotFrames, setShotFrames] = useState<Record<number, ShotFramePreview>>({});
  const [shotFrameModels, setShotFrameModels] = useState<Record<number, FrameModels>>({});
  const [frameError, setFrameError] = useState<string | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxSrc(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const lastTriggerRef = useRef(0);
  useEffect(() => {
    if (!triggerGenerateAllFrames || triggerGenerateAllFrames <= lastTriggerRef.current) return;
    if (!shots.some((s) => s.prompt?.trim())) return;
    lastTriggerRef.current = triggerGenerateAllFrames;
    void handleGenerateAllFrames();
  }, [triggerGenerateAllFrames]);

  const handleGenerateFrames = useCallback(
    async (index: number) => {
      const prompt = shots[index]?.prompt?.trim();
      if (!prompt) return;
      setLoadingFrameIndex(index);
      setFrameError(null);
      try {
        const continuity =
          index > 0 ? '（与上一镜头叙事衔接，同一空间与连续动作）' : '';
        const text = continuity ? `${prompt}${continuity}` : prompt;

        if (index === 0) {
          const res = await generateFrames({
            prompt: text,
            aspectRatio,
            shotIndex: 0,
          });
          const next: ShotFramePreview = { first: res.firstFrame, last: res.lastFrame };
          const merged = { ...shotFrames, [index]: next };
          setShotFrames(merged);
          setShotFrameModels((prev) => ({
            ...prev,
            [index]: {
              first: res.imagenModelFirst ?? null,
              middle: null,
              last: res.imagenModelLast ?? null,
            },
          }));
          onShotFramesChange?.(merged);
          return;
        }

        const prevLast = shotFrames[index - 1]?.last;
        const styleRef = shotFrames[0]?.first;
        if (!prevLast) {
          setFrameError('请先生成「镜头1」的首尾帧，再生成当前镜头。');
          return;
        }
        if (!styleRef) {
          setFrameError('缺少首镜首帧作为画风参考，请先生成镜头1。');
          return;
        }

        const res = await generateFrames({
          prompt: text,
          aspectRatio,
          shotIndex: index,
          previousLastFrame: prevLast,
          styleReferenceFrame: styleRef,
        });

        const next: ShotFramePreview = {
          first: res.firstFrame,
          last: res.lastFrame,
          middle: res.middleFrame,
        };
        const merged = { ...shotFrames, [index]: next };
        setShotFrames(merged);
        setShotFrameModels((prev) => ({
          ...prev,
          [index]: {
            first: null,
            middle: res.imagenModelMiddle ?? null,
            last: res.imagenModelLast ?? null,
          },
        }));
        onShotFramesChange?.(merged);
      } catch (e) {
        setFrameError(e instanceof Error ? e.message : '分镜预览生成失败');
      } finally {
        setLoadingFrameIndex(null);
      }
    },
    [shots, aspectRatio, shotFrames, onShotFramesChange]
  );

  const handleGenerateAllFrames = useCallback(async () => {
    const indices = shots
      .map((_, i) => i)
      .filter((i) => shots[i]?.prompt?.trim())
      .sort((a, b) => a - b);
    if (indices.length === 0) {
      setFrameError('请先填写至少一个镜头的描述');
      return;
    }
    setLoadingFrameIndex(-1);
    setFrameError(null);
    try {
      const newFrames: Record<number, ShotFramePreview> = {};
      const newModels: Record<number, FrameModels> = {};

      for (const i of indices) {
        const base = shots[i].prompt.trim();
        const continuity = i > 0 ? '（与上一镜头叙事衔接，同一空间与连续动作）' : '';
        const text = continuity ? `${base}${continuity}` : base;

        if (i === 0) {
          const res = await generateFrames({ prompt: text, aspectRatio, shotIndex: 0 });
          newFrames[0] = { first: res.firstFrame, last: res.lastFrame };
          newModels[0] = {
            first: res.imagenModelFirst ?? null,
            middle: null,
            last: res.imagenModelLast ?? null,
          };
        } else {
          const prevLast = newFrames[i - 1]?.last ?? shotFrames[i - 1]?.last;
          const styleRef = newFrames[0]?.first ?? shotFrames[0]?.first;
          if (!prevLast || !styleRef) {
            setFrameError(`请先完成镜头${i}之前所有镜头的预览生成（需上一镜尾帧与首镜首帧）。`);
            setLoadingFrameIndex(null);
            return;
          }
          const res = await generateFrames({
            prompt: text,
            aspectRatio,
            shotIndex: i,
            previousLastFrame: prevLast,
            styleReferenceFrame: styleRef,
          });
          newFrames[i] = {
            first: res.firstFrame,
            last: res.lastFrame,
            middle: res.middleFrame,
          };
          newModels[i] = {
            first: null,
            middle: res.imagenModelMiddle ?? null,
            last: res.imagenModelLast ?? null,
          };
        }

        const merged = { ...shotFrames, ...newFrames };
        setShotFrames(merged);
        setShotFrameModels((prev) => ({ ...prev, ...newModels }));
        onShotFramesChange?.(merged);
      }
    } catch (e) {
      setFrameError(e instanceof Error ? e.message : '分镜预览生成失败');
    } finally {
      setLoadingFrameIndex(null);
    }
  }, [shots, aspectRatio, shotFrames, onShotFramesChange]);

  const addShot = useCallback(() => {
    setShots((prev) => [...prev, { duration: 5, prompt: '' }]);
  }, [setShots]);

  const updateShot = useCallback(
    (index: number, updates: Partial<ShotItem>) => {
      setShots((prev) => prev.map((s, i) => (i === index ? { ...s, ...updates } : s)));
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
            {loadingFrameIndex === -1 ? '生成中…' : '一键生成全部（按镜顺序衔接）'}
          </button>
        )}
      </div>
      <RunningStatus
        active={loadingFrameIndex !== null}
        label={loadingFrameIndex === -1 ? '正在批量生成分镜预览' : '正在生成分镜帧'}
        stallAfterSec={25}
        scene="rehearsal"
      />

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
                <option key={d} value={d}>
                  {d}s
                </option>
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
                  {loadingFrameIndex === i ? '生成中…' : i === 0 ? '生成首尾帧' : '生成中间帧+尾帧（接上一镜）'}
                </button>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  {i === 0
                    ? '镜头1：生成首帧与尾帧，并作为全片画风基准。'
                    : '本镜首帧=上一镜尾帧；仅生成中间帧与尾帧，画风与镜头1一致。素材库图片仍可在生成视频时作为参考。'}
                </p>
              </div>
              {shotFrames[i] && (
                <div className="flex flex-col gap-1">
                  {(shotFrameModels[i]?.first || shotFrameModels[i]?.middle || shotFrameModels[i]?.last) && (
                    <p className="text-[10px] leading-tight text-[var(--color-text-subtle)] max-w-[32rem] break-all">
                      模型：
                      {i === 0 ? (
                        <>
                          首 {shotFrameModels[i]?.first ?? '—'} · 尾 {shotFrameModels[i]?.last ?? '—'}
                        </>
                      ) : (
                        <>
                          首(沿用) — · 中 {shotFrameModels[i]?.middle ?? '—'} · 尾 {shotFrameModels[i]?.last ?? '—'}
                        </>
                      )}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <div className="flex flex-col items-center">
                      <span className="text-xs text-[var(--color-text-muted)] mb-1 max-w-[5.5rem] text-center">
                        {i === 0 ? '首帧' : '首帧（上一镜尾）'}
                      </span>
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
                    {i > 0 && shotFrames[i].middle && (
                      <div className="flex flex-col items-center">
                        <span className="text-xs text-[var(--color-text-muted)] mb-1">中间帧</span>
                        <button
                          type="button"
                          onClick={() => setLightboxSrc(shotFrames[i].middle!)}
                          className="block cursor-zoom-in rounded border border-[var(--color-border)] hover:border-[var(--color-primary)]/50 transition-colors"
                        >
                          <img
                            src={shotFrames[i].middle}
                            alt={`镜头${i + 1} 中间帧`}
                            className="w-24 h-auto object-cover"
                          />
                        </button>
                      </div>
                    )}
                    <div className="flex flex-col items-center">
                      <span className="text-xs text-[var(--color-text-muted)] mb-1">尾帧</span>
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
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {frameError && <p className="text-sm text-[var(--color-error)]">{frameError}</p>}

      <button
        type="button"
        onClick={addShot}
        disabled={totalDuration >= maxTotalDuration}
        className="w-full px-4 py-3 rounded-lg border border-dashed border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
      >
        + 镜头
      </button>

      {lightboxSrc && (
        <div
          className="fixed top-0 right-0 bottom-0 left-0 z-50 flex items-center justify-center bg-black/80 p-4 cursor-zoom-out sm:left-56"
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
