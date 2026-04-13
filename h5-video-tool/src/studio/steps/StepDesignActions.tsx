export function StepDesignActions({
  busyL3,
  maxTotalDurationSec,
  onMaxTotalDurationSecChange,
  onGenerateStoryboard,
}: {
  busyL3: boolean;
  maxTotalDurationSec: number;
  onMaxTotalDurationSecChange: (next: number) => void;
  onGenerateStoryboard: () => void | Promise<void>;
}) {
  return (
    <>
      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border)]/80 bg-[var(--color-surface-elevated)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">
          <span className="mr-1.5 inline-block text-[var(--color-primary)]" aria-hidden>
            ◆
          </span>
          角色、场景与关键道具会应用到后续分镜与成片，建议定妆、场景图与道具图确认后再继续。
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
        <label className="text-xs text-[var(--color-text-muted)]">
          分镜总时长上限（秒）
          <input
            type="number"
            min={20}
            max={300}
            value={maxTotalDurationSec}
            onChange={(e) => onMaxTotalDurationSecChange(Number(e.target.value) || 60)}
            className="mt-1 block w-28 rounded-lg border border-[var(--color-border)] px-2 py-1.5 text-sm"
          />
        </label>
        <button
          type="button"
          disabled={busyL3}
          onClick={() => void onGenerateStoryboard()}
          className="rounded-lg bg-[var(--color-primary)] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {busyL3 ? '生成中…' : '生成分镜表'}
        </button>
      </div>
      <p className="text-[11px] leading-relaxed text-[var(--color-text-muted)]">
        分镜表会尽量让 L1 中<strong className="text-[var(--color-text)]">每一个场景 id</strong>
        至少在某一镜出现（与「全部场景」定帧对应）。若你增删过故事场景，请重新点「生成分镜表」以同步。
      </p>
    </>
  );
}

