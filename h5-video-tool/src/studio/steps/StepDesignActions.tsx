import { useLocale } from '../../i18n/LocaleContext.tsx';
import { formatMessage } from '../../i18n/locale.ts';

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
  const { t } = useLocale();
  const tx = (path: string, values?: Record<string, string | number>) => formatMessage(t(path), values);

  return (
    <>
      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border)]/80 bg-[var(--color-surface-elevated)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">
          <span className="mr-1.5 inline-block text-[var(--color-primary)]" aria-hidden>
            *
          </span>
          {t('productionWizard.designActions.assetReadinessHint')}
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
        <label className="text-xs text-[var(--color-text-muted)]">
          {t('productionWizard.designActions.storyboardDurationCap')}
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
          {busyL3 ? t('productionWizard.designActions.generating') : t('productionWizard.designActions.generateStoryboard')}
        </button>
      </div>
      <p className="text-[11px] leading-relaxed text-[var(--color-text-muted)]">
        {t('productionWizard.designActions.coveragePrefix')}
        <strong className="text-[var(--color-text)]">{t('productionWizard.designActions.coverageSceneId')}</strong>
        {tx('productionWizard.designActions.coverageSuffix')}
      </p>
    </>
  );
}
