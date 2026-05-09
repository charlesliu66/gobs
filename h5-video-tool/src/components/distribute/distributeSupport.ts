export type DistributionAssetSource = 'create-flow' | 'history' | 'server-output';

export interface DistributionAsset {
  id: string;
  source: DistributionAssetSource;
  title: string;
  createdAt: number;
  previewUrl?: string;
  videoPath?: string;
  videoUrl?: string;
  taskId?: string;
  prompt?: string;
  sourceLabel?: string;
  subtitle?: string;
}

export interface DistributionServerOutputInput {
  path: string;
  mtimeMs: number;
  size: number;
  source: 'dreamina' | 'other';
  promptSummary?: string;
}

export interface BuildDistributionServerOutputOptions {
  buildPlaybackUrl?: (path: string) => string;
  sourceLabels?: Partial<Record<DistributionServerOutputInput['source'], string>>;
  fallbackTitle?: string;
}

export interface DistributionTaskHistoryItem {
  id: string;
  taskId: string;
  planName?: string;
  status?: number;
  statusText: string;
  serialName?: string;
  platform?: string;
  platforms?: string[];
  accounts?: DistributionTaskHistoryAccount[];
  accountCount?: number;
  successCount?: number;
  failedCount?: number;
  shareLink?: string;
  shareLinks?: string[];
  resultImages: string[];
  failDesc?: string;
  failReasons?: string[];
  createdAt: number;
}

export interface DistributionTaskHistoryAccount {
  id?: string;
  username?: string;
  platform?: string;
  region?: string;
}

export interface DistributionTaskHistorySummary {
  total: number;
  success: number;
  failed: number;
  pending: number;
}

export type DistributionTaskHistoryStatusFilter = 'all' | 'success' | 'failed' | 'pending';

export interface DistributionTaskHistoryFilters {
  status?: DistributionTaskHistoryStatusFilter;
  platform?: string;
  query?: string;
}

export interface DistributionTaskHistoryGroup {
  id: string;
  label: string;
  items: DistributionTaskHistoryItem[];
}

export type DistributionPreflightStatus = 'complete' | 'attention' | 'blocked';

export interface DistributionPreflightItem {
  id: string;
  label: string;
  detail: string;
  status: DistributionPreflightStatus;
}

export interface DistributionPreflightState {
  selectedAsset?: Pick<DistributionAsset, 'id' | 'videoPath' | 'videoUrl' | 'title'> | null;
  selectedAccountCount: number;
  selectedPlatformCount?: number;
  platformCopyCount?: number;
  reviewedPublishOptions?: boolean;
  targetMarket?: string;
  selectedRegions?: string[];
}

const ASSET_PRIORITY: Record<DistributionAssetSource, number> = {
  'create-flow': 3,
  history: 2,
  'server-output': 1,
};

const TASK_STATUS_TEXT: Record<number, string> = {
  1: 'waiting',
  2: 'running',
  3: 'success',
  4: 'failed',
  7: 'canceled',
};

function trimString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.trim());
}

function readTaskHistoryAccountArray(value: unknown): DistributionTaskHistoryAccount[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const record = item as Record<string, unknown>;
    const account: DistributionTaskHistoryAccount = {
      id: trimString(record.id ?? record.accountId ?? record.envId),
      username: trimString(record.username ?? record.userName ?? record.accountName ?? record.serialName),
      platform: trimString(record.platform ?? record.appName),
      region: trimString(record.region ?? record.country ?? record.market),
    };
    return account.id || account.username || account.platform || account.region ? [account] : [];
  });
}

function normalizeTimestamp(value: unknown): number {
  const raw = typeof value === 'string' ? Number(value) : typeof value === 'number' ? value : 0;
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return raw < 1_000_000_000_000 ? raw * 1000 : raw;
}

function basename(value: string): string {
  const normalized = value.replace(/\\/g, '/');
  return normalized.split('/').pop() || normalized;
}

function truncate(value: string, max = 72): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}…`;
}

function buildDistributionAssetKey(asset: DistributionAsset): string {
  if (asset.videoPath) return `path:${asset.videoPath}`;
  if (asset.videoUrl) return `url:${asset.videoUrl}`;
  if (asset.taskId) return `task:${asset.taskId}`;
  return `id:${asset.id}`;
}

function mergeAssetPair(left: DistributionAsset, right: DistributionAsset): DistributionAsset {
  const leftPriority = ASSET_PRIORITY[left.source];
  const rightPriority = ASSET_PRIORITY[right.source];
  const primary = rightPriority > leftPriority || (rightPriority === leftPriority && right.createdAt > left.createdAt)
    ? right
    : left;
  const secondary = primary === left ? right : left;

  return {
    ...secondary,
    ...primary,
    createdAt: Math.max(left.createdAt, right.createdAt),
    previewUrl: primary.previewUrl || secondary.previewUrl,
    videoPath: primary.videoPath || secondary.videoPath,
    videoUrl: primary.videoUrl || secondary.videoUrl,
    taskId: primary.taskId || secondary.taskId,
    prompt: primary.prompt || secondary.prompt,
    sourceLabel: primary.sourceLabel || secondary.sourceLabel,
    subtitle: primary.subtitle || secondary.subtitle,
  };
}

export function buildDistributionAssetFromServerOutput(
  item: DistributionServerOutputInput,
  options?: BuildDistributionServerOutputOptions,
): DistributionAsset {
  const prompt = trimString(item.promptSummary);
  const fileName = basename(item.path);
  const title = prompt ? truncate(prompt) : options?.fallbackTitle ?? fileName;
  const playbackUrl = options?.buildPlaybackUrl?.(item.path);

  return {
    id: `server-output:${item.path}`,
    source: 'server-output',
    sourceLabel: options?.sourceLabels?.[item.source] ?? (item.source === 'dreamina' ? 'Dreamina output' : 'Server output'),
    title,
    subtitle: fileName,
    createdAt: normalizeTimestamp(item.mtimeMs),
    previewUrl: trimString(playbackUrl),
    videoPath: item.path,
    prompt,
  };
}

export function mergeDistributionAssets(
  lists: Array<Array<DistributionAsset> | null | undefined>,
): DistributionAsset[] {
  const merged = new Map<string, DistributionAsset>();

  for (const list of lists) {
    for (const asset of list ?? []) {
      const key = buildDistributionAssetKey(asset);
      const existing = merged.get(key);
      merged.set(key, existing ? mergeAssetPair(existing, asset) : asset);
    }
  }

  return [...merged.values()].sort((left, right) => right.createdAt - left.createdAt);
}

function readTaskHistoryField(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = trimString(record[key]);
    if (value) return value;
  }
  return undefined;
}

function uniqueTrimmed(values: Array<string | undefined | null>): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const trimmed = typeof value === 'string' ? value.trim() : '';
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

function normalizeFilterToken(value: string): string {
  return value.trim().toLowerCase();
}

function readTaskHistoryPlatforms(item: DistributionTaskHistoryItem): string[] {
  return uniqueTrimmed([
    item.platform,
    ...(item.platforms ?? []),
    ...(item.accounts ?? []).map((account) => account.platform),
  ]);
}

export function normalizeTaskHistoryItems(items: unknown[]): DistributionTaskHistoryItem[] {
  if (!Array.isArray(items)) return [];

  return items.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const record = item as Record<string, unknown>;
    const taskId = readTaskHistoryField(record, ['taskId', 'id']);
    if (!taskId) return [];

    const status = Number(record.status ?? record.taskStatus ?? record.task_status);
    const normalizedStatus = Number.isFinite(status) ? status : undefined;
    const providedStatusText = readTaskHistoryField(record, ['statusText', 'status_text']);
    const accounts = readTaskHistoryAccountArray(record.accounts ?? record.accountList ?? record.items);
    const shareLinks = readStringArray(record.shareLinks ?? record.share_links);
    const failReasons = readStringArray(record.failReasons ?? record.fail_reasons);

    return [{
      id: taskId,
      taskId,
      planName: readTaskHistoryField(record, ['planName', 'plan_name']),
      status: normalizedStatus,
      statusText: providedStatusText ?? (normalizedStatus ? TASK_STATUS_TEXT[normalizedStatus] ?? `status:${normalizedStatus}` : 'unknown'),
      serialName: readTaskHistoryField(record, ['serialName', 'serial_name']),
      platform: readTaskHistoryField(record, ['platform', 'platformName', 'platform_name', 'appName']),
      platforms: readStringArray(record.platforms),
      accounts,
      accountCount: Number(record.accountCount ?? record.account_count) || undefined,
      successCount: Number(record.successCount ?? record.success_count) || undefined,
      failedCount: Number(record.failedCount ?? record.failed_count) || undefined,
      shareLink: readTaskHistoryField(record, ['shareLink', 'shareUrl', 'share_url', 'postUrl', 'post_url', 'url', 'videoUrl']) ?? shareLinks[0],
      shareLinks,
      resultImages: readStringArray(record.resultImages ?? record.result_images ?? record.images),
      failDesc: readTaskHistoryField(record, ['failDesc', 'fail_desc', 'failReason', 'fail_reason', 'msg']) ?? failReasons[0],
      failReasons,
      createdAt: normalizeTimestamp(
        record.scheduleAt ??
        record.schedule_at ??
        record.createdAt ??
        record.created_at ??
        record.createTime ??
        record.create_time,
      ),
    }];
  });
}

export function getTaskHistoryStatusBucket(
  item: DistributionTaskHistoryItem,
): Exclude<DistributionTaskHistoryStatusFilter, 'all'> {
  const statusText = item.statusText.toLowerCase();
  if (item.status === 3 || ['success', 'succeeded', 'complete', 'completed', 'done'].includes(statusText)) {
    return 'success';
  }
  if (
    item.status === 4 ||
    item.status === 7 ||
    ['failed', 'fail', 'canceled', 'cancelled', 'error'].includes(statusText)
  ) {
    return 'failed';
  }
  return 'pending';
}

export function getTaskHistoryPlatformOptions(items: DistributionTaskHistoryItem[]): string[] {
  const options = uniqueTrimmed(items.flatMap((item) => readTaskHistoryPlatforms(item)));
  return options.sort((left, right) => left.localeCompare(right));
}

export function filterTaskHistoryItems(
  items: DistributionTaskHistoryItem[],
  filters: DistributionTaskHistoryFilters,
): DistributionTaskHistoryItem[] {
  const status = filters.status ?? 'all';
  const platform = normalizeFilterToken(filters.platform ?? '');
  const query = normalizeFilterToken(filters.query ?? '');

  return items.filter((item) => {
    if (status !== 'all' && getTaskHistoryStatusBucket(item) !== status) return false;

    const platforms = readTaskHistoryPlatforms(item);
    if (platform && platform !== 'all' && !platforms.some((value) => normalizeFilterToken(value) === platform)) {
      return false;
    }

    if (!query) return true;
    const searchable = uniqueTrimmed([
      item.planName,
      item.taskId,
      item.id,
      item.statusText,
      item.serialName,
      item.failDesc,
      ...platforms,
      ...(item.accounts ?? []).flatMap((account) => [account.username, account.region, account.id]),
    ]).join(' ').toLowerCase();
    return searchable.includes(query);
  });
}

function buildLocalDateKey(timestamp: number): string {
  if (!timestamp) return 'unknown';
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function groupTaskHistoryItemsByDate(
  items: DistributionTaskHistoryItem[],
  formatDateLabel?: (timestamp: number) => string,
  unknownLabel = 'Unknown date',
): DistributionTaskHistoryGroup[] {
  const groups = new Map<string, DistributionTaskHistoryGroup>();

  for (const item of items) {
    const id = buildLocalDateKey(item.createdAt);
    const existing = groups.get(id);
    if (existing) {
      existing.items.push(item);
      continue;
    }
    groups.set(id, {
      id,
      label: item.createdAt ? formatDateLabel?.(item.createdAt) ?? new Date(item.createdAt).toLocaleDateString() : unknownLabel,
      items: [item],
    });
  }

  return [...groups.values()];
}

export function getTaskHistoryShareLink(item: DistributionTaskHistoryItem): string | undefined {
  return item.shareLink ?? item.shareLinks?.find(Boolean);
}

export function summarizeTaskHistory(items: DistributionTaskHistoryItem[]): DistributionTaskHistorySummary {
  const summary: DistributionTaskHistorySummary = {
    total: items.length,
    success: 0,
    failed: 0,
    pending: 0,
  };

  for (const item of items) {
    if (item.status === 3) summary.success += 1;
    else if (item.status === 4 || item.status === 7 || item.statusText === 'failed' || item.statusText === 'canceled') summary.failed += 1;
    else summary.pending += 1;
  }

  return summary;
}

export function buildDistributionPreflightItems(state: DistributionPreflightState): DistributionPreflightItem[] {
  const hasAsset = Boolean(state.selectedAsset?.videoPath || state.selectedAsset?.videoUrl || state.selectedAsset?.id);
  const selectedPlatformCount = Math.max(0, state.selectedPlatformCount ?? 0);
  const platformCopyCount = Math.max(0, state.platformCopyCount ?? 0);
  const targetMarket = trimString(state.targetMarket);
  const selectedRegions = (state.selectedRegions ?? []).map((value) => value.trim()).filter(Boolean);
  const marketCovered = !targetMarket || selectedRegions.some((region) => region.toLowerCase() === targetMarket.toLowerCase());

  return [
    {
      id: 'asset',
      label: 'Publish asset',
      detail: hasAsset ? 'Publish asset selected' : 'No publish asset selected',
      status: hasAsset ? 'complete' : 'blocked',
    },
    {
      id: 'accounts',
      label: 'Target accounts',
      detail: state.selectedAccountCount > 0
        ? `${state.selectedAccountCount} account${state.selectedAccountCount === 1 ? '' : 's'} selected`
        : 'No target accounts selected',
      status: state.selectedAccountCount > 0 ? 'complete' : 'blocked',
    },
    {
      id: 'copy',
      label: 'Platform copy coverage',
      detail: selectedPlatformCount > 0
        ? `Copy ready for ${platformCopyCount} of ${selectedPlatformCount} platforms`
        : platformCopyCount > 0
          ? `Copy ready for ${platformCopyCount} platform${platformCopyCount === 1 ? '' : 's'}`
          : 'No platform-specific copy prepared yet',
      status: selectedPlatformCount > 0 && platformCopyCount < selectedPlatformCount
        ? 'attention'
        : platformCopyCount > 0
          ? 'complete'
          : 'attention',
    },
    {
      id: 'market',
      label: 'Market alignment',
      detail: targetMarket
        ? marketCovered
          ? `Selected accounts include target market ${targetMarket}`
          : `Selected accounts do not include target market ${targetMarket}`
        : 'No target market set',
      status: targetMarket ? (marketCovered ? 'complete' : 'attention') : 'attention',
    },
    {
      id: 'options',
      label: 'Publish options',
      detail: state.reviewedPublishOptions ? 'Publish options reviewed' : 'Publish options still need review',
      status: state.reviewedPublishOptions ? 'complete' : 'attention',
    },
  ];
}
