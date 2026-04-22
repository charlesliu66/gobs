export type UiLocale = 'zh-CN' | 'en';
export type ContentLocale = 'zh' | 'en';
export type LocalePresetId = 'zhUiZhContent' | 'enUiZhContent' | 'enUiEnContent';

export const UI_LOCALE_STORAGE_KEY = 'gobs_ui_locale';
export const CONTENT_LOCALE_STORAGE_KEY = 'gobs_content_locale';

const LOCALE_PRESETS: Record<LocalePresetId, { uiLocale: UiLocale; contentLocale: ContentLocale }> = {
  zhUiZhContent: { uiLocale: 'zh-CN', contentLocale: 'zh' },
  enUiZhContent: { uiLocale: 'en', contentLocale: 'zh' },
  enUiEnContent: { uiLocale: 'en', contentLocale: 'en' },
};

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

export function getLocalePreset(id: LocalePresetId): { uiLocale: UiLocale; contentLocale: ContentLocale } {
  return LOCALE_PRESETS[id];
}

export function matchLocalePreset(uiLocale: UiLocale, contentLocale: ContentLocale): LocalePresetId | null {
  for (const [id, preset] of Object.entries(LOCALE_PRESETS) as Array<
    [LocalePresetId, { uiLocale: UiLocale; contentLocale: ContentLocale }]
  >) {
    if (preset.uiLocale === uiLocale && preset.contentLocale === contentLocale) return id;
  }
  return null;
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

export function formatDateTime(value: string | number | Date, locale: UiLocale): string {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
