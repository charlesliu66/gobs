/**
 * H5 地牢主题 Loading 体验 — 主展示组件
 *
 * 根据场景展示主题化背景、角色文案、非线性进度条、彩蛋交互区。
 * 支持渐显渐隐文案切换、火把动画、敲门交互。
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import type { LoadingScene } from './types';
import type { LoadingState } from './useLoadingOrchestrator';
import { nonLinearPercent } from './useLoadingOrchestrator';
import { onKnock, onTorchSwipe, onFortuneClick } from './easterEggs';
import type { EasterEggResult } from './easterEggs';

// ─── 场景背景图映射（生成后替换为真实资产路径）────────────
const SCENE_BG: Record<LoadingScene, string> = {
  'dungeon-entrance': '/loading-assets/images/dungeon-entrance.png',
  tavern: '/loading-assets/images/tavern.png',
  blacksmith: '/loading-assets/images/blacksmith.png',
  settlement: '/loading-assets/images/settlement.png',
  reconnect: '/loading-assets/images/reconnect.png',
};

// ─── 场景音效映射 ────────────────────────────────────────
const SCENE_AUDIO: Record<LoadingScene, string> = {
  'dungeon-entrance': '/loading-assets/audio/dungeon-entrance-1.mp3',
  tavern: '/loading-assets/audio/tavern-1.mp3',
  blacksmith: '/loading-assets/audio/blacksmith-1.mp3',
  settlement: '/loading-assets/audio/settlement-1.mp3',
  reconnect: '/loading-assets/audio/reconnect-1.mp3',
};

interface Props {
  state: LoadingState;
  onCancel?: () => void;
  onRetry?: () => void;
  onBack?: () => void;
  /** 减弱动效模式（低端机/prefers-reduced-motion） */
  reducedMotion?: boolean;
  /** 静音模式 */
  muted?: boolean;
}

export default function DungeonLoadingScreen({
  state,
  onCancel,
  onRetry,
  onBack,
  reducedMotion = false,
  muted = false,
}: Props) {
  const scene = state.task?.scene ?? 'dungeon-entrance';
  const [localEgg, setLocalEgg] = useState<EasterEggResult | null>(null);
  const [fortuneVisible, setFortuneVisible] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [torchLeftLit, setTorchLeftLit] = useState(false);
  const [torchRightLit, setTorchRightLit] = useState(false);

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
    audio.volume = 0.3;
    audioRef.current = audio;

    // 渐入
    audio.volume = 0;
    audio.play().catch(() => {});
    const fadeIn = setInterval(() => {
      if (audio.volume < 0.3) {
        audio.volume = Math.min(0.3, audio.volume + 0.02);
      } else {
        clearInterval(fadeIn);
      }
    }, 50);

    return () => {
      clearInterval(fadeIn);
      // 渐出
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

  // 敲门交互
  const handleKnock = useCallback(() => {
    const result = onKnock(scene);
    if (result) {
      setLocalEgg(result);
      setTimeout(() => setLocalEgg(null), 4000);
    }
  }, [scene]);

  // 火把滑动
  const handleTorchSwipe = useCallback((dir: 'left' | 'right') => {
    if (dir === 'left') setTorchLeftLit(true);
    else setTorchRightLit(true);
    const result = onTorchSwipe(dir);
    if (result) {
      setLocalEgg(result);
      setTimeout(() => setLocalEgg(null), 4000);
    }
  }, []);

  // 命签
  const handleFortune = useCallback(() => {
    const result = onFortuneClick();
    if (result) {
      setLocalEgg(result);
      setFortuneVisible(false);
      setTimeout(() => setLocalEgg(null), 5000);
    }
  }, []);

  // 8s+ 显示命签入口
  useEffect(() => {
    if (state.elapsedMs >= 8000) setFortuneVisible(true);
  }, [state.elapsedMs]);

  if (!state.active && !state.task?.error) return null;

  const displayPercent = state.percent != null ? nonLinearPercent(state.percent) : null;
  const activeEgg = localEgg || state.easterEggResult;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-end overflow-hidden">
      {/* 背景层（16:9 横屏原画，object-cover 适配任意屏幕比例） */}
      <img
        src={SCENE_BG[scene]}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
      />
      {/* 暗角遮罩 */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/50" />

      {/* 火把交互区（左右两侧） */}
      {!reducedMotion && (
        <>
          <button
            className="absolute left-2 top-1/3 h-24 w-12 opacity-0 active:opacity-10"
            onClick={() => handleTorchSwipe('left')}
            aria-label="点亮左侧火把"
          />
          <button
            className="absolute right-2 top-1/3 h-24 w-12 opacity-0 active:opacity-10"
            onClick={() => handleTorchSwipe('right')}
            aria-label="点亮右侧火把"
          />
          {/* 火把动画指示器 */}
          {torchLeftLit && (
            <div className="absolute left-4 top-1/3 h-4 w-4 animate-pulse rounded-full bg-amber-400/60 shadow-[0_0_12px_4px_rgba(251,191,36,0.3)]" />
          )}
          {torchRightLit && (
            <div className="absolute right-4 top-1/3 h-4 w-4 animate-pulse rounded-full bg-amber-400/60 shadow-[0_0_12px_4px_rgba(251,191,36,0.3)]" />
          )}
        </>
      )}

      {/* 敲门交互区（仅地牢入口场景） */}
      {scene === 'dungeon-entrance' && (
        <button
          className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0 active:opacity-10"
          onClick={handleKnock}
          aria-label="敲门"
        />
      )}

      {/* 主内容区 */}
      <div className="relative z-10 w-full max-w-md px-6 pb-12">
        {/* 彩蛋弹出 */}
        {activeEgg && (
          <div
            className={`mb-4 rounded-xl border px-4 py-3 text-center text-sm backdrop-blur-sm transition-all duration-500 ${
              activeEgg.isSuperRare
                ? 'border-purple-400/50 bg-purple-900/40 text-purple-200'
                : activeEgg.isRare
                  ? 'border-amber-400/50 bg-amber-900/40 text-amber-200'
                  : 'border-stone-500/40 bg-stone-800/40 text-stone-300'
            }`}
          >
            {activeEgg.isSuperRare && <span className="mr-1">✨</span>}
            {activeEgg.isRare && !activeEgg.isSuperRare && <span className="mr-1">🎲</span>}
            {activeEgg.text}
          </div>
        )}

        {/* 命签入口 */}
        {fortuneVisible && !localEgg && state.tier !== 'critical' && (
          <button
            onClick={handleFortune}
            className="mx-auto mb-4 flex items-center gap-2 rounded-lg border border-amber-600/30 bg-amber-950/30 px-4 py-2 text-sm text-amber-300/80 backdrop-blur-sm transition hover:bg-amber-950/50 active:scale-95"
          >
            🎴 求今日命签
          </button>
        )}

        {/* 阶段进度 */}
        {state.phase && (
          <div className="mb-3 text-center text-xs tracking-wider text-stone-400/80">
            {state.phase}
          </div>
        )}

        {/* 进度条（非线性） */}
        {displayPercent !== null && (
          <div className="relative mx-auto mb-4 h-1.5 w-full overflow-hidden rounded-full bg-stone-700/50">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-700 ease-out"
              style={{ width: `${displayPercent}%` }}
            />
            {/* 光泽动画 */}
            {!reducedMotion && (
              <div className="absolute inset-0 animate-[shimmer_2s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            )}
          </div>
        )}

        {/* 角色文案区 */}
        <div className="mb-6 min-h-[60px]">
          <p className="mb-1 text-xs font-medium tracking-wide text-amber-500/70">
            {state.currentSpeaker}
          </p>
          <p
            className={`text-base leading-relaxed text-stone-200 transition-opacity ${
              state.copyFading ? 'opacity-0 duration-300' : 'opacity-100 duration-500'
            }`}
          >
            {state.currentCopy}
          </p>
        </div>

        {/* 时间指示器（仅开发/调试用，正式版可通过配置关闭） */}
        {state.elapsedMs > 3000 && (
          <div className="mb-3 text-center text-[10px] text-stone-500/50">
            {(state.elapsedMs / 1000).toFixed(0)}s
          </div>
        )}

        {/* 操作按钮区 */}
        <div className="flex items-center justify-center gap-3">
          {/* 取消按钮 */}
          {state.showCancel && onCancel && (
            <button
              onClick={onCancel}
              className="rounded-lg border border-stone-600/40 bg-stone-800/50 px-5 py-2.5 text-sm text-stone-400 backdrop-blur-sm transition hover:bg-stone-700/50 active:scale-95"
            >
              取消
            </button>
          )}

          {/* 重试按钮（8s+） */}
          {state.showRetry && onRetry && (
            <button
              onClick={onRetry}
              className="rounded-lg border border-amber-600/40 bg-amber-900/40 px-5 py-2.5 text-sm font-medium text-amber-300 backdrop-blur-sm transition hover:bg-amber-800/50 active:scale-95"
            >
              重试
            </button>
          )}

          {/* 返回大厅（15s+） */}
          {state.showFallbackActions && onBack && (
            <button
              onClick={onBack}
              className="rounded-lg border border-stone-500/40 bg-stone-800/40 px-5 py-2.5 text-sm text-stone-300 backdrop-blur-sm transition hover:bg-stone-700/40 active:scale-95"
            >
              返回大厅
            </button>
          )}
        </div>

        {/* 错误态 */}
        {state.task?.error && !state.active && (
          <div className="mt-4 rounded-xl border border-red-800/40 bg-red-950/30 p-4 text-center">
            <p className="mb-2 text-sm text-red-300">
              守门人：门今天罢工了，不是你的问题。
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
                  className="rounded-lg bg-stone-800/50 px-4 py-2 text-sm text-stone-300 transition hover:bg-stone-700/50"
                >
                  返回大厅
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 底部装饰线 */}
      <div className="relative z-10 h-1 w-full bg-gradient-to-r from-transparent via-amber-700/30 to-transparent" />
    </div>
  );
}
