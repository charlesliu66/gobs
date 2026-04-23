import type { UiLocale } from '../i18n/locale.ts';
import { formatDateTime } from '../i18n/locale.ts';

export type OutputGallerySource = 'dreamina' | 'other';
export type OutputGalleryView = 'visible' | 'hidden';
export type OutputGallerySavedFilter = 'all' | 'saved' | 'unsaved';
export type OutputGalleryDaysFilter = 'all' | '1' | '7' | '30';

export interface OutputGalleryQueryOptions {
  q?: string;
  source?: 'all' | OutputGallerySource;
  days?: OutputGalleryDaysFilter;
  view?: OutputGalleryView;
}

export function buildOutputGalleryQuery(options: OutputGalleryQueryOptions): string {
  const q = new URLSearchParams();
  const keyword = options.q?.trim();
  if (keyword) q.set('q', keyword);
  if (options.source && options.source !== 'all') q.set('source', options.source);
  if (options.days && options.days !== 'all') q.set('days', options.days);
  if (options.view && options.view !== 'visible') q.set('view', options.view);
  const qs = q.toString();
  return qs ? `?${qs}` : '';
}

export function inferOutputSourceLabel(
  source: OutputGallerySource,
  labels?: { dreamina: string; other: string },
): string {
  if (source === 'dreamina') return labels?.dreamina ?? '即梦回补';
  return labels?.other ?? '服务端成片';
}

export function formatOutputGalleryFilename(
  videoPath: string,
  options?: {
    locale?: UiLocale;
    fallbackPrefix?: string;
  },
): string {
  const base = videoPath.split('/').pop() || videoPath;
  const dreaminaMatch = base.match(/dreamina[_-]([0-9a-f]{8,})[_-](\d{10,13})/i);
  if (dreaminaMatch) {
    const ts = Number(dreaminaMatch[2]);
    const date = new Date(ts > 1e12 ? ts : ts * 1000);
    const prefix = options?.fallbackPrefix ?? '即梦成片';
    return `${prefix} · ${formatDateTime(date, options?.locale ?? 'zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  }
  return base.replace(/[_-][0-9a-f]{16,}\.(mp4|mov|webm|mkv)$/i, '.$1');
}

export function buildOutputHistoryPrompt(
  item: { path: string; promptSummary?: string },
  options?: { sourceLabel?: string },
): string {
  const promptSummary = item.promptSummary?.trim();
  if (promptSummary) return promptSummary;
  return `[${options?.sourceLabel ?? '服务端成片'}] ${item.path}`;
}

export function filterOutputItemsBySavedState<T extends { path: string }>(
  items: T[],
  savedPaths: Set<string>,
  savedFilter: OutputGallerySavedFilter,
): T[] {
  if (savedFilter === 'all') return items;
  return items.filter((item) => (savedFilter === 'saved' ? savedPaths.has(item.path) : !savedPaths.has(item.path)));
}
