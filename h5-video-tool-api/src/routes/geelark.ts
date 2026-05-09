import { Router, type Request } from 'express';
import { COOKIE_NAME, verifyGobsSessionToken } from '../gobs/gobsAuthSession.js';
import { findGobsUserById } from '../gobs/gobsAuthStore.js';
import {
  filterAccountIdsByAllowedIds,
  filterAccountsByAllowedIds,
  getTaskDetail,
  getTaskHistory,
  listAccounts,
  normalizeTaskDetailPayload,
  publishVideo,
} from '../services/geelark.js';

export const geelarkRouter = Router();

export interface GeelarkTaskHistoryAccount {
  id?: string;
  username?: string;
  platform?: string;
  region?: string;
}

export interface GeelarkTaskHistoryEntry {
  id: string;
  planName?: string;
  status: number;
  statusText: string;
  createdAt?: number;
  updatedAt?: number;
  accountCount: number;
  accounts: GeelarkTaskHistoryAccount[];
  successCount: number;
  failedCount: number;
  resultImages: string[];
  shareLinks: string[];
  failReasons: string[];
}

export type GeelarkTaskHistoryStatusFilter = 'all' | 'success' | 'failed' | 'pending';

export interface GeelarkTaskHistoryPageInfo {
  limit: number;
  offset: number;
  returned: number;
  filtered: number;
  available: number;
  hasMore: boolean;
  nextOffset?: number;
}

export interface GeelarkTaskHistoryFilters {
  status: GeelarkTaskHistoryStatusFilter;
  platform?: string;
  q?: string;
  from?: string;
  to?: string;
}

export interface GeelarkTaskHistoryBuildOptions {
  filters?: Partial<GeelarkTaskHistoryFilters>;
  limit?: number;
  offset?: number;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readTrimmedString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function readNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function readRecordArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => asRecord(item))
    .filter((item): item is Record<string, unknown> => !!item);
}

function firstDefinedNumber(values: unknown[]): number | undefined {
  for (const value of values) {
    const number = readNumber(value);
    if (number !== undefined) return number;
  }
  return undefined;
}

function uniqueStrings(values: Array<string | undefined>, limit = 6): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    if (!value || seen.has(value)) continue;
    seen.add(value);
    result.push(value);
    if (result.length >= limit) break;
  }
  return result;
}

function normalizeHistoryAccount(account: Record<string, unknown>): GeelarkTaskHistoryAccount | null {
  const normalized: GeelarkTaskHistoryAccount = {
    id: readTrimmedString(account.id ?? account.accountId ?? account.envId),
    username: readTrimmedString(account.username ?? account.userName ?? account.accountName ?? account.serialName),
    platform: readTrimmedString(account.platform ?? account.appName),
    region: readTrimmedString(account.region ?? account.country ?? account.market),
  };
  return normalized.id || normalized.username || normalized.platform || normalized.region ? normalized : null;
}

function collectHistoryAccounts(record: Record<string, unknown>): GeelarkTaskHistoryAccount[] {
  const groups = [record.accountList, record.accounts, record.items, record.list, record.results];
  const deduped: GeelarkTaskHistoryAccount[] = [];
  const seen = new Set<string>();

  for (const group of groups) {
    for (const item of readRecordArray(group)) {
      const normalized = normalizeHistoryAccount(item);
      if (!normalized) continue;
      const key = JSON.stringify(normalized);
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(normalized);
    }
  }

  return deduped;
}

function collectHistoryShareLinks(
  record: Record<string, unknown>,
  detail: ReturnType<typeof normalizeTaskDetailPayload>,
): string[] {
  const nestedLinks = readRecordArray(record.accountList)
    .concat(readRecordArray(record.accounts))
    .concat(readRecordArray(record.items))
    .flatMap((item) => [
      readTrimmedString(item.shareLink),
      readTrimmedString(item.shareUrl),
      readTrimmedString(item.url),
      readTrimmedString(item.postUrl),
      readTrimmedString(item.videoUrl),
    ]);

  return uniqueStrings(
    [
      detail.shareLink,
      readTrimmedString(record.shareLink),
      readTrimmedString(record.shareUrl),
      readTrimmedString(record.url),
      readTrimmedString(record.postUrl),
      readTrimmedString(record.videoUrl),
      ...nestedLinks,
    ],
    4,
  );
}

function collectHistoryFailReasons(
  record: Record<string, unknown>,
  detail: ReturnType<typeof normalizeTaskDetailPayload>,
): string[] {
  const nestedReasons = readRecordArray(record.accountList)
    .concat(readRecordArray(record.accounts))
    .concat(readRecordArray(record.items))
    .flatMap((item) => [
      readTrimmedString(item.failDesc),
      readTrimmedString(item.failReason),
      readTrimmedString(item.error),
      readTrimmedString(item.message),
    ]);

  return uniqueStrings(
    [
      detail.failDesc,
      readTrimmedString(record.failDesc),
      readTrimmedString(record.failReason),
      readTrimmedString(record.error),
      readTrimmedString(record.message),
      ...nestedReasons,
    ],
    4,
  );
}

function countAccountsWithStatus(accounts: Record<string, unknown>[], status: number): number {
  return accounts.filter((account) => readNumber(account.status) === status).length;
}

function normalizeHistoryTimestamp(value: number | undefined): number {
  if (!value || !Number.isFinite(value)) return 0;
  return value < 1_000_000_000_000 ? value * 1000 : value;
}

function historyStatusBucket(item: GeelarkTaskHistoryEntry): Exclude<GeelarkTaskHistoryStatusFilter, 'all'> {
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

function taskHistoryPlatforms(item: GeelarkTaskHistoryEntry): string[] {
  return uniqueStrings([
    ...item.accounts.map((account) => account.platform),
  ], 10);
}

function normalizeSearchToken(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? '';
}

function parseDateBoundary(value: string | undefined, endOfDay = false): number | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const numeric = Number(trimmed);
  if (Number.isFinite(numeric) && numeric > 0) {
    return normalizeHistoryTimestamp(numeric);
  }
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(trimmed)
    ? `${trimmed}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`
    : trimmed;
  const parsed = Date.parse(iso);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function matchesTaskHistoryFilters(item: GeelarkTaskHistoryEntry, filters: GeelarkTaskHistoryFilters): boolean {
  if (filters.status !== 'all' && historyStatusBucket(item) !== filters.status) return false;

  const platform = normalizeSearchToken(filters.platform);
  const platforms = taskHistoryPlatforms(item);
  if (platform && platform !== 'all' && !platforms.some((value) => normalizeSearchToken(value) === platform)) {
    return false;
  }

  const createdAt = normalizeHistoryTimestamp(item.createdAt);
  const from = parseDateBoundary(filters.from);
  const to = parseDateBoundary(filters.to, true);
  if (from !== undefined && (!createdAt || createdAt < from)) return false;
  if (to !== undefined && (!createdAt || createdAt > to)) return false;

  const query = normalizeSearchToken(filters.q);
  if (!query) return true;
  const searchable = uniqueStrings([
    item.id,
    item.planName,
    item.statusText,
    ...platforms,
    ...item.shareLinks,
    ...item.failReasons,
    ...item.accounts.flatMap((account) => [account.id, account.username, account.region, account.platform]),
  ], 50).join(' ').toLowerCase();
  return searchable.includes(query);
}

export function normalizeTaskHistoryEntry(item: unknown): GeelarkTaskHistoryEntry {
  const record = asRecord(item) ?? {};
  const detail = normalizeTaskDetailPayload({
    ...record,
    id: record.id ?? record.taskId ?? record.task_id ?? '',
  });
  const accounts = collectHistoryAccounts(record);
  const accountRecords = readRecordArray(record.accountList)
    .concat(readRecordArray(record.accounts))
    .concat(readRecordArray(record.items));
  const successCount =
    firstDefinedNumber([record.successAmount, record.successCount, record.successTotal]) ??
    (countAccountsWithStatus(accountRecords, 3) || (detail.status === 3 ? 1 : 0));
  const failedCount =
    firstDefinedNumber([record.failAmount, record.failedCount, record.failCount]) ??
    (countAccountsWithStatus(accountRecords, 4) || (detail.status === 4 ? 1 : 0));

  return {
    id: detail.id,
    planName: detail.planName,
    status: detail.status ?? 0,
    statusText: detail.statusText ?? `status:${detail.status ?? 0}`,
    createdAt: firstDefinedNumber([record.createdAt, record.createTime, record.createdTime, record.scheduleAt]),
    updatedAt: firstDefinedNumber([record.updatedAt, record.updateTime, record.updatedTime, record.finishTime, record.endTime]),
    accountCount: accounts.length || firstDefinedNumber([record.accountCount, record.totalAmount, record.totalCount]) || 0,
    accounts,
    successCount,
    failedCount,
    resultImages: detail.resultImages,
    shareLinks: collectHistoryShareLinks(record, detail),
    failReasons: collectHistoryFailReasons(record, detail),
  };
}

function normalizeHistoryFilters(filters?: Partial<GeelarkTaskHistoryFilters>): GeelarkTaskHistoryFilters {
  const status = filters?.status;
  return {
    status: status === 'success' || status === 'failed' || status === 'pending' ? status : 'all',
    platform: readTrimmedString(filters?.platform),
    q: readTrimmedString(filters?.q),
    from: readTrimmedString(filters?.from),
    to: readTrimmedString(filters?.to),
  };
}

export function buildTaskHistoryResponse(items: unknown[], options?: GeelarkTaskHistoryBuildOptions) {
  if (!options) {
    return {
      items,
      history: items.map((item) => normalizeTaskHistoryEntry(item)),
    };
  }

  const filters = normalizeHistoryFilters(options?.filters);
  const pairs = items.map((item) => ({
    raw: item,
    history: normalizeTaskHistoryEntry(item),
  }));
  const filteredPairs = pairs.filter((pair) => matchesTaskHistoryFilters(pair.history, filters));
  const limit = Math.min(Math.max(Math.trunc(options?.limit ?? filteredPairs.length), 1), 100);
  const offset = Math.max(Math.trunc(options?.offset ?? 0), 0);
  const pagedPairs = filteredPairs.slice(offset, offset + limit);
  const response: {
    items: unknown[];
    history: GeelarkTaskHistoryEntry[];
    page?: GeelarkTaskHistoryPageInfo;
    filters?: GeelarkTaskHistoryFilters;
  } = {
    items: pagedPairs.map((pair) => pair.raw),
    history: pagedPairs.map((pair) => pair.history),
  };
  if (options) {
    const nextOffset = offset + pagedPairs.length;
    response.page = {
      limit,
      offset,
      returned: pagedPairs.length,
      filtered: filteredPairs.length,
      available: pairs.length,
      hasMore: nextOffset < filteredPairs.length,
      nextOffset: nextOffset < filteredPairs.length ? nextOffset : undefined,
    };
    response.filters = filters;
  }
  return response;
}

function escapeCsvCell(value: unknown): string {
  const raw = Array.isArray(value) ? value.join(' | ') : String(value ?? '');
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function buildTaskHistoryCsv(history: GeelarkTaskHistoryEntry[]): string {
  const header = [
    'task_id',
    'plan_name',
    'status',
    'created_at',
    'updated_at',
    'platforms',
    'account_count',
    'success_count',
    'failed_count',
    'share_links',
    'fail_reasons',
  ];
  const rows = history.map((item) => [
    item.id,
    item.planName ?? '',
    item.statusText,
    item.createdAt ?? '',
    item.updatedAt ?? '',
    taskHistoryPlatforms(item).join(' | '),
    item.accountCount,
    item.successCount,
    item.failedCount,
    item.shareLinks.join(' | '),
    item.failReasons.join(' | '),
  ]);
  return [header, ...rows].map((row) => row.map(escapeCsvCell).join(',')).join('\n');
}

function readQueryString(value: unknown): string | undefined {
  if (Array.isArray(value)) return readQueryString(value[0]);
  return readTrimmedString(value);
}

function readQueryInt(value: unknown, fallback: number, max: number): number {
  const raw = readQueryString(value);
  const parsed = raw ? Number.parseInt(raw, 10) : fallback;
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, 1), max);
}

function readQueryOffset(value: unknown): number {
  const raw = readQueryString(value);
  const parsed = raw ? Number.parseInt(raw, 10) : 0;
  return Number.isFinite(parsed) ? Math.max(parsed, 0) : 0;
}

function readTaskHistoryStatusFilter(value: unknown): GeelarkTaskHistoryStatusFilter {
  const raw = readQueryString(value)?.toLowerCase();
  return raw === 'success' || raw === 'failed' || raw === 'pending' ? raw : 'all';
}

function hasAdvancedHistoryQuery(req: Request): boolean {
  return ['limit', 'offset', 'status', 'platform', 'q', 'query', 'from', 'to', 'format', 'export']
    .some((key) => req.query[key] !== undefined);
}

function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index <= 0) continue;
    if (part.slice(0, index).trim() !== name) continue;
    return decodeURIComponent(part.slice(index + 1).trim());
  }
  return undefined;
}

async function getSessionUser(req: Request) {
  const token = readCookie(req, COOKIE_NAME);
  if (!token) return null;
  const payload = await verifyGobsSessionToken(token);
  if (!payload) return null;
  const record = await findGobsUserById(payload.sub);
  if (!record) return null;
  if ((record.credentialVersion ?? 1) !== payload.cv) return null;
  return record;
}

function resolveAllowedPublishAccountIds(record: Awaited<ReturnType<typeof getSessionUser>>): string[] | null {
  if (!record || record.isSuperAdmin || record.publishAccountIds === undefined) {
    return null;
  }
  return record.publishAccountIds;
}

geelarkRouter.get('/accounts', async (req, res) => {
  try {
    const record = await getSessionUser(req);
    const allowedIds = resolveAllowedPublishAccountIds(record);
    res.json({ accounts: filterAccountsByAllowedIds(listAccounts(), allowedIds) });
  } catch (err) {
    console.error('[geelark/accounts]', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load GeeLark accounts' });
  }
});

geelarkRouter.post('/publish', async (req, res) => {
  const { videoUrl, videoPath, accountIds, caption, hashtags, markAI, needShareLink } = req.body as {
    videoUrl?: string;
    videoPath?: string;
    accountIds?: string[];
    caption?: string;
    hashtags?: string;
    markAI?: boolean;
    needShareLink?: boolean;
  };
  const input = typeof videoPath === 'string' ? videoPath : videoUrl;
  if (!input || typeof input !== 'string') {
    res.status(400).json({ error: 'Please provide videoUrl or videoPath' });
    return;
  }

  const requestedIds = Array.isArray(accountIds)
    ? accountIds.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    : [];
  if (requestedIds.length === 0) {
    res.status(400).json({ error: 'Please select at least one target account' });
    return;
  }

  try {
    const record = await getSessionUser(req);
    const allowedIds = resolveAllowedPublishAccountIds(record);
    const permittedIds = filterAccountIdsByAllowedIds(requestedIds, allowedIds);
    if (permittedIds.length === 0) {
      res.status(403).json({ error: 'Current user has no permitted GeeLark publish accounts' });
      return;
    }

    const result = await publishVideo({
      videoUrl: input,
      accountIds: permittedIds,
      caption: typeof caption === 'string' ? caption : undefined,
      hashtags: typeof hashtags === 'string' ? hashtags : undefined,
      markAI: !!markAI,
      needShareLink: !!needShareLink,
    });
    res.json(result);
  } catch (err) {
    console.error('[geelark/publish]', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to publish through GeeLark' });
  }
});

geelarkRouter.get('/task/:id', async (req, res) => {
  const id = String(req.params.id || '').trim();
  if (!id) {
    res.status(400).json({ error: 'Please provide task id' });
    return;
  }
  try {
    res.json(await getTaskDetail(id));
  } catch (err) {
    console.error('[geelark/task]', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load task detail' });
  }
});

geelarkRouter.get('/tasks', async (req, res) => {
  const size = readQueryInt(req.query.size, 20, 100);
  const advanced = hasAdvancedHistoryQuery(req);
  const limit = readQueryInt(req.query.limit, size, 100);
  const offset = readQueryOffset(req.query.offset);
  const filters: GeelarkTaskHistoryFilters = {
    status: readTaskHistoryStatusFilter(req.query.status),
    platform: readQueryString(req.query.platform),
    q: readQueryString(req.query.q) ?? readQueryString(req.query.query),
    from: readQueryString(req.query.from),
    to: readQueryString(req.query.to),
  };
  const format = readQueryString(req.query.format) ?? readQueryString(req.query.export);
  try {
    const items = await getTaskHistory(size);
    const response = buildTaskHistoryResponse(items, advanced ? { filters, limit, offset } : undefined);
    if (format === 'csv') {
      res
        .status(200)
        .setHeader('content-type', 'text/csv; charset=utf-8')
        .setHeader('content-disposition', 'attachment; filename="geelark-task-history.csv"')
        .send(buildTaskHistoryCsv(response.history));
      return;
    }
    res.json(response);
  } catch (err) {
    console.error('[geelark/tasks]', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load task history' });
  }
});
