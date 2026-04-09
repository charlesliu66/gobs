/**
 * 从 GOBS gobsPublishCatalog 抽离的 GeeLark OpenAPI 基址与 Token 解析（仅供风控大师 bundle）。
 */
import { readFile } from 'fs/promises';
import { join } from 'path';

export function getGeelarkOpenApiV1Base(): string {
  const raw =
    process.env.GEELARK_BASE_URL?.trim() ||
    process.env.GEELARK_SJ_BASE_URL?.trim() ||
    process.env.GEELARK_OPENAPI_BASE?.trim();
  const fallback = 'https://openapi.geelark.com/open/v1';
  const base = (raw || fallback).replace(/\/$/, '');
  return base.includes('/open/v') ? base : `${base}/open/v1`.replace(/\/$/, '');
}

export async function resolveGeelarkBearerToken(): Promise<string> {
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

export function geelarkApiTraceId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16).toUpperCase();
  }).replace(/-/g, '');
}
