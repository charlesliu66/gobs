export interface DistributionRecentDraft {
  caption: string;
  hashtags: string;
}

export interface DistributionRecentContext {
  id: string;
  savedAt: number;
  packageId: string | null;
  packageTitle: string;
  assetId: string | null;
  assetTitle: string;
  assetSource: string | null;
  accountIds: string[];
  accountCount: number;
  platforms: string[];
  activeDraftKey: string;
  platformDrafts: Record<string, DistributionRecentDraft>;
  needShareLink: boolean;
  markAI: boolean;
}

interface BuildRecentContextInput {
  packageId?: string | null;
  packageTitle?: string | null;
  selectedAsset?: {
    id?: string | null;
    title?: string | null;
    source?: string | null;
  } | null;
  selectedAccounts?: Array<{
    id?: string | null;
    platform?: string | null;
  }>;
  platformDrafts?: Record<string, DistributionRecentDraft>;
  activeDraftKey?: string | null;
  needShareLink?: boolean;
  markAI?: boolean;
  now?: number;
}

interface StorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

export const DISTRIBUTION_RECENT_CONTEXT_STORAGE_KEY = 'gobs:distribute:recent-contexts';
export const MAX_DISTRIBUTION_RECENT_CONTEXTS = 3;

export function buildDistributionRecentContext(input: BuildRecentContextInput): DistributionRecentContext {
  const accountIds = uniqueStrings((input.selectedAccounts ?? []).map((account) => account.id ?? ''));
  const platforms = uniqueStrings((input.selectedAccounts ?? []).map((account) => account.platform ?? ''));
  const packageId = cleanText(input.packageId);
  const assetId = cleanText(input.selectedAsset?.id);
  const activeDraftKey = cleanText(input.activeDraftKey) || 'default';
  const id = packageId
    ? `package:${packageId}`
    : `asset:${assetId || 'none'}:${accountIds.join(',') || 'no-accounts'}:${activeDraftKey}`;

  return {
    id,
    savedAt: input.now ?? Date.now(),
    packageId: packageId || null,
    packageTitle: cleanText(input.packageTitle),
    assetId: assetId || null,
    assetTitle: cleanText(input.selectedAsset?.title),
    assetSource: cleanText(input.selectedAsset?.source) || null,
    accountIds,
    accountCount: accountIds.length,
    platforms,
    activeDraftKey,
    platformDrafts: sanitizeDrafts(input.platformDrafts),
    needShareLink: Boolean(input.needShareLink),
    markAI: Boolean(input.markAI),
  };
}

export function loadDistributionRecentContexts(storage?: StorageLike | null): DistributionRecentContext[] {
  const target = resolveStorage(storage);
  if (!target) return [];

  try {
    const parsed = JSON.parse(target.getItem(DISTRIBUTION_RECENT_CONTEXT_STORAGE_KEY) || '[]') as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeRecentContext)
      .filter((item): item is DistributionRecentContext => Boolean(item))
      .sort((left, right) => right.savedAt - left.savedAt)
      .slice(0, MAX_DISTRIBUTION_RECENT_CONTEXTS);
  } catch {
    return [];
  }
}

export function saveDistributionRecentContext(
  context: DistributionRecentContext,
  storage?: StorageLike | null,
): DistributionRecentContext[] {
  const target = resolveStorage(storage);
  const sanitized = normalizeRecentContext(context);
  if (!sanitized) return loadDistributionRecentContexts(target);

  const next = [
    sanitized,
    ...loadDistributionRecentContexts(target).filter((item) => item.id !== sanitized.id),
  ].slice(0, MAX_DISTRIBUTION_RECENT_CONTEXTS);

  try {
    target?.setItem(DISTRIBUTION_RECENT_CONTEXT_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // localStorage can fail in private browsing or storage-quota states. Keep UI functional.
  }

  return next;
}

function resolveStorage(storage?: StorageLike | null): StorageLike | null {
  if (storage) return storage;
  if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) return null;
  return (globalThis as typeof globalThis & { localStorage?: StorageLike }).localStorage ?? null;
}

function normalizeRecentContext(value: unknown): DistributionRecentContext | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const id = cleanText(record.id);
  const savedAt = toFiniteTimestamp(record.savedAt);
  if (!id || !savedAt) return null;
  const accountIds = uniqueStrings(Array.isArray(record.accountIds) ? record.accountIds.map(cleanText) : []);

  return {
    id,
    savedAt,
    packageId: cleanText(record.packageId) || null,
    packageTitle: cleanText(record.packageTitle),
    assetId: cleanText(record.assetId) || null,
    assetTitle: cleanText(record.assetTitle),
    assetSource: cleanText(record.assetSource) || null,
    accountIds,
    accountCount: accountIds.length,
    platforms: uniqueStrings(Array.isArray(record.platforms) ? record.platforms.map(cleanText) : []),
    activeDraftKey: cleanText(record.activeDraftKey) || 'default',
    platformDrafts: sanitizeDrafts(record.platformDrafts),
    needShareLink: Boolean(record.needShareLink),
    markAI: Boolean(record.markAI),
  };
}

function sanitizeDrafts(value: unknown): Record<string, DistributionRecentDraft> {
  if (!value || typeof value !== 'object') return {};
  const entries = Object.entries(value as Record<string, unknown>)
    .map(([key, draft]) => {
      if (!draft || typeof draft !== 'object') return null;
      const draftRecord = draft as Record<string, unknown>;
      return [
        cleanText(key) || 'default',
        {
          caption: cleanText(draftRecord.caption),
          hashtags: cleanText(draftRecord.hashtags),
        },
      ] as const;
    })
    .filter((entry): entry is readonly [string, DistributionRecentDraft] => Boolean(entry));
  return Object.fromEntries(entries);
}

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function toFiniteTimestamp(value: unknown): number {
  const timestamp = Number(value);
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : 0;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
