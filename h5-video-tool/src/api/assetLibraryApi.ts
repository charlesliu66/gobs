/**
 * TASK-C: 资产中台前端 API 封装
 * 对接后端 /api/asset-library/* (TASK-A 实现)
 * TASK-D: 新增 getAssetHighlights
 */
import { apiGet, apiPost } from './client';

const BASE = '/api/asset-library';

// ── 类型定义 ──────────────────────────────────────────────────────────────────

export interface AssetTag {
  key: string;
  value: string;
  source: 'ai' | 'human';
  confidence: number;
  status: 'pending' | 'confirmed' | 'rejected';
}

export interface LibraryAsset {
  id: string;
  filename: string;
  mime_type: string;
  size: number;
  status: string;
  created_at: string;
  updated_at: string;
  tags: AssetTag[];
  /** TASK-D: 服务端文件访问 URL（含 token 认证），由后端追加 */
  file_url?: string;
  /** 原始字段别名（后端返回 mimetype，TASK-D 统一前端接口） */
  mimetype?: string;
  /** 文件大小（filesize 别名） */
  filesize?: number;
  /** 视频时长（秒） */
  duration?: number | null;
}

export interface ListAssetsResult {
  assets: LibraryAsset[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ImportJob {
  jobId: string;
  username: string;
  total: number;
  processed: number;
  failed: number;
  status: 'running' | 'done' | 'error';
  errors?: string[];
}

export interface FacetsResult {
  [key: string]: Array<{ value: string; count: number }>;
}

export interface BatchTagUpdate {
  assetId: string;
  key: string;
  value: string;
  status?: 'confirmed' | 'rejected';
  action?: 'upsert' | 'delete';
}

// ── 导入（multipart/form-data）───────────────────────────────────────────────

export async function importAssets(files: FileList): Promise<{ jobId: string; total: number }> {
  const formData = new FormData();
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    if (f) formData.append('files', f);
  }
  const token = localStorage.getItem('gobs_token');
  const res = await fetch(`${BASE}/import`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error || res.statusText);
  }
  return res.json() as Promise<{ jobId: string; total: number }>;
}

export async function getJobStatus(jobId: string): Promise<ImportJob> {
  // 后端返回 DB 行结构（id, status: 'pending'|'running'|'done'|'interrupted'|'failed', error）
  // 归一化为前端 ImportJob 格式
  const raw = await apiGet<{
    id?: string;
    jobId?: string;
    username?: string;
    total: number;
    processed: number;
    failed: number;
    skipped?: number;
    status: string;
    error?: string | null;
  }>(`${BASE}/import/${encodeURIComponent(jobId)}`);

  const normalizedStatus: ImportJob['status'] =
    raw.status === 'done' ? 'done'
    : raw.status === 'failed' || raw.status === 'interrupted' || raw.status === 'error' ? 'error'
    : 'running';

  return {
    jobId: raw.jobId ?? raw.id ?? jobId,
    username: raw.username ?? '',
    total: raw.total,
    processed: raw.processed,
    failed: raw.failed,
    status: normalizedStatus,
    errors: raw.error ? [raw.error] : undefined,
  };
}

// ── 资产列表 ──────────────────────────────────────────────────────────────────

export async function listAssets(params: Record<string, string> = {}): Promise<ListAssetsResult> {
  const qs = new URLSearchParams(params).toString();
  // 后端返回 { assets, total, page, pageSize }，兼容旧版 { items } 字段
  const raw = await apiGet<{
    assets?: LibraryAsset[];
    items?: LibraryAsset[];
    total: number;
    page: number;
    pageSize: number;
  }>(`${BASE}/assets${qs ? `?${qs}` : ''}`);
  return { assets: raw.assets ?? raw.items ?? [], total: raw.total, page: raw.page, pageSize: raw.pageSize };
}

// ── 批量标签更新 ──────────────────────────────────────────────────────────────

export async function batchUpdateTags(
  updates: BatchTagUpdate[]
): Promise<{ ok: boolean; results: Array<{ assetId: string; key: string; result: string }> }> {
  return apiPost(`${BASE}/assets/batch-tags`, { updates });
}

// ── 搜索 ──────────────────────────────────────────────────────────────────────

export interface SearchParams {
  q?: string;
  ratio?: string;
  type?: string;
  orientation?: string;
  duration_range?: string;
  quality?: string;
  purpose?: string;
  page?: number;
  pageSize?: number;
}

export async function searchAssets(params: SearchParams): Promise<ListAssetsResult> {
  const raw: Record<string, string> = {};
  if (params.q) raw.q = params.q;
  if (params.ratio) raw.ratio = params.ratio;
  if (params.type) raw.type = params.type;
  if (params.orientation) raw.orientation = params.orientation;
  if (params.duration_range) raw.duration_range = params.duration_range;
  if (params.quality) raw.quality = params.quality;
  if (params.purpose) raw.purpose = params.purpose;
  if (params.page) raw.page = String(params.page);
  if (params.pageSize) raw.pageSize = String(params.pageSize);
  const qs = new URLSearchParams(raw).toString();
  const result = await apiGet<{
    assets?: LibraryAsset[];
    items?: LibraryAsset[];
    total: number;
    page: number;
    pageSize: number;
  }>(`${BASE}/search${qs ? `?${qs}` : ''}`);
  return { assets: result.assets ?? result.items ?? [], total: result.total, page: result.page, pageSize: result.pageSize };
}

// ── 维度聚合 ──────────────────────────────────────────────────────────────────

export async function getFacets(): Promise<FacetsResult> {
  return apiGet<FacetsResult>(`${BASE}/facets`);
}

// ── TASK-D: 高光候选 ──────────────────────────────────────────────────────────

export interface HighlightCandidate {
  startSec: number;
  endSec: number;
  score: number;
  reason: string;
}

export async function getAssetHighlights(assetId: string): Promise<HighlightCandidate[]> {
  const res = await apiGet<{ highlights: HighlightCandidate[] }>(
    `${BASE}/assets/${encodeURIComponent(assetId)}/highlights`
  );
  return res.highlights ?? [];
}

// ── TASK-D: 构造带 token 的文件 URL ──────────────────────────────────────────

export function buildAssetFileUrl(assetId: string): string {
  const token = localStorage.getItem('gobs_token') ?? '';
  return `/api/asset-library/assets/${encodeURIComponent(assetId)}/file?token=${encodeURIComponent(token)}`;
}
