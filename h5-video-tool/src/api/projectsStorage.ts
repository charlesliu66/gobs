/**
 * 项目持久化 API（调后端 /api/projects）
 */
import { apiGet, apiPost, apiPut, apiDelete } from './client';

export interface ProjectMeta {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectData extends ProjectMeta {
  username: string;
  data: Record<string, unknown>;
}

/**
 * 列出当前用户所有项目
 */
export async function listProjects(): Promise<ProjectMeta[]> {
  const res = await apiGet<{ projects: ProjectMeta[] }>('/api/projects');
  return res.projects;
}

/**
 * 创建新项目，返回 meta（含 id）
 */
export async function createProject(name: string): Promise<ProjectMeta> {
  return apiPost<ProjectMeta>('/api/projects', { name });
}

/**
 * 读取项目完整数据
 */
export async function getProject(id: string): Promise<ProjectData> {
  return apiGet<ProjectData>(`/api/projects/${encodeURIComponent(id)}`);
}

/**
 * 保存/更新项目数据
 * @param id 项目 id
 * @param name 项目名称
 * @param data 任意 JSON 数据
 */
export async function saveProject(
  id: string,
  name: string,
  data: Record<string, unknown>,
): Promise<ProjectMeta> {
  return apiPut<ProjectMeta>(`/api/projects/${encodeURIComponent(id)}`, { name, data });
}

/**
 * 重命名项目
 */
export async function renameProject(id: string, name: string): Promise<ProjectMeta> {
  return apiPut<ProjectMeta>(`/api/projects/${encodeURIComponent(id)}`, { name });
}

/**
 * 删除项目
 */
export async function deleteProject(id: string): Promise<{ ok: boolean }> {
  return apiDelete<{ ok: boolean }>(`/api/projects/${encodeURIComponent(id)}`);
}
