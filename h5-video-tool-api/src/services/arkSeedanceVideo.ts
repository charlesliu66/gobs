const DEFAULT_ARK_BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3';
const DEFAULT_ARK_MODEL = 'doubao-seedance-2-0-260128';
const DEFAULT_ARK_FAST_MODEL = 'doubao-seedance-2-0-fast-260128';
const DEFAULT_ARK_MAX_CONCURRENT = 3;

export type ArkSeedanceErrorCode =
  | 'ARK_AUTH_INVALID'
  | 'ARK_CONTENT_POLICY'
  | 'ARK_COPYRIGHT_RISK'
  | 'ARK_INPUT_INVALID'
  | 'ARK_ASSET_UNAVAILABLE'
  | 'ARK_RATE_LIMIT'
  | 'ARK_TIMEOUT'
  | 'ARK_TASK_FAILED';

export interface ArkSeedanceDisplayError {
  errorCode: ArkSeedanceErrorCode;
  displayMessageZh: string;
  displayMessageEn: string;
  providerMessage: string;
}

export interface ArkSeedanceCreatePayload {
  model: string;
  content: Array<Record<string, unknown>>;
  ratio: string;
  duration: number;
  watermark: boolean;
  generate_audio?: boolean;
}

export interface ArkSeedanceNormalizedTask {
  submitId: string;
  phase: 'querying' | 'success' | 'failed';
  providerStatus: string;
  videoUrl?: string;
  errorCode?: ArkSeedanceErrorCode;
  displayMessageZh?: string;
  displayMessageEn?: string;
  providerMessage?: string;
}

export interface ArkSeedanceSubmitParams {
  storyboardText?: string;
  prompt?: string;
  aspectRatio?: string;
  duration?: number;
  model: string;
  imageBase64?: string;
  imageMimeType?: string;
  multimodalImages?: Array<{ base64: string; mimeType?: string }>;
  multimodalVideos?: Array<{ base64: string; mimeType?: string }>;
  multimodalAudios?: Array<{ base64: string; mimeType?: string }>;
  dreaminaModelVersion?: string;
}

interface ArkSeedanceTaskResponse {
  id?: string;
  status?: string;
  content?: {
    video_url?: string;
    last_frame_url?: string;
  };
  error?: {
    code?: string;
    message?: string;
  } | null;
}

function stripDataPrefix(value: string, prefixPattern: RegExp): string {
  return value.replace(prefixPattern, '').trim();
}

function toDataUrl(base64: string, mimeType: string): string {
  const raw = stripDataPrefix(base64, /^data:[^;]+;base64,/i);
  return `data:${mimeType};base64,${raw}`;
}

function normalizeAspectRatio(aspectRatio?: string): string {
  const trimmed = aspectRatio?.trim();
  if (trimmed === '9:16' || trimmed === '1:1' || trimmed === '16:9') return trimmed;
  return '16:9';
}

function normalizeDuration(duration?: number): number {
  if (!Number.isFinite(duration)) return 5;
  return Math.min(15, Math.max(4, Math.round(duration ?? 5)));
}

function isFastModelName(value?: string | null): boolean {
  return /seedance.*fast/i.test(value ?? '');
}

export function isArkSeedanceEnabled(): boolean {
  const raw = process.env.ARK_API_KEY?.trim();
  return !!raw;
}

export function resolveArkBaseUrl(): string {
  return process.env.ARK_BASE_URL?.trim() || DEFAULT_ARK_BASE_URL;
}

export function resolveArkApiKey(): string {
  const raw = process.env.ARK_API_KEY?.trim();
  if (!raw) {
    throw new Error('ARK_API_KEY is not configured');
  }
  return raw;
}

export function getArkSeedanceMaxConcurrent(): number {
  const raw = Number.parseInt(process.env.ARK_SEEDANCE_MAX_CONCURRENT ?? `${DEFAULT_ARK_MAX_CONCURRENT}`, 10);
  return Number.isFinite(raw) && raw >= 1 ? raw : DEFAULT_ARK_MAX_CONCURRENT;
}

export function resolveArkProviderModel(params: {
  requestedModel: string;
  requestedModelVersion?: string;
}): string {
  const explicitVersion = params.requestedModelVersion?.trim();
  if (explicitVersion) {
    if (/doubao-seedance-2-0-fast-260128/i.test(explicitVersion)) return explicitVersion;
    if (/doubao-seedance-2-0-260128/i.test(explicitVersion)) return explicitVersion;
    if (/doubao-seedance-2\.0-fast/i.test(explicitVersion)) return DEFAULT_ARK_FAST_MODEL;
    if (/doubao-seedance-2\.0/i.test(explicitVersion)) return DEFAULT_ARK_MODEL;
    if (/seedance2\.0fast/i.test(explicitVersion)) return DEFAULT_ARK_FAST_MODEL;
    if (/seedance2\.0/i.test(explicitVersion)) return DEFAULT_ARK_MODEL;
  }

  if (params.requestedModel === 'dreamina-multimodal') {
    return process.env.ARK_SEEDANCE_DEFAULT_MODEL?.trim() || DEFAULT_ARK_MODEL;
  }

  if (isFastModelName(process.env.ARK_SEEDANCE_USE_FAST?.trim())) {
    return process.env.ARK_SEEDANCE_FAST_MODEL?.trim() || DEFAULT_ARK_FAST_MODEL;
  }

  return process.env.ARK_SEEDANCE_DEFAULT_MODEL?.trim() || DEFAULT_ARK_MODEL;
}

export function buildArkSeedanceCreatePayload(input: {
  providerModel: string;
  submitParams: ArkSeedanceSubmitParams;
}): ArkSeedanceCreatePayload {
  const prompt = input.submitParams.storyboardText?.trim() || input.submitParams.prompt?.trim() || '';
  if (!prompt) {
    throw new Error('Prompt is required for Ark Seedance task creation');
  }

  const content: Array<Record<string, unknown>> = [{ type: 'text', text: prompt }];
  const requestedModel = input.submitParams.model.trim().toLowerCase();

  if (requestedModel === 'dreamina-image2video') {
    if (!input.submitParams.imageBase64?.trim()) {
      throw new Error('Image-to-video requires a reference image');
    }
    content.push({
      type: 'image_url',
      image_url: {
        url: toDataUrl(
          input.submitParams.imageBase64,
          input.submitParams.imageMimeType?.trim() || 'image/png',
        ),
      },
      role: 'first_frame',
    });
  }

  if (requestedModel === 'dreamina-multimodal') {
    for (const image of input.submitParams.multimodalImages ?? []) {
      content.push({
        type: 'image_url',
        image_url: {
          url: toDataUrl(image.base64, image.mimeType?.trim() || 'image/png'),
        },
        role: 'reference_image',
      });
    }
    for (const video of input.submitParams.multimodalVideos ?? []) {
      content.push({
        type: 'video_url',
        video_url: {
          url: toDataUrl(video.base64, video.mimeType?.trim() || 'video/mp4'),
        },
        role: 'reference_video',
      });
    }
    for (const audio of input.submitParams.multimodalAudios ?? []) {
      content.push({
        type: 'audio_url',
        audio_url: {
          url: toDataUrl(audio.base64, audio.mimeType?.trim() || 'audio/mpeg'),
        },
        role: 'reference_audio',
      });
    }
  }

  const payload: ArkSeedanceCreatePayload = {
    model: input.providerModel,
    content,
    ratio: normalizeAspectRatio(input.submitParams.aspectRatio),
    duration: normalizeDuration(input.submitParams.duration),
    watermark: true,
  };

  if (requestedModel === 'dreamina-multimodal') {
    payload.generate_audio = true;
  }

  return payload;
}

export function classifyArkSeedanceError(error?: { code?: string; message?: string } | null): ArkSeedanceDisplayError {
  const providerMessage = error?.message?.trim() || error?.code?.trim() || 'Ark Seedance task failed.';
  const lower = providerMessage.toLowerCase();
  const code = error?.code?.toLowerCase() || '';

  if (/unauthorized|invalid api key|authentication/i.test(providerMessage) || code.includes('auth')) {
    return {
      errorCode: 'ARK_AUTH_INVALID',
      displayMessageZh: '方舟 API Key 无效或未配置，请检查服务端鉴权配置。',
      displayMessageEn: 'The Ark API key is invalid or missing. Check the server authentication setup.',
      providerMessage,
    };
  }
  if (/copyright|lyrics|brand|trademark|ip restriction|protected work/i.test(lower)) {
    return {
      errorCode: 'ARK_COPYRIGHT_RISK',
      displayMessageZh: '提示词可能涉及版权/IP限制，请改写品牌名、角色名、歌词或受保护作品描述后重试。',
      displayMessageEn: 'The prompt may hit copyright or IP restrictions. Rewrite brand names, character names, lyrics, or protected work descriptions and try again.',
      providerMessage,
    };
  }
  if (/policy|unsafe|content violation|moderation|risk|违规|审查/i.test(lower) || code.includes('policy')) {
    return {
      errorCode: 'ARK_CONTENT_POLICY',
      displayMessageZh: '请求内容触发了平台安全限制，请调整提示词或参考素材后重试。',
      displayMessageEn: 'The request hit platform safety restrictions. Adjust the prompt or reference assets and try again.',
      providerMessage,
    };
  }
  if (/invalid|bad request|unsupported|format|parameter|ratio|duration/i.test(lower) || code.includes('invalid')) {
    return {
      errorCode: 'ARK_INPUT_INVALID',
      displayMessageZh: '输入参数或素材格式不符合方舟要求，请检查提示词、比例、时长和参考素材。',
      displayMessageEn: 'The request parameters or asset format do not satisfy Ark requirements. Check the prompt, ratio, duration, and reference assets.',
      providerMessage,
    };
  }
  if (/unreachable|download|fetch|asset|url/i.test(lower)) {
    return {
      errorCode: 'ARK_ASSET_UNAVAILABLE',
      displayMessageZh: '参考素材地址不可访问或读取失败，请检查素材链接或重新上传后重试。',
      displayMessageEn: 'A reference asset could not be reached or read. Check the asset link or upload it again and retry.',
      providerMessage,
    };
  }
  if (/rate limit|too many requests|quota|429/i.test(lower)) {
    return {
      errorCode: 'ARK_RATE_LIMIT',
      displayMessageZh: '方舟当前限流或配额繁忙，请稍后重试。',
      displayMessageEn: 'Ark is currently rate-limited or busy on quota. Please try again later.',
      providerMessage,
    };
  }
  if (/timeout|expired/i.test(lower)) {
    return {
      errorCode: 'ARK_TIMEOUT',
      displayMessageZh: '方舟任务处理超时，请稍后重试。',
      displayMessageEn: 'The Ark task timed out. Please try again later.',
      providerMessage,
    };
  }

  return {
    errorCode: 'ARK_TASK_FAILED',
    displayMessageZh: '方舟视频生成失败，请稍后重试；如多次失败，请调整提示词或参考素材。',
    displayMessageEn: 'Ark video generation failed. Try again later; if it keeps failing, adjust the prompt or reference assets.',
    providerMessage,
  };
}

export function normalizeArkSeedanceTask(task: ArkSeedanceTaskResponse): ArkSeedanceNormalizedTask {
  const submitId = String(task.id ?? '').trim();
  const providerStatus = String(task.status ?? 'unknown').trim().toLowerCase();

  if (providerStatus === 'succeeded') {
    return {
      submitId,
      phase: 'success',
      providerStatus,
      videoUrl: task.content?.video_url?.trim() || undefined,
    };
  }

  if (providerStatus === 'failed' || providerStatus === 'expired' || providerStatus === 'cancelled') {
    const classified = classifyArkSeedanceError(task.error);
    return {
      submitId,
      phase: 'failed',
      providerStatus,
      errorCode: classified.errorCode,
      displayMessageZh: classified.displayMessageZh,
      displayMessageEn: classified.displayMessageEn,
      providerMessage: classified.providerMessage,
    };
  }

  return {
    submitId,
    phase: 'querying',
    providerStatus,
  };
}

export function canRemoteCancelArkTask(providerStatus?: string | null): boolean {
  return providerStatus?.trim().toLowerCase() === 'queued';
}

async function parseJsonSafely(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text.trim()) return null;
  return JSON.parse(text) as unknown;
}

async function arkRequest(path: string, init?: RequestInit): Promise<Response> {
  const apiKey = resolveArkApiKey();
  const headers = new Headers(init?.headers ?? {});
  headers.set('Authorization', `Bearer ${apiKey}`);
  if (!headers.has('Content-Type') && init?.body) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(`${resolveArkBaseUrl()}${path}`, {
    ...init,
    headers,
  });
}

function toErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>;
    const error = record.error;
    if (error && typeof error === 'object') {
      const inner = error as Record<string, unknown>;
      if (typeof inner.message === 'string' && inner.message.trim()) return inner.message.trim();
      if (typeof inner.code === 'string' && inner.code.trim()) return inner.code.trim();
    }
    if (typeof record.message === 'string' && record.message.trim()) return record.message.trim();
  }
  return fallback;
}

export async function createArkSeedanceTask(payload: ArkSeedanceCreatePayload): Promise<{ id: string }> {
  const response = await arkRequest('/contents/generations/tasks', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const body = await parseJsonSafely(response);
  if (!response.ok) {
    throw new Error(toErrorMessage(body, `Ark create task failed with status ${response.status}`));
  }
  const data = body as { id?: string };
  if (!data?.id?.trim()) {
    throw new Error('Ark did not return a task id.');
  }
  return { id: data.id.trim() };
}

export async function getArkSeedanceTask(id: string): Promise<ArkSeedanceTaskResponse> {
  const response = await arkRequest(`/contents/generations/tasks/${encodeURIComponent(id)}`, {
    method: 'GET',
  });
  const body = await parseJsonSafely(response);
  if (!response.ok) {
    throw new Error(toErrorMessage(body, `Ark get task failed with status ${response.status}`));
  }
  return (body ?? {}) as ArkSeedanceTaskResponse;
}

export async function deleteArkSeedanceTask(id: string): Promise<void> {
  const response = await arkRequest(`/contents/generations/tasks/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (response.ok) return;
  const body = await parseJsonSafely(response);
  throw new Error(toErrorMessage(body, `Ark delete task failed with status ${response.status}`));
}

export async function downloadArkVideoAsDataUrl(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download Ark video result: ${response.status}`);
  }
  const contentType = response.headers.get('content-type')?.trim() || 'video/mp4';
  const buffer = Buffer.from(await response.arrayBuffer());
  return `data:${contentType};base64,${buffer.toString('base64')}`;
}
