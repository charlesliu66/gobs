import type { ContinuityIssue } from '../../api/shotReview';

export function StepStoryboardContinuityCheck({
  issues,
  checking,
  onCheck,
  onJumpToShot,
}: {
  issues: ContinuityIssue[] | null;
  checking: boolean;
  onCheck: () => void;
  onJumpToShot: (idx: number) => void;
}) {
  const severityBadge = (s: 'warning' | 'error') =>
    s === 'error'
      ? 'border-red-500/40 bg-red-950/30 text-red-300'
      : 'border-amber-500/40 bg-amber-950/30 text-amber-300';

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--color-text)]">分镜间一致性检查</span>
        <button
          type="button"
          disabled={checking}
          onClick={onCheck}
          className="rounded-md bg-teal-600 px-3 py-1 text-[11px] font-medium text-white transition-colors hover:bg-teal-500 disabled:opacity-50"
        >
          {checking ? '检查中…' : '一致性检查'}
        </button>
      </div>

      {checking && (
        <div className="mt-2 flex items-center gap-2 text-[11px] text-[var(--color-text-muted)]">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-teal-400/30 border-t-teal-400" />
          正在检查相邻镜头连贯性…
        </div>
      )}

      {issues !== null && !checking && (
        <div className="mt-3 space-y-2">
          {issues.length === 0 ? (
            <p className="text-[11px] text-green-400">所有相邻镜头连续性良好，未发现问题。</p>
          ) : (
            issues.map((issue, i) => (
              <div
                key={i}
                className={`rounded-md border p-2.5 text-[11px] ${severityBadge(issue.severity)}`}
              >
                <div className="flex items-center gap-2">
                  <span className="rounded border border-current px-1 py-0.5 text-[9px] font-medium uppercase">
                    {issue.severity}
                  </span>
                  <span className="font-medium">{issue.category}</span>
                  <span className="text-[10px] opacity-70">
                    镜头 #{issue.shotIndexA} → #{issue.shotIndexB}
                  </span>
                </div>
                <p className="mt-1 text-[var(--color-text)]">{issue.description}</p>
                <button
                  type="button"
                  onClick={() => onJumpToShot(issue.shotIndexA)}
                  className="mt-1 text-[10px] underline opacity-70 hover:opacity-100"
                >
                  跳转到镜头 #{issue.shotIndexA}
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
