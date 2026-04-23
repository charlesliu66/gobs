import { jsonrepair } from 'jsonrepair';

import { compassChatCompletion } from './compassLlm.js';

export type ReplyLocale = 'zh-CN' | 'en';
export type CaptionReplyLanguage = 'EN' | 'CN';

const CJK_RE = /[\u3400-\u9fff]/g;
const LATIN_WORD_RE = /[A-Za-z]+(?:['’-][A-Za-z]+)*/g;
const ALWAYS_PRESERVE_KEYS = new Set([
  'id',
  'role',
  'platform',
  'mode',
  'kind',
  'type',
  'aspectRatio',
  'targetPlatform',
  'sceneId',
  'sceneRef',
  'shotIndex',
  'structureTemplate',
  'taskId',
  'videoUrl',
  'videoPath',
  'selectedPreviewVideoVersionId',
  'pendingVideoSubmitId',
  'submitId',
  'jobId',
  'createdAt',
]);

type StringEntry = {
  path: string;
  value: string;
};

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

export function isEnglishReplyLocale(locale?: ReplyLocale | null): boolean {
  return locale === 'en';
}

export function normalizeReplyLocale(raw?: string | null): ReplyLocale | null {
  const value = String(raw || '').trim().toLowerCase();
  if (!value) return null;
  if (value.startsWith('en')) return 'en';
  if (value.startsWith('zh')) return 'zh-CN';
  return null;
}

export function contentLocaleToReplyLocale(raw?: string | null): ReplyLocale {
  return String(raw || '').trim().toLowerCase().startsWith('en') ? 'en' : 'zh-CN';
}

export function detectReplyLocaleFromText(raw?: string | null): ReplyLocale | null {
  const { zh, en } = scoreTextLanguage(raw);
  if (!zh && !en) return null;
  if (en >= Math.max(3, zh * 1.2)) return 'en';
  if (zh >= Math.max(2, en * 1.2)) return 'zh-CN';
  return null;
}

export function detectReplyLocaleFromSamples(samples: Array<string | null | undefined>): ReplyLocale | null {
  let zh = 0;
  let en = 0;
  for (const sample of samples) {
    const score = scoreTextLanguage(sample);
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
  contentLocale?: string | null;
  samples?: Array<string | null | undefined>;
}): ReplyLocale {
  const explicit = normalizeReplyLocale(options?.explicit);
  if (explicit) return explicit;
  const detected = detectReplyLocaleFromSamples(options?.samples ?? []);
  if (detected) return detected;
  return contentLocaleToReplyLocale(options?.contentLocale);
}

export function replyLocaleToCaptionLanguage(locale: ReplyLocale): CaptionReplyLanguage {
  return locale === 'en' ? 'EN' : 'CN';
}

export function localizedText(
  replyLocale: ReplyLocale,
  zh: string,
  en: string,
): string {
  return isEnglishReplyLocale(replyLocale) ? en : zh;
}

function shouldPreserveKey(key?: string): boolean {
  if (!key) return false;
  if (ALWAYS_PRESERVE_KEYS.has(key)) return true;
  return /(?:^|[A-Z])(id|ids|url|path)$/.test(key);
}

function shouldPreserveValue(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (/^(?:https?:\/\/|data:|output\/|\/api\/)/i.test(trimmed)) return true;
  if (/^[A-Za-z0-9_-]{1,48}$/.test(trimmed)) return true;
  return false;
}

function collectStringEntries(
  value: unknown,
  parentKey: string | null,
  path: Array<string | number>,
  entries: StringEntry[],
  preserveKeys: Set<string>,
): void {
  if (value == null) return;

  if (typeof value === 'string') {
    const key = parentKey ?? undefined;
    if (preserveKeys.has(key || '') || shouldPreserveKey(key) || shouldPreserveValue(value)) return;
    const trimmed = value.trim();
    if (!trimmed) return;
    entries.push({
      path: path.map((segment) => String(segment)).join('.'),
      value,
    });
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => collectStringEntries(item, parentKey, [...path, index], entries, preserveKeys));
    return;
  }

  if (typeof value === 'object') {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      collectStringEntries(child, key, [...path, key], entries, preserveKeys);
    }
  }
}

function setValueAtPath(target: unknown, path: string, value: string): void {
  const segments = path.split('.');
  let cursor: unknown = target;

  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index]!;
    const next = Array.isArray(cursor)
      ? cursor[Number(segment)]
      : (cursor as Record<string, unknown>)[segment];
    cursor = next;
  }

  const last = segments[segments.length - 1]!;
  if (Array.isArray(cursor)) {
    cursor[Number(last)] = value;
    return;
  }
  (cursor as Record<string, unknown>)[last] = value;
}

function chunkEntries(entries: StringEntry[], maxChars = 6500): StringEntry[][] {
  const chunks: StringEntry[][] = [];
  let current: StringEntry[] = [];
  let currentChars = 0;

  for (const entry of entries) {
    const size = entry.path.length + entry.value.length;
    if (current.length > 0 && currentChars + size > maxChars) {
      chunks.push(current);
      current = [];
      currentChars = 0;
    }
    current.push(entry);
    currentChars += size;
  }

  if (current.length > 0) chunks.push(current);
  return chunks;
}

function extractJsonEnvelope(raw: string): string {
  const text = raw.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(text);
  if (fenced?.[1]) return fenced[1].trim();

  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1);
  }
  return text;
}

function extractBalancedJsonObject(raw: string): string | null {
  const start = raw.indexOf('{');
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < raw.length; i += 1) {
    const char = raw[i]!;
    if (escaped) {
      escaped = false;
      continue;
    }
    if (inString) {
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return raw.slice(start, i + 1);
    }
  }
  return null;
}

export function parseTranslatedEntriesResponse(raw: string): Array<{ path?: string; value?: string }> {
  const text = extractJsonEnvelope(raw);
  const candidates = [text];
  const balanced = extractBalancedJsonObject(text);
  if (balanced && !candidates.includes(balanced)) candidates.unshift(balanced);

  let lastError: unknown;
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as { items?: Array<{ path?: string; value?: string }> };
      return parsed.items ?? [];
    } catch (error) {
      lastError = error;
    }
    try {
      const parsed = JSON.parse(jsonrepair(candidate)) as { items?: Array<{ path?: string; value?: string }> };
      return parsed.items ?? [];
    } catch (error) {
      lastError = error;
    }
  }

  const message = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`replyLocale translation JSON parse failed: ${message}`);
}

async function translateEntriesToEnglish(entries: StringEntry[]): Promise<StringEntry[]> {
  const raw = await compassChatCompletion({
    systemPrompt: [
      'You translate structured creative-writing fields from Chinese to English.',
      'Return strict JSON only.',
      'Keep the same array length and the same path values.',
      'Translate only the "value" text into natural, concise English.',
      'Do not rewrite IDs, path tokens, URLs, timestamps, or JSON structure.',
    ].join('\n'),
    userText: JSON.stringify({
      items: entries,
      output: { items: [{ path: 'same-as-input', value: 'english translation' }] },
    }),
    temperature: 0.1,
    maxTokens: 8192,
  });

  let parsedItems: Array<{ path?: string; value?: string }>;
  try {
    parsedItems = parseTranslatedEntriesResponse(raw);
  } catch (error) {
    console.warn('[replyLocale] translateEntriesToEnglish fallback to source text:', error);
    return entries;
  }

  const byPath = new Map(
    parsedItems
      .filter((item): item is { path: string; value: string } => typeof item.path === 'string' && typeof item.value === 'string')
      .map((item) => [item.path, item.value]),
  );

  return entries.map((entry) => ({
    path: entry.path,
    value: byPath.get(entry.path) ?? entry.value,
  }));
}

export async function translateStructuredToEnglish<T>(
  payload: T,
  options?: { preserveKeys?: string[] },
): Promise<T> {
  const cloned = JSON.parse(JSON.stringify(payload)) as T;
  const entries: StringEntry[] = [];
  const preserveKeys = new Set(options?.preserveKeys ?? []);

  collectStringEntries(cloned, null, [], entries, preserveKeys);
  if (entries.length === 0) return cloned;

  const translatedChunks = await Promise.all(chunkEntries(entries).map((chunk) => translateEntriesToEnglish(chunk)));
  for (const translatedEntry of translatedChunks.flat()) {
    setValueAtPath(cloned, translatedEntry.path, translatedEntry.value);
  }
  return cloned;
}

export async function localizeStructuredPayload<T>(
  payload: T,
  replyLocale: ReplyLocale,
  options?: { preserveKeys?: string[] },
): Promise<T> {
  if (!isEnglishReplyLocale(replyLocale)) return payload;
  return translateStructuredToEnglish(payload, options);
}
