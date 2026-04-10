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
  if (!key) throw new Error('未配置 GEELARK_BEARER_TOKEN/GEELARK_API_KEY');
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
  if (res.status >= 400) throw new Error(`GeeLark HTTP ${res.status}: ${JSON.stringify(data).slice(0, 220)}`);
  if (typeof data.code === 'number' && data.code !== 0) throw new Error(`GeeLark [${data.code}]: ${data.msg || '未知错误'}`);
  return (data.data ?? ({} as T)) as T;
}

function loadAccountsConfig(): AccountCfg[] {
  const candidates = [
    process.env.GEELARK_ACCOUNTS_CONFIG?.trim(),
    path.join(process.cwd(), 'config', 'geelark-accounts.json'),
    path.join(process.cwd(), '..', 'config', 'geelark-accounts.json'),
  ].filter(Boolean) as string[];
  for (const p of candidates) {
    try {
      if (!fs.existsSync(p)) continue;
      const raw = fs.readFileSync(p, 'utf-8');
      const j = JSON.parse(raw) as { accounts?: unknown } | unknown[];
      const list = Array.isArray(j) ? j : Array.isArray((j as { accounts?: unknown })?.accounts) ? ((j as { accounts: unknown[] }).accounts) : [];
      const out: AccountCfg[] = [];
      for (const a of list) {
        if (!a || typeof a !== 'object') continue;
        const o = a as Record<string, unknown>;
        const id = String(o.id ?? '').trim();
        const username = String(o.username ?? '').trim();
        const envId = String(o.envId ?? '').trim();
        if (!id || !username || !envId) continue;
        out.push({
          id,
          username,
          envId,
          region: typeof o.region === 'string' ? o.region : undefined,
          platform: typeof o.platform === 'string' ? o.platform : undefined,
          remark: typeof o.remark === 'string' ? o.remark : undefined,
          canPost: o.canPost !== false,
        });
      }
      if (out.length > 0) return out;
    } catch {
      // try next
    }
  }
  return [];
}

export function listAccounts() {
  return loadAccountsConfig()
    .filter((a) => a.canPost !== false)
    .map((a) => ({
      id: a.id,
      username: a.username,
      region: a.region,
      platform: a.platform,
      remark: a.remark,
      canPost: a.canPost !== false,
    }));
}

function resolveEnvIds(accountIds: string[]): string[] {
  const all = loadAccountsConfig();
  const ids: string[] = [];
  for (const aid of accountIds) {
    const m = all.find((a) => a.id === aid);
    if (m?.envId) ids.push(m.envId);
  }
  return [...new Set(ids)];
}

async function putBinary(uploadUrl: string, buf: Buffer): Promise<number> {
  const u = new URL(uploadUrl);
  const mod = u.protocol === 'https:' ? https : http;
  return await new Promise((resolve, reject) => {
    const req = mod.request(
      {
        hostname: u.hostname,
        port: u.port || (u.protocol === 'https:' ? 443 : 80),
        path: `${u.pathname}${u.search}`,
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
      reject(new Error('GeeLark 上传超时'));
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
    const r = await axios.get<ArrayBuffer>(input, { responseType: 'arraybuffer', maxRedirects: 5, ...proxyCfg(180_000) });
    return Buffer.from(r.data);
  }
  const fp = path.isAbsolute(input) ? input : path.join(process.cwd(), input);
  if (!fs.existsSync(fp)) throw new Error(`视频路径不存在: ${input}`);
  return fs.readFileSync(fp);
}

async function uploadVideoToGeelark(videoInput: string): Promise<string> {
  const fileBuf = await readVideoInput(videoInput);
  const up = await geelarkPost<{ uploadUrl?: string; resourceUrl?: string }>('/upload/getUrl', { fileType: 'mp4' });
  if (!up.uploadUrl || !up.resourceUrl) throw new Error('GeeLark 获取上传地址失败');
  const status = await putBinary(up.uploadUrl, fileBuf);
  if (status >= 400) throw new Error(`GeeLark OSS 上传失败: HTTP ${status}`);
  return up.resourceUrl;
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
  if (envIds.length === 0) throw new Error('未匹配到可发布账号（请检查 config/geelark-accounts.json 的 id/envId）');
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
  return { taskIds: data.taskIds ?? [], planName };
}

const STATUS_MAP: Record<number, string> = {
  1: '等待执行',
  2: '执行中',
  3: '已完成',
  4: '任务失败',
  7: '已取消',
};

export async function getTaskDetail(taskId: string): Promise<Record<string, unknown>> {
  const d = await geelarkPost<Record<string, unknown>>('/task/detail', { id: taskId });
  const s = Number(d.status ?? 0);
  return { ...d, statusText: STATUS_MAP[s] ?? `状态${s}` };
}

export async function getTaskHistory(size = 20): Promise<unknown[]> {
  const d = await geelarkPost<{ items?: unknown[] }>('/task/historyRecords', { size: Math.min(Math.max(size, 1), 100) });
  return d.items ?? [];
}

