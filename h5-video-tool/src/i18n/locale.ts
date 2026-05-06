export type UiLocale = 'zh-CN' | 'en';
export type ContentLocale = 'zh' | 'en';
export type LocalePresetId =
  | 'zh-ui-zh-content'
  | 'en-ui-zh-content'
  | 'en-ui-en-content';

export const UI_LOCALE_STORAGE_KEY = 'gobs_ui_locale';
export const CONTENT_LOCALE_STORAGE_KEY = 'gobs_content_locale';

type StorageLike = Pick<Storage, 'getItem' | 'setItem'> | Map<string, string>;

function read(storage: StorageLike | null | undefined, key: string): string | null {
  if (!storage) return null;
  if (storage instanceof Map) return storage.get(key) ?? null;
  return storage.getItem(key);
}

function write(storage: StorageLike | null | undefined, key: string, value: string): void {
  if (!storage) return;
  if (storage instanceof Map) {
    storage.set(key, value);
    return;
  }
  storage.setItem(key, value);
}

export function normalizeUiLocale(raw?: string | null): UiLocale {
  const value = String(raw || '').trim().toLowerCase();
  if (value.startsWith('en')) return 'en';
  return 'zh-CN';
}

export function normalizeContentLocale(raw?: string | null): ContentLocale {
  const value = String(raw || '').trim().toLowerCase();
  if (value.startsWith('en')) return 'en';
  return 'zh';
}

export function detectBrowserUiLocale(raw?: string | null): UiLocale {
  return normalizeUiLocale(raw);
}

export function defaultContentLocaleFor(uiLocale: UiLocale): ContentLocale {
  return uiLocale === 'en' ? 'en' : 'zh';
}

export function getLocalePairForLanguage(uiLocale: UiLocale): {
  uiLocale: UiLocale;
  contentLocale: ContentLocale;
} {
  return {
    uiLocale,
    contentLocale: defaultContentLocaleFor(uiLocale),
  };
}

export function getLocalePairForPreset(preset: LocalePresetId): {
  uiLocale: UiLocale;
  contentLocale: ContentLocale;
} {
  switch (preset) {
    case 'en-ui-zh-content':
      return { uiLocale: 'en', contentLocale: 'zh' };
    case 'en-ui-en-content':
      return { uiLocale: 'en', contentLocale: 'en' };
    case 'zh-ui-zh-content':
    default:
      return { uiLocale: 'zh-CN', contentLocale: 'zh' };
  }
}

export function getLocalePreset(
  uiLocale: UiLocale,
  contentLocale: ContentLocale,
): LocalePresetId {
  if (uiLocale === 'en' && contentLocale === 'zh') return 'en-ui-zh-content';
  if (uiLocale === 'en' && contentLocale === 'en') return 'en-ui-en-content';
  return 'zh-ui-zh-content';
}

export function readStoredUiLocale(storage?: StorageLike | null): UiLocale {
  return normalizeUiLocale(read(storage, UI_LOCALE_STORAGE_KEY));
}

export function readStoredContentLocale(storage?: StorageLike | null, uiLocale?: UiLocale): ContentLocale {
  const stored = read(storage, CONTENT_LOCALE_STORAGE_KEY);
  if (stored) return normalizeContentLocale(stored);
  return uiLocale ? getLocalePairForLanguage(uiLocale).contentLocale : 'zh';
}

export function writeStoredUiLocale(storage: StorageLike | null | undefined, locale: UiLocale): void {
  write(storage, UI_LOCALE_STORAGE_KEY, locale);
}

export function writeStoredContentLocale(
  storage: StorageLike | null | undefined,
  locale: ContentLocale,
): void {
  write(storage, CONTENT_LOCALE_STORAGE_KEY, locale);
}

export function buildLocaleHeaders(
  uiLocale: UiLocale,
  contentLocale: ContentLocale,
): Record<'X-UI-Locale' | 'X-Content-Locale', string> {
  return {
    'X-UI-Locale': uiLocale,
    'X-Content-Locale': contentLocale,
  };
}

export function getInitialUiLocale(storage?: StorageLike | null, browserLocale?: string | null): UiLocale {
  const stored = read(storage, UI_LOCALE_STORAGE_KEY);
  return stored ? normalizeUiLocale(stored) : detectBrowserUiLocale(browserLocale);
}

export function getInitialContentLocale(
  storage?: StorageLike | null,
  uiLocale?: UiLocale,
): ContentLocale {
  const stored = read(storage, CONTENT_LOCALE_STORAGE_KEY);
  if (stored) return normalizeContentLocale(stored);
  if (uiLocale) return getLocalePairForLanguage(uiLocale).contentLocale;
  return defaultContentLocaleFor(uiLocale ?? 'zh-CN');
}

export function formatDateTime(
  value: string | number | Date,
  locale: UiLocale,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString(
    locale,
    options ?? {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    },
  );
}

export function formatDate(
  value: string | number | Date,
  locale: UiLocale,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString(
    locale,
    options ?? {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    },
  );
}

export function formatTime(
  value: string | number | Date,
  locale: UiLocale,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleTimeString(
    locale,
    options ?? {
      hour: '2-digit',
      minute: '2-digit',
    },
  );
}

export function formatRelativeTime(
  value: string | number | Date,
  locale: UiLocale,
  now = Date.now(),
): string {
  const timestamp = value instanceof Date ? value.getTime() : new Date(value).getTime();
  const diff = Math.max(0, now - timestamp);

  if (diff < 60_000) {
    return locale === 'en' ? 'just now' : '刚刚';
  }
  if (diff < 3_600_000) {
    const minutes = Math.floor(diff / 60_000);
    return locale === 'en' ? `${minutes} min ago` : `${minutes}分钟前`;
  }
  if (diff < 86_400_000) {
    const hours = Math.floor(diff / 3_600_000);
    return locale === 'en' ? `${hours} hr ago` : `${hours}小时前`;
  }
  const days = Math.floor(diff / 86_400_000);
  return locale === 'en' ? `${days} day${days === 1 ? '' : 's'} ago` : `${days}天前`;
}

export function formatMessage(
  template: string,
  values?: Record<string, string | number>,
): string {
  if (!values) return template;
  return Object.entries(values).reduce(
    (message, [key, value]) => message.replaceAll(`{${key}}`, String(value)),
    template,
  );
}
