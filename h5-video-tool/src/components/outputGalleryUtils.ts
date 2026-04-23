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

export function inferOutputSourceLabel(source: OutputGallerySource): string {
  return source === 'dreamina' ? '即梦回补' : '服务端成片';
}

export function filterOutputItemsBySavedState<T extends { path: string }>(
  items: T[],
  savedPaths: Set<string>,
  savedFilter: OutputGallerySavedFilter,
): T[] {
  if (savedFilter === 'all') return items;
  return items.filter((item) => (savedFilter === 'saved' ? savedPaths.has(item.path) : !savedPaths.has(item.path)));
}
