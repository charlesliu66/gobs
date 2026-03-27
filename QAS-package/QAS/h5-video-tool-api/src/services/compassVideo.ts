/**
 * Compass 视频生成 API 集成（Veo / Vertex AI 风格）
 * 文档: Compass Gemini API proxy - Video Generation 章节
 *
 * 使用 Compass 代理的 Google Veo API（与 Python SDK 一致）：
 * - 创建: POST publishers/google/models/{model}:predictLongRunning
 * - 轮询: GET {operation_name}（operations.get，与 client.operations.get 对应）
 * - 视频结果: operation.response.generated_videos[0].video.uri
 */
import axios, { AxiosInstance } from 'axios';

const BASE_URL =
  process.env.COMPASS_API_URL?.trim() || 'https://compass.llm.shopee.io/compass-api/v1';
const API_KEY = process.env.COMPASS_API_KEY?.trim();

/** Veo 模型：veo-2.0-generate-001 | veo-3.0-generate-001 | veo-3.1-generate-001 等 */
const DEFAULT_MODEL = process.env.COMPASS_VIDEO_MODEL?.trim() || 'veo-2.0-generate-001';

export interface CompassGenerateOptions {
  prompt: string;
  imageUrls?: string[];
  duration?: number;
  aspectRatio?: string;
  /** Veo 模型名，如 veo-2.0-generate-001 */
  model?: string;
}

export interface CompassTaskResult {
  taskId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  error?: string;
}

function createClient(): AxiosInstance {
  if (!API_KEY) {
    throw new Error('COMPASS_API_KEY 未配置，请在 .env 中设置');
  }
  return axios.create({
    baseURL: BASE_URL,
    timeout: 180000,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
  });
}

/** 将 aspect_ratio 映射为 Vertex AI 参数 */
function toAspectRatio(aspectRatio?: string): string {
  const map: Record<string, string> = {
    '16:9': '16:9',
    '9:16': '9:16',
    '1:1': '1:1',
    '4:3': '4:3',
    '3:4': '3:4',
  };
  return map[aspectRatio ?? ''] ?? '16:9';
}

/**
 * 创建 Veo 视频生成任务（Vertex AI predictLongRunning）
 */
export async function createVideoTask(
  options: CompassGenerateOptions
): Promise<{ taskId: string; model: string }> {
  const client = createClient();
  const model = options.model ?? DEFAULT_MODEL;
  const aspectRatio = toAspectRatio(options.aspectRatio);
  const durationSeconds = Math.min(8, Math.max(1, options.duration ?? 5)); // Veo 默认 8 秒

  const instances: Record<string, unknown>[] = [{ prompt: options.prompt.trim() }];
  if (options.imageUrls?.length) {
    // 首图作为 image 参考（需 base64 或 URL）
    const img = options.imageUrls[0];
    instances[0].image = img.startsWith('data:')
      ? {
          bytesBase64Encoded: img.replace(/^data:image\/\w+;base64,/, ''),
          mimeType: 'image/png',
        }
      : { gcsUri: img, mimeType: 'image/png' };
  }

  const body = {
    instances,
    parameters: {
      aspectRatio,
      durationSeconds,
      generateAudio: false,
    },
  };

  const predictPath = `publishers/google/models/${model}:predictLongRunning`;
  console.log('[compassVideo] Veo create', { model, prompt: options.prompt.slice(0, 50) });
  const { data } = await client.post(predictPath, body);

  // 返回完整 operation name（用于 operations.get 轮询，与 Python SDK 一致）
  const opName = data.name ?? data.operationName ?? data.operation?.name;
  if (!opName) {
    throw new Error('Compass Veo API 未返回 operation name');
  }

  const taskId = String(opName);
  return { taskId, model };
}

/**
 * 轮询 Veo 任务直到完成
 * 使用 fetchPredictOperation（与 Compass 文档一致），operationName 传完整路径
 */
export async function waitForVideo(
  taskId: string,
  options: { pollIntervalMs?: number; maxWaitMs?: number; model?: string } = {}
): Promise<CompassTaskResult> {
  const { pollIntervalMs = 15000, maxWaitMs = 300000, model: modelOpt } = options;
  const model = modelOpt ?? DEFAULT_MODEL;
  const client = createClient();
  const fetchPath = `publishers/google/models/${model}:fetchPredictOperation`;

  const start = Date.now();
  const result: CompassTaskResult = { taskId, status: 'processing' };

  // 首次轮询前等待（与 Python SDK time.sleep(15) 一致）
  await new Promise((r) => setTimeout(r, 15000));

  while (Date.now() - start < maxWaitMs) {
    try {
      // operationName: 完整路径或 UUID（Compass 文档示例为 UUID，但完整路径也可能支持）
      const operationName =
        String(taskId).includes('/operations/') ? taskId : String(taskId).split('/operations/').pop() ?? taskId;
      const { data } = await client.post(fetchPath, { operationName });
      const done = data.done === true;
      const err = data.error ?? data.status;

      if (done && err) {
        result.status = 'failed';
        result.error = typeof err === 'object' ? (err.message ?? JSON.stringify(err)) : String(err);
        throw new Error(result.error || '视频生成失败');
      }

      if (done && (data.response ?? data.result)) {
        const resp = data.response ?? data.result;
        const videos = resp?.generatedVideos ?? resp?.generated_videos;
        const video = videos?.[0]?.video ?? videos?.[0];

        if (!video) {
          result.status = 'failed';
          result.error = 'API 未返回视频';
          throw new Error(result.error);
        }

        const uri = video.uri ?? video.gcsUri;
        if (!uri) {
          result.status = 'failed';
          result.error = '视频无可用 URI';
          throw new Error(result.error);
        }

        // 将视频 URL 转为 base64 data URL（前端可直接播放）
        try {
          const videoRes = await axios.get(uri, { responseType: 'arraybuffer', timeout: 60000 });
          const buf = Buffer.from(videoRes.data);
          result.videoUrl = `data:video/mp4;base64,${buf.toString('base64')}`;
          result.status = 'completed';
          return result;
        } catch (e) {
          console.error('[compassVideo] 下载视频失败', e);
          result.videoUrl = uri;
          result.status = 'completed';
          return result;
        }
      }
    } catch (e: unknown) {
      const axErr = e as { response?: { status: number; data?: unknown } };
      if (axErr?.response?.status === 500) {
        console.error('[compassVideo] fetchPredictOperation 500:', JSON.stringify(axErr.response?.data));
      }
      throw e;
    }

    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }

  throw new Error('视频生成超时');
}

/**
 * 查询任务状态（兼容旧接口，Veo 场景下由 waitForVideo 内部轮询）
 */
export async function getTaskStatus(taskId: string): Promise<CompassTaskResult> {
  return { taskId, status: 'processing' };
}
