import { apiGet, apiPost } from './client';

/** 可灵模型 id（与后端 isKlingModel 一致） */
export function isKlingModelId(model?: string | null): boolean {
  if (!model?.trim()) return false;
  const m = model.trim().toLowerCase();
  return m.startsWith('kling') || m.includes('kling-v') || m.startsWith('kling/') || m.startsWith('kling-video');
}

/**
 * 同域代理可灵 CDN MP4，供 <video> 播放与下载。
 * 未配置 VITE_API_BASE_URL 时用相对路径 `/api/...`，走 Vite 代理（局域网访问请勿用 localhost 写死后端地址）。
 */
export function klingVideoProxyUrl(remoteVideoUrl: string): string {
  const path = `/api/video/kling/video-proxy?url=${encodeURIComponent(remoteVideoUrl)}`;
  const base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
  if (!base) return path;
  return `${base}${path}`;
}

export interface VideoGenerateRequest {
  storyboardText: string;
  materials: { id: string; name: string; mimeType?: string }[];
  driveToken?: string;
  duration?: number;
  aspectRatio?: string;
  /** Veo 模型，如 veo-2.0-generate-001 */
  model?: string;
  /** 分辨率，720p/1080p/4k */
  resolution?: string;
  /**
   * 可灵多图参考（Omni `image_list`）。优先级高于 materials 多图。
   * base64 不含 `data:image/...;base64,` 前缀；type 可选表示首尾帧语义。
   */
  referenceImages?: { base64: string; mimeType?: string; type?: 'first_frame' | 'end_frame' }[];
  /** 可灵 Omni `video_list`：公网 http(s) 直链；TikTok 分享页需先换可访问的 MP4 */
  referenceVideoUrl?: string;
  referenceVideoReferType?: 'feature' | 'base';
  referenceVideoKeepSound?: 'yes' | 'no';
}

export interface VeoModelsResponse {
  models: string[];
  /** ingarena 网关时，可灵单段可走异步创建 + video-list 轮询 */
  klingAsync?: boolean;
}

export async function getVeoModels(): Promise<VeoModelsResponse> {
  try {
    const res = await apiGet<VeoModelsResponse>('/api/video/models');
    if (res?.models?.length) return res;
  } catch {
    /* ignore */
  }
  return { models: ['veo-2.0-generate-001'], klingAsync: false };
}

export interface VideoGenerateResponse {
  taskId: string;
  status: 'pending' | 'completed';
  videoUrl?: string;
  /** 服务器本地路径（如 output/xxx.mp4），推送到 GeeLark 时优先使用，避免 base64 传输 */
  videoPath?: string;
  estimatedTime?: number;
}

/** 多镜头生成请求 */
export interface MultishotGenerateRequest {
  shots: { durationSeconds: number; prompt: string; imageBase64?: string }[];
  aspectRatio?: string;
  /** 用户选的素材（第 1 张=主体设定图 @img1，第 2 张=场景设定图 @img2），用于视频生成的参考图 */
  materials?: { id: string; name: string; mimeType?: string }[];
  driveToken?: string;
  /** 与单段一致：可灵模型（kling-v*）走可灵 API */
  model?: string;
}

export interface MultishotGenerateResponse {
  status: 'completed';
  videoUrl: string;
  outputPath?: string;
}

/** ingarena：仅创建可灵任务，由前端轮询 GET /api/video/kling/task/:id */
export async function generateKlingAsync(req: VideoGenerateRequest): Promise<{ taskId: string; status: 'pending' }> {
  return apiPost('/api/video/generate-kling-async', req);
}

export type KlingPollPhase = 'pending' | 'processing' | 'succeeded' | 'failed';

export interface KlingVideoListRow {
  taskId: string;
  taskStatus?: number | string;
  taskStatusMsg?: string;
  videoUrl?: string;
  coverUrl?: string;
  modelName?: string;
  aspectRatio?: string;
  modeLabel?: string;
  soundLabel?: string;
  createdAt?: string;
  prompt?: string;
  /** 后端透传 video-list 原始字段，便于解析非标准 video_url 位置 */
  raw?: Record<string, unknown>;
}

/** 轮询接口返回的 row 里，视频地址可能在 videoUrl 或 raw 嵌套字段 */
export function resolveKlingPlaybackUrl(row: KlingVideoListRow | undefined): string | undefined {
  if (!row) return undefined;
  const u = row.videoUrl?.trim();
  if (u) return u;
  const raw = row.raw;
  if (raw && typeof raw === 'object') {
    const r = raw as Record<string, unknown>;
    for (const k of ['video_url', 'videoUrl', 'download_url', 'downloadUrl']) {
      const v = r[k];
      if (typeof v === 'string' && /^https?:\/\//i.test(v.trim())) return v.trim();
    }
    const tr = r.task_result;
    if (tr && typeof tr === 'object') {
      const t = tr as Record<string, unknown>;
      const vu = t.video_url ?? t.videoUrl ?? t.url;
      if (typeof vu === 'string' && vu.trim()) return vu.trim();
    }
  }
  return undefined;
}

export interface KlingTaskStatusResponse {
  phase: KlingPollPhase;
  row?: KlingVideoListRow;
  error?: string;
}

export async function getKlingTaskStatus(taskId: string): Promise<KlingTaskStatusResponse> {
  const id = encodeURIComponent(taskId);
  return apiGet<KlingTaskStatusResponse>(`/api/video/kling/task/${id}`);
}

/** 与 clipai.ingarena.net 视频列表同源（同一 KLING_API_KEY） */
export interface KlingRecentListResponse {
  items: KlingVideoListRow[];
  klingAvailable: boolean;
}

export async function getKlingRecentList(page = 1, pageSize = 20): Promise<KlingRecentListResponse> {
  return apiGet<KlingRecentListResponse>(`/api/video/kling/recent-list?page=${page}&pageSize=${pageSize}`);
}

export async function generateMultishot(req: MultishotGenerateRequest): Promise<MultishotGenerateResponse> {
  const shots = req.shots.map((s, i) => ({
    index: i,
    durationSeconds: Math.max(5, Math.min(8, s.durationSeconds || 5)),
    prompt: s.prompt.trim(),
    imageBase64: s.imageBase64,
  }));
  const body: Record<string, unknown> = {
    shots,
    aspectRatio: req.aspectRatio ?? '16:9',
  };
  if (req.materials?.length) body.materials = req.materials;
  if (req.driveToken) body.driveToken = req.driveToken;
  if (req.model) body.model = req.model;
  return apiPost<MultishotGenerateResponse>('/api/video/generate-multishot', body);
}
