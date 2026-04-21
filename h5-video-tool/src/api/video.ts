import { apiGet, apiPost } from './client';

/** 可灵模型 id（与后端 isKlingModel 一致） */
export function isKlingModelId(model?: string | null): boolean {
  if (!model?.trim()) return false;
  const m = model.trim().toLowerCase();
  return m.startsWith('kling') || m.includes('kling-v') || m.startsWith('kling/') || m.startsWith('kling-video');
}

/** 即梦「全能参考」dreamina-multimodal */
export function isDreaminaMultimodalModelId(model?: string | null): boolean {
  return model?.trim().toLowerCase() === 'dreamina-multimodal';
}

/** 即梦任一模型（含全能参考 / 文生 / 图生） */
export function isDreaminaModelId(model?: string | null): boolean {
  const m = model?.trim().toLowerCase() ?? '';
  return m === 'dreamina-multimodal' || m === 'dreamina-text2video' || m === 'dreamina-image2video';
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
  /** 即梦全能参考：与 storyboardText 同为 prompt；@图片1 对应 multimodalImages[0] 等 */
  multimodalImages?: { base64: string; mimeType?: string }[];
  multimodalVideos?: { base64: string; mimeType?: string }[];
  multimodalAudios?: { base64: string; mimeType?: string }[];
  /** 即梦 CLI `--model-version`（如 seedance2.0、seedance2.0fast）；空则读服务端 DREAMINA_*_MODEL */
  dreaminaModelVersion?: string;
  /** 即梦全能参考：后端自动将自由文本重写为结构化 prompt（默认 true） */
  autoComposePrompt?: boolean;
  /** 即梦全能参考：主角/场景参考图索引提示（按 @图片n 的 n-1） */
  dreaminaPromptHints?: {
    roleImageIndex?: number;
    sceneImageIndex?: number;
    roleName?: string;
    sceneName?: string;
  };
  /** 来源标记：production 源在后端提交后立即释放信号量 slot */
  source?: 'production' | 'quickfilm';
  /** 高级制片项目 id；用于孤儿 submitId 恢复时重建 batch-job */
  projectId?: string;
  /** 0-based 分镜序号；孤儿恢复时回写到对应 shot */
  shotIndex?: number;
  /** 分镜描述文案，仅用于 batch-job 展示 */
  shotDescription?: string;
}

export interface VeoModelsResponse {
  models: string[];
  /** ingarena 网关时，可灵单段可走异步创建 + video-list 轮询 */
  klingAsync?: boolean;
  /** 即梦：可走 POST /dreamina/submit + 轮询，排队中可继续提交新任务 */
  dreaminaAsync?: boolean;
}

export async function getVeoModels(): Promise<VeoModelsResponse> {
  try {
    const res = await apiGet<VeoModelsResponse>('/api/video/models');
    if (res?.models?.length) return res;
  } catch {
    /* ignore */
  }
  return { models: ['veo-2.0-generate-001'], klingAsync: false, dreaminaAsync: false };
}

export interface VideoGenerateResponse {
  taskId: string;
  status: 'pending' | 'completed';
  videoUrl?: string;
  /** 服务器本地路径（如 output/xxx.mp4），推送到 GeeLark 时优先使用，避免 base64 传输 */
  videoPath?: string;
  estimatedTime?: number;
}

export async function generateVideo(req: VideoGenerateRequest): Promise<VideoGenerateResponse> {
  return apiPost<VideoGenerateResponse>('/api/video/generate', req);
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
  status: 'pending' | 'completed';
  jobId?: string;
  videoUrl?: string;
  outputPath?: string;
}

export interface MultishotJobStatusResponse {
  jobId: string;
  status: 'pending' | 'running' | 'done' | 'error';
  shots: Array<{
    index: number;
    status: 'pending' | 'running' | 'done' | 'error';
    promptSnippet: string;
    durationSeconds: number;
    videoPath?: string;
    error?: string;
  }>;
  finalVideoPath?: string;
  error?: string;
  progress?: {
    total: number;
    done: number;
    failed: number;
    running: number;
    pending: number;
  };
  updatedAt?: string;
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
  errorCode?: string;
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

/** 即梦：仅提交任务，立即返回 submitId（与 POST /generate 同 body） */
export async function submitDreaminaAsync(
  req: VideoGenerateRequest,
): Promise<{ submitId: string; taskId: string; status: 'pending' }> {
  return apiPost('/api/video/dreamina/submit', req);
}

export interface DreaminaAuthStatus {
  loggedIn: boolean;
  username?: string;
  error?: string;
}

export async function checkDreaminaAuthStatus(): Promise<DreaminaAuthStatus> {
  return apiGet<DreaminaAuthStatus>('/api/video/dreamina/auth-status');
}

export interface DreaminaTaskPollResponse {
  taskId: string;
  submitId: string;
  status: 'pending' | 'completed' | 'failed';
  phase?: string;
  genStatus?: string;
  queueInfo?: {
    queue_idx?: number;
    queue_length?: number;
    queue_status?: string;
    priority?: number;
  };
  failReason?: string;
  videoUrl?: string;
  videoPath?: string;
  errorCode?: string;
}

/** 轮询即梦任务：排队中返回 queueInfo；完成返回 videoUrl */
export async function getDreaminaTaskStatus(submitId: string): Promise<DreaminaTaskPollResponse> {
  const id = encodeURIComponent(submitId);
  return apiGet<DreaminaTaskPollResponse>(`/api/video/dreamina/task/${id}`);
}

/** 服务端 output 目录近期视频（即梦等落盘），path 为相对 api data 根目录，用于 /api/video/file?path= */
export interface OutputRecentVideoItem {
  path: string;
  mtimeMs: number;
  size: number;
}

export interface OutputRecentVideosResponse {
  items: OutputRecentVideoItem[];
  syncedDreaminaCount?: number;
}

export async function getOutputRecentVideos(opts?: {
  limit?: number;
  dreaminaOnly?: boolean;
}): Promise<OutputRecentVideosResponse> {
  const q = new URLSearchParams();
  if (opts?.limit) q.set('limit', String(opts.limit));
  if (opts?.dreaminaOnly) q.set('dreaminaOnly', '1');
  const qs = q.toString();
  return apiGet<OutputRecentVideosResponse>(`/api/video/output-recent${qs ? `?${qs}` : ''}`);
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

export async function getMultishotJobStatus(jobId: string): Promise<MultishotJobStatusResponse> {
  return apiGet<MultishotJobStatusResponse>(`/api/video/multishot-job/${encodeURIComponent(jobId)}`);
}
