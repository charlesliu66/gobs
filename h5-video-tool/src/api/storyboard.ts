import { apiPost } from './client';

export interface GenerateFramesRequest {
  prompt: string;
  aspectRatio?: string;
}

export interface GenerateFramesResponse {
  firstFrame: string;
  lastFrame: string;
}

/** 根据单镜描述生成首帧+尾帧图（Compass Imagen），用于预览镜头质感 */
export async function generateFrames(req: GenerateFramesRequest): Promise<GenerateFramesResponse> {
  return apiPost<GenerateFramesResponse>('/api/storyboard/frames', {
    prompt: req.prompt.trim(),
    aspectRatio: req.aspectRatio ?? '16:9',
  });
}
