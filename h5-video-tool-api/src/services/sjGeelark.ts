/**
 * SJ GeeLark API：TikTok 矩阵（批量评论、云手机、任务日志）
 * 与 SJ 项目一致：默认国际区 openapi.geelark.com + Bearer Token
 * 若需国内区可配置 GEELARK_SJ_BASE_URL=https://openapi.geelark.cn/open/v1
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** 与 SJ 一致：默认国际区 geelark.com（避免 Bearer token signature verification failure）；需国内区时配置 GEELARK_SJ_BASE_URL */
const BASE = (process.env.GEELARK_SJ_BASE_URL || process.env.GEELARK_BASE_URL || 'https://openapi.geelark.com/open/v1').replace(/\/$/, '');

function loadGeelarkConfig(): { apiKey?: string; appId?: string } | null {
  const paths = [
    process.env.GEELARK_CONFIG,
    path.join(process.cwd(), 'config', 'geelark.json'),
    path.join(process.cwd(), '..', 'config', 'geelark.json'),
    path.join(__dirname, '..', '..', '..', 'config', 'geelark.json'),
  ].filter(Boolean) as string[];

  for (const p of paths) {
    if (p && fs.existsSync(p)) {
      try {
        const cfg = JSON.parse(fs.readFileSync(p, 'utf-8'));
        if (cfg.apiKey) process.env.GEELARK_API_KEY = cfg.apiKey;
        if (cfg.appId) process.env.GEELARK_APP_ID = cfg.appId;
        return cfg;
      } catch {}
    }
  }
  return null;
}

/** Bearer 认证用：GEELARK_BEARER_TOKEN 或 GEELARK_API_KEY */
function getApiKey(): string {
  return process.env.GEELARK_BEARER_TOKEN || process.env.GEELARK_API_KEY || '';
}

/** Key 验证用：必须用 GEELARK_API_KEY（与 appId 配套），不能用 Bearer Token */
function getKeyAuthApiKey(): string {
  return process.env.GEELARK_API_KEY || '';
}

/** 加载配置并检查是否有有效认证（供 geelark-status 等路由使用） */
export function ensureConfigLoaded(): boolean {
  loadGeelarkConfig();
  const appId = getAppId();
  const keyAuthApiKey = getKeyAuthApiKey();
  const bearerToken = getApiKey();
  return !!(appId && keyAuthApiKey.length >= 10) || (bearerToken.length >= 10);
}

function getAppId(): string {
  return process.env.GEELARK_APP_ID || '';
}

function traceId(): string {
  return crypto.randomUUID?.()?.replace(/-/g, '').toUpperCase() ?? 
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16).toUpperCase();
    }).replace(/-/g, '');
}

function keySign(traceIdVal: string, ts: string, nonce: string, appId: string, apiKey: string): string {
  const raw = `${appId}${traceIdVal}${ts}${nonce}${apiKey}`;
  return crypto.createHash('sha256').update(raw, 'utf8').digest('hex').toUpperCase();
}

function getHeaders(): Record<string, string> {
  loadGeelarkConfig();
  const appId = getAppId();
  const keyAuthApiKey = getKeyAuthApiKey();
  const bearerToken = getApiKey();
  // Key 验证：需 appId + GEELARK_API_KEY（不能用 Bearer Token 做签名，否则会 signature verification failure）
  const useKeyAuth = !!(appId && keyAuthApiKey.length >= 10);

  const tid = traceId();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    traceId: tid,
  };
  if (useKeyAuth) {
    const ts = String(Date.now());
    const nonce = tid.slice(0, 6);
    headers.appId = appId;
    headers.ts = ts;
    headers.nonce = nonce;
    headers.sign = keySign(tid, ts, nonce, appId, keyAuthApiKey);
  } else if (bearerToken) {
    headers.Authorization = `Bearer ${bearerToken}`;
  }
  return headers;
}

async function post<T = unknown>(path: string, body: Record<string, unknown>): Promise<T> {
  const url = `${BASE}/${path.replace(/^\//, '')}`;
  const res = await axios.post(url, body, {
    headers: getHeaders(),
    timeout: 30000,
    validateStatus: () => true,
  });
  const data = res.data as { code?: number; msg?: string; data?: T };
  if (data.code !== undefined && data.code !== 0) {
    throw new Error(data.msg || 'GeeLark 请求失败');
  }
  return (data.data ?? data) as T;
}

export async function getCloudPhones(params?: { page?: number; pageSize?: number }): Promise<{ id: string; serialName?: string; serialNo?: string; status?: number; group?: { id: string; name: string }; remark?: string; proxy?: unknown }[]> {
  const data = await post<{ items?: { id: string; serialName?: string; serialNo?: string; status?: number; group?: { id: string; name: string }; remark?: string; proxy?: unknown }[] }>(
    'phone/list',
    { page: params?.page ?? 1, pageSize: params?.pageSize ?? 100 }
  );
  return data?.items ?? [];
}

export async function phoneStart(ids: string[]): Promise<{ totalAmount: number; successAmount: number; failAmount: number }> {
  const data = await post<{ totalAmount?: number; successAmount?: number; failAmount?: number }>('phone/start', { ids });
  return {
    totalAmount: data?.totalAmount ?? 0,
    successAmount: data?.successAmount ?? 0,
    failAmount: data?.failAmount ?? 0,
  };
}

export async function phoneStop(ids: string[]): Promise<{ totalAmount: number; successAmount: number; failAmount: number }> {
  const data = await post<{ totalAmount?: number; successAmount?: number; failAmount?: number }>('phone/stop', { ids });
  return {
    totalAmount: data?.totalAmount ?? 0,
    successAmount: data?.successAmount ?? 0,
    failAmount: data?.failAmount ?? 0,
  };
}

export async function phoneDelete(ids: string[]): Promise<{ totalAmount: number; successAmount: number; failAmount: number }> {
  const data = await post<{ totalAmount?: number; successAmount?: number; failAmount?: number }>('phone/delete', { ids });
  return {
    totalAmount: data?.totalAmount ?? 0,
    successAmount: data?.successAmount ?? 0,
    failAmount: data?.failAmount ?? 0,
  };
}

export async function phoneDetailUpdate(params: { id: string; name?: string; remark?: string; proxyId?: string }): Promise<void> {
  await post('phone/detail/update', params);
}

export async function proxyList(params: { page: number; pageSize: number }): Promise<{
  total: number;
  page: number;
  pageSize: number;
  list: { id: string; scheme: string; server: string; port: number; username?: string; password?: string }[];
}> {
  const data = await post<{ total?: number; page?: number; pageSize?: number; list?: { id: string; scheme: string; server: string; port: number; username?: string; password?: string }[] }>(
    'proxy/list',
    params
  );
  return {
    total: data?.total ?? 0,
    page: data?.page ?? 1,
    pageSize: data?.pageSize ?? 10,
    list: data?.list ?? [],
  };
}

export async function proxyAdd(list: { scheme: string; server: string; port: number; username?: string; password?: string }[]): Promise<{ successAmount: number; failAmount: number }> {
  const data = await post<{ successAmount?: number; failAmount?: number }>('proxy/add', { list });
  return { successAmount: data?.successAmount ?? 0, failAmount: data?.failAmount ?? 0 };
}

export async function proxyUpdate(list: { id: string; scheme: string; server: string; port: number; username?: string; password?: string }[]): Promise<void> {
  await post('proxy/update', { list });
}

export async function proxyDelete(ids: string[]): Promise<void> {
  await post('proxy/delete', { ids });
}

export async function taskHistoryRecords(params?: { size?: number }): Promise<{
  total: number;
  items: { id: string; planName?: string; taskType?: number; serialName?: string; envId?: string; scheduleAt?: number; status?: number; failCode?: number; failDesc?: string; cost?: number }[];
}> {
  const data = await post<{ total?: number; items?: { id: string; planName?: string; taskType?: number; serialName?: string; envId?: string; scheduleAt?: number; status?: number; failCode?: number; failDesc?: string; cost?: number }[] }>(
    'task/historyRecords',
    params ?? { size: 100 }
  );
  return { total: data?.total ?? 0, items: data?.items ?? [] };
}

export async function taskQuery(ids: string[]): Promise<{ total: number; items: { id: string; status?: number; failCode?: number; failDesc?: string }[] }> {
  const data = await post<{ total?: number; items?: { id: string; status?: number; failCode?: number; failDesc?: string }[] }>('task/query', { ids });
  return { total: data?.total ?? 0, items: data?.items ?? [] };
}

export async function taskDetail(id: string, searchAfter?: number[]): Promise<{
  id: string;
  planName?: string;
  taskType?: number;
  serialName?: string;
  envId?: string;
  scheduleAt?: number;
  status?: number;
  failCode?: number;
  failDesc?: string;
  cost?: number;
  resultImages?: string[];
  logs?: string[];
  logContinue?: boolean;
  searchAfter?: number[];
}> {
  const data = await post<unknown>('task/detail', { id, ...(searchAfter?.length ? { searchAfter } : {}) });
  return (data ?? {}) as ReturnType<typeof taskDetail> extends Promise<infer R> ? R : never;
}

export async function taskCancel(ids: string[]): Promise<{ successAmount: number; failAmount: number }> {
  const data = await post<{ successAmount?: number; failAmount?: number }>('task/cancel', { ids });
  return { successAmount: data?.successAmount ?? 0, failAmount: data?.failAmount ?? 0 };
}

export async function scheduleTiktokComment(params: {
  phoneId: string;
  tiktokUrl: string;
  comment: string;
  scheduleAt: number;
  useAsia?: boolean;
}): Promise<{ taskId: string }> {
  const apiPath = params.useAsia ? 'rpa/task/tiktokRandomCommentAsia' : 'rpa/task/tiktokRandomComment';
  const body = {
    id: params.phoneId,
    scheduleAt: params.scheduleAt,
    useAi: 2,
    comment: (params.comment || '').trim().slice(0, 500),
    links: params.tiktokUrl ? [String(params.tiktokUrl).trim()] : [],
    commentProbability: 100,
    name: 'TikTok评论',
  };
  if (!body.comment) throw new Error('评论内容不能为空');
  if (body.links.length === 0) throw new Error('请填写视频链接');
  const data = await post<{ taskId?: string }>(apiPath, body);
  return { taskId: data?.taskId ?? '' };
}
