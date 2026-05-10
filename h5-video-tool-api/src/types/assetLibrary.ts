/**
 * TASK-A: 资产中台类型定义
 */

export type AssetStatus = 'pending' | 'tagging' | 'ready' | 'error';
export type TagSource = 'rule' | 'ai' | 'human';
export type TagStatus = 'confirmed' | 'pending' | 'rejected';
export type JobStatus = 'pending' | 'running' | 'done' | 'interrupted' | 'failed';

export const AI_CATEGORIES = [
  '角色', '武器道具', '场景', 'UI素材', '宣传图', '视频片段', '未分类',
] as const;
export type AiCategory = typeof AI_CATEGORIES[number];

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
  ai_category: AiCategory;
  ai_description: string | null;
  team_category: TeamAssetCategory | null;
  folder_id: string | null;
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
  aiCategory?: string;
  folderId?: string;
}

export type FacetResult = Record<string, Record<string, number>>;
