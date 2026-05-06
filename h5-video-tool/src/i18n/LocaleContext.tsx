import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { getMessage } from './messages.ts';
import {
  getInitialContentLocale,
  getInitialUiLocale,
  getLocalePairForLanguage,
  writeStoredContentLocale,
  writeStoredUiLocale,
  type ContentLocale,
  type UiLocale,
} from './locale.ts';

type LocaleContextValue = {
  uiLocale: UiLocale;
  contentLocale: ContentLocale;
  setLanguage: (next: UiLocale) => void;
  setLocalePair: (next: { uiLocale: UiLocale; contentLocale: ContentLocale }) => void;
  setUiLocale: (next: UiLocale) => void;
  setContentLocale: (next: ContentLocale) => void;
  t: (path: string) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function getBrowserLocale(): string | null {
  if (typeof navigator === 'undefined') return null;
  return navigator.language || null;
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [uiLocale, setUiLocaleState] = useState<UiLocale>(() =>
    getInitialUiLocale(typeof window === 'undefined' ? null : window.localStorage, getBrowserLocale()),
  );
  const [contentLocale, setContentLocaleState] = useState<ContentLocale>(() =>
    getInitialContentLocale(typeof window === 'undefined' ? null : window.localStorage, uiLocale),
  );

  const setLocalePair = (next: { uiLocale: UiLocale; contentLocale: ContentLocale }) => {
    setUiLocaleState(next.uiLocale);
    setContentLocaleState(next.contentLocale);
    if (typeof window !== 'undefined') {
      writeStoredUiLocale(window.localStorage, next.uiLocale);
      writeStoredContentLocale(window.localStorage, next.contentLocale);
    }
  };

  const setLanguage = (next: UiLocale) => {
    setLocalePair(getLocalePairForLanguage(next));
  };

  const setUiLocale = (next: UiLocale) => {
    setUiLocaleState(next);
    if (typeof window !== 'undefined') {
      writeStoredUiLocale(window.localStorage, next);
    }
  };

  const setContentLocale = (next: ContentLocale) => {
    setContentLocaleState(next);
    if (typeof window !== 'undefined') {
      writeStoredContentLocale(window.localStorage, next);
    }
  };

  const value = useMemo<LocaleContextValue>(
    () => ({
      uiLocale,
      contentLocale,
      setLanguage,
      setLocalePair,
      setUiLocale,
      setContentLocale,
      t: (path: string) => getMessage(uiLocale, path),
    }),
    [contentLocale, uiLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const value = useContext(LocaleContext);
  if (!value) throw new Error('useLocale must be used within LocaleProvider');
  return value;
}
