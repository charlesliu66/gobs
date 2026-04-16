/**
 * H5 地牢主题 Loading 体验 — 统一等待管理器
 *
 * 统一接管所有 async 请求状态，输出 loading UI、文案策略、阶段进度。
 * 支持时长分级（0-1s/1-3s/3-8s/8-15s/15s+）自动升级 UI 复杂度。
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import type { LoadingScene, LoadingTask, DurationTier, CopyTone } from './types';
import { pickCopy, getProgressiveChain, getFallbackCopy, SPEAKER_NAMES, getSceneSpeaker } from './copyPool';
import { resetEasterEggState, onLongWait } from './easterEggs';
import type { EasterEggResult } from './easterEggs';

export interface LoadingState {
  active: boolean;
  task: LoadingTask | null;
  tier: DurationTier;
  elapsedMs: number;
  currentCopy: string;
  currentSpeaker: string;
  copyFading: boolean;
  showCancel: boolean;
  showRetry: boolean;
  showFallbackActions: boolean;
  easterEggResult: EasterEggResult | null;
  phase?: string;
  percent?: number;
}

interface OrchestratorActions {
  start: (taskId: string, scene: LoadingScene, canCancel?: boolean) => void;
  progress: (taskId: string, phase: string, percent?: number) => void;
  resolve: (taskId: string) => void;
  reject: (taskId: string, error?: string) => void;
  cancel: () => void;
  retry: () => void;
}

export type UserSegment = 'newbie' | 'active' | 'returning';

interface OrchestratorOptions {
  userSegment?: UserSegment;
  onCancel?: (taskId: string) => void;
  onRetry?: (taskId: string) => void;
}

function getTier(ms: number): DurationTier {
  if (ms < 1000) return 'instant';
  if (ms < 3000) return 'light';
  if (ms < 8000) return 'normal';
  if (ms < 15000) return 'risky';
  return 'critical';
}

function getMaxTone(segment: UserSegment, elapsedMs: number): CopyTone {
  if (segment === 'newbie' && elapsedMs < 10000) return 'light';
  if (elapsedMs < 5000) return 'medium';
  return 'heavy';
}

// 非线性进度：前 80% 走得快（给信心），后 20% 慢（真实）
export function nonLinearPercent(realPercent: number): number {
  if (realPercent <= 0) return 0;
  if (realPercent >= 100) return 100;
  const normalized = realPercent / 100;
  const curved = normalized < 0.8
    ? (normalized / 0.8) * 0.9    // 前80%真实进度 → 映射到显示0-90%
    : 0.9 + ((normalized - 0.8) / 0.2) * 0.1;  // 后20%真实 → 显示90-100%
  return Math.round(curved * 100);
}

const COPY_ROTATE_MS = 2500;
const FADE_DURATION_MS = 400;

export function useLoadingOrchestrator(options: OrchestratorOptions = {}): [LoadingState, OrchestratorActions] {
  const { userSegment = 'active', onCancel, onRetry } = options;

  const [state, setState] = useState<LoadingState>({
    active: false,
    task: null,
    tier: 'instant',
    elapsedMs: 0,
    currentCopy: '',
    currentSpeaker: '',
    copyFading: false,
    showCancel: false,
    showRetry: false,
    showFallbackActions: false,
    easterEggResult: null,
  });

  const taskRef = useRef<LoadingTask | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const chainIndexRef = useRef(0);
  const longWaitFiredRef = useRef(false);
  const lastRetryTaskRef = useRef<string>('');

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = undefined;
    }
    taskRef.current = null;
    chainIndexRef.current = 0;
    longWaitFiredRef.current = false;
  }, []);

  const start = useCallback((taskId: string, scene: LoadingScene, canCancel = false) => {
    cleanup();
    resetEasterEggState();

    const task: LoadingTask = {
      id: taskId,
      scene,
      canCancel,
      startedAt: Date.now(),
      resolved: false,
    };
    taskRef.current = task;
    chainIndexRef.current = 0;

    const speaker = getSceneSpeaker(scene);
    const chain = getProgressiveChain(scene);
    const firstCopy = chain?.steps[0]?.text ?? pickCopy(scene, 'light').text;

    setState({
      active: true,
      task,
      tier: 'instant',
      elapsedMs: 0,
      currentCopy: firstCopy,
      currentSpeaker: SPEAKER_NAMES[speaker],
      copyFading: false,
      showCancel: canCancel,
      showRetry: false,
      showFallbackActions: false,
      easterEggResult: null,
    });

    let lastCopyRotate = Date.now();

    timerRef.current = setInterval(() => {
      const t = taskRef.current;
      if (!t || t.resolved) { cleanup(); return; }

      const elapsed = Date.now() - t.startedAt;
      const tier = getTier(elapsed);
      const now = Date.now();

      let newCopy: string | undefined;
      let fading = false;

      // 三段递进优先
      if (chain) {
        const nextStep = chain.steps[chainIndexRef.current + 1];
        if (nextStep && elapsed >= nextStep.delayMs) {
          chainIndexRef.current++;
          newCopy = nextStep.text;
          fading = true;
        }
      }

      // 递进链播完后自动切换随机文案
      if (!newCopy && now - lastCopyRotate >= COPY_ROTATE_MS) {
        const maxTone = getMaxTone(userSegment, elapsed);
        if (tier === 'critical') {
          newCopy = getFallbackCopy().text;
        } else if (chain && chainIndexRef.current >= chain.steps.length - 1) {
          newCopy = pickCopy(t.scene, maxTone).text;
        }
        if (newCopy) {
          lastCopyRotate = now;
          fading = true;
        }
      }

      // 8s+ 长等待彩蛋触发
      if (elapsed >= 8000 && !longWaitFiredRef.current) {
        longWaitFiredRef.current = true;
        const eggResult = onLongWait();
        if (eggResult) {
          setState((prev) => ({ ...prev, easterEggResult: eggResult }));
        }
      }

      setState((prev) => ({
        ...prev,
        elapsedMs: elapsed,
        tier,
        ...(newCopy ? { currentCopy: newCopy, copyFading: fading } : {}),
        showRetry: tier === 'risky' || tier === 'critical',
        showFallbackActions: tier === 'critical',
        phase: t.phase,
        percent: t.percent,
      }));

      // 渐隐恢复
      if (fading) {
        setTimeout(() => {
          setState((prev) => ({ ...prev, copyFading: false }));
        }, FADE_DURATION_MS);
      }
    }, 200);
  }, [cleanup, userSegment]);

  const progress = useCallback((taskId: string, phase: string, percent?: number) => {
    const t = taskRef.current;
    if (!t || t.id !== taskId) return;
    t.phase = phase;
    t.percent = percent;
  }, []);

  const resolve = useCallback((taskId: string) => {
    const t = taskRef.current;
    if (!t || t.id !== taskId) return;
    t.resolved = true;
    cleanup();
    setState((prev) => ({
      ...prev,
      active: false,
      task: null,
      tier: 'instant',
      easterEggResult: null,
    }));
  }, [cleanup]);

  const reject = useCallback((taskId: string, error?: string) => {
    const t = taskRef.current;
    if (!t || t.id !== taskId) return;
    t.resolved = true;
    t.error = error;
    cleanup();
    setState((prev) => ({
      ...prev,
      active: false,
      task: { ...t, error },
      tier: 'critical',
    }));
  }, [cleanup]);

  const cancel = useCallback(() => {
    const t = taskRef.current;
    if (!t || !t.canCancel) return;
    t.resolved = true;
    cleanup();
    onCancel?.(t.id);
    setState((prev) => ({ ...prev, active: false, task: null }));
  }, [cleanup, onCancel]);

  const retry = useCallback(() => {
    const t = taskRef.current;
    if (!t) return;
    lastRetryTaskRef.current = t.id;
    onRetry?.(t.id);
  }, [onRetry]);

  useEffect(() => () => cleanup(), [cleanup]);

  return [state, { start, progress, resolve, reject, cancel, retry }];
}
