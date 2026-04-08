/**
 * 项目持久化 API — 统一使用 /api/production/project/* 接口
 */
import { apiGet, apiPost, apiDelete } from './client';

export interface ProjectListItem {
  id: string;
  title: string;
  updatedAt: string;
  step: number;
}

/** 列出所有项目 */
export async function listProjects(): Promise<ProjectListItem[]> {
  const res = await apiGet<{ projects: ProjectListItem[] }>('/api/production/project/list');
  return res.projects;
}

/** 创建新项目 */
export async function createProject(name: string): Promise<{ id: string; updatedAt: string }> {
  return apiPost<{ id: string; updatedAt: string }>('/api/production/project/save', {
    project: { meta: { title: name } },
  });
}

/** 删除项目 */
export async function deleteProject(id: string): Promise<{ ok: boolean }> {
  return apiDelete<{ ok: boolean }>(`/api/production/project?id=${encodeURIComponent(id)}`);
}

/** 重命名项目（先 load 完整数据再 save，只改 title） */
export async function renameProject(id: string, newTitle: string): Promise<{ id: string; updatedAt: string }> {
  // 先加载完整项目数据
  const full = await apiGet<Record<string, unknown>>(`/api/production/project/load?id=${encodeURIComponent(id)}`);
  const project = (full.project as Record<string, unknown>) || {};
  const meta = (project.meta as Record<string, unknown>) || {};

  // 更新 title，保持其他数据不变
  return apiPost<{ id: string; updatedAt: string }>('/api/production/project/save', {
    ...full,
    id,
    project: {
      ...project,
      meta: { ...meta, title: newTitle },
    },
  });
}
