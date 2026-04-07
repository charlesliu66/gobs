import { apiPost } from './client';

export interface GenerateFramesRequest {
  prompt: string;
  aspectRatio?: string;
  /** 0=首镜生成首尾帧；>0 为后续镜（首帧沿用上一镜尾帧 + 生成中间帧与尾帧） */
  shotIndex?: number;
  /** 非首镜必填：上一镜的尾帧 data URL */
  previousLastFrame?: string;
  /** 非首镜必填：首镜首帧 data URL，用于画风锁定 */
  styleReferenceFrame?: string;
  /** 立项「全片画风」参考图 data URL；存在时优先于 styleReferenceFrame 作为多模态画风基准 */
  globalStyleReferenceFrame?: string;
}

export type GenerateFramesMode = 'first_shot' | 'continuation';

export interface GenerateFramesResponse {
  mode?: GenerateFramesMode;
  firstFrame: string;
  lastFrame: string;
  /** 非首镜：中间帧 */
  middleFrame?: string;
  imagenModelFirst?: string | null;
  imagenModelMiddle?: string | null;
  imagenModelLast?: string | null;
}

/** 根据单镜描述生成分镜预览帧（首镜：首尾；后续：沿用首镜画风与上一镜尾帧） */
export async function generateFrames(req: GenerateFramesRequest): Promise<GenerateFramesResponse> {
  return apiPost<GenerateFramesResponse>('/api/storyboard/frames', {
    prompt: req.prompt.trim(),
    aspectRatio: req.aspectRatio ?? '16:9',
    shotIndex: req.shotIndex ?? 0,
    ...(req.previousLastFrame ? { previousLastFrame: req.previousLastFrame } : {}),
    ...(req.styleReferenceFrame ? { styleReferenceFrame: req.styleReferenceFrame } : {}),
    ...(req.globalStyleReferenceFrame
      ? { globalStyleReferenceFrame: req.globalStyleReferenceFrame }
      : {}),
  });
}

const BASE = import.meta.env.VITE_API_BASE_URL || '';

export interface GenerateCharacterPortraitRequest {
  prompt: string;
  aspectRatio?: string;
  /** 参考图 data URL，启用参考生图 */
  referenceImage?: string;
  /** 立项全片画风参考 data URL，多模态锁定（与分镜一致） */
  globalStyleReferenceFrame?: string;
  /** 可选：覆盖服务端 Compass Key（仅本请求） */
  compassApiKey?: string;
}

/** 角色肖像单张（Compass Imagen，服务端 /api/storyboard/portrait） */
export async function generateCharacterPortrait(
  req: GenerateCharacterPortraitRequest,
): Promise<{ imageDataUrl: string; model?: string | null }> {
  const res = await fetch(`${BASE}/api/storyboard/portrait`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: req.prompt.trim(),
      aspectRatio: req.aspectRatio ?? '9:16',
      ...(req.referenceImage ? { referenceImage: req.referenceImage } : {}),
      ...(req.globalStyleReferenceFrame
        ? { globalStyleReferenceFrame: req.globalStyleReferenceFrame }
        : {}),
      ...(req.compassApiKey?.trim() ? { compassApiKey: req.compassApiKey.trim() } : {}),
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error || res.statusText);
  }
  return res.json() as Promise<{ imageDataUrl: string; model?: string | null }>;
}
