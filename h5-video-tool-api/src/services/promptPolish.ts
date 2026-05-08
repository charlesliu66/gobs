/**
 * 基于模糊视频创意 prompt，用 LLM 优化为 VEO 可用的视频描述，
 * 并提取适合 Google Drive 文件名搜索的关键词（中英双语）。
 * 通过 Compass Gemini 代理（OpenAI 兼容 chat/completions），密钥优先 COMPASS_API_KEY（KEY2 常为 Veo 专用）；
 * 可选 GEMINI_PROXY 为 axios 配置 HTTPS 代理（与 Veo 等同机内网场景一致）。
 *
 * 支持模板（templateId）：viral-dance 动作迁移、boss-showcase 角色展示。
 */
import axios, { isAxiosError } from 'axios';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { randomUUID } from 'crypto';
import { spawn } from 'child_process';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { getApiDataDir, getDefaultVideoOutputDir } from '../config/apiDataDir.js';
import { getTemplate } from '../config/prompt-templates/index.js';
import { resolveCompassApiKeyForGeminiChat } from './compassApiKey.js';
import { recordKeyUsage } from './keyUsageStats.js';
import { sanitizeUsername } from '../utils/safeUsername.js';
import { bufferFromVideoUrlPayload } from './videoUtils.js';
import { ffprobeDurationSeconds, getFfmpegPath } from './video/ffmpegPaths.js';

/** VEO 通用规则（Subject + Action 结构，单场景、具体描述） */
const VEO_BASE_RULES = `
## VEO 通用规则（必须遵循）
- **结构**：Subject（主体）+ Action（动作）+ 场景 + 镜头 + 光线 + 风格。主体要具体（如「经验丰富的浪人」而非「男人」）
- **单场景**：一次只讲一个场景，避免 A 然后 B 然后 C 的连续事件
- **语言**：清晰具体，避免模糊。对话用冒号不用引号
- **风格**：Cinematic、8K、电影感、3D 渲染、逆光、剪影等
- **安全**：禁止真人、换脸、血腥、断肢、色情、政治、具体品牌/IP、明星姓名
- **高危词替换**：斩杀→挥刀收势；怪物→神秘对手/身影；格斗→身形交错、刀光剑影
`;

/** single-shot：输出单段英文 prompt，8 秒，直接用于 VEO */
const VEO_SINGLE_SHOT_SYSTEM = `你是视频创作助手，将用户创意优化为 **Google VEO text-to-video** 可直接使用的单段英文 prompt。

${VEO_BASE_RULES}

## 输出要求（single-shot）
- **语言**：输出语言必须与用户输入一致。用户用中文输入则 polishedPrompt 为中文；用英文则英文。默认中文。
- polishedPrompt 必须是**单段**，50–150 词，描述一个 8 秒内的完整场景
- 时长固定 8 秒（VEO 支持 5–8 秒）
- 不要分镜格式、不要时间码、不要多镜头
- 示例（中文）：经验丰富的浪人武士在黄昏的竹林间奔跑，电影感光线，尘埃粒子，慢速跟拍，3D 渲染，8K。
- 示例（英文）：A samurai in dark armor runs through a bamboo forest at dusk, cinematic lighting, dust particles in the air, slow camera follow, 3D rendered, 8K.

## searchKeywords 与 folderHints
- searchKeywords：中英双语，如 ["浪人","ronin","竹林","bamboo"]
- folderHints：["Scenario","Character","Weapon","Effect"] 中选

## 输出格式（严格 JSON）
{"polishedPrompt":"单段英文...","searchKeywords":["..."],"folderHints":["Scenario","Character"]}`;

/** Viral 舞蹈：可灵 Omni（image_list + video_list），单段 prompt 与 @图片1/@图片2 对齐 */
const KLING_VIRAL_SINGLE_SHOT_SYSTEM = `你是视频创作助手，将用户创意优化为 **可灵 Kling Omni** 使用的单段 prompt（平台会单独传入参考图与参考视频，文案中用【TikTok视频】【图片1】【图片2】与多模态引用对应）。

## 输出要求（single-shot · Kling Omni）
- **语言**：与用户输入一致（中文优先）。
- polishedPrompt 为**单段**，完整一句或多句连贯描述，**不要**分镜、**不要**时间码。
- 必须体现：参考舞蹈/动作来源（写作「【TikTok视频】」或用户提供的视频指代）+ 角色（【图片1】）+ 场景（【图片2】）。
- 可补充：光线、镜头、画风、节奏（前 3 秒抓眼、竖屏舞蹈感）。

## searchKeywords 与 folderHints
- searchKeywords：中英双语，如 ["舞蹈","dance","角色","场景"]
- folderHints：["Scenario","Character"] 等

## 输出格式（严格 JSON）
{"polishedPrompt":"...","searchKeywords":["..."],"folderHints":["Scenario","Character"]}`;

/** multi-shot：直接输出 shots 数组，每镜为独立 VEO 可用的英文 prompt，平台自动填充 */
const VEO_MULTI_SHOT_SYSTEM = `你是视频创作助手，将用户创意拆解为**多镜头分镜**，每镜头输出为可直接用于 Google VEO 的英文 prompt。

${VEO_BASE_RULES}

## 输出要求（multi-shot）
- **语言**：输出语言必须与用户输入一致。用户用中文输入则 shots[].prompt 均为中文；用英文则英文。默认中文。
- **shots**：镜头数组，每镜含 duration（5–8 秒）和 prompt（单段，50–120 词，语言与用户输入一致）
- prompt 必须可直接用于 VEO：单场景、具体、含景别/运镜/光线/风格
- 镜头总时长等于模板指定时长（如 60 秒约 8–12 镜）
- 景别+运镜：特写、中景、全景、缓慢推进、固定低角、跟拍、航拍等
- 风格统一：Cinematic、8K、电影感、3D 渲染

## searchKeywords 与 folderHints
- searchKeywords：中英双语，如 ["浪人","ronin","竹林","bamboo"]
- folderHints：["Scenario","Character","Weapon","Effect"] 中选

## 输出格式（严格 JSON）
{"shots":[{"duration":6,"prompt":"A weathered ronin in dark armor stands silhouetted against..."},{"duration":7,"prompt":"Close-up of the ronin's hand gripping the katana..."}],"searchKeywords":["..."],"folderHints":["Scenario","Character"]}`;

/** 无模板时的兜底 system prompt（保留原 Seedance 风格，用于 style 模式） */
const FALLBACK_STYLE_SYSTEM = `你是视频创作助手，将用户创意优化为符合视频生成平台规则的分镜格式 prompt。

${VEO_BASE_RULES}

输出格式：分镜（时间码 + 景别 + 运镜），searchKeywords 中英双语，folderHints 可选。
{"polishedPrompt":"...","searchKeywords":["..."],"folderHints":["Scenario","Character"]}`;

export interface ShotItem {
  duration: number;
  prompt: string;
}

export interface PolishResult {
  polishedPrompt: string;
  searchKeywords: string[];
  folderHints?: string[];
  /** 传入 templateId 时返回模板的 duration、aspectRatio、pipelineMode */
  template?: { duration: number; aspectRatio: string; pipelineMode: string };
  /** 多镜模板时：LLM 直接生成的分镜数组，每镜含 duration 与 prompt */
  shots?: ShotItem[];
  /** 短剧/猫猫后宫模板时：剧本中的主要人物/角色名称，用于用户上传对应角色图 */
  characters?: string[];
}

const DEFAULT_COMPASS_API_URL = 'http://compass.llm.shopee.io/compass-api/v1';
/** Compass 上多数项目已开通；3.x Pro 常需单独白名单，勿作默认 */
const DEFAULT_COMPASS_GEMINI_MODEL = 'gemini-2.5-flash';

function getCompassLlmConfig() {
  const apiKey = resolveCompassApiKeyForGeminiChat();
  const baseURL = (process.env.COMPASS_API_URL?.trim() || DEFAULT_COMPASS_API_URL).replace(/\/$/, '');
  const model = process.env.COMPASS_GEMINI_MODEL?.trim() || DEFAULT_COMPASS_GEMINI_MODEL;
  return { apiKey, baseURL, model };
}

/** 与 Veo 等一致：可选 HTTP(S) 代理访问 Compass */
function createCompassHttpClient() {
  const proxyUrl = process.env.GEMINI_PROXY?.trim();
  const config: Parameters<typeof axios.create>[0] = {
    timeout: 120000,
    headers: { 'Content-Type': 'application/json' },
  };
  if (proxyUrl) {
    config.httpsAgent = new HttpsProxyAgent(proxyUrl);
    config.proxy = false;
  }
  return axios.create(config);
}

/** OpenAI 兼容：Compass 若返回则可用于计费观测 */
export interface CompassChatUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

async function postCompassChatCompletions(
  body: Record<string, unknown>,
  opts?: { timeout?: number; logLabel?: string },
): Promise<{ text: string; usage?: CompassChatUsage }> {
  const { apiKey, baseURL } = getCompassLlmConfig();
  const altKey = (process.env.COMPASS_API_KEY2?.trim() ?? '') || '';
  const client = createCompassHttpClient();
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    // P1-11：429 / 5xx 场景下，若尚未尝试 KEY2 且它与主 KEY 不同，则做一次 Key 轮换。
    const useKey = attempt > 1 && altKey && altKey !== apiKey ? altKey : apiKey;
    try {
      const { data } = await client.post<{
        choices?: Array<{ message?: { content?: string | null } }>;
        error?: { message?: string };
        usage?: CompassChatUsage;
      }>(`${baseURL}/chat/completions`, body, {
        headers: { Authorization: `Bearer ${useKey}` },
        timeout: opts?.timeout,
      });

      const errMsg = data.error?.message;
      if (errMsg) throw new Error(errMsg);

      const rawText = data.choices?.[0]?.message?.content?.trim() ?? '';
      if (!rawText) throw new Error('Compass Gemini 返回内容为空');
      const usage = data.usage;
      const label = opts?.logLabel ?? 'chat';
      if (process.env.EDITOR_LLM_LOG_USAGE === '1' || process.env.EDITOR_LLM_LOG_USAGE === 'true') {
        console.info(
          `[LLM usage] ${label}:`,
          usage ? JSON.stringify(usage) : '(response 无 usage 字段，可能为网关未透传)',
        );
      }
      await recordKeyUsage({
        success: true,
        promptTokens: usage?.prompt_tokens,
        completionTokens: usage?.completion_tokens,
        totalTokens: usage?.total_tokens,
      });
      return { text: rawText, usage };
    } catch (e) {
      const isLast = attempt === maxAttempts;
      let msg = 'Compass Gemini 请求失败';
      if (isAxiosError(e)) {
        msg =
          (e.response?.data as { error?: { message?: string } })?.error?.message ||
          (typeof e.response?.data === 'string' ? e.response.data : e.message) ||
          msg;
        const status = e.response?.status ?? 0;
        // 429 / 5xx 也视为可重试；保留原网络错误集合
        const transient =
          status === 429 ||
          (status >= 500 && status < 600) ||
          /ECONNRESET|timeout|socket hang up|network/i.test(msg);
        await recordKeyUsage({ success: false });
        if (!isLast && transient) {
          // P1-11：优先使用 Retry-After，其次指数退避（1s, 3s, 6s）
          const retryAfterSec = Number.parseFloat(String(e.response?.headers?.['retry-after'] ?? '0')) || 0;
          const backoffMs =
            retryAfterSec > 0
              ? Math.min(15_000, retryAfterSec * 1000)
              : Math.min(10_000, attempt * attempt * 1000);
          console.warn(
            `[Compass retry] ${opts?.logLabel ?? 'chat'} attempt ${attempt}/${maxAttempts} failed (status=${status || 'n/a'}): ${msg}; backoff=${backoffMs}ms`,
          );
          await new Promise((r) => setTimeout(r, backoffMs));
          continue;
        }
      } else if (e instanceof Error) {
        msg = e.message || msg;
        // "返回内容为空" 常见于 Gemini safety filter / finish_reason=length / 网关瞬时异常，
        // 视为可重试：下一次会自动走备用 KEY（见上方 useKey 选择），也给后端一次"空→非空"的机会。
        const emptyResponse = /返回内容为空|empty.*content|no content/i.test(msg);
        const transient = emptyResponse || /ECONNRESET|timeout|socket hang up|network/i.test(msg);
        await recordKeyUsage({ success: false });
        if (!isLast && transient) {
          console.warn(`[Compass retry] ${opts?.logLabel ?? 'chat'} attempt ${attempt}/${maxAttempts} failed: ${msg}`);
          await new Promise((r) => setTimeout(r, attempt * 1000));
          continue;
        }
      } else {
        await recordKeyUsage({ success: false });
      }
      // 网络层错误（连接失败/超时）：给出可操作的提示而不是抛出 "Network Error"
      const isNetworkLevelError = /network error|econnreset|enotfound|econnrefused|timeout|socket hang up/i.test(msg);
      throw new Error(
        isNetworkLevelError
          ? `AI 服务暂时不可达（已重试 ${maxAttempts} 次），请稍后重试。如持续出现，请检查服务器出网配置或 COMPASS_API_URL`
          : (typeof msg === 'string' && msg ? msg : 'Compass Gemini 请求失败'),
      );
    }
  }

  throw new Error('Compass Gemini 请求失败（已重试 3 次）');
}

/**
 * Compass OpenAI 兼容接口：POST {COMPASS_API_URL}/chat/completions，Authorization: Bearer
 */
export async function compassChatCompletion(options: {
  systemPrompt: string;
  userText: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  const { model } = getCompassLlmConfig();
  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: 'system', content: options.systemPrompt },
      { role: 'user', content: options.userText },
    ],
    temperature: options.temperature ?? 0.3,
  };
  if (options.maxTokens != null) body.max_tokens = options.maxTokens;
  const r = await postCompassChatCompletions(body, { logLabel: 'compassChatCompletion' });
  return r.text;
}

/** 同 compassChatCompletion，额外返回 usage（剪辑统计用） */
export async function compassChatCompletionWithUsage(options: {
  systemPrompt: string;
  userText: string;
  temperature?: number;
  maxTokens?: number;
  /** 约束模型输出格式，如 { type: 'json_object' } */
  responseFormat?: { type: string };
  /** 覆盖默认模型（不传则用 COMPASS_GEMINI_MODEL / gemini-2.5-flash） */
  model?: string;
}): Promise<{ text: string; usage?: CompassChatUsage }> {
  const { model: defaultModel } = getCompassLlmConfig();
  const body: Record<string, unknown> = {
    model: options.model || defaultModel,
    messages: [
      { role: 'system', content: options.systemPrompt },
      { role: 'user', content: options.userText },
    ],
    temperature: options.temperature ?? 0.3,
  };
  if (options.maxTokens != null) body.max_tokens = options.maxTokens;
  if (options.responseFormat) body.response_format = options.responseFormat;
  return postCompassChatCompletions(body, { logLabel: `compassChat[${options.model || defaultModel}]` });
}

/** OpenAI 兼容多模态：user 为 content 数组（text + image_url data URL） */
export async function compassChatCompletionWithContent(options: {
  systemPrompt: string;
  userContent: Array<
    | { type: 'text'; text: string }
    | { type: 'image_url'; image_url: { url: string } }
  >;
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  const r = await compassChatCompletionWithContentWithUsage(options);
  return r.text;
}

export async function compassChatCompletionWithContentWithUsage(options: {
  systemPrompt: string;
  userContent: Array<
    | { type: 'text'; text: string }
    | { type: 'image_url'; image_url: { url: string } }
  >;
  temperature?: number;
  maxTokens?: number;
}): Promise<{ text: string; usage?: CompassChatUsage }> {
  const { model } = getCompassLlmConfig();
  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: 'system', content: options.systemPrompt },
      { role: 'user', content: options.userContent },
    ],
    temperature: options.temperature ?? 0.25,
  };
  if (options.maxTokens != null) body.max_tokens = options.maxTokens;
  return postCompassChatCompletions(body, { timeout: 180_000, logLabel: 'compassChatCompletion.multimodal' });
}

const STYLE_HINTS: Record<string, string> = {
  viral: '按「社群Viral风」优化：短平快、吸睛、适合 TikTok/小红书，前 3 秒抓住注意力',
  formal: '按「正式宣传风」优化：节奏沉稳、品牌感',
  story: '按「剧情叙事风」优化：有起承转合、情绪递进',
};

function extractJson(s: string): string {
  const m = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (m) return m[1].trim();
  return s.trim();
}

function safeJsonParse<T>(raw: string): T | null {
  try {
    return JSON.parse(extractJson(raw)) as T;
  } catch {
    return null;
  }
}

export type PolishOptions = { styleId?: string; templateId?: string; multishot?: boolean; duration?: number; aspectRatio?: string };

export async function polishPrompt(
  rawPrompt: string,
  options?: PolishOptions | string
): Promise<PolishResult> {
  const opts = typeof options === 'string' ? { styleId: options } : options ?? {};
  const template = opts.templateId ? getTemplate(opts.templateId) : undefined;
  const useCustomMultishot = !template && opts.multishot === true;
  const targetDuration = opts.duration ?? 30;
  const targetAspectRatio = opts.aspectRatio ?? '16:9';

  const userText = rawPrompt.trim() || '请输入视频创意';

  let systemPrompt: string;
  if (template) {
    const base =
      template.id === 'viral-dance'
        ? KLING_VIRAL_SINGLE_SHOT_SYSTEM
        : template.outputMode === 'single-shot'
          ? VEO_SINGLE_SHOT_SYSTEM
          : VEO_MULTI_SHOT_SYSTEM;
    systemPrompt = `${base}\n\n## 模板专属要求\n${template.systemPromptSuffix}\n`;
  } else if (useCustomMultishot) {
    const styleHint = opts.styleId && STYLE_HINTS[opts.styleId]
      ? `\n## 风格要求\n${STYLE_HINTS[opts.styleId]}\n`
      : '';
    systemPrompt = `${VEO_MULTI_SHOT_SYSTEM}\n\n## 自定义多镜（仅导演知识，无模板约束）
- 镜头总时长 = ${targetDuration} 秒，比例 ${targetAspectRatio}
- 按用户创意拆解为多镜，每镜 5-8 秒，景别+运镜+光线+风格
${styleHint}`;
  } else {
    const styleHint = opts.styleId && STYLE_HINTS[opts.styleId]
      ? `\n## 风格要求\n${STYLE_HINTS[opts.styleId]}\n`
      : '';
    systemPrompt = FALLBACK_STYLE_SYSTEM + styleHint;
  }

  const rawText = await compassChatCompletion({
    systemPrompt,
    userText,
    temperature: 0.3,
  });

  const jsonStr = extractJson(rawText);
  try {
    const parsed = JSON.parse(jsonStr) as {
      polishedPrompt?: string;
      shots?: Array<{ duration?: number; prompt?: string }>;
      searchKeywords?: string[];
      folderHints?: string[];
      characters?: string[];
    };
    let polishedPrompt = typeof parsed.polishedPrompt === 'string' ? parsed.polishedPrompt : rawPrompt;
    polishedPrompt = polishedPrompt.replace(/\\n/g, '\n').trim();
    const searchKeywords = Array.isArray(parsed.searchKeywords)
      ? parsed.searchKeywords.filter((k): k is string => typeof k === 'string' && k.length > 0)
      : [];
    const folderHints = Array.isArray(parsed.folderHints)
      ? parsed.folderHints.filter((k): k is string =>
          typeof k === 'string' && /^(Scenario|Character|Weapon|Effect)$/i.test(k)
        )
      : undefined;

    const result: PolishResult = {
      polishedPrompt: polishedPrompt || rawPrompt,
      searchKeywords: searchKeywords.length > 0 ? searchKeywords : [rawPrompt],
      folderHints: folderHints?.length ? folderHints : undefined,
    };
    if (template) {
      result.template = {
        duration: template.duration,
        aspectRatio: template.aspectRatio,
        pipelineMode: template.pipelineMode,
      };
    } else if (useCustomMultishot) {
      result.template = {
        duration: targetDuration,
        aspectRatio: targetAspectRatio,
        pipelineMode: 'multishot',
      };
    }
    let characters = Array.isArray(parsed.characters)
      ? parsed.characters.filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
      : undefined;
    if (characters?.length) result.characters = characters;

    if ((template?.outputMode === 'multi-shot' || useCustomMultishot) && Array.isArray(parsed.shots) && parsed.shots.length > 0) {
      let normalized = parsed.shots
        .map((s) => ({
          duration: Math.min(8, Math.max(5, Number(s.duration) || 5)),
          prompt: (typeof s.prompt === 'string' ? s.prompt : '').replace(/\\n/g, '\n').trim(),
        }))
        .filter((s) => s.prompt.length > 0);
      // BOSS 展示：强制 3 镜 × 5s = 15s
      if (template?.id === 'boss-showcase') {
        if (normalized.length > 3) normalized = normalized.slice(0, 3);
        while (normalized.length < 3 && parsed.shots[normalized.length]) {
          const s = parsed.shots[normalized.length];
          const p = (typeof s.prompt === 'string' ? s.prompt : '').replace(/\\n/g, '\n').trim();
          if (p) normalized.push({ duration: 5, prompt: p });
        }
        normalized = normalized.map((s) => ({ ...s, duration: 5 })).slice(0, 3);
      }
      result.shots = normalized;
    }
    return result;
  } catch {
    const m = rawText.match(/"polishedPrompt"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    if (m) {
      const extracted = m[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
      const result: PolishResult = {
        polishedPrompt: extracted || rawPrompt,
        searchKeywords: [rawPrompt],
      };
      if (template) {
        result.template = {
          duration: template.duration,
          aspectRatio: template.aspectRatio,
          pipelineMode: template.pipelineMode,
        };
      }
      return result;
    }
    return {
      polishedPrompt: rawPrompt,
      searchKeywords: [rawPrompt],
      template: template
        ? { duration: template.duration, aspectRatio: template.aspectRatio, pipelineMode: template.pipelineMode }
        : undefined,
    };
  }
}

// ============ generateCaptionForPost ============
// 模式1：格子为空 → 基于 prompt 提炼适合平台的 description 和 hashtag
// 模式2：格子已有内容 → 基于平台规则（如 TikTok 传播性）优化用户已有文案

/** TikTok 易火公式（与 .cursor/skills/geelark-publish/reference/caption-formulas.md 对齐） */
const TIKTOK_RULES = `
【TikTok 必须遵守】
- **禁止**把用户的视频生成 prompt（分镜/英文技术描述/镜头参数）原样当文案；要提炼成**观众视角**的短句。
- **长度**：英文约 30–120 字符；中文约 15–45 字；可 2–4 行，用换行分段。
- **风格**：口语、有情绪、像真人发帖；可用 1–2 个 emoji；可适度用网络缩写（如 fr、ngl、POV）仅当语言为英文时。
- **钩子类型**（择一或混合）：悬念/互动提问（「谁懂」「你敢信吗」）/结果前置/情感共鸣。
- **hashtag**：共 6–12 个，空格分隔；至少 1 个泛流量（#fyp 或 #foryou 或 #viral）+ 2–4 个与内容相关的垂直标签（如 #gaming #anime）+ 可选 1 个长尾；**不要**堆砌无关标签。`;

const CAPTION_SYSTEM_PROMPT = `你是 TikTok 短视频文案专家。用户给的是**内部视频创意/prompt**（可能含分镜、英文技术描述），你要输出**可直接发布**的 TikTok 文案与标签。
${TIKTOK_RULES}
- **语言**：caption 与 hashtag 文案部分须符合指定语言（EN=英文、CN=中文简体、TH=泰语、ID=印尼语）；hashtag 可保留英文常见流量词（如 #fyp）。
输出格式（严格 JSON）：{"caption":"...","hashtags":"#fyp #tag2 ..."}`;

const PLATFORM_CAPTION_SYSTEM_PROMPT = `你是多平台短视频文案专家。输入是**视频创意 prompt**（可能冗长、技术性），你要为每个指定平台写**可直接发布**的文案，禁止照搬原文。
${TIKTOK_RULES}
- **instagram / reels**：前 1–2 行 Hook，接简短正文，可加一句 CTA；标签 5–10 个，含 #reels #viral 等大盘 + 垂直。
- **youtube / shorts**：caption 当作 Shorts 标题+首行描述，关键词靠前，8–18 个英文词为宜；标签含 #Shorts 与垂直词。
- **facebook**：偏故事感或提问，邀请互动；标签适中。
输出 JSON，key 为小写平台名：{"tiktok":{"caption":"...","hashtags":"..."},"instagram":{"caption":"...","hashtags":"..."}}`;

const PLATFORM_OPTIMIZE_SYSTEM_PROMPT = `你是多平台文案优化专家。用户已写草稿，请按各平台传播规律优化；若草稿是把技术 prompt 直接粘贴来的，请**改写成观众向口语**。
${TIKTOK_RULES}
- Instagram：强化 Hook + CTA；YouTube Shorts：标题感、关键词前置；Facebook：故事感。
输出 JSON：{"tiktok":{"caption":"...","hashtags":"..."},"instagram":{...}}`;

export interface CaptionResult {
  caption: string;
  hashtags: string;
}

export interface CaptionByPlatformResult {
  byPlatform: Record<string, CaptionResult>;
}

export type CaptionLanguage = 'EN' | 'CN' | 'TH' | 'ID';

export interface CaptionAccountContext {
  id?: string;
  username?: string;
  platform?: string;
  region?: string;
  remark?: string;
}

export interface CaptionCampaignContext {
  objective?: string;
  targetAudience?: string;
  callToAction?: string;
  targetMarket?: string;
  complianceNotes?: string;
  bannedPhrases?: string[];
}

interface CaptionCandidate {
  caption?: string;
  hashtags?: string;
  hookType?: string;
  confidence?: number;
}

interface CaptionVisionSummary {
  subject: string;
  action: string;
  vibe: string;
  standoutMoment: string;
  audienceAngle: string;
  contentTags: string[];
  styleTags: string[];
}

const NORMALIZED_PLATFORMS: Record<string, string> = {
  tiktok: 'tiktok',
  instagram: 'instagram',
  reels: 'instagram',
  youtube: 'youtube',
  shorts: 'youtube',
  facebook: 'facebook',
};

const DEFAULT_TIKTOK_HASHTAGS = ['#fyp', '#viral', '#tiktok', '#foryou'];

const TIKTOK_TRAFFIC_TAGS = ['#fyp', '#viral', '#foryou'];

const PROMPT_ARTIFACT_PATTERN =
  /\b(16:9|9:16|4k|8k|1080p|720p|cinematic|slow motion|camera|shot|lens|scene|lighting|render|vfx)\b/i;

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function stripPromptArtifacts(value: string): string {
  return normalizeWhitespace(
    value
      .replace(/\b\d{1,2}\s*s(ec(onds?)?)?\b/gi, ' ')
      .replace(/\b(16:9|9:16|4k|8k|1080p|720p)\b/gi, ' ')
      .replace(/\b(cinematic|slow motion|close[- ]up|wide shot|camera move|camera pan|camera zoom)\b/gi, ' ')
      .replace(/[|]+/g, ' ')
      .replace(/\s{2,}/g, ' '),
  );
}

function containsCjk(value: string): boolean {
  return /[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff]/u.test(value);
}

function containsLatin(value: string): boolean {
  return /[a-z]/i.test(value);
}

function countMatches(value: string, pattern: RegExp): number {
  const matches = value.match(pattern);
  return matches ? matches.length : 0;
}

const BLOCKED_PUBLISH_TOKEN_FRAGMENTS = [
  'output',
  'admin',
  'dreamina',
  'backend',
  'server',
  'api',
  'compass',
  'studio',
  'upload',
  'uploads',
  '服务端成片',
  '服务端',
  '管理员',
];

function compactPublishToken(value: string): string {
  return normalizeWhitespace(value)
    .replace(/^#+/, '')
    .replace(/[^\p{L}\p{N}]/gu, '')
    .toLowerCase();
}

function isBlockedPublishToken(value: string): boolean {
  const compact = compactPublishToken(value);
  if (!compact) return false;
  return BLOCKED_PUBLISH_TOKEN_FRAGMENTS.some((fragment) => compact.includes(fragment));
}

function stripBlockedPublishText(value: string): string {
  return normalizeWhitespace(
    value
      .replace(/\b[\w.-]+(?:[\\/][\w.-]+){1,}\b/g, ' ')
      .replace(/\b(?:output|admin|dreamina|backend|server|api|compass|studio|upload|uploads)\b/gi, ' ')
      .replace(/服务端成片|服务端|管理员/gu, ' '),
  );
}

function extractInlineHashtags(value: string): string[] {
  return value.match(/#[^\s#]+/g) ?? [];
}

function sanitizePromptIdeaText(value: string): string {
  return stripBlockedPublishText(stripPromptArtifacts(value.replace(/#[^\s#]+/g, ' ')));
}

function sanitizeHashtagDraft(value: string): string {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return '';
  const extracted =
    raw.match(/#[^\s#]+/g) ??
    raw
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean)
      .map((token) => (token.startsWith('#') ? token : `#${token}`));

  const cleaned = extracted.filter((token) => !isBlockedPublishToken(token)).join(' ');
  return cleaned ? normalizeHashtags(cleaned) : '';
}

function toHashtagToken(value: string): string | null {
  const raw = normalizeWhitespace(value).replace(/^#+/, '');
  if (!raw) return null;
  const compact = raw
    .replace(/['".,!?()[\]{}:;/\\]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .join('');
  const cleaned = compact.replace(/[^\p{L}\p{N}_]/gu, '');
  if (cleaned.length < 3) return null;
  if (/^[a-z]{1,3}$/i.test(cleaned)) return null;
  if (isBlockedPublishToken(cleaned)) return null;
  return `#${cleaned.slice(0, 24)}`;
}

function uniquePush(target: string[], seen: Set<string>, token: string | null | undefined): void {
  if (!token) return;
  const key = token.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  target.push(token);
}

export function normalizeHashtags(hashtags: string): string {
  const raw = typeof hashtags === 'string' ? hashtags.trim() : '';
  const extracted =
    raw.match(/#[^\s#]+/g) ??
    raw
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean)
      .map((token) => (token.startsWith('#') ? token : `#${token}`));

  const normalized: string[] = [];
  const seen = new Set<string>();

  for (const token of extracted) {
    const cleaned = `#${token.replace(/^#+/, '').replace(/[^\p{L}\p{N}_]/gu, '')}`.trim();
    if (cleaned.length <= 1) continue;
    const key = cleaned.toLowerCase();
    if (key === '#shorts') continue;
    if (isBlockedPublishToken(cleaned)) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(cleaned);
    if (normalized.length >= 6) break;
  }

  if (normalized.length === 0) {
    return DEFAULT_TIKTOK_HASHTAGS.join(' ');
  }

  return normalized.join(' ');
}

/** LLM 解析失败时：从 prompt 抽关键词做极简 TikTok 风，避免整段粘贴 */
export function buildFallbackFromPrompt(userText: string): CaptionResult {
  const t = sanitizePromptIdeaText((userText || '').trim());
  const baseWords = t.match(/[\u4e00-\u9fa5]{2,8}|[a-zA-Z]{3,12}/g)?.slice(0, 4) || [];
  const fallbackTopic = baseWords.slice(0, 2).join(' ') || 'this moment';
  return {
    caption: `Wait for it: ${fallbackTopic} hits way harder than you expect.`,
    hashtags: assembleTikTokHashtags({
      rawHashtags: ['#fyp', '#viral', ...baseWords.map((word) => `#${word}`)].join(' '),
      contentTags: baseWords,
    }),
  };
  if (!t) {
    return {
      caption: 'POV: this escalated fast and the ending lands hard 🔥',
      hashtags: DEFAULT_TIKTOK_HASHTAGS.join(' '),
    };
  }
  const stripTech = t
    .replace(/\b\d{1,2}s\b/gi, '')
    .replace(/\b(16:9|9:16|4k|720p|1080p)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  const words = stripTech.match(/[\u4e00-\u9fa5]{2,8}|[a-zA-Z]{3,12}/g)?.slice(0, 4) || [];
  const topic = words.slice(0, 2).join(' ') || 'this moment';
  const betterCaption = `POV: ${topic} and it gets better every second 🔥`;
  const betterTagBase = words
    .map((k) => '#' + k.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '').slice(0, 24))
    .filter((x) => x.length > 1)
    .slice(0, 4);
  const betterHashtags = normalizeHashtags(['#fyp', '#viral', ...betterTagBase].join(' '));
  return { caption: betterCaption, hashtags: betterHashtags };
}

export interface GenerateCaptionOptions {
  existingCaption?: string;
  existingHashtags?: string;
  language?: 'EN' | 'CN' | 'TH' | 'ID';
  campaignContext?: CaptionCampaignContext;
}

export function scoreCaptionQuality(caption: string, language: CaptionLanguage = 'EN'): number {
  const text = normalizeWhitespace(caption);
  if (!text) return 0;

  let score = 35;
  const lower = text.toLowerCase();
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const charCount = text.length;

  if (/^(wait for it|you need to see this|this part|the way|he|she|when|watch)/i.test(text)) score += 10;
  if (/[!?]/.test(text)) score += 4;
  if (/🔥|😮|😳|😭|💀|✨/.test(text)) score += 3;
  if (PROMPT_ARTIFACT_PATTERN.test(text)) score -= 18;
  if (/it gets better every second/i.test(lower)) score -= 28;
  if (/\bpov:\s*/i.test(lower) && containsCjk(text)) score -= 18;
  if (BLOCKED_PUBLISH_TOKEN_FRAGMENTS.some((fragment) => lower.includes(fragment))) score -= 40;

  if (language === 'EN') {
    if (containsCjk(text) && containsLatin(text)) score -= 18;
    if (!containsLatin(text)) score -= 16;
  }
  if (language === 'CN' && containsLatin(text) && containsCjk(text)) score -= 10;

  if (charCount < 18) score -= 8;
  if (charCount > 120) score -= 10;
  if (wordCount >= 4 && wordCount <= 14) score += 6;

  const keywordish = countMatches(lower, /\b[a-z]{3,}\b/g);
  if (wordCount >= 6 && keywordish === wordCount && !/[.!?]/.test(text)) score -= 12;

  return Math.max(0, Math.min(100, score));
}

export function isLowQualityCaption(caption: string, language: CaptionLanguage = 'EN'): boolean {
  return scoreCaptionQuality(caption, language) < 32;
}

export function assembleTikTokHashtags(input: {
  rawHashtags?: string;
  contentTags?: string[];
  styleTags?: string[];
}): string {
  const tags: string[] = [];
  const seen = new Set<string>();

  for (const traffic of TIKTOK_TRAFFIC_TAGS.slice(0, 2)) uniquePush(tags, seen, traffic);

  const rawTokens = normalizeHashtags(input.rawHashtags || '').split(/\s+/).filter(Boolean);
  for (const token of rawTokens) {
    if (tags.length >= 6) break;
    if (isBlockedPublishToken(token)) continue;
    if (/^#(?:fyp|viral|foryou|tiktok)$/i.test(token)) {
      uniquePush(tags, seen, token);
      continue;
    }
    if (/^#[a-z]{1,3}$/i.test(token)) continue;
    uniquePush(tags, seen, token);
  }

  for (const token of input.contentTags ?? []) {
    if (tags.length >= 6) break;
    uniquePush(tags, seen, toHashtagToken(token));
  }
  for (const token of input.styleTags ?? []) {
    if (tags.length >= 6) break;
    uniquePush(tags, seen, toHashtagToken(token));
  }

  return normalizeHashtags(tags.join(' '));
}

function sanitizeCaptionText(caption: string): string {
  return stripBlockedPublishText(
    caption
      .replace(/^["'“”]+|["'“”]+$/g, '')
      .replace(/^caption:\s*/i, '')
      .replace(/^copy:\s*/i, '')
      .replace(/\s*#[^\s#]+/g, ''),
  );
}

function sanitizeCampaignContextText(value: string): string {
  return normalizeWhitespace(stripBlockedPublishText(value.replace(/#[^\s#]+/g, ' ')));
}

function sanitizeCampaignPhraseList(values?: string[]): string[] {
  if (!values?.length) return [];
  const phrases: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const sanitized = sanitizeCampaignContextText(value);
    if (!sanitized || seen.has(sanitized)) continue;
    seen.add(sanitized);
    phrases.push(sanitized);
    if (phrases.length >= 6) break;
  }
  return phrases;
}

export function pickBestCaptionResult(
  candidates: Array<Partial<CaptionResult>>,
  fallback: CaptionResult,
  language: CaptionLanguage = 'EN',
  hashtagOptions?: { contentTags?: string[]; styleTags?: string[] },
): CaptionResult {
  const ranked = candidates
    .map((candidate) => {
      const rawCaption = typeof candidate.caption === 'string' ? candidate.caption : '';
      const caption = sanitizeCaptionText(rawCaption);
      const hashtags = [typeof candidate.hashtags === 'string' ? candidate.hashtags : '', ...extractInlineHashtags(rawCaption)]
        .filter(Boolean)
        .join(' ');
      return { caption, hashtags, quality: scoreCaptionQuality(caption, language) };
    })
    .sort((a, b) => b.quality - a.quality);

  const winner = ranked.find((item) => item.caption && !isLowQualityCaption(item.caption, language));
  if (!winner) {
    return {
      caption: sanitizeCaptionText(fallback.caption),
      hashtags: assembleTikTokHashtags({
        rawHashtags: fallback.hashtags,
        contentTags: hashtagOptions?.contentTags,
        styleTags: hashtagOptions?.styleTags,
      }),
    };
  }

  return {
    caption: winner.caption,
    hashtags: assembleTikTokHashtags({
      rawHashtags: winner.hashtags || fallback.hashtags,
      contentTags: hashtagOptions?.contentTags,
      styleTags: hashtagOptions?.styleTags,
    }),
  };
}

export interface GenerateCaptionOptions {
  videoPath?: string;
  videoUrl?: string;
  accountContext?: CaptionAccountContext[];
  campaignContext?: CaptionCampaignContext;
  requestUsername?: string;
}

function isWithinAllowedRoot(candidatePath: string, username?: string): boolean {
  const safeUser = sanitizeUsername(username || 'admin');
  const roots = [
    path.resolve(getDefaultVideoOutputDir(), safeUser),
    path.resolve(getDefaultVideoOutputDir(), 'batch-jobs', 'videos'),
    path.resolve(getDefaultVideoOutputDir(), 'production', 'projects', safeUser),
    path.resolve(getDefaultVideoOutputDir(), 'production', 'images', safeUser),
    path.resolve(getApiDataDir(), 'output', safeUser),
    path.resolve(getApiDataDir(), 'output', 'batch-jobs', 'videos'),
  ];
  const abs = path.resolve(candidatePath);
  return roots.some((root) => abs === root || abs.startsWith(root + path.sep));
}

async function fileExists(candidatePath: string): Promise<boolean> {
  try {
    await fs.access(candidatePath);
    return true;
  } catch {
    return false;
  }
}

async function resolveCaptionVideoPath(
  videoPath?: string,
  videoUrl?: string,
  username?: string,
): Promise<{ videoFilePath?: string; tempFilePath?: string }> {
  const trimmedPath = videoPath?.trim();
  if (trimmedPath) {
    const resolved = path.isAbsolute(trimmedPath)
      ? trimmedPath
      : path.resolve(getApiDataDir(), path.normalize(trimmedPath));
    if (isWithinAllowedRoot(resolved, username) && await fileExists(resolved)) {
      return { videoFilePath: resolved };
    }
  }

  const trimmedUrl = videoUrl?.trim();
  if (!trimmedUrl) return {};

  try {
    const parsed = new URL(trimmedUrl, 'http://localhost');
    if (parsed.pathname === '/api/video/file') {
      const relPath = parsed.searchParams.get('path');
      if (relPath) {
        const resolved = path.resolve(getApiDataDir(), path.normalize(relPath));
        if (isWithinAllowedRoot(resolved, username) && await fileExists(resolved)) {
          return { videoFilePath: resolved };
        }
      }
    }
    const batchMatch = parsed.pathname.match(/^\/api\/batch-jobs\/video\/([a-zA-Z0-9_-]+)$/);
    if (batchMatch) {
      const resolved = path.resolve(getApiDataDir(), 'output', 'batch-jobs', 'videos', `${batchMatch[1]}.mp4`);
      if (await fileExists(resolved)) return { videoFilePath: resolved };
    }
  } catch {
    // fall through to remote/data URL handling
  }

  const buffer = await bufferFromVideoUrlPayload(trimmedUrl);
  if (!buffer?.length) return {};
  const tempFilePath = path.join(os.tmpdir(), `caption-video-${randomUUID()}.mp4`);
  await fs.writeFile(tempFilePath, buffer);
  return { videoFilePath: tempFilePath, tempFilePath };
}

async function extractFrameAtTime(videoFilePath: string, tSec: number, outPath: string): Promise<void> {
  const ffmpeg = getFfmpegPath();
  await new Promise<void>((resolve, reject) => {
    const proc = spawn(
      ffmpeg,
      [
        '-hide_banner',
        '-loglevel',
        'error',
        '-ss',
        String(Math.max(0, tSec)),
        '-i',
        videoFilePath,
        '-vframes',
        '1',
        '-vf',
        'scale=768:-2',
        '-q:v',
        '3',
        outPath,
      ],
      { windowsHide: true },
    );
    proc.on('close', (code) => {
      if (code !== 0) reject(new Error(`extract frame failed at ${tSec}`));
      else resolve();
    });
    proc.on('error', reject);
  });
}

async function extractCaptionFrames(videoFilePath: string): Promise<Array<{ tSec: number; dataUrl: string }>> {
  const durationSec = await ffprobeDurationSeconds(videoFilePath);
  const checkpoints = [
    Math.max(0.1, durationSec * 0.15),
    Math.max(0.2, durationSec * 0.5),
    Math.max(0.3, durationSec * 0.82),
  ];
  const tempDir = path.join(os.tmpdir(), `caption-frames-${randomUUID()}`);
  await fs.mkdir(tempDir, { recursive: true });
  try {
    const frames: Array<{ tSec: number; dataUrl: string }> = [];
    for (let index = 0; index < checkpoints.length; index += 1) {
      const tSec = checkpoints[index]!;
      const outPath = path.join(tempDir, `frame-${index}.jpg`);
      await extractFrameAtTime(videoFilePath, tSec, outPath);
      const buffer = await fs.readFile(outPath);
      frames.push({ tSec, dataUrl: `data:image/jpeg;base64,${buffer.toString('base64')}` });
    }
    return frames;
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

function summarizeAccountContext(accountContext?: CaptionAccountContext[]): string {
  if (!accountContext?.length) return '';
  return accountContext
    .map((account) => {
      const bits = [
        account.platform?.trim(),
        account.region?.trim(),
        account.username?.trim(),
      ].filter(Boolean);
      return bits.join('/');
    })
    .filter(Boolean)
    .slice(0, 6)
    .join(', ');
}

async function analyzeCaptionVideo(
  videoFilePath: string,
  userText: string,
  accountContext?: CaptionAccountContext[],
): Promise<CaptionVisionSummary | null> {
  const frames = await extractCaptionFrames(videoFilePath);
  if (frames.length === 0) return null;

  const userContent: Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }> = [
    {
      type: 'text',
      text: [
        'Analyze these video frames for short-form social distribution.',
        `Original prompt or idea: ${userText || 'none'}`,
        summarizeAccountContext(accountContext) ? `Account context: ${summarizeAccountContext(accountContext)}` : '',
        'Return strict JSON: {"subject":"","action":"","vibe":"","standoutMoment":"","audienceAngle":"","contentTags":[""],"styleTags":[""]}',
      ].filter(Boolean).join('\n'),
    },
    ...frames.map((frame) => ({ type: 'image_url' as const, image_url: { url: frame.dataUrl } })),
  ];

  const raw = await compassChatCompletionWithContent({
    systemPrompt:
      'You are a TikTok content strategist. Describe what is visually happening in the clip for publishing copy, not production prompting. Keep tags short and concrete.',
    userContent,
    temperature: 0.2,
    maxTokens: 1200,
  });
  const parsed = safeJsonParse<Partial<CaptionVisionSummary>>(raw);
  if (!parsed) return null;
  return {
    subject: normalizeWhitespace(parsed.subject || ''),
    action: normalizeWhitespace(parsed.action || ''),
    vibe: normalizeWhitespace(parsed.vibe || ''),
    standoutMoment: normalizeWhitespace(parsed.standoutMoment || ''),
    audienceAngle: normalizeWhitespace(parsed.audienceAngle || ''),
    contentTags: Array.isArray(parsed.contentTags) ? parsed.contentTags.filter((item): item is string => typeof item === 'string').slice(0, 4) : [],
    styleTags: Array.isArray(parsed.styleTags) ? parsed.styleTags.filter((item): item is string => typeof item === 'string').slice(0, 3) : [],
  };
}

export function buildCaptionContextBlock(input: {
  prompt: string;
  language: CaptionLanguage;
  existingCaption?: string;
  existingHashtags?: string;
  platforms?: string[];
  accountContext?: CaptionAccountContext[];
  campaignContext?: CaptionCampaignContext;
  vision?: CaptionVisionSummary | null;
}): string {
  const bannedPhrases = sanitizeCampaignPhraseList(input.campaignContext?.bannedPhrases);
  const lines = [
    `Requested language: ${input.language}`,
    input.platforms?.length ? `Target platforms: ${input.platforms.join(', ')}` : '',
    summarizeAccountContext(input.accountContext) ? `Selected accounts: ${summarizeAccountContext(input.accountContext)}` : '',
    input.prompt ? `Source idea: ${sanitizePromptIdeaText(input.prompt)}` : '',
    input.campaignContext?.objective ? `Campaign objective: ${sanitizeCampaignContextText(input.campaignContext.objective)}` : '',
    input.campaignContext?.targetAudience ? `Target audience: ${sanitizeCampaignContextText(input.campaignContext.targetAudience)}` : '',
    input.campaignContext?.callToAction ? `Desired CTA: ${sanitizeCampaignContextText(input.campaignContext.callToAction)}` : '',
    input.campaignContext?.targetMarket ? `Target market: ${sanitizeCampaignContextText(input.campaignContext.targetMarket)}` : '',
    input.campaignContext?.complianceNotes ? `Compliance notes: ${sanitizeCampaignContextText(input.campaignContext.complianceNotes)}` : '',
    bannedPhrases.length ? `Avoid phrases: ${bannedPhrases.join(', ')}` : '',
    input.vision?.subject ? `Visual subject: ${input.vision.subject}` : '',
    input.vision?.action ? `Visual action: ${input.vision.action}` : '',
    input.vision?.vibe ? `Visual vibe: ${input.vision.vibe}` : '',
    input.vision?.standoutMoment ? `Best moment: ${input.vision.standoutMoment}` : '',
    input.vision?.audienceAngle ? `Audience angle: ${input.vision.audienceAngle}` : '',
    input.vision?.contentTags?.length ? `Content tags: ${input.vision.contentTags.join(', ')}` : '',
    input.vision?.styleTags?.length ? `Style tags: ${input.vision.styleTags.join(', ')}` : '',
    input.existingCaption ? `Existing caption draft: ${sanitizeCaptionText(input.existingCaption)}` : '',
    input.existingHashtags ? `Existing hashtags draft: ${sanitizeHashtagDraft(input.existingHashtags)}` : '',
  ];
  return lines.filter(Boolean).join('\n');
}

export async function generateCaptionForPost(
  prompt: string,
  platforms?: string[],
  options?: GenerateCaptionOptions
): Promise<CaptionResult | CaptionByPlatformResult> {
  const userText = prompt.trim() || '视频创意描述';
  const exCaption = (options?.existingCaption ?? '').trim();
  const exHashtags = (options?.existingHashtags ?? '').trim();
  const hasExistingDraft = exCaption.length > 0 || exHashtags.length > 0;
  const precomputedPlatforms =
    platforms?.length && platforms?.length > 0
      ? [...new Set(platforms.map((p) => NORMALIZED_PLATFORMS[p.toLowerCase()] || p.toLowerCase()).filter(Boolean))]
      : [];
  const lang2: CaptionLanguage = options?.language ?? 'EN';
  let tempFilePath2: string | undefined;
  let vision2: CaptionVisionSummary | null = null;
  try {
    const resolved2 = await resolveCaptionVideoPath(options?.videoPath, options?.videoUrl, options?.requestUsername);
    tempFilePath2 = resolved2.tempFilePath;
    if (resolved2.videoFilePath) {
      try {
        vision2 = await analyzeCaptionVideo(resolved2.videoFilePath, userText, options?.accountContext);
      } catch (error) {
        console.warn('[prompt/generate-caption] vision analysis skipped:', error);
      }
    }
    const fallback2 = pickBestCaptionResult(
      [],
      buildFallbackFromPrompt(userText),
      lang2,
      { contentTags: vision2?.contentTags, styleTags: vision2?.styleTags },
    );
    const contextBlock2 = buildCaptionContextBlock({
      prompt: userText,
      language: lang2,
      existingCaption: exCaption || undefined,
      existingHashtags: exHashtags || undefined,
      platforms: precomputedPlatforms,
      accountContext: options?.accountContext,
      campaignContext: options?.campaignContext,
      vision: vision2,
    });
    if (precomputedPlatforms.length > 0) {
      const rawText2 = await compassChatCompletion({
        systemPrompt: [
          'You write publish-ready short-form social captions.',
          'Use the visual context, not raw production prompting language.',
          'Each platform entry must feel native, concise, and hook-first.',
          'Return strict JSON keyed by platform name.',
        ].join('\n'),
        userText: `${contextBlock2}\n\nReturn JSON like {"tiktok":{"caption":"","hashtags":""},"instagram":{"caption":"","hashtags":""}}`,
        temperature: 0.45,
        maxTokens: 1800,
      });
      const parsed2 = safeJsonParse<Record<string, { caption?: string; hashtags?: string }>>(rawText2) ?? {};
      const byPlatform2: Record<string, CaptionResult> = {};
      for (const platform of precomputedPlatforms) {
        byPlatform2[platform] = pickBestCaptionResult(
          [parsed2[platform] || parsed2[platform.toLowerCase()] || {}],
          fallback2,
          lang2,
          { contentTags: vision2?.contentTags, styleTags: vision2?.styleTags },
        );
      }
      return { byPlatform: byPlatform2 };
    }
    const rawText2 = await compassChatCompletion({
      systemPrompt: [
        'You write TikTok-first short-form captions.',
        'Use a real hook, clean single-language output, and compact hashtags.',
        'Never paste production prompt wording, camera language, or technical specs.',
        'Return strict JSON with a candidates array.',
      ].join('\n'),
      userText: hasExistingDraft
        ? `${contextBlock2}\n\nPolish the existing draft into 3 better candidates. Return JSON: {"candidates":[{"caption":"","hashtags":"","hookType":"","confidence":0.0}]}`
        : `${contextBlock2}\n\nGenerate 3 publish-ready candidates. Return JSON: {"candidates":[{"caption":"","hashtags":"","hookType":"","confidence":0.0}]}`,
      temperature: 0.5,
      maxTokens: 1800,
    });
    const parsed2 = safeJsonParse<{ candidates?: CaptionCandidate[]; caption?: string; hashtags?: string }>(rawText2);
    const candidates2 = Array.isArray(parsed2?.candidates)
      ? parsed2?.candidates ?? []
      : parsed2 && (parsed2.caption || parsed2.hashtags)
        ? [{ caption: parsed2.caption, hashtags: parsed2.hashtags }]
        : [];
    return pickBestCaptionResult(
      candidates2,
      fallback2,
      lang2,
      { contentTags: vision2?.contentTags, styleTags: vision2?.styleTags },
    );
  } finally {
    if (tempFilePath2) {
      await fs.rm(tempFilePath2, { force: true }).catch(() => undefined);
    }
  }

  const legacyPlatforms: string[] = platforms ?? [];
  const uniquePlatforms =
    legacyPlatforms.length > 0
      ? [...new Set(legacyPlatforms.map((p) => NORMALIZED_PLATFORMS[p.toLowerCase()] || p.toLowerCase()).filter(Boolean))]
      : [];

  const usePlatformMode = uniquePlatforms.length > 0;
  const isOptimizeMode = hasExistingDraft && usePlatformMode;
  const lang = options?.language ?? 'EN';
  const langHint = lang === 'EN' ? 'caption 和 hashtags 必须使用英文' : lang === 'CN' ? 'caption 和 hashtags 必须使用中文' : lang === 'TH' ? 'caption 和 hashtags 必须使用泰语 (Thai)' : lang === 'ID' ? 'caption 和 hashtags 必须使用印尼语 (Indonesian)' : 'caption 和 hashtags 必须使用英文';
  const systemPromptBase = usePlatformMode
    ? isOptimizeMode
      ? `${PLATFORM_OPTIMIZE_SYSTEM_PROMPT}\n\n平台：${uniquePlatforms.join(', ')}`
      : `${PLATFORM_CAPTION_SYSTEM_PROMPT}\n\n平台：${uniquePlatforms.join(', ')}`
    : hasExistingDraft
      ? `你是 TikTok 文案优化专家。用户已填写草稿；若草稿是复制自视频生成 prompt 的长英文/分镜描述，请**彻底改写**为短句、口语、带钩子，并配合理 hashtag（见下条规则）。
${TIKTOK_RULES}
输出 JSON：{"caption":"...","hashtags":"#tag1 #tag2"}`
      : CAPTION_SYSTEM_PROMPT;
  const systemPrompt = `${systemPromptBase}\n\n## 语言要求\n${langHint}。`;

  let userContent: string;
  if (hasExistingDraft) {
    const draft = [exCaption && `文案：${exCaption}`, exHashtags && `标签：${exHashtags}`].filter(Boolean).join('\n');
    userContent = usePlatformMode
      ? `视频主题/context：${userText}\n\n用户已有内容：\n${draft}\n\n请按各平台规则优化，输出 JSON，key 为平台名。`
      : `视频主题：${userText}\n\n用户已有：${draft}\n\n请优化为更有传播性的文案和标签。`;
  } else {
    userContent = usePlatformMode
      ? `视频 prompt：${userText}\n\n请为 ${uniquePlatforms.join('、')} 分别生成，输出 JSON，key 为平台名。`
      : userText;
  }

  const rawText = await compassChatCompletion({
    systemPrompt,
    userText: userContent,
    temperature: 0.45,
  });

  if (usePlatformMode) {
    try {
      const parsed = JSON.parse(extractJson(rawText)) as Record<string, { caption?: string; hashtags?: string }>;
      const byPlatform: Record<string, CaptionResult> = {};
      for (const p of uniquePlatforms) {
        const item = parsed[p] || parsed[p.toLowerCase()];
        const fb = buildFallbackFromPrompt(userText);
        byPlatform[p] = {
          caption: (typeof item?.caption === 'string' && item.caption?.trim()) ? (item.caption?.trim() || '') : fb.caption,
          hashtags: normalizeHashtags((typeof item?.hashtags === 'string' && item.hashtags?.trim()) ? (item.hashtags ?? '') : fb.hashtags),
        };
      }
      return { byPlatform };
    } catch {
      const fallback = buildFallbackFromPrompt(userText);
      return { byPlatform: Object.fromEntries(uniquePlatforms.map((p) => [p, fallback])) };
    }
  }

  try {
    const parsed = JSON.parse(extractJson(rawText)) as { caption?: string; hashtags?: string };
    const fb = buildFallbackFromPrompt(userText);
    return {
      caption: typeof parsed.caption === 'string' ? parsed.caption?.trim() || '' : fb.caption,
      hashtags: normalizeHashtags(parsed.hashtags ?? fb.hashtags),
    };
  } catch {
    return buildFallbackFromPrompt(userText);
  }
}

// 纯翻译：将现有文案与标签翻译为目标语言，不改写内容
const TRANSLATE_CAPTION_SYSTEM = `你是社媒文案翻译助手。将用户提供的 caption（文案）和 hashtags（标签）翻译为目标语言。
- 保持原意、风格和 emoji，只做语言转换
- caption：完整翻译，保留 emoji
- hashtags：翻译标签的语义（如 #viral 可保留；#浪人 → #ronin 或对应目标语），保持 # 开头
输出格式（严格 JSON）：{"caption":"...","hashtags":"#tag1 #tag2"}`;

export async function translateCaptionForPost(
  caption: string,
  hashtags: string,
  targetLanguage: 'EN' | 'CN' | 'TH' | 'ID'
): Promise<CaptionResult> {
  const cap = (caption ?? '').trim();
  const tag = (hashtags ?? '').trim();
  if (!cap && !tag) {
    return { caption: cap, hashtags: tag || DEFAULT_TIKTOK_HASHTAGS.join(' ') };
  }

  const langName =
    targetLanguage === 'EN'
      ? '英文 (English)'
      : targetLanguage === 'CN'
        ? '中文 (Chinese)'
        : targetLanguage === 'TH'
          ? '泰语 (Thai)'
          : '印尼语 (Indonesian)';

  const userContent = [cap && `文案：${cap}`, tag && `标签：${tag}`].filter(Boolean).join('\n');
  const systemPrompt = `${TRANSLATE_CAPTION_SYSTEM}\n\n## 目标语言\n${langName}。`;

  const rawText = await compassChatCompletion({
    systemPrompt,
    userText: userContent,
    temperature: 0.2,
  });

  try {
    const parsed = JSON.parse(extractJson(rawText)) as { caption?: string; hashtags?: string };
    return {
      caption: typeof parsed.caption === 'string' ? parsed.caption.trim() : cap,
      hashtags:
        typeof parsed.hashtags === 'string'
          ? normalizeHashtags(parsed.hashtags)
          : tag || DEFAULT_TIKTOK_HASHTAGS.join(' '),
    };
  } catch {
    return { caption: cap, hashtags: tag || DEFAULT_TIKTOK_HASHTAGS.join(' ') };
  }
}
