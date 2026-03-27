import { apiGet, apiPost } from './client';

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
}

export interface VeoModelsResponse {
  models: string[];
}

export async function getVeoModels(): Promise<string[]> {
  try {
    const res = await apiGet<VeoModelsResponse>('/api/video/models');
    return res?.models?.length ? res.models : ['veo-2.0-generate-001'];
  } catch {
    return ['veo-2.0-generate-001'];
  }
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
}

export interface MultishotGenerateResponse {
  status: 'completed';
  videoUrl: string;
  outputPath?: string;
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
  return apiPost<MultishotGenerateResponse>('/api/video/generate-multishot', body);
}
