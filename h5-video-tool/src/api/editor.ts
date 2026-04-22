import { apiGet, apiPost, redirectToLogin } from './client';
import type { EditorProjectMemory, EditorUserCommunicationProfile } from '../editor/types/agentMemory';
import type { AspectRatioPreset, MediaAsset, TimelineProject } from '../editor/types/timeline';
import { generateUUID } from '../utils/uuid';

const BASE = import.meta.env.VITE_API_BASE_URL || '';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('gobs_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function handleUnauthorized(res: Response): void {
  if (res.status === 401) {
    redirectToLogin();
  }
}

export interface EditorAssetDto {
  id: string;
  url: string;
  kind: 'video' | 'image';
  originalName: string;
  mime?: string;
  size?: number;
  createdAt?: string;
  durationSec?: number;
  meta?: Record<string, unknown>;
}

export async function listEditorAssets(): Promise<{ assets: EditorAssetDto[] }> {
  return apiGet<{ assets: EditorAssetDto[] }>('/api/editor/assets');
}

export async function deleteEditorAsset(id: string): Promise<void> {
  const res = await fetch(`${BASE}/api/editor/assets/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  handleUnauthorized(res);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error || res.statusText);
  }
}

export async function getEditorUploadConfig(): Promise<{ maxMb: number; maxBytes: number }> {
  const res = await fetch(`${BASE}/api/editor/upload-config`, {
    headers: getAuthHeaders(),
  });
  handleUnauthorized(res);
  if (!res.ok) {
    const mb = 2048;
    return { maxMb: mb, maxBytes: mb * 1024 * 1024 };
  }
  return res.json() as Promise<{ maxMb: number; maxBytes: number }>;
}

export async function uploadEditorAsset(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<{ asset: EditorAssetDto }> {
  // 前置单文件上限校验，失败给出含 MB 的可读提示（优于服务端 413 默默失败）
  try {
    const cfg = await getEditorUploadConfig();
    if (file.size > cfg.maxBytes) {
      const fileMb = (file.size / 1024 / 1024).toFixed(1);
      throw new Error(
        `文件 ${fileMb} MB 超过单文件上限 ${cfg.maxMb} MB，请裁剪或提高 EDITOR_UPLOAD_MAX_MB 后重试。`,
      );
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes('超过单文件上限')) throw e;
  }

  const fd = new FormData();
  fd.append('file', file);
  fd.append('originalName', file.name);

  // 若提供进度回调，改用 XHR 以获取 upload progress 事件
  if (onProgress) {
    const token = localStorage.getItem('gobs_token');
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${BASE}/api/editor/assets/upload`);
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.timeout = 600_000; // 10 分钟
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      });
      xhr.addEventListener('load', () => {
        if (xhr.status === 401) {
          redirectToLogin();
          reject(new Error('登录已过期，请重新登录'));
          return;
        }
        if (xhr.status < 200 || xhr.status >= 300) {
          let errMsg = xhr.statusText;
          try {
            const body = JSON.parse(xhr.responseText) as { error?: string };
            if (body.error) errMsg = body.error;
          } catch { /* ignore */ }
          reject(new Error(errMsg));
          return;
        }
        try {
          resolve(JSON.parse(xhr.responseText) as { asset: EditorAssetDto });
        } catch {
          reject(new Error('响应解析失败'));
        }
      });
      xhr.addEventListener('error', () => {
        reject(new Error('上传请求未到达 API（网络中断/CORS/网关限制）。若上传大文件，请检查 Nginx 的 client_max_body_size 是否已放宽。'));
      });
      xhr.addEventListener('timeout', () => {
        reject(new Error('上传超时（>10分钟），请检查网络或文件大小'));
      });
      xhr.send(fd);
    });
  }

  let res: Response;
  try {
    res = await fetch(`${BASE}/api/editor/assets/upload`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: fd,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/Failed to fetch|NetworkError|network/i.test(msg)) {
      throw new Error(
        '上传请求未到达 API（网络中断/CORS/网关限制）。若上传大文件，请检查 Nginx 的 client_max_body_size 是否已放宽。',
      );
    }
    throw e;
  }
  handleUnauthorized(res);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error || res.statusText);
  }
  return res.json() as Promise<{ asset: EditorAssetDto }>;
}

export interface EditorProjectRecord {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  aspectRatio: AspectRatioPreset;
  project: TimelineProject;
  assets: Record<string, MediaAsset>;
  memory: EditorProjectMemory;
}

export async function listEditorProjects(): Promise<{ projects: Array<Pick<EditorProjectRecord, 'id' | 'name' | 'createdAt' | 'updatedAt' | 'aspectRatio'> & { sourceProductionProjectId?: string }> }> {
  return apiGet('/api/editor/projects');
}

export async function loadEditorProject(id: string): Promise<EditorProjectRecord> {
  const out = await apiGet<{ success: boolean; data: EditorProjectRecord }>(`/api/editor/projects/${encodeURIComponent(id)}`);
  return out.data;
}

export async function saveEditorProject(input: {
  id?: string;
  name?: string;
  aspectRatio: AspectRatioPreset;
  project: TimelineProject;
  assets: Record<string, MediaAsset>;
  memory?: EditorProjectMemory;
}): Promise<EditorProjectRecord> {
  const out = await apiPost<{ success: boolean; data: EditorProjectRecord }>('/api/editor/projects', input);
  return out.data;
}

export async function renameEditorProject(id: string, name: string): Promise<void> {
  const res = await fetch(`${BASE}/api/editor/projects/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  handleUnauthorized(res);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error || res.statusText);
  }
}

export async function deleteEditorProject(id: string): Promise<void> {
  const res = await fetch(`${BASE}/api/editor/projects/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  handleUnauthorized(res);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error || res.statusText);
  }
}

// ─── 增量同步：制片 → 剪辑 ─────────────────────────────────────

export interface SyncDiffItem {
  shotIndex: number;
  currentVersionId: string | null;
  latestVersionId: string;
  latestVideoUrl: string;
  latestDurationSec: number;
  hasUpdate: boolean;
}

export interface SyncProductionResponse {
  success: boolean;
  productionTitle: string;
  diffs: SyncDiffItem[];
}

export async function syncProductionCheck(editorProjectId: string): Promise<SyncProductionResponse> {
  return apiPost<SyncProductionResponse>(
    `/api/editor/projects/${encodeURIComponent(editorProjectId)}/sync-production`,
    {},
  );
}

export interface ApplySyncReplacement {
  shotIndex: number;
  newVersionId: string;
}

export async function applySyncReplacements(
  editorProjectId: string,
  replacements: ApplySyncReplacement[],
): Promise<EditorProjectRecord> {
  const res = await fetch(`${BASE}/api/editor/projects/${encodeURIComponent(editorProjectId)}/apply-sync`, {
    method: 'PATCH',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ replacements }),
  });
  handleUnauthorized(res);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error || res.statusText);
  }
  const out = await res.json() as { success: boolean; data: EditorProjectRecord };
  return out.data;
}

// ─── 导出 ─────────────────────────────────────────────────────

export interface EditorExportStartResponse {
  jobId: string;
  message?: string;
}

export interface EditorExportStatusResponse {
  id: string;
  status: 'queued' | 'processing' | 'done' | 'error';
  progress: number;
  progressMsg?: string;
  downloadUrl: string | null;
  error: string | null;
  mock?: boolean;
}

export async function startEditorExport(body: {
  project: TimelineProject;
  assets?: Record<string, MediaAsset>;
  aspectRatio?: AspectRatioPreset;
  resolution?: string;
  format?: string;
  quality?: string;
}): Promise<EditorExportStartResponse> {
  return apiPost<EditorExportStartResponse>('/api/editor/export', body);
}

export async function getEditorExportStatus(jobId: string): Promise<EditorExportStatusResponse> {
  return apiGet<EditorExportStatusResponse>(`/api/editor/export/${encodeURIComponent(jobId)}`);
}

export interface ExportFileRecord {
  filename: string;
  size: number;
  sizeLabel: string;
  createdAt: number;
  downloadUrl: string;
}

export async function listExportFiles(): Promise<{ files: ExportFileRecord[] }> {
  return apiGet<{ files: ExportFileRecord[] }>('/api/editor/export/files');
}

export async function deleteExportFile(filename: string): Promise<void> {
  const res = await fetch(`${BASE}/api/editor/export/files/${encodeURIComponent(filename)}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  handleUnauthorized(res);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error || res.statusText);
  }
}

/** 与后端一致：先缩窗再抽帧（仅 vision / hybrid 生效） */
export type EditorVisionFocus =
  | { kind: 'manual'; centerSec: number; windowSec?: number }
  | { kind: 'audio'; windowSec?: number };

export interface ApplyEditorAgentBody {
  userMessage: string;
  aspectRatio: AspectRatioPreset;
  selectedAssetIds: string[];
  assets: Array<{ id: string; originalName: string; durationSec: number }>;
  currentProject: TimelineProject;
  projectMemory?: EditorProjectMemory;
  visionFocus?: EditorVisionFocus;
}

/** 与后端 Compass OpenAI 兼容 usage 一致；网关未透传时可能缺省 */
export interface CompassChatUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

export interface LlmUsageCallRecord {
  stage: string;
  usage?: CompassChatUsage;
}

export interface ApplyEditorAgentResponse {
  summary: string;
  project: TimelineProject;
  projectMemory?: EditorProjectMemory;
  userCommunicationProfile?: EditorUserCommunicationProfile;
  /** 单次「智能剪辑」请求内各阶段 LLM 用量；totals 为合计 */
  llmUsage?: {
    byCall: LlmUsageCallRecord[];
    totals: CompassChatUsage;
  };
}

export async function applyEditorAgent(body: ApplyEditorAgentBody): Promise<ApplyEditorAgentResponse> {
  return apiPost<ApplyEditorAgentResponse>('/api/editor/agent/apply', body);
}

/** 剪辑任务 SSE 进度（与后端 EditorAgentProgressPayload 一致） */
export type EditorAgentJobProgress = {
  stage: string;
  percent: number;
  message: string;
  /** 粗估剩余秒数（启发式，非承诺） */
  etaSec?: number;
};

/**
 * 剪辑任务流式接口：推送进度事件，结束时返回与 apply 相同结构。
 * 第三个参数 signal 支持 AbortController 取消——中断后 fetch 会抛 AbortError，
 * 调用方可据此展示"已取消"而不是"失败"。
 */
export async function applyEditorAgentStream(
  body: ApplyEditorAgentBody,
  onProgress: (p: EditorAgentJobProgress) => void,
  signal?: AbortSignal,
): Promise<ApplyEditorAgentResponse> {
  const res = await fetch(`${BASE}/api/editor/agent/apply-stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(body),
    signal,
  });
  handleUnauthorized(res);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error || res.statusText);
  }
  if (!res.body) {
    throw new Error('服务端未返回流式正文');
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finalResult: ApplyEditorAgentResponse | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split('\n\n');
    buffer = chunks.pop() ?? '';
    for (const rawBlock of chunks) {
      const block = rawBlock.trim();
      if (!block) continue;
      const dataLine = block
        .split('\n')
        .map((l) => l.trim())
        .find((l) => l.startsWith('data:'));
      if (!dataLine) continue;
      const jsonStr = dataLine.startsWith('data:') ? dataLine.slice(5).trim() : dataLine;
      let payload: {
        type?: string;
        stage?: string;
        percent?: number;
        message?: string;
        etaSec?: number;
        summary?: string;
        project?: TimelineProject;
        projectMemory?: EditorProjectMemory;
        userCommunicationProfile?: EditorUserCommunicationProfile;
        llmUsage?: ApplyEditorAgentResponse['llmUsage'];
        error?: string;
      };
      try {
        payload = JSON.parse(jsonStr) as typeof payload;
      } catch {
        continue;
      }
      if (payload.type === 'progress' && payload.percent != null && payload.message) {
        onProgress({
          stage: payload.stage ?? 'progress',
          percent: payload.percent,
          message: payload.message,
          etaSec: payload.etaSec,
        });
      }
      if (payload.type === 'done' && payload.project) {
        finalResult = {
          summary: payload.summary ?? '',
          project: payload.project,
          projectMemory: payload.projectMemory,
          userCommunicationProfile: payload.userCommunicationProfile,
          llmUsage: payload.llmUsage,
        };
      }
      if (payload.type === 'error') {
        throw new Error(payload.error || '剪辑任务失败');
      }
    }
  }

  if (!finalResult) {
    throw new Error('流已结束但未收到剪辑结果，请重试');
  }
  return finalResult;
}

/** 先判定「闲聊」还是「剪辑任务」 */
export type RouteEditorAgentResponse = { intent: 'edit' } | { intent: 'chat' };

export async function routeEditorAgentMessage(userMessage: string): Promise<RouteEditorAgentResponse> {
  return apiPost<RouteEditorAgentResponse>('/api/editor/agent/route', { userMessage });
}

/** 独立对话：大模型闲聊（需在 route 为 chat 后调用） */
export async function chatEditorAgent(
  userMessage: string,
  projectMemory?: EditorProjectMemory,
): Promise<{
  reply: string;
  projectMemory?: EditorProjectMemory;
  userCommunicationProfile?: EditorUserCommunicationProfile;
}> {
  return apiPost<{
    reply: string;
    projectMemory?: EditorProjectMemory;
    userCommunicationProfile?: EditorUserCommunicationProfile;
  }>('/api/editor/agent/chat', { userMessage, projectMemory });
}

// ---------------------------------------------------------------------------
// 分片上传（Chunked Upload）— 适用于 >20MB 的大文件
// ---------------------------------------------------------------------------

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB per chunk

async function uploadChunkOnce(
  uploadId: string,
  chunkIndex: number,
  totalChunks: number,
  chunk: Blob,
): Promise<void> {
  const fd = new FormData();
  fd.append('uploadId', uploadId);
  fd.append('chunkIndex', String(chunkIndex));
  fd.append('totalChunks', String(totalChunks));
  fd.append('chunk', chunk);
  const token = localStorage.getItem('gobs_token');
  const res = await fetch(`${BASE}/api/editor/assets/upload-chunk`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
}

/**
 * 分片上传 with 指数退避重试。大文件上传容易被网络抖动打断，
 * 一片挂就全链路失败不友好。重试 2 次（总共 3 次尝试）。
 */
async function uploadChunk(
  uploadId: string,
  chunkIndex: number,
  totalChunks: number,
  chunk: Blob,
): Promise<void> {
  const maxRetries = 2;
  let lastErr: unknown = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      await uploadChunkOnce(uploadId, chunkIndex, totalChunks, chunk);
      return;
    } catch (e) {
      lastErr = e;
      if (attempt === maxRetries) break;
      await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt)));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

async function assembleChunks(
  uploadId: string,
  originalName: string,
  expectedTotalSize: number,
): Promise<{ asset: EditorAssetDto }> {
  const token = localStorage.getItem('gobs_token');
  const res = await fetch(`${BASE}/api/editor/assets/upload-assemble`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ uploadId, originalName, expectedTotalSize }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<{ asset: EditorAssetDto }>;
}

/** 分片上传（并发池 3），大文件上传整体时长由串行 N 片缩短为 ceil(N/3) 倍时间 */
export async function uploadEditorAssetChunked(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<{ asset: EditorAssetDto }> {
  const uploadId = generateUUID();
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

  // 前置大小校验：超出单文件上限直接抛友好错误，避免分片全传完后才被服务端拒绝
  try {
    const cfg = await getEditorUploadConfig();
    if (file.size > cfg.maxBytes) {
      const fileMb = (file.size / 1024 / 1024).toFixed(1);
      throw new Error(
        `文件 ${fileMb} MB 超过单文件上限 ${cfg.maxMb} MB，请裁剪或提高 EDITOR_UPLOAD_MAX_MB 后重试。`,
      );
    }
  } catch (e) {
    // 仅当真正抛出"超出上限"文案时才阻断，其它探测失败不影响继续
    if (e instanceof Error && e.message.includes('超过单文件上限')) throw e;
  }

  const CONCURRENCY = 3;
  let nextIndex = 0;
  let done = 0;
  const updateProgress = () => {
    onProgress?.(Math.min(90, Math.round((done / totalChunks) * 90)));
  };

  async function worker(): Promise<void> {
    while (true) {
      const i = nextIndex;
      if (i >= totalChunks) return;
      nextIndex += 1;
      const chunk = file.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      await uploadChunk(uploadId, i, totalChunks, chunk);
      done += 1;
      updateProgress();
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, totalChunks) }, () => worker()),
  );

  const result = await assembleChunks(uploadId, file.name, file.size);
  onProgress?.(100);
  return result;
}

export interface AnalyzeEditorVideoBody {
  assetId: string;
  durationSec: number;
  /** 与后端 EDITOR_ANALYSIS_MODE 一致时可覆盖单次请求 */
  mode?: 'off' | 'audio' | 'vision' | 'hybrid';
  userIntent?: string;
  targetTimelineSec?: number;
  visionFocus?: EditorVisionFocus;
}

export interface AnalyzeEditorVideoResponse {
  assetId: string;
  mode: string;
  targetTimelineSec: number;
  candidateWindows: Array<{
    id: string;
    assetId: string;
    sourceStart: number;
    sourceEnd: number;
  }>;
  candidateCount: number;
}

/** 仅分析候选段（不调用剪辑 LLM），用于调试或预检耗时 */
export async function analyzeEditorVideo(body: AnalyzeEditorVideoBody): Promise<AnalyzeEditorVideoResponse> {
  return apiPost<AnalyzeEditorVideoResponse>('/api/editor/analyze/video', body);
}

export interface GenerateEditorMusicBody {
  prompt: string;
  negativePrompt?: string;
  sampleCount?: number;
  /** Suno customMode 风格标签，如 "Cinematic Orchestral"（可选） */
  style?: string;
  /** Suno customMode 曲目标题（可选） */
  title?: string;
  /** 显式指定引擎：auto(默认) | suno | lyria */
  provider?: 'auto' | 'suno' | 'lyria';
}

export interface GenerateEditorMusicResponse {
  /** 实际使用的引擎：'suno' | 'lyria' */
  provider: 'suno' | 'lyria';
  model: string;
  clipDurationSec: number;
  instrumentalOnly: boolean;
  items: Array<{
    id: string;
    url: string;
    durationSec: number;
    mime: string;
  }>;
}

export async function generateEditorMusic(body: GenerateEditorMusicBody): Promise<GenerateEditorMusicResponse> {
  return apiPost<GenerateEditorMusicResponse>('/api/editor/music/generate', body);
}

/** 一键将模糊描述润色为 Lyria 英文 prompt（依赖 Compass Gemini） */
export async function polishEditorMusicPrompt(raw: string): Promise<{ prompt: string; negativePrompt: string }> {
  return apiPost<{ prompt: string; negativePrompt: string }>('/api/editor/music/polish-prompt', { raw });
}
