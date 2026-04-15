/**
 * Suno API（sunoapi.org 第三方网关）文生器乐。
 * - 每次请求返回 2 首 MP3（异步任务，轮询直到 SUCCESS）。
 * - 配额耗尽（HTTP body code=429）抛出 SunoQuotaExhaustedError，由路由层决定是否 fallback。
 * - API 文档：https://docs.sunoapi.org/
 */
import axios, { isAxiosError } from 'axios';

const SUNO_BASE =
  (process.env.SUNO_API_BASE_URL?.trim() || 'https://api.sunoapi.org').replace(/\/$/, '');

const DEFAULT_MODEL = process.env.SUNO_MODEL?.trim() || 'V4_5ALL';

/** 两次轮询之间的间隔（毫秒） */
const POLL_INTERVAL_MS = 6_000;
/** 最长等待时间（毫秒）：3.5 分钟，略高于 Suno 官方"2-3 分钟"承诺 */
const MAX_WAIT_MS = 210_000;

// ---------- 错误类型 ----------

export class SunoQuotaExhaustedError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'SunoQuotaExhaustedError';
  }
}

export class SunoSensitiveWordError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'SunoSensitiveWordError';
  }
}

// ---------- 接口定义 ----------

export interface SunoGenerateOptions {
  /** 英文描述性 prompt（customMode=false 时上限 500 字符） */
  prompt: string;
  /** 风格标签（customMode=true 时必填，如 "Cinematic Orchestral"） */
  style?: string;
  /** 曲目标题（customMode=true 时必填） */
  title?: string;
  /** 是否纯器乐（默认 true） */
  instrumental?: boolean;
  /** 排除的风格，如 "Vocal, Rap" */
  negativeTags?: string;
  model?: string;
}

export interface SunoMusicResult {
  /** MP3 二进制 */
  buffer: Buffer;
  /** 实际时长（秒），来自 Suno API 元数据 */
  duration: number;
  /** 曲目标题 */
  title: string;
}

// ---------- 辅助函数 ----------

function getApiKey(): string {
  const key = process.env.SUNO_API_KEY?.trim();
  if (!key) throw new Error('SUNO_API_KEY 未配置，无法调用 Suno API');
  return key;
}

function normalizeSunoError(code: number, msg: string): never {
  if (code === 429) throw new SunoQuotaExhaustedError(`Suno 账号额度不足（429）：${msg}`);
  if (code === 401) throw new SunoQuotaExhaustedError(`Suno API Key 无效（401）：${msg}`);
  throw new Error(`Suno 请求失败（code=${code}）：${msg}`);
}

// ---------- 提交生成任务 ----------

async function submitTask(options: SunoGenerateOptions): Promise<string> {
  const apiKey = getApiKey();
  const model = options.model ?? DEFAULT_MODEL;

  // customMode=true 时 style/title 必填；false 时只需 prompt（简单模式）
  const useCustom = !!(options.style || options.title);

  const body: Record<string, unknown> = {
    customMode: useCustom,
    instrumental: options.instrumental ?? true,
    model,
  };

  if (useCustom) {
    body.style = options.style || 'Cinematic Orchestral';
    body.title = options.title || 'AI Generated Music';
    if (!(options.instrumental ?? true)) {
      body.prompt = options.prompt.slice(0, 3000);
    }
  } else {
    body.prompt = options.prompt.slice(0, 500);
  }

  if (options.negativeTags) body.negativeTags = options.negativeTags;

  const resp = await axios.post<{
    code: number;
    msg: string;
    data: { taskId: string };
  }>(`${SUNO_BASE}/api/v1/generate`, body, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    timeout: 30_000,
  });

  const { code, msg, data } = resp.data;
  if (code !== 200) normalizeSunoError(code, msg);
  return data.taskId;
}

// ---------- 轮询任务状态 ----------

type SunoStatus =
  | 'PENDING'
  | 'TEXT_SUCCESS'
  | 'FIRST_SUCCESS'
  | 'SUCCESS'
  | 'CREATE_TASK_FAILED'
  | 'GENERATE_AUDIO_FAILED'
  | 'CALLBACK_EXCEPTION'
  | 'SENSITIVE_WORD_ERROR';

interface SunoRecordData {
  taskId: string;
  status: SunoStatus;
  errorCode?: number;
  errorMessage?: string;
  response?: {
    sunoData?: Array<{
      id: string;
      audioUrl: string;
      duration: number;
      title: string;
    }>;
  };
}

async function pollUntilDone(
  taskId: string,
): Promise<Array<{ audioUrl: string; duration: number; title: string }>> {
  const apiKey = getApiKey();
  const deadline = Date.now() + MAX_WAIT_MS;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    const resp = await axios.get<{
      code: number;
      msg: string;
      data: SunoRecordData;
    }>(`${SUNO_BASE}/api/v1/generate/record-info`, {
      params: { taskId },
      headers: { Authorization: `Bearer ${apiKey}` },
      timeout: 20_000,
    });

    if (resp.data.code !== 200) {
      normalizeSunoError(resp.data.code, resp.data.msg);
    }

    const { status, errorMessage, response } = resp.data.data;

    if (status === 'SUCCESS' && response?.sunoData?.length) {
      return response.sunoData.map((d) => ({
        audioUrl: d.audioUrl,
        duration: d.duration,
        title: d.title,
      }));
    }

    if (status === 'SENSITIVE_WORD_ERROR') {
      throw new SunoSensitiveWordError(
        'Suno 提示词包含敏感词，请修改后重试',
      );
    }

    if (status === 'CREATE_TASK_FAILED' || status === 'GENERATE_AUDIO_FAILED') {
      throw new Error(`Suno 生成失败（${status}）：${errorMessage || '未知原因'}`);
    }

    // PENDING / TEXT_SUCCESS / FIRST_SUCCESS → 继续等待
  }

  throw new Error('Suno 生成超时（等待超过 3.5 分钟），请稍后重试');
}

// ---------- 下载 MP3 ----------

async function downloadMp3(url: string): Promise<Buffer> {
  const resp = await axios.get<ArrayBuffer>(url, {
    responseType: 'arraybuffer',
    timeout: 90_000,
  });
  return Buffer.from(resp.data);
}

// ---------- 公开 API ----------

/**
 * 调用 Suno 生成器乐，返回 MP3 二进制数组（每次固定返回 2 首）。
 *
 * @throws {SunoQuotaExhaustedError} 额度不足或 Key 无效
 * @throws {SunoSensitiveWordError} 提示词含敏感词
 * @throws {Error} 其他生成/网络错误
 */
export async function generateSunoMusic(
  options: SunoGenerateOptions,
): Promise<SunoMusicResult[]> {
  const taskId = await submitTask(options);
  console.log(`[sunoMusic] 任务已提交 taskId=${taskId}，开始轮询…`);

  const tracks = await pollUntilDone(taskId);
  console.log(`[sunoMusic] taskId=${taskId} 完成，${tracks.length} 首曲目，开始下载…`);

  const results: SunoMusicResult[] = [];
  for (const track of tracks) {
    try {
      const buffer = await downloadMp3(track.audioUrl);
      results.push({ buffer, duration: track.duration, title: track.title });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[sunoMusic] 下载 ${track.audioUrl} 失败：${msg}`);
      // 跳过下载失败的单首，不中止整批
    }
  }

  if (results.length === 0) {
    throw new Error('Suno 返回的音频均下载失败');
  }

  return results;
}

/** Suno API Key 是否已配置 */
export function isSunoConfigured(): boolean {
  return !!process.env.SUNO_API_KEY?.trim();
}

/** 是否属于"配额/认证"类错误（应 fallback 到 Lyria） */
export function isSunoFallbackError(err: unknown): boolean {
  if (err instanceof SunoSensitiveWordError) return false; // 内容问题，不 fallback
  return true; // 其他所有 Suno 错误均 fallback
}
