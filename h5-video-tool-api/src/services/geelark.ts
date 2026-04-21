import crypto from 'crypto';
import fs from 'fs';
import http from 'http';
import https from 'https';
import path from 'path';
import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';

type AccountCfg = {
  id: string;
  username: string;
  envId: string;
  region?: string;
  platform?: string;
  remark?: string;
  canPost?: boolean;
};

export type ListedAccount = {
  id: string;
  username: string;
  region?: string;
  platform?: string;
  remark?: string;
  canPost: boolean;
};

type PhoneStatusDetail = {
  id: string;
  serialName?: string;
  status: number;
};

type PhoneBatchResult = {
  totalAmount?: number;
  successAmount?: number;
  failAmount?: number;
  successDetails?: Array<{ id: string; status?: number; serialName?: string }>;
  failDetails?: Array<{ id: string; code?: number; msg?: string }>;
};

const PHONE_STATUS_RUNNING = 0;
const PHONE_STATUS_STARTING = 1;
const PHONE_STATUS_STOPPED = 2;
const PHONE_STATUS_EXPIRED = 3;
const TASK_STATUS_SUCCESS = 3;
const TASK_STATUS_FAILED = 4;
const TASK_STATUS_CANCELED = 7;
const PHONE_READY_TIMEOUT_MS = 180_000;
const PHONE_READY_POLL_MS = 5_000;
const TASK_MONITOR_POLL_MS = 15_000;
const TASK_MONITOR_TIMEOUT_MS = 45 * 60 * 1000;

function getBase(): string {
  const raw =
    process.env.GEELARK_BASE_URL?.trim() ||
    process.env.GEELARK_SJ_BASE_URL?.trim() ||
    process.env.GEELARK_OPENAPI_BASE?.trim() ||
    'https://openapi.geelark.com/open/v1';
  const base = raw.replace(/\/$/, '');
  return base.includes('/open/v') ? base : `${base}/open/v1`;
}

function getApiKey(): string {
  return (
    process.env.GEELARK_BEARER_TOKEN?.trim() ||
    process.env.GEELARK_API_KEY?.trim() ||
    process.env.GEELARK_TOKEN?.trim() ||
    ''
  );
}

function traceId(): string {
  return crypto.randomUUID().replace(/-/g, '').toUpperCase();
}

function proxyCfg(timeoutMs: number) {
  const proxyUrl =
    process.env.GEELARK_HTTP_PROXY?.trim() ||
    process.env.HTTPS_PROXY?.trim() ||
    process.env.HTTP_PROXY?.trim();
  if (!proxyUrl) return { timeout: timeoutMs, proxy: false as const };
  const agent = new HttpsProxyAgent(proxyUrl);
  return { timeout: timeoutMs, httpsAgent: agent, httpAgent: agent, proxy: false as const };
}

async function geelarkPost<T>(pathName: string, body: Record<string, unknown>): Promise<T> {
  const key = getApiKey();
  if (!key) throw new Error('Missing GEELARK_BEARER_TOKEN or GEELARK_API_KEY');
  const url = `${getBase()}${pathName.startsWith('/') ? pathName : `/${pathName}`}`;
  const res = await axios.post(url, body, {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      traceId: traceId(),
      Authorization: `Bearer ${key}`,
    },
    validateStatus: () => true,
    ...proxyCfg(60_000),
  });
  const data = res.data as { code?: number; msg?: string; data?: T };
  if (res.status >= 400) {
    throw new Error(`GeeLark HTTP ${res.status}: ${JSON.stringify(data).slice(0, 220)}`);
  }
  if (typeof data.code === 'number' && data.code !== 0) {
    throw new Error(`GeeLark [${data.code}]: ${data.msg || 'unknown error'}`);
  }
  return (data.data ?? ({} as T)) as T;
}

function loadAccountsConfig(): AccountCfg[] {
  const candidates = [
    process.env.GEELARK_ACCOUNTS_CONFIG?.trim(),
    path.join(process.cwd(), 'config', 'geelark-accounts.json'),
    path.join(process.cwd(), '..', 'config', 'geelark-accounts.json'),
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    try {
      if (!fs.existsSync(candidate)) continue;
      const raw = fs.readFileSync(candidate, 'utf8');
      const parsed = JSON.parse(raw) as { accounts?: unknown } | unknown[];
      const list = Array.isArray(parsed)
        ? parsed
        : Array.isArray((parsed as { accounts?: unknown })?.accounts)
          ? (parsed as { accounts: unknown[] }).accounts
          : [];

      const accounts: AccountCfg[] = [];
      for (const item of list) {
        if (!item || typeof item !== 'object') continue;
        const record = item as Record<string, unknown>;
        const id = String(record.id ?? '').trim();
        const username = String(record.username ?? '').trim();
        const envId = String(record.envId ?? '').trim();
        if (!id || !username || !envId) continue;
        accounts.push({
          id,
          username,
          envId,
          region: typeof record.region === 'string' ? record.region : undefined,
          platform: typeof record.platform === 'string' ? record.platform : undefined,
          remark: typeof record.remark === 'string' ? record.remark : undefined,
          canPost: record.canPost !== false,
        });
      }
      if (accounts.length > 0) return accounts;
    } catch {
      // Try the next candidate.
    }
  }

  return [];
}

export function listAccounts(): ListedAccount[] {
  return loadAccountsConfig()
    .filter((account) => account.canPost !== false)
    .map((account) => ({
      id: account.id,
      username: account.username,
      region: account.region,
      platform: account.platform,
      remark: account.remark,
      canPost: account.canPost !== false,
    }));
}

export function filterAccountsByAllowedIds<T extends { id: string }>(accounts: T[], allowedIds: string[] | null): T[] {
  if (allowedIds === null) return accounts;
  const allowed = new Set(allowedIds);
  return accounts.filter((account) => allowed.has(account.id));
}

export function filterAccountIdsByAllowedIds(accountIds: string[], allowedIds: string[] | null): string[] {
  if (allowedIds === null) return [...accountIds];
  const allowed = new Set(allowedIds);
  return accountIds.filter((accountId) => allowed.has(accountId));
}

export function getEnvIdsRequiringStart(targetEnvIds: string[], statuses: PhoneStatusDetail[]): string[] {
  const statusById = new Map(statuses.map((status) => [status.id, status.status]));
  return targetEnvIds.filter((envId) => statusById.get(envId) === PHONE_STATUS_STOPPED);
}

export function areAllPhonesReady(targetEnvIds: string[], statuses: PhoneStatusDetail[]): boolean {
  const statusById = new Map(statuses.map((status) => [status.id, status.status]));
  return targetEnvIds.every((envId) => statusById.get(envId) === PHONE_STATUS_RUNNING);
}

export function buildTaskEnvMap(taskIds: string[], envIds: string[]): Record<string, string> {
  const taskEnvMap: Record<string, string> = {};
  const count = Math.min(taskIds.length, envIds.length);
  for (let index = 0; index < count; index += 1) {
    taskEnvMap[taskIds[index]] = envIds[index];
  }
  return taskEnvMap;
}

export function shouldStopPhoneForTaskStatus(status: number): boolean {
  return status === TASK_STATUS_SUCCESS;
}

function resolveEnvIds(accountIds: string[]): string[] {
  const allAccounts = loadAccountsConfig();
  const envIds: string[] = [];
  for (const accountId of accountIds) {
    const matched = allAccounts.find((account) => account.id === accountId);
    if (matched?.envId) envIds.push(matched.envId);
  }
  return [...new Set(envIds)];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatPhoneBatchFailures(result: PhoneBatchResult): string {
  return (result.failDetails ?? [])
    .map((detail) => `${detail.id}:${detail.code ?? 'ERR'}:${detail.msg ?? 'unknown'}`)
    .join(', ');
}

async function getPhoneStatuses(envIds: string[]): Promise<PhoneStatusDetail[]> {
  if (envIds.length === 0) return [];
  const result = await geelarkPost<PhoneBatchResult>('/phone/status', { ids: envIds });
  if ((result.failAmount ?? 0) > 0) {
    throw new Error(`GeeLark phone/status failed for ${formatPhoneBatchFailures(result)}`);
  }
  return (result.successDetails ?? []).map((detail) => ({
    id: detail.id,
    serialName: detail.serialName,
    status: Number(detail.status ?? PHONE_STATUS_EXPIRED),
  }));
}

async function startPhones(envIds: string[]): Promise<void> {
  if (envIds.length === 0) return;
  const result = await geelarkPost<PhoneBatchResult>('/phone/start', {
    ids: envIds,
    energySavingMode: 1,
  });
  if ((result.failAmount ?? 0) > 0) {
    throw new Error(`GeeLark phone/start failed for ${formatPhoneBatchFailures(result)}`);
  }
}

async function stopPhones(envIds: string[]): Promise<void> {
  if (envIds.length === 0) return;
  const result = await geelarkPost<PhoneBatchResult>('/phone/stop', { ids: envIds });
  if ((result.failAmount ?? 0) > 0) {
    throw new Error(`GeeLark phone/stop failed for ${formatPhoneBatchFailures(result)}`);
  }
}

async function ensurePhonesReady(envIds: string[]): Promise<void> {
  if (envIds.length === 0) return;
  const initialStatuses = await getPhoneStatuses(envIds);
  if (initialStatuses.some((status) => status.status === PHONE_STATUS_EXPIRED)) {
    throw new Error('One or more GeeLark phones are expired and cannot be started');
  }

  const envIdsToStart = getEnvIdsRequiringStart(envIds, initialStatuses);
  if (envIdsToStart.length > 0) {
    await startPhones(envIdsToStart);
  }

  const deadline = Date.now() + PHONE_READY_TIMEOUT_MS;
  while (Date.now() <= deadline) {
    const statuses = await getPhoneStatuses(envIds);
    if (statuses.some((status) => status.status === PHONE_STATUS_EXPIRED)) {
      throw new Error('One or more GeeLark phones expired while waiting to start');
    }
    if (areAllPhonesReady(envIds, statuses)) {
      return;
    }
    await sleep(PHONE_READY_POLL_MS);
  }

  throw new Error('GeeLark phones did not become ready before timeout');
}

async function putBinary(uploadUrl: string, buf: Buffer): Promise<number> {
  const url = new URL(uploadUrl);
  const mod = url.protocol === 'https:' ? https : http;
  return await new Promise((resolve, reject) => {
    const req = mod.request(
      {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: `${url.pathname}${url.search}`,
        method: 'PUT',
        headers: { 'Content-Length': buf.length },
      },
      (res) => {
        res.resume();
        resolve(res.statusCode || 0);
      },
    );
    req.on('error', reject);
    req.setTimeout(120_000, () => {
      req.destroy();
      reject(new Error('GeeLark upload timed out'));
    });
    req.write(buf);
    req.end();
  });
}

async function readVideoInput(input: string): Promise<Buffer> {
  if (input.startsWith('data:video/')) {
    const b64 = input.replace(/^data:video\/[^;]+;base64,/, '');
    return Buffer.from(b64, 'base64');
  }
  if (input.startsWith('http://') || input.startsWith('https://')) {
    const response = await axios.get<ArrayBuffer>(input, {
      responseType: 'arraybuffer',
      maxRedirects: 5,
      ...proxyCfg(180_000),
    });
    return Buffer.from(response.data);
  }
  const filePath = path.isAbsolute(input) ? input : path.join(process.cwd(), input);
  if (!fs.existsSync(filePath)) throw new Error(`Video path does not exist: ${input}`);
  return fs.readFileSync(filePath);
}

async function uploadVideoToGeelark(videoInput: string): Promise<string> {
  const fileBuf = await readVideoInput(videoInput);
  const uploadInfo = await geelarkPost<{ uploadUrl?: string; resourceUrl?: string }>('/upload/getUrl', {
    fileType: 'mp4',
  });
  if (!uploadInfo.uploadUrl || !uploadInfo.resourceUrl) {
    throw new Error('GeeLark did not return an upload URL');
  }
  const statusCode = await putBinary(uploadInfo.uploadUrl, fileBuf);
  if (statusCode >= 400) {
    throw new Error(`GeeLark upload storage failed with HTTP ${statusCode}`);
  }
  return uploadInfo.resourceUrl;
}

const STATUS_MAP: Record<number, string> = {
  1: 'waiting',
  2: 'running',
  3: 'success',
  4: 'failed',
  7: 'canceled',
};

export async function getTaskDetail(taskId: string): Promise<Record<string, unknown>> {
  const detail = await geelarkPost<Record<string, unknown>>('/task/detail', { id: taskId });
  const status = Number(detail.status ?? 0);
  return { ...detail, statusText: STATUS_MAP[status] ?? `status:${status}` };
}

async function monitorPublishTasksAndStopPhones(taskEnvMap: Record<string, string>): Promise<void> {
  const pending = new Map(Object.entries(taskEnvMap));
  if (pending.size === 0) return;

  const deadline = Date.now() + TASK_MONITOR_TIMEOUT_MS;
  while (pending.size > 0 && Date.now() <= deadline) {
    for (const [taskId, envId] of [...pending.entries()]) {
      try {
        const detail = await getTaskDetail(taskId);
        const status = Number(detail.status ?? 0);
        if (shouldStopPhoneForTaskStatus(status)) {
          await stopPhones([envId]);
          pending.delete(taskId);
          continue;
        }
        if (status === TASK_STATUS_FAILED || status === TASK_STATUS_CANCELED) {
          console.warn(`[geelark/auto-stop] preserving env ${envId} because task ${taskId} ended with status ${status}`);
          pending.delete(taskId);
        }
      } catch (error) {
        console.error(`[geelark/auto-stop] failed while monitoring task ${taskId}`, error);
      }
    }

    if (pending.size > 0) {
      await sleep(TASK_MONITOR_POLL_MS);
    }
  }

  if (pending.size > 0) {
    console.warn(`[geelark/auto-stop] monitor timed out for tasks ${[...pending.keys()].join(', ')}`);
  }
}

export async function publishVideo(options: {
  videoUrl: string;
  accountIds: string[];
  caption?: string;
  hashtags?: string;
  markAI?: boolean;
  needShareLink?: boolean;
}): Promise<{ taskIds: string[]; planName: string }> {
  const envIds = resolveEnvIds(options.accountIds);
  if (envIds.length === 0) {
    throw new Error('No GeeLark envIds matched the selected publish accounts');
  }

  await ensurePhonesReady(envIds);
  const resourceUrl = await uploadVideoToGeelark(options.videoUrl);
  const planName = `task${Date.now()}`;
  const scheduleAt = Math.floor(Date.now() / 1000);
  const list = envIds.map((envId) => ({
    scheduleAt,
    envId,
    video: resourceUrl,
    videoDesc: [options.caption ?? '', options.hashtags ?? ''].filter(Boolean).join(' ').trim() || undefined,
    markAI: !!options.markAI,
    needShareLink: !!options.needShareLink,
  }));

  const data = await geelarkPost<{ taskIds?: string[] }>('/task/add', { planName, taskType: 1, list });
  const taskIds = data.taskIds ?? [];
  const taskEnvMap = buildTaskEnvMap(taskIds, envIds);
  void monitorPublishTasksAndStopPhones(taskEnvMap).catch((error) => {
    console.error('[geelark/auto-stop] background monitor crashed', error);
  });
  return { taskIds, planName };
}

export async function getTaskHistory(size = 20): Promise<unknown[]> {
  const data = await geelarkPost<{ items?: unknown[] }>('/task/historyRecords', {
    size: Math.min(Math.max(size, 1), 100),
  });
  return data.items ?? [];
}
