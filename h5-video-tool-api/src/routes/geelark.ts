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

export function buildTaskHistoryResponse(items: unknown[]) {
  return {
    items,
    history: items.map((item) => normalizeTaskHistoryEntry(item)),
  };
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
  const size = Math.min(Number.parseInt(String(req.query.size ?? '20'), 10) || 20, 100);
  try {
    const items = await getTaskHistory(size);
    res.json(buildTaskHistoryResponse(items));
  } catch (err) {
    console.error('[geelark/tasks]', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load task history' });
  }
});
