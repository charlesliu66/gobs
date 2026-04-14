/**
 * TASK-A: 资产中台类型定义
 */

export type AssetStatus = 'pending' | 'tagging' | 'ready' | 'error';
export type TagSource = 'rule' | 'ai' | 'human';
export type TagStatus = 'confirmed' | 'pending' | 'rejected';
export type JobStatus = 'pending' | 'running' | 'done' | 'interrupted' | 'failed';

export interface AssetRecord {
  id: string;
  username: string;
  project_id: string;
  filename: string;
  filepath: string;
  mimetype: string;
  filesize: number;
  sha256: string;
  width: number | null;
  height: number | null;
  duration: number | null;
  fps: number | null;
  orientation: string | null;
  has_audio: number; // 0 or 1 (SQLite boolean)
  status: AssetStatus;
  created_at: string;
  updated_at: string;
}

export interface AssetTag {
  id: number;
  asset_id: string;
  key: string;
  value: string;
  source: TagSource;
  confidence: number;
  status: TagStatus;
  created_at: string;
}

export interface ImportJob {
  id: string;
  username: string;
  total: number;
  processed: number;
  failed: number;
  skipped: number;
  status: JobStatus;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export interface SearchQuery {
  username: string;
  q?: string;
  page?: number;
  pageSize?: number;
  filters: Record<string, string>;
}

export type FacetResult = Record<string, Record<string, number>>;
