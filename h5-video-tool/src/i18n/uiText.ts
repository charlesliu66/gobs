import type { UiLocale } from './locale.ts';

export function pickUiText<T>(uiLocale: UiLocale, zh: T, en: T): T {
  return uiLocale === 'en' ? en : zh;
}
