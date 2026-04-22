import type { ContentLocale, UiLocale } from './locale.ts';

export type ReplyLocale = UiLocale;
export type ReplyCaptionLanguage = 'EN' | 'CN';

const CJK_RE = /[\u3400-\u9fff]/g;
const LATIN_WORD_RE = /[A-Za-z]+(?:['’-][A-Za-z]+)*/g;

function countMatches(input: string, pattern: RegExp): number {
  return input.match(pattern)?.length ?? 0;
}

function scoreTextLanguage(raw?: string | null): { zh: number; en: number } {
  const text = String(raw || '').trim();
  if (!text) return { zh: 0, en: 0 };
  return {
    zh: countMatches(text, CJK_RE),
    en: countMatches(text, LATIN_WORD_RE),
  };
}

export function normalizeReplyLocale(raw?: string | null): ReplyLocale | null {
  const value = String(raw || '').trim().toLowerCase();
  if (!value) return null;
  if (value.startsWith('en')) return 'en';
  if (value.startsWith('zh')) return 'zh-CN';
  return null;
}

export function contentLocaleToReplyLocale(locale?: ContentLocale | null): ReplyLocale {
  return locale === 'en' ? 'en' : 'zh-CN';
}

export function detectReplyLocaleFromText(raw?: string | null): ReplyLocale | null {
  const { zh, en } = scoreTextLanguage(raw);
  if (!zh && !en) return null;
  if (en >= Math.max(3, zh * 1.2)) return 'en';
  if (zh >= Math.max(2, en * 1.2)) return 'zh-CN';
  return null;
}

export function detectReplyLocaleFromValues(values: Array<string | null | undefined>): ReplyLocale | null {
  let zh = 0;
  let en = 0;
  for (const value of values) {
    const score = scoreTextLanguage(value);
    zh += score.zh;
    en += score.en;
  }
  if (!zh && !en) return null;
  if (en >= Math.max(3, zh * 1.2)) return 'en';
  if (zh >= Math.max(2, en * 1.2)) return 'zh-CN';
  return null;
}

export function collectStringSamples(input: unknown, limit = 64): string[] {
  const samples: string[] = [];

  const walk = (value: unknown) => {
    if (samples.length >= limit || value == null) return;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) samples.push(trimmed);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item) => walk(item));
      return;
    }
    if (typeof value === 'object') {
      Object.values(value as Record<string, unknown>).forEach((item) => walk(item));
    }
  };

  walk(input);
  return samples;
}

export function resolveReplyLocale(options?: {
  explicit?: string | null;
  values?: Array<string | null | undefined>;
  sampleObject?: unknown;
  fallbackContentLocale?: ContentLocale | null;
}): ReplyLocale {
  const explicit = normalizeReplyLocale(options?.explicit);
  if (explicit) return explicit;

  const samples = [
    ...(options?.values ?? []),
    ...collectStringSamples(options?.sampleObject),
  ];
  const detected = detectReplyLocaleFromValues(samples);
  if (detected) return detected;

  return contentLocaleToReplyLocale(options?.fallbackContentLocale);
}

export function replyLocaleToCaptionLanguage(locale: ReplyLocale): ReplyCaptionLanguage {
  return locale === 'en' ? 'EN' : 'CN';
}
