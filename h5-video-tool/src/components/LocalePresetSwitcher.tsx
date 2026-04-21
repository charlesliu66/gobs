import { useLocale } from '../i18n/LocaleContext.tsx';
import { getLocalePreset, matchLocalePreset, type LocalePresetId } from '../i18n/locale.ts';

const PRESET_IDS: LocalePresetId[] = ['zhUiZhContent', 'enUiZhContent', 'enUiEnContent'];

export function LocalePresetSwitcher({ compact = false }: { compact?: boolean }) {
  const { uiLocale, contentLocale, setUiLocale, setContentLocale, t } = useLocale();
  const activePreset = matchLocalePreset(uiLocale, contentLocale);

  const applyPreset = (presetId: LocalePresetId) => {
    const preset = getLocalePreset(presetId);
    setUiLocale(preset.uiLocale);
    setContentLocale(preset.contentLocale);
  };

  return (
    <div className={`flex flex-wrap gap-1.5 ${compact ? '' : 'justify-end'}`}>
      {PRESET_IDS.map((presetId) => {
        const active = activePreset === presetId;
        return (
          <button
            key={presetId}
            type="button"
            onClick={() => applyPreset(presetId)}
            className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
              active
                ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-text)]'
            }`}
          >
            {t(`localePreset.${presetId}`)}
          </button>
        );
      })}
    </div>
  );
}
