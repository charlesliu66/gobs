/**
 * 高级制片持久化 API
 * 图片上传到后端 output/production/images/
 * 项目 JSON 保存到 output/production/projects/
 */
import { apiGet, apiPost, apiPatch, apiDelete } from './client';

export interface UploadImageResponse {
  path: string;   // 相对路径，如 output/production/images/xxx.png
  url: string;    // 可直接用于 <img src> 的 API 路由，如 /api/production/image?path=...
  filename: string;
}

/**
 * 上传 base64 图片到服务端，返回持久化路径和可访问 URL。
 * base64 可带或不带 data: 前缀。
 */
export async function uploadProductionImage(
  base64: string,
  mimeType?: string,
  label?: string,
): Promise<UploadImageResponse> {
  return apiPost<UploadImageResponse>('/api/production/upload-image', {
    base64,
    mimeType,
    label,
  });
}

/** 将服务端返回的相对路径或 /api/production/image?path=xxx 转为可用的图片 URL */
export function resolveProductionImageUrl(pathOrUrl: string | undefined): string | undefined {
  if (!pathOrUrl) return undefined;
  if (pathOrUrl.startsWith('data:')) return pathOrUrl;          // 仍是 base64（旧数据兼容）
  if (pathOrUrl.startsWith('/api/')) return pathOrUrl;           // 已是 API 路径
  if (pathOrUrl.startsWith('http')) return pathOrUrl;            // 外部 URL
  // 相对路径转 API 路由
  return `/api/production/image?path=${encodeURIComponent(pathOrUrl)}`;
}

// ── 项目持久化 ────────────────────────────────────────────────────────────────

export interface ProjectSaveMeta {
  id: string;
  updatedAt: string;
  title: string;
}

export interface ProjectListItem {
  id: string;
  title: string;
  updatedAt: string;
  step: number;
}

/**
 * 保存整个制片项目（含所有图片路径引用）到服务端。
 * 首次保存不传 id，服务端会生成并返回。
 * 后续更新传已有 id 做覆盖保存。
 */
export async function saveProductionProject(
  data: Record<string, unknown>,
  id?: string,
): Promise<ProjectSaveMeta> {
  return apiPost<ProjectSaveMeta>('/api/production/project/save', { ...data, id });
}

/**
 * 加载制片项目
 */
export async function loadProductionProject(id: string): Promise<Record<string, unknown>> {
  return apiGet<Record<string, unknown>>(`/api/production/project/load?id=${encodeURIComponent(id)}`);
}

/**
 * 列出所有已保存的制片项目（最多 50 个，按时间倒序）
 */
export async function listProductionProjects(): Promise<{ projects: ProjectListItem[] }> {
  return apiGet<{ projects: ProjectListItem[] }>('/api/production/project/list');
}

/**
 * 删除制片项目
 */
export async function deleteProductionProject(id: string): Promise<{ ok: boolean }> {
  return apiDelete<{ ok: boolean }>(`/api/production/project?id=${encodeURIComponent(id)}`);
}

/**
 * 即时持久化镜头版本选择（不等 auto-save）
 */
export async function patchShotVersion(
  projectId: string,
  shotIndex: number,
  versionId: string,
): Promise<{ ok: boolean }> {
  return apiPatch<{ ok: boolean }>(
    `/api/production/project/${encodeURIComponent(projectId)}/shots/${shotIndex}/version`,
    { versionId },
  );
}

/**
 * 清理镜头的旧版本，只保留指定版本
 */
export async function deleteShotVersions(
  projectId: string,
  shotIndex: number,
  keepVersionId: string,
): Promise<{ ok: boolean; deletedFiles: number }> {
  return apiDelete<{ ok: boolean; deletedFiles: number }>(
    `/api/production/project/${encodeURIComponent(projectId)}/shots/${shotIndex}/versions?keepVersionId=${encodeURIComponent(keepVersionId)}`,
  );
}
