import { useLocale } from '../../i18n/LocaleContext.tsx';
import { pickUiText } from '../../i18n/uiText.ts';

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
  const { uiLocale } = useLocale();
  const uiText = <T,>(zh: T, en: T) => pickUiText(uiLocale, zh, en);

  return (
    <>
      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border)]/80 bg-[var(--color-surface-elevated)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">
          <span className="mr-1.5 inline-block text-[var(--color-primary)]" aria-hidden>
            ◆
          </span>
          {uiText(
            '角色、场景与关键道具会应用到后续分镜与成片，建议定妆、场景图与道具图确认后再继续。',
            'Characters, scenes, and key props flow into later storyboard shots and the final edit. Confirm portraits, scene images, and prop images before continuing.',
          )}
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
        <label className="text-xs text-[var(--color-text-muted)]">
          {uiText('分镜总时长上限（秒）', 'Storyboard total duration cap (seconds)')}
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
          {busyL3 ? uiText('生成中…', 'Generating…') : uiText('生成分镜表', 'Generate storyboard')}
        </button>
      </div>
      <p className="text-[11px] leading-relaxed text-[var(--color-text-muted)]">
        {uiText('分镜表会尽量让 L1 中', 'The storyboard tries to make every ')}
        <strong className="text-[var(--color-text)]">{uiText('每一个场景 id', 'scene id')}</strong>
        {uiText(
          '至少在某一镜出现（与「全部场景」定帧对应）。若你增删过故事场景，请重新点「生成分镜表」以同步。',
          ' appear in at least one shot, matching the All Scenes keyframes. If you add or remove story scenes, regenerate the storyboard to sync.',
        )}
      </p>
    </>
  );
}

