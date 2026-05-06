import type { UiLocale } from '../i18n/locale.ts';

export function resolveLocalizedVideoErrorMessage(
  uiLocale: UiLocale,
  input: {
    displayMessageZh?: string;
    displayMessageEn?: string;
    failReason?: string;
  },
): string {
  const zh = input.displayMessageZh?.trim();
  const en = input.displayMessageEn?.trim();
  const fallback = input.failReason?.trim() || '';

  if (uiLocale === 'en') {
    return en || zh || fallback;
  }
  return zh || en || fallback;
}
