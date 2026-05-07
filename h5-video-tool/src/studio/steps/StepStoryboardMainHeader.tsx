import { useLocale } from '../../i18n/LocaleContext.tsx';
import { formatMessage } from '../../i18n/locale.ts';

export function StepStoryboardMainHeader({
  styleRefSummary,
  storySceneCoverage,
  shotIndex,
  shotRefTagsText,
  shotVideoDreaminaModel,
  dreaminaModelVersion,
  onShotVideoDreaminaModelChange,
  onDreaminaModelVersionChange,
}: {
  styleRefSummary: string;
  storySceneCoverage: { hit: number; total: number; missingLabels: string[] } | null;
  shotIndex: number;
  shotRefTagsText: string;
  shotVideoDreaminaModel?: string;
  dreaminaModelVersion?: string;
  onShotVideoDreaminaModelChange: (next: string) => void;
  onDreaminaModelVersionChange: (next: string) => void;
}) {
  const { t, uiLocale } = useLocale();
  const tx = (path: string, values?: Record<string, string | number>) => formatMessage(t(path), values);
  const separator = uiLocale === 'en' ? ', ' : '、';

  return (
    <>
      <div className="text-xs text-[var(--color-text-muted)]">
        {t('productionWizard.storyboardMainHeader.globalStyle')}
        {styleRefSummary.slice(0, 120)}
        {styleRefSummary.length > 120 ? '...' : ''}
      </div>
      {storySceneCoverage && storySceneCoverage.total > 0 ? (
        <div
          className={`rounded-lg border px-3 py-2 text-[11px] leading-snug ${
            storySceneCoverage.hit < storySceneCoverage.total
              ? 'border-amber-500/45 bg-amber-500/10 text-amber-950 dark:text-amber-100'
              : 'border-[var(--color-border)]/80 bg-[var(--color-surface)] text-[var(--color-text-muted)]'
          }`}
        >
          <span className="font-medium text-[var(--color-text)]">
            {t('productionWizard.storyboardMainHeader.sceneCoverage')}
          </span>
          {tx('productionWizard.storyboardMainHeader.sceneCoverageSummary', {
            hit: storySceneCoverage.hit,
            total: storySceneCoverage.total,
          })}
          {storySceneCoverage.hit < storySceneCoverage.total && storySceneCoverage.missingLabels.length > 0 ? (
            <span>
              {' '}
              {t('productionWizard.storyboardMainHeader.missingShots')}
              {storySceneCoverage.missingLabels.join(separator)}
              {t('productionWizard.storyboardMainHeader.missingShotsHint')}
            </span>
          ) : (
            <span>{t('productionWizard.storyboardMainHeader.coverageMatches')}</span>
          )}
        </div>
      ) : null}
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold text-[var(--color-text)]">
            {tx('productionWizard.storyboardMainHeader.shotTitle', { shotIndex })}
          </h3>
          <span className="text-xs text-[var(--color-text-muted)]">{shotRefTagsText}</span>
        </div>
        <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">
          {t('productionWizard.storyboardMainHeader.promptAssemblyHint')}
        </p>
        <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">
          {t('productionWizard.storyboardMainHeader.multimodalHint')}
        </p>
        <div className="mt-2 flex flex-wrap items-end gap-3 text-[10px]">
          <label className="flex flex-col gap-0.5 text-[var(--color-text-muted)]">
            {t('productionWizard.storyboardMainHeader.storyboardVideoModel')}
            <select
              value={shotVideoDreaminaModel ?? ''}
              onChange={(e) => onShotVideoDreaminaModelChange(e.target.value)}
              className="mt-0.5 max-w-[240px] rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-[11px] text-[var(--color-text)]"
            >
              <option value="">
                {t('productionWizard.storyboardMainHeader.autoVideoMode')}
              </option>
              <option value="dreamina-multimodal">
                {t('productionWizard.storyboardMainHeader.multimodalMode')}
              </option>
              <option value="dreamina-image2video">{t('productionWizard.storyboardMainHeader.imageToVideoMode')}</option>
              <option value="dreamina-text2video">{t('productionWizard.storyboardMainHeader.textToVideoMode')}</option>
            </select>
          </label>
          <label className="flex flex-col gap-0.5 text-[var(--color-text-muted)]">
            {t('productionWizard.storyboardMainHeader.seedanceVersion')}
            <select
              value={dreaminaModelVersion ?? ''}
              onChange={(e) => onDreaminaModelVersionChange(e.target.value)}
              className="mt-0.5 max-w-[260px] rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-[11px] text-[var(--color-text)]"
            >
              <option value="">
                {t('productionWizard.storyboardMainHeader.defaultSeedanceVersion')}
              </option>
              <option value="seedance2.0">{t('productionWizard.storyboardMainHeader.seedance20')}</option>
              <option value="seedance2.0fast">{t('productionWizard.storyboardMainHeader.seedance20Fast')}</option>
            </select>
          </label>
        </div>
      </div>
    </>
  );
}
