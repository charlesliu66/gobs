import { apiGet, apiPost } from './client';
import type { AspectRatioPreset, TimelineProject } from '../editor/types/timeline';

const BASE = import.meta.env.VITE_API_BASE_URL || '';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('gobs_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function handleUnauthorized(res: Response): void {
  if (res.status === 401) {
    localStorage.removeItem('gobs_token');
    localStorage.removeItem('gobs_user');
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
  }
}

export interface EditorAssetDto {
  id: string;
  url: string;
  kind: 'video';
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

export async function uploadEditorAsset(file: File): Promise<{ asset: EditorAssetDto }> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('originalName', file.name);
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
 */
export async function applyEditorAgentStream(
  body: ApplyEditorAgentBody,
  onProgress: (p: EditorAgentJobProgress) => void,
): Promise<ApplyEditorAgentResponse> {
  const res = await fetch(`${BASE}/api/editor/agent/apply-stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(body),
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
export async function chatEditorAgent(userMessage: string): Promise<{ reply: string }> {
  return apiPost<{ reply: string }>('/api/editor/agent/chat', { userMessage });
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
}

export interface GenerateEditorMusicResponse {
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
