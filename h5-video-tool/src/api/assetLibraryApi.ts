/**
 * TASK-C: 资产中台前端 API 封装
 * 对接后端 /api/asset-library/* (TASK-A 实现)
 * TASK-D: 新增 getAssetHighlights
 */
import { apiGet, apiPost, apiDelete, apiPatch } from './client';

const BASE = '/api/asset-library';

// ── 类型定义 ──────────────────────────────────────────────────────────────────

export interface AssetTag {
  key: string;
  value: string;
  source: 'ai' | 'human';
  confidence: number;
  status: 'pending' | 'confirmed' | 'rejected';
}

export const TEAM_ASSET_CATEGORIES = [
  'character_image',
  'scene_image',
  'ui_screenshot',
  'logo',
  'gameplay_screenshot',
  'video_clip',
  'finished_banner',
  'reference_image',
] as const;

export type TeamAssetCategory = typeof TEAM_ASSET_CATEGORIES[number];
export type TeamAssetCategorySource = 'manual' | 'ai_category' | 'filename' | 'mime' | 'fallback';

export interface AssetPreprocessSummary {
  file_type: 'image' | 'video' | 'audio' | 'other';
  width: number | null;
  height: number | null;
  aspect_ratio: string | null;
  orientation: string | null;
  thumbnail_ready: boolean;
  duration_sec: number | null;
  has_audio: boolean;
  campaign_asset_category: TeamAssetCategory;
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
  file_url?: string;
  thumbnail_url?: string;
  mimetype?: string;
  filesize?: number;
  duration?: number | null;
  width?: number | null;
  height?: number | null;
  orientation?: string | null;
  ai_category?: string;
  ai_description?: string;
  team_category?: TeamAssetCategory;
  team_category_source?: TeamAssetCategorySource;
  reuse_category?: TeamAssetCategory;
  preprocess?: AssetPreprocessSummary;
  is_favorite?: boolean;
  last_used_at?: string;
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
  /** 被跳过的文件数（通常是 sha256 去重命中的重复文件） */
  skipped: number;
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

export async function importAssets(files: FileList | File[]): Promise<{ jobId: string; total: number }> {
  const formData = new FormData();
  const list = files instanceof FileList ? Array.from(files) : files;
  for (const f of list) {
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
    skipped: raw.skipped ?? 0,
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

export async function updateAssetCategory(
  assetId: string,
  teamCategory: TeamAssetCategory,
): Promise<LibraryAsset> {
  const result = await apiPatch<{ ok: boolean; asset: LibraryAsset }>(
    `${BASE}/assets/${encodeURIComponent(assetId)}/category`,
    { teamCategory },
  );
  return result.asset;
}

// ── 待确认标签（分页）────────────────────────────────────────────────────────

export interface PendingTagItem {
  asset_id: string;
  filename: string;
  mimetype: string;
  ai_category: string;
  tag: AssetTag;
}

export interface PendingTagsResult {
  total: number;
  page: number;
  pageSize: number;
  items: PendingTagItem[];
}

export async function getPendingTags(page = 1, pageSize = 20): Promise<PendingTagsResult> {
  return apiGet<PendingTagsResult>(
    `${BASE}/pending-tags?page=${page}&pageSize=${pageSize}`
  );
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
  ai_category?: string;
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
  if (params.ai_category) raw.ai_category = params.ai_category;
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

// ── 构造带 token 的文件 URL ──────────────────────────────────────────────────

export function buildAssetFileUrl(assetId: string): string {
  const token = localStorage.getItem('gobs_token') ?? '';
  return `/api/asset-library/assets/${encodeURIComponent(assetId)}/file?token=${encodeURIComponent(token)}`;
}

// ── 删除素材 ────────────────────────────────────────────────────────────────

export async function deleteAsset(id: string): Promise<void> {
  await apiDelete(`${BASE}/assets/${encodeURIComponent(id)}`);
}

export async function batchDeleteAssets(ids: string[]): Promise<{ deleted: number; ids: string[] }> {
  return apiPost(`${BASE}/assets/batch-delete`, { ids });
}

// ── 收藏 ────────────────────────────────────────────────────────────────────

export async function addFavorite(assetId: string): Promise<void> {
  await apiPost(`${BASE}/favorites/${encodeURIComponent(assetId)}`, {});
}

export async function removeFavorite(assetId: string): Promise<void> {
  await apiDelete(`${BASE}/favorites/${encodeURIComponent(assetId)}`);
}

export async function listFavorites(params: { page?: number; pageSize?: number } = {}): Promise<ListAssetsResult> {
  const raw: Record<string, string> = {};
  if (params.page) raw.page = String(params.page);
  if (params.pageSize) raw.pageSize = String(params.pageSize);
  const qs = new URLSearchParams(raw).toString();
  const result = await apiGet<{
    assets?: LibraryAsset[];
    total: number;
    page: number;
    pageSize: number;
  }>(`${BASE}/favorites${qs ? `?${qs}` : ''}`);
  return { assets: result.assets ?? [], total: result.total, page: result.page, pageSize: result.pageSize };
}

// ── 最近使用 ────────────────────────────────────────────────────────────────

export async function recordUsage(assetId: string, context?: string): Promise<void> {
  await apiPost(`${BASE}/usage`, { assetId, context });
}

export async function listRecent(limit = 50): Promise<{ assets: LibraryAsset[]; total: number }> {
  const result = await apiGet<{
    assets?: LibraryAsset[];
    total: number;
  }>(`${BASE}/recent?limit=${limit}`);
  return { assets: result.assets ?? [], total: result.total };
}

// ── 分类统计（虚拟文件夹）────────────────────────────────────────────────────

export interface CategoryCount {
  category: string;
  count: number;
}

export async function getCategories(): Promise<{ categories: CategoryCount[]; total: number }> {
  return apiGet<{ categories: CategoryCount[]; total: number }>(`${BASE}/categories`);
}

// ── 自定义文件夹 ────────────────────────────────────────────────────────────

export interface AssetFolder {
  id: string;
  username: string;
  parent_id: string | null;
  name: string;
  sort_order: number;
  asset_count: number;
  created_at: string;
  updated_at: string;
}

export async function listFolders(): Promise<{ folders: AssetFolder[] }> {
  return apiGet<{ folders: AssetFolder[] }>(`${BASE}/folders`);
}

export async function createFolder(name: string, parentId?: string): Promise<{ folder: AssetFolder }> {
  return apiPost(`${BASE}/folders`, { name, parentId });
}

export async function renameFolder(id: string, name: string): Promise<void> {
  const token = localStorage.getItem('gobs_token');
  await fetch(`${BASE}/folders/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ name }),
  });
}

export async function deleteFolder(id: string): Promise<void> {
  await apiDelete(`${BASE}/folders/${encodeURIComponent(id)}`);
}

export async function moveAssetsToFolder(folderId: string, assetIds: string[]): Promise<void> {
  await apiPost(`${BASE}/folders/${encodeURIComponent(folderId)}/move-assets`, { assetIds });
}

// ── AI 一键整理 ──────────────────────────────────────────────────────────────

export interface AutoOrganizeResult {
  created_folders: string[];
  moved_count: number;
  tagged_count: number;
  still_uncategorized: number;
  total_folders: number;
}

export async function autoOrganize(): Promise<AutoOrganizeResult> {
  return apiPost<AutoOrganizeResult>(`${BASE}/auto-organize`, {});
}
