/**
 * TASK-C: 资产中台前端 API 封装
 * 对接后端 /api/asset-library/* (TASK-A 实现)
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
  return apiGet<ImportJob>(`${BASE}/import/${encodeURIComponent(jobId)}`);
}

// ── 资产列表 ──────────────────────────────────────────────────────────────────

export async function listAssets(params: Record<string, string> = {}): Promise<ListAssetsResult> {
  const qs = new URLSearchParams(params).toString();
  return apiGet<ListAssetsResult>(`${BASE}/assets${qs ? `?${qs}` : ''}`);
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
  return apiGet<ListAssetsResult>(`${BASE}/search${qs ? `?${qs}` : ''}`);
}

// ── 维度聚合 ──────────────────────────────────────────────────────────────────

export async function getFacets(): Promise<FacetsResult> {
  return apiGet<FacetsResult>(`${BASE}/facets`);
}
