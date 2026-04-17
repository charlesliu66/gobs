/**
 * 百老汇筑梦师 Loading 体验 — 主展示组件
 *
 * 根据场景展示剧院主题背景、角色文案、聚光灯进度条、彩蛋交互区。
 * 配色体系：剧院金（--theater-gold）+ 聚光灯暖白 + 幕布深红
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import type { LoadingScene } from './types';
import type { LoadingState } from './useLoadingOrchestrator';
import { nonLinearPercent } from './useLoadingOrchestrator';
import { onSpotlightDrag, onCurtainPull, onApplause, onInspirationDice } from './easterEggs';
import type { EasterEggResult } from './easterEggs';

// ─── 场景背景图映射 ────────────────────────────────────────
const SCENE_BG: Record<LoadingScene, string> = {
  'writers-room': '/loading-assets/images/writers-room.png',
  rehearsal: '/loading-assets/images/rehearsal.png',
  'fine-cut': '/loading-assets/images/fine-cut.png',
  premiere: '/loading-assets/images/premiere.png',
  'on-tour': '/loading-assets/images/on-tour.png',
  lobby: '/loading-assets/images/lobby.png',
  'props-room': '/loading-assets/images/props-room.png',
};

// ─── 场景音效映射 ──────────────────────────────────────────
const SCENE_AUDIO: Record<LoadingScene, string> = {
  'writers-room': '/loading-assets/audio/writers-room-1.mp3',
  rehearsal: '/loading-assets/audio/rehearsal-1.mp3',
  'fine-cut': '/loading-assets/audio/fine-cut-1.mp3',
  premiere: '/loading-assets/audio/premiere-1.mp3',
  'on-tour': '/loading-assets/audio/on-tour-1.mp3',
  lobby: '/loading-assets/audio/lobby-1.mp3',
  'props-room': '/loading-assets/audio/props-room-1.mp3',
};

// ─── 场景中文名 ────────────────────────────────────────────
const SCENE_LABELS: Record<LoadingScene, string> = {
  'writers-room': '编剧室',
  rehearsal: '排练厅',
  'fine-cut': '精修室',
  premiere: '首演台',
  'on-tour': '巡演厅',
  lobby: '大厅',
  'props-room': '道具间',
};

interface Props {
  state: LoadingState;
  onCancel?: () => void;
  onRetry?: () => void;
  onBack?: () => void;
  reducedMotion?: boolean;
  muted?: boolean;
}

export default function TheaterLoadingScreen({
  state,
  onCancel,
  onRetry,
  onBack,
  reducedMotion = false,
  muted = false,
}: Props) {
  const scene = state.task?.scene ?? 'lobby';
  const [localEgg, setLocalEgg] = useState<EasterEggResult | null>(null);
  const [diceVisible, setDiceVisible] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 音效管理
  useEffect(() => {
    if (muted || !state.active) {
      audioRef.current?.pause();
      return;
    }
    const src = SCENE_AUDIO[scene];
    if (!src) return;

    const audio = new Audio(src);
    audio.loop = true;
    audio.volume = 0;
    audioRef.current = audio;

    audio.play().catch(() => {});
    const fadeIn = setInterval(() => {
      if (audio.volume < 0.25) {
        audio.volume = Math.min(0.25, audio.volume + 0.02);
      } else {
        clearInterval(fadeIn);
      }
    }, 50);

    return () => {
      clearInterval(fadeIn);
      const fadeOut = setInterval(() => {
        if (audio.volume > 0.01) {
          audio.volume = Math.max(0, audio.volume - 0.03);
        } else {
          audio.pause();
          clearInterval(fadeOut);
        }
      }, 30);
    };
  }, [state.active, scene, muted]);

  // 聚光灯彩蛋
  const handleSpotlight = useCallback(() => {
    const result = onSpotlightDrag();
    if (result) {
      setLocalEgg(result);
      setTimeout(() => setLocalEgg(null), 4000);
    }
  }, []);

  // 幕布拉开
  const handleCurtain = useCallback(() => {
    const result = onCurtainPull(scene);
    if (result) {
      setLocalEgg(result);
      setTimeout(() => setLocalEgg(null), 4000);
    }
  }, [scene]);

  // 掌声
  const handleApplause = useCallback(() => {
    const result = onApplause();
    if (result) {
      setLocalEgg(result);
      setTimeout(() => setLocalEgg(null), 4000);
    }
  }, []);

  // 灵感骰子
  const handleDice = useCallback(() => {
    const result = onInspirationDice();
    if (result) {
      setLocalEgg(result);
      setDiceVisible(false);
      setTimeout(() => setLocalEgg(null), 5000);
    }
  }, []);

  // 8s+ 显示灵感骰子入口
  useEffect(() => {
    if (state.elapsedMs >= 8000) setDiceVisible(true);
  }, [state.elapsedMs]);

  if (!state.active && !state.task?.error) return null;

  const displayPercent = state.percent != null ? nonLinearPercent(state.percent) : null;
  const activeEgg = localEgg || state.easterEggResult;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-end overflow-hidden">
      {/* 背景层 */}
      <img
        src={SCENE_BG[scene]}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
      />
      {/* 剧院氛围遮罩：深红渐变 + 暗角 */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#1a0a0a]/85 via-[#1a0a0a]/30 to-[#0d0505]/60" />

      {/* 聚光灯交互区（顶部） */}
      {!reducedMotion && (
        <button
          className="absolute left-1/2 top-8 h-16 w-16 -translate-x-1/2 rounded-full opacity-0 active:opacity-10"
          onClick={handleSpotlight}
          aria-label="拖动聚光灯"
        />
      )}

      {/* 幕布拉开（首演场景上滑区域） */}
      {scene === 'premiere' && (
        <button
          className="absolute left-1/2 top-0 h-32 w-full -translate-x-1/2 opacity-0 active:opacity-5"
          onClick={handleCurtain}
          aria-label="拉开幕布"
        />
      )}

      {/* 掌声触发区（底部点击） */}
      <button
        className="absolute bottom-0 left-0 right-0 h-16 opacity-0 active:opacity-5"
        onClick={handleApplause}
        aria-label="鼓掌"
      />

      {/* 主内容区 */}
      <div className="relative z-10 w-full max-w-md px-6 pb-12">
        {/* 场景标识 */}
        <div className="mb-4 text-center">
          <span className="inline-block rounded-full border border-amber-700/30 bg-amber-950/30 px-3 py-1 text-[11px] tracking-widest text-amber-400/70 backdrop-blur-sm">
            {SCENE_LABELS[scene]}
          </span>
        </div>

        {/* 彩蛋弹出 */}
        {activeEgg && (
          <div
            className={`mb-4 rounded-xl border px-4 py-3 text-center text-sm backdrop-blur-sm transition-all duration-500 ${
              activeEgg.isSuperRare
                ? 'border-amber-300/50 bg-amber-900/40 text-amber-100'
                : activeEgg.isRare
                  ? 'border-yellow-500/50 bg-yellow-900/30 text-yellow-200'
                  : 'border-amber-700/30 bg-amber-950/30 text-amber-300/90'
            }`}
          >
            {activeEgg.text}
          </div>
        )}

        {/* 灵感骰子入口 */}
        {diceVisible && !localEgg && state.tier !== 'critical' && (
          <button
            onClick={handleDice}
            className="mx-auto mb-4 flex items-center gap-2 rounded-lg border border-amber-600/30 bg-amber-950/30 px-4 py-2 text-sm text-amber-300/80 backdrop-blur-sm transition hover:bg-amber-900/40 active:scale-95"
          >
            🎲 抽灵感签
          </button>
        )}

        {/* 阶段进度 */}
        {state.phase && (
          <div className="mb-3 text-center text-xs tracking-wider text-amber-400/60">
            {state.phase}
          </div>
        )}

        {/* 进度条（聚光灯扫过舞台） */}
        {displayPercent !== null && (
          <div className="relative mx-auto mb-4 h-1.5 w-full overflow-hidden rounded-full bg-amber-950/40">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-500 transition-all duration-700 ease-out"
              style={{ width: `${displayPercent}%` }}
            />
            {!reducedMotion && (
              <div className="absolute inset-0 animate-[shimmer_2s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/15 to-transparent" />
            )}
          </div>
        )}

        {/* 角色文案区 */}
        <div className="mb-6 min-h-[60px]">
          <p className="mb-1 text-xs font-medium tracking-wide text-amber-500/80">
            {state.currentSpeaker}
          </p>
          <p
            className={`text-base leading-relaxed text-amber-100/90 transition-opacity ${
              state.copyFading ? 'opacity-0 duration-300' : 'opacity-100 duration-500'
            }`}
          >
            {state.currentCopy}
          </p>
        </div>

        {/* 时间指示器 */}
        {state.elapsedMs > 3000 && (
          <div className="mb-3 text-center text-[10px] text-amber-800/50">
            {(state.elapsedMs / 1000).toFixed(0)}s
          </div>
        )}

        {/* 操作按钮区 */}
        <div className="flex items-center justify-center gap-3">
          {state.showCancel && onCancel && (
            <button
              onClick={onCancel}
              className="rounded-lg border border-amber-800/30 bg-amber-950/40 px-5 py-2.5 text-sm text-amber-400/70 backdrop-blur-sm transition hover:bg-amber-900/40 active:scale-95"
            >
              取消
            </button>
          )}
          {state.showRetry && onRetry && (
            <button
              onClick={onRetry}
              className="rounded-lg border border-amber-500/40 bg-amber-800/40 px-5 py-2.5 text-sm font-medium text-amber-200 backdrop-blur-sm transition hover:bg-amber-700/50 active:scale-95"
            >
              重试
            </button>
          )}
          {state.showFallbackActions && onBack && (
            <button
              onClick={onBack}
              className="rounded-lg border border-amber-700/30 bg-amber-950/30 px-5 py-2.5 text-sm text-amber-300/80 backdrop-blur-sm transition hover:bg-amber-900/30 active:scale-95"
            >
              返回大厅
            </button>
          )}
        </div>

        {/* 错误态 */}
        {state.task?.error && !state.active && (
          <div className="mt-4 rounded-xl border border-red-800/40 bg-red-950/30 p-4 text-center">
            <p className="mb-2 text-sm text-red-300">
              舞台监督：今晚演出遇到了技术问题，我们正在抢修。
            </p>
            <p className="text-xs text-red-400/60">{state.task.error}</p>
            <div className="mt-3 flex justify-center gap-3">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="rounded-lg bg-red-900/50 px-4 py-2 text-sm text-red-200 transition hover:bg-red-800/50"
                >
                  重新连接
                </button>
              )}
              {onBack && (
                <button
                  onClick={onBack}
                  className="rounded-lg bg-amber-950/50 px-4 py-2 text-sm text-amber-300 transition hover:bg-amber-900/50"
                >
                  返回大厅
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 底部装饰线（剧院金） */}
      <div className="relative z-10 h-1 w-full bg-gradient-to-r from-transparent via-amber-600/30 to-transparent" />
    </div>
  );
}
