import { readFile } from 'fs/promises';
import { join } from 'path';

export type PublishAccountOption = { id: string; username?: string; remark?: string; platform?: string };

/** 调用时读取 env（须在 loadEnv 之后；勿在模块顶层缓存）。 */
function getGeelarkOpenApiV1Base(): string {
  const raw =
    process.env.GEELARK_BASE_URL?.trim() ||
    process.env.GEELARK_SJ_BASE_URL?.trim() ||
    process.env.GEELARK_OPENAPI_BASE?.trim();
  const fallback = 'https://openapi.geelark.com/open/v1';
  const base = (raw || fallback).replace(/\/$/, '');
  return base.includes('/open/v') ? base : `${base}/open/v1`.replace(/\/$/, '');
}

async function resolveGeelarkBearerToken(): Promise<string> {
  const fromEnv =
    process.env.GEELARK_BEARER_TOKEN?.trim() ||
    process.env.GEELARK_API_KEY?.trim() ||
    process.env.GEELARK_TOKEN?.trim();
  if (fromEnv) return fromEnv;
  const candidates = [
    join(process.cwd(), '..', 'config', 'geelark.json'),
    join(process.cwd(), 'config', 'geelark.json'),
    join(process.cwd(), '..', '..', 'config', 'geelark.json'),
  ];
  for (const p of candidates) {
    try {
      const raw = await readFile(p, 'utf8');
      const j = JSON.parse(raw) as { apiKey?: unknown; bearerToken?: unknown };
      const k = typeof j.bearerToken === 'string' ? j.bearerToken.trim() : '';
      if (k) return k;
      const a = typeof j.apiKey === 'string' ? j.apiKey.trim() : '';
      if (a) return a;
    } catch {
      /* next */
    }
  }
  return '';
}

function traceId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16).toUpperCase();
  }).replace(/-/g, '');
}

/** 从仓库 config/geelark-accounts.json 读取视频分发目标账号列表 */
export async function loadPublishAccountsFromConfig(): Promise<PublishAccountOption[]> {
  const candidates = [
    join(process.cwd(), '..', 'config', 'geelark-accounts.json'),
    join(process.cwd(), 'config', 'geelark-accounts.json'),
    join(process.cwd(), '..', '..', 'config', 'geelark-accounts.json'),
  ];
  for (const p of candidates) {
    try {
      const raw = await readFile(p, 'utf8');
      const j = JSON.parse(raw) as { accounts?: unknown };
      const list = Array.isArray(j.accounts) ? j.accounts : [];
      const out: PublishAccountOption[] = [];
      for (const a of list) {
        if (!a || typeof a !== 'object') continue;
        const o = a as Record<string, unknown>;
        const id = String(o.id ?? '').trim();
        if (!id) continue;
        out.push({
          id,
          username: typeof o.username === 'string' ? o.username : undefined,
          remark: typeof o.remark === 'string' ? o.remark : undefined,
          platform: typeof o.platform === 'string' ? o.platform : undefined,
        });
      }
      return out;
    } catch {
      /* try next */
    }
  }
  return [];
}

function collectTagLabels(p: Record<string, unknown>): string[] {
  const out: string[] = [];
  const push = (v: unknown) => {
    const t = String(v ?? '').trim();
    if (t && !out.includes(t)) out.push(t);
  };
  const arr = (x: unknown) => {
    if (!Array.isArray(x)) return;
    for (const it of x) {
      if (typeof it === 'string') push(it);
      else if (it && typeof it === 'object' && 'name' in it) push((it as { name?: unknown }).name);
    }
  };
  arr(p.tags);
  arr(p.tagList);
  arr(p.tagNames);
  const g = p.group;
  if (g && typeof g === 'object' && g !== null && 'name' in g) push((g as { name?: unknown }).name);
  return out;
}

/** 调用 GeeLark 拉取云手机并汇总 group/tag 列（Bearer：GEELARK_BEARER_TOKEN 或 GEELARK_API_KEY，或 config/geelark.json） */
export async function fetchMatrixGroupTagOptions(): Promise<string[]> {
  const token = await resolveGeelarkBearerToken();
  if (!token) return [];
  const base = getGeelarkOpenApiV1Base();
  const tags = new Set<string>();
  let page = 1;
  const pageSize = 100;
  try {
    while (page < 200) {
      const res = await fetch(`${base}/phone/list`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          traceId: traceId(),
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ page, pageSize }),
      });
      const data = (await res.json()) as { code?: number; data?: { items?: Record<string, unknown>[] }; msg?: string };
      if (data.code !== 0) break;
      const items = data.data?.items ?? [];
      for (const p of items) {
        for (const t of collectTagLabels(p)) tags.add(t);
      }
      if (items.length < pageSize) break;
      page++;
    }
  } catch {
    return [...tags].sort((a, b) => a.localeCompare(b, 'en'));
  }
  return [...tags].sort((a, b) => a.localeCompare(b, 'en'));
}
