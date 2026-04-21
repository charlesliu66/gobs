import { useLocale } from '../i18n/LocaleContext.tsx';
import { getLocalePreset, matchLocalePreset, type LocalePresetId } from '../i18n/locale.ts';

const PRESET_IDS: LocalePresetId[] = ['zhUiZhContent', 'enUiZhContent', 'enUiEnContent'];

export function LocalePresetSwitcher({ compact = false }: { compact?: boolean }) {
  const { uiLocale, contentLocale, setUiLocale, setContentLocale, t } = useLocale();
  const activePreset = matchLocalePreset(uiLocale, contentLocale);
  const activeMeta = t(`localeSwitcher.${activePreset}Meta`);

  const applyPreset = (presetId: LocalePresetId) => {
    const preset = getLocalePreset(presetId);
    setUiLocale(preset.uiLocale);
    setContentLocale(preset.contentLocale);
  };

  return (
    <div
      className={
        compact
          ? 'inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-[rgba(15,18,34,0.72)] p-1 shadow-[0_10px_30px_rgba(8,10,20,0.28)] backdrop-blur'
          : 'rounded-2xl border border-white/8 bg-[linear-gradient(180deg,rgba(18,22,40,0.96),rgba(12,15,28,0.92))] p-3 shadow-[0_18px_40px_rgba(4,6,14,0.34)]'
      }
    >
      {!compact && (
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-subtle)]">
              {t('localeSwitcher.title')}
            </p>
            <p className="mt-1 text-[11px] leading-4 text-[var(--color-text-muted)]">
              {t('localeSwitcher.hint')}
            </p>
          </div>
          <span className="rounded-full border border-[var(--color-primary)]/28 bg-[var(--color-primary)]/12 px-2 py-1 text-[10px] font-medium text-[var(--color-primary-soft)]">
            {activeMeta}
          </span>
        </div>
      )}

      <div
        className={
          compact
            ? 'inline-flex items-center rounded-[18px] bg-white/4 p-0.5'
            : 'grid grid-cols-3 gap-1 rounded-[18px] border border-white/6 bg-black/16 p-1'
        }
      >
        {PRESET_IDS.map((presetId) => {
          const active = activePreset === presetId;
          return (
            <button
              key={presetId}
              type="button"
              onClick={() => applyPreset(presetId)}
              className={`transition ${
                compact
                  ? `min-w-[58px] rounded-2xl px-3 py-2 text-[11px] font-semibold ${
                      active
                        ? 'bg-[linear-gradient(135deg,var(--color-primary),color-mix(in srgb,var(--color-primary) 68%,white))] text-white shadow-[0_12px_28px_rgba(124,141,255,0.34)]'
                        : 'text-[var(--color-text-muted)] hover:bg-white/6 hover:text-[var(--color-text)]'
                    }`
                  : `rounded-[14px] px-2 py-2.5 text-center ${
                      active
                        ? 'bg-[linear-gradient(135deg,var(--color-primary),color-mix(in srgb,var(--color-primary) 72%,white))] text-white shadow-[0_12px_26px_rgba(124,141,255,0.30)]'
                        : 'text-[var(--color-text-muted)] hover:bg-white/6 hover:text-[var(--color-text)]'
                    }`
              }`}
              title={t(`localePreset.${presetId}`)}
            >
              <span className="block whitespace-nowrap text-[11px] font-semibold">
                {t(`localeSwitcher.${presetId}Badge`)}
              </span>
              {!compact && (
                <span className={`mt-1 block text-[10px] ${active ? 'text-white/74' : 'text-[var(--color-text-subtle)]'}`}>
                  {t(`localeSwitcher.${presetId}`)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
