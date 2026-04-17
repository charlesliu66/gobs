import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import type { LoadingScene, Speaker } from './loading/types';
import { pickCopy, SPEAKER_NAMES, getSceneSpeaker } from './loading/copyPool';

interface RunningStatusProps {
  active: boolean;
  label?: string;
  stallAfterSec?: number;
  className?: string;
  /** 传入剧院场景后，>3s 自动升级为卡片式，显示角色名 + 文案轮播 */
  scene?: LoadingScene;
}

const COPY_ROTATE_MS = 3500;

export function RunningStatus({
  active,
  label = '处理中',
  stallAfterSec = 25,
  className = '',
  scene,
}: RunningStatusProps) {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState<number>(Date.now());
  const [theaterCopy, setTheaterCopy] = useState('');
  const [theaterSpeaker, setTheaterSpeaker] = useState('');
  const [copyFading, setCopyFading] = useState(false);
  const rotateTimer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    if (!active) {
      setStartedAt(null);
      setTheaterCopy('');
      setTheaterSpeaker('');
      if (rotateTimer.current) clearInterval(rotateTimer.current);
      return;
    }
    setStartedAt(Date.now());
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);

  const elapsedSec = useMemo(() => {
    if (!active || !startedAt) return 0;
    return Math.max(0, Math.floor((now - startedAt) / 1000));
  }, [active, startedAt, now]);

  const rotateCopy = useCallback(() => {
    if (!scene) return;
    setCopyFading(true);
    setTimeout(() => {
      const copy = pickCopy(scene, 'medium');
      const speaker: Speaker = copy.speaker ?? getSceneSpeaker(scene);
      setTheaterCopy(copy.text);
      setTheaterSpeaker(SPEAKER_NAMES[speaker]);
      setCopyFading(false);
    }, 300);
  }, [scene]);

  // 3s 阈值触发剧院文案 + 轮播
  useEffect(() => {
    if (!scene || !active || elapsedSec < 3) {
      if (rotateTimer.current) clearInterval(rotateTimer.current);
      return;
    }
    if (!theaterCopy) rotateCopy();
    rotateTimer.current = setInterval(rotateCopy, COPY_ROTATE_MS);
    return () => { if (rotateTimer.current) clearInterval(rotateTimer.current); };
  }, [scene, active, elapsedSec >= 3, rotateCopy]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!active) return null;

  const stalled = elapsedSec >= stallAfterSec;
  const showTheater = !!scene && elapsedSec >= 3 && theaterCopy;

  // 升级模式：卡片式剧院文案
  if (showTheater) {
    return (
      <div
        className={`flex flex-col gap-1.5 rounded-lg border border-amber-600/25 bg-amber-950/20 px-3 py-2.5 backdrop-blur-sm ${className}`}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center gap-2">
          <span className="relative inline-flex h-3 w-3 items-center justify-center">
            <span className="inline-block h-3 w-3 rounded-full border border-amber-400 border-t-transparent animate-spin" />
            <span className="absolute inline-block h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
          </span>
          <span className="text-[11px] font-medium tracking-wide text-amber-500/80">
            {theaterSpeaker}
          </span>
          <span className="ml-auto text-[10px] text-amber-700/50">{elapsedSec}s</span>
        </div>
        <p
          className={`text-sm leading-relaxed text-amber-200/80 transition-opacity ${
            copyFading ? 'opacity-0 duration-200' : 'opacity-100 duration-400'
          }`}
        >
          {theaterCopy}
        </p>
      </div>
    );
  }

  // 默认模式：保持原有 inline 样式
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs ${
        stalled
          ? 'border-amber-500/35 bg-amber-500/10 text-amber-300'
          : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]'
      } ${className}`}
      role="status"
      aria-live="polite"
    >
      <span className="relative inline-flex h-3 w-3 items-center justify-center">
        <span className="inline-block h-3 w-3 rounded-full border border-current border-t-transparent animate-spin" />
        <span className="absolute inline-block h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
      </span>
      <span>
        {stalled ? `可能卡住（已运行 ${elapsedSec}s）` : `${label}（${elapsedSec}s）`}
      </span>
    </div>
  );
}
