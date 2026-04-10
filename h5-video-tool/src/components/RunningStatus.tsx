import { useEffect, useMemo, useState } from 'react';

interface RunningStatusProps {
  active: boolean;
  label?: string;
  stallAfterSec?: number;
  className?: string;
}

export function RunningStatus({
  active,
  label = '处理中',
  stallAfterSec = 25,
  className = '',
}: RunningStatusProps) {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    if (!active) {
      setStartedAt(null);
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

  if (!active) return null;

  const stalled = elapsedSec >= stallAfterSec;
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

