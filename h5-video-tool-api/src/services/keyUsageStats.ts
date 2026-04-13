import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { getApiDataDir } from '../config/apiDataDir.js';
import { getRequestAccount } from './requestContext.js';

type UsageKey = `${string}__${string}`;

type UsageBucket = {
  date: string;
  account: string;
  totalCalls: number;
  successCalls: number;
  failedCalls: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

type UsageStore = {
  version: 1;
  buckets: Record<UsageKey, UsageBucket>;
};

type RecordUsageInput = {
  success: boolean;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
};

export type DailyUsageRow = UsageBucket & {
  successRate: number;
};

function nowDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function usagePath(): string {
  return join(getApiDataDir(), '.data', 'key-usage-daily.json');
}

function emptyStore(): UsageStore {
  return { version: 1, buckets: {} };
}

async function readStore(): Promise<UsageStore> {
  try {
    const raw = await readFile(usagePath(), 'utf8');
    const parsed = JSON.parse(raw) as UsageStore;
    if (!parsed || typeof parsed !== 'object' || !parsed.buckets) return emptyStore();
    return { version: 1, buckets: parsed.buckets };
  } catch {
    return emptyStore();
  }
}

async function writeStore(store: UsageStore): Promise<void> {
  const p = usagePath();
  await mkdir(dirname(p), { recursive: true });
  await writeFile(p, JSON.stringify(store, null, 2), 'utf8');
}

let queueTail: Promise<void> = Promise.resolve();

async function withStoreLock<T>(fn: () => Promise<T>): Promise<T> {
  const prev = queueTail.catch(() => {});
  let release!: () => void;
  queueTail = new Promise<void>((resolve) => {
    release = resolve;
  });
  await prev;
  try {
    return await fn();
  } finally {
    release();
  }
}

function toInt(v: unknown): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return 0;
  return Math.max(0, Math.floor(v));
}

export async function recordKeyUsage(input: RecordUsageInput): Promise<void> {
  const account = getRequestAccount() ?? 'unknown';
  const date = nowDateKey();
  const key = `${date}__${account}` as UsageKey;
  await withStoreLock(async () => {
    const store = await readStore();
    const bucket: UsageBucket =
      store.buckets[key] ?? {
        date,
        account,
        totalCalls: 0,
        successCalls: 0,
        failedCalls: 0,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      };
    bucket.totalCalls += 1;
    if (input.success) bucket.successCalls += 1;
    else bucket.failedCalls += 1;
    bucket.promptTokens += toInt(input.promptTokens);
    bucket.completionTokens += toInt(input.completionTokens);
    bucket.totalTokens += toInt(input.totalTokens);
    store.buckets[key] = bucket;
    await writeStore(store);
  });
}

export async function queryDailyKeyUsage(days: number): Promise<DailyUsageRow[]> {
  const d = Math.min(90, Math.max(1, Math.floor(days || 7)));
  const minDate = new Date(Date.now() - (d - 1) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const store = await readStore();
  const rows = Object.values(store.buckets)
    .filter((x) => x.date >= minDate)
    .map((x) => ({
      ...x,
      successRate: x.totalCalls > 0 ? x.successCalls / x.totalCalls : 0,
    }))
    .sort((a, b) => (a.date === b.date ? a.account.localeCompare(b.account) : a.date < b.date ? 1 : -1));
  return rows;
}

