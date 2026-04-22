import { useLocale } from '../i18n/LocaleContext.tsx';
import { normalizeUiLocale, type UiLocale } from '../i18n/locale.ts';

export function LocalePresetSwitcher({ compact = false }: { compact?: boolean }) {
  const { uiLocale, setLanguage } = useLocale();
  const text =
    uiLocale === 'en'
      ? {
          label: 'Language',
          hint: 'Switch UI and generated content together',
          chinese: '简体中文',
          english: 'English',
        }
      : {
          label: '语言',
          hint: '界面和生成内容一起切换',
          chinese: '简体中文',
          english: 'English',
        };

  const handleChange = (value: string) => {
    setLanguage(normalizeUiLocale(value) as UiLocale);
  };

  return (
    <div
      className={
        compact
          ? 'inline-flex items-center gap-2 rounded-xl border border-white/10 bg-[rgba(15,18,34,0.72)] px-2 py-1.5 shadow-[0_10px_30px_rgba(8,10,20,0.28)] backdrop-blur'
          : 'rounded-2xl border border-white/8 bg-[linear-gradient(180deg,rgba(18,22,40,0.96),rgba(12,15,28,0.92))] p-3 shadow-[0_18px_40px_rgba(4,6,14,0.34)]'
      }
    >
      {!compact && (
        <div className="mb-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-subtle)]">
              {text.label}
            </p>
            <p className="mt-1 text-[11px] leading-4 text-[var(--color-text-muted)]">
              {text.hint}
            </p>
          </div>
        </div>
      )}

      <div className={compact ? 'min-w-[132px]' : ''}>
        <select
          aria-label={text.label}
          value={uiLocale}
          onChange={(event) => handleChange(event.target.value)}
          className={`w-full cursor-pointer appearance-none rounded-xl border border-[var(--color-primary)]/25 bg-[rgba(9,12,24,0.86)] bg-no-repeat px-3 py-2 pr-9 text-sm font-medium text-[var(--color-text)] outline-none transition hover:border-[var(--color-primary)]/45 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15 ${
            compact ? 'text-[13px]' : 'mt-1'
          }`}
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none'%3E%3Cpath d='M2.25 4.5L6 8.25L9.75 4.5' stroke='%23C9D2FF' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
            backgroundPosition: 'right 12px center',
          }}
        >
          <option value="zh-CN">{text.chinese}</option>
          <option value="en">{text.english}</option>
        </select>
      </div>
    </div>
  );
}
