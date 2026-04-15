/**
 * 基于模糊视频创意 prompt，用 LLM 优化为 VEO 可用的视频描述，
 * 并提取适合 Google Drive 文件名搜索的关键词（中英双语）。
 * 通过 Compass Gemini 代理（OpenAI 兼容 chat/completions），密钥优先 COMPASS_API_KEY（KEY2 常为 Veo 专用）；
 * 可选 GEMINI_PROXY 为 axios 配置 HTTPS 代理（与 Veo 等同机内网场景一致）。
 *
 * 支持模板（templateId）：viral-dance 单镜、cg-trailer/short-drama 多镜分镜。
 */
import axios, { isAxiosError } from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { getTemplate } from '../config/prompt-templates/index.js';
import { resolveCompassApiKeyForGeminiChat } from './compassApiKey.js';
import { recordKeyUsage } from './keyUsageStats.js';

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
  const client = createCompassHttpClient();
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const { data } = await client.post<{
        choices?: Array<{ message?: { content?: string | null } }>;
        error?: { message?: string };
        usage?: CompassChatUsage;
      }>(`${baseURL}/chat/completions`, body, {
        headers: { Authorization: `Bearer ${apiKey}` },
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
        const transient = /ECONNRESET|timeout|socket hang up|network/i.test(msg);
        await recordKeyUsage({ success: false });
        if (!isLast && transient) {
          console.warn(`[Compass retry] ${opts?.logLabel ?? 'chat'} attempt ${attempt}/${maxAttempts} failed: ${msg}`);
          await new Promise((r) => setTimeout(r, attempt * 1000));
          continue;
        }
      } else if (e instanceof Error) {
        msg = e.message || msg;
        const transient = /ECONNRESET|timeout|socket hang up|network/i.test(msg);
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
}): Promise<{ text: string; usage?: CompassChatUsage }> {
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
  if (options.responseFormat) body.response_format = options.responseFormat;
  return postCompassChatCompletions(body, { logLabel: 'compassChatCompletion' });
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
    let suffix = template.systemPromptSuffix;
    const isShortDrama = template.id === 'short-drama' || template.id === 'cat-harem';
    if (isShortDrama && template.outputMode === 'multi-shot') {
      suffix += `\n\n## 人物提取（短剧必填）
- **characters**：从剧本中提取所有主要人物/角色名称，按出场重要性排序。
- 输出格式必须包含 characters 数组，如：{"shots":[...],"characters":["男主","女主","反派"],"searchKeywords":[...],"folderHints":[...]}
- 猫猫后宫剧固定为 ["橘猫男主","白猫","布偶","黑猫"]；其他短剧按剧本提取，如 ["顾总","前女友","现男友"]。`;
    }
    systemPrompt = `${base}\n\n## 模板专属要求\n${suffix}\n`;
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
    if (!characters?.length && template?.id === 'cat-harem') {
      characters = ['橘猫男主', '白猫', '布偶', '黑猫'];
    }
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

const NORMALIZED_PLATFORMS: Record<string, string> = {
  tiktok: 'tiktok',
  instagram: 'instagram',
  reels: 'instagram',
  youtube: 'youtube',
  shorts: 'youtube',
  facebook: 'facebook',
};

function normalizeHashtags(hashtags: string): string {
  let h = typeof hashtags === 'string' ? hashtags.trim() : '';
  if (h && !h.includes(' ')) h = h.replace(/#/g, ' #').trim();
  return h || '#fyp #viral';
}

/** LLM 解析失败时：从 prompt 抽关键词做极简 TikTok 风，避免整段粘贴 */
function buildFallbackFromPrompt(userText: string): CaptionResult {
  const t = (userText || '').trim();
  if (!t) return { caption: 'This hit different 🔥 Worth the watch.', hashtags: '#fyp #foryou #viral #shorts' };
  const stripTech = t
    .replace(/\b\d{1,2}s\b/gi, '')
    .replace(/\b(16:9|9:16|4k|720p|1080p)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  const words = stripTech.match(/[\u4e00-\u9fa5]{2,8}|[a-zA-Z]{3,12}/g)?.slice(0, 4) || [];
  const topic = words.slice(0, 2).join(' ') || 'this moment';
  const caption = `POV: ${topic} — too good to scroll past 🔥`;
  const tagBase = words
    .map((k) => '#' + k.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '').slice(0, 24))
    .filter((x) => x.length > 1)
    .slice(0, 3);
  const hashtags = ['#fyp', '#foryou', '#viral', ...tagBase, '#shorts'].join(' ');
  return { caption, hashtags };
}

export interface GenerateCaptionOptions {
  existingCaption?: string;
  existingHashtags?: string;
  language?: 'EN' | 'CN' | 'TH' | 'ID';
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

  const uniquePlatforms =
    platforms?.length && platforms.length > 0
      ? [...new Set(platforms.map((p) => NORMALIZED_PLATFORMS[p.toLowerCase()] || p.toLowerCase()).filter(Boolean))]
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
          caption: (typeof item?.caption === 'string' && item.caption.trim()) ? item.caption.trim() : fb.caption,
          hashtags: normalizeHashtags((typeof item?.hashtags === 'string' && item.hashtags.trim()) ? item.hashtags : fb.hashtags),
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
      caption: typeof parsed.caption === 'string' ? parsed.caption.trim() : fb.caption,
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

/** 短剧：用户模糊创意 → 剧本摘要 + 剧本正文（供分镜与拍摄参考） */

const SHORT_DRAMA_EXPAND_SYSTEM = `你是竖屏短剧（抖音/快手风格）的剧本策划。用户会提供一句或一段**模糊创意**，你需要扩展为**完整策划案**，用于后续生成视频分镜。

## 输出语言
- 全部使用**中文**。

## 字段说明（summary 对象）
- **protagonist**：主角姓名或称呼（简短）
- **storyGenre**：故事类型/频道，如：女频、男频、甜宠、复仇、悬疑、都市、古风 等
- **synopsis**：故事梗概，1–3 句，可含「地位反差/身份错位」等标签式前缀（用方括号），讲清核心冲突
- **background**：故事背景：时代、地域、社会阶层（1–2 句）
- **setting**：故事设定：关键规则、契约、身份约束、复仇动机等（2–4 句）
- **oneLineStory**：一句话故事：用一段完整叙事（约 200–400 字）讲清起承转合，包含主要转折与情绪高潮，适合作为口播/旁白底稿

## scriptContent（剧本正文）
- 与 summary 一致、可执行的**剧本文案**：建议包含：**场次提示**（如 场次1-订婚宴）、**画面/动作**、**关键台词或旁白**（可简短）
- 总时长约 **30 秒竖屏短剧** 的节奏（6–8 个场景单元），每单元用空行分隔
- 禁止真人明星姓名、违规内容；可虚构角色名

## 输出格式（严格 JSON，不要 markdown）
{"summary":{"protagonist":"...","storyGenre":"...","synopsis":"...","background":"...","setting":"...","oneLineStory":"..."},"scriptContent":"..."}`;

export interface ShortDramaSummary {
  protagonist: string;
  storyGenre: string;
  synopsis: string;
  background: string;
  setting: string;
  oneLineStory: string;
}

export interface ShortDramaExpandResult {
  summary: ShortDramaSummary;
  scriptContent: string;
}

export async function expandShortDramaFromIdea(rawIdea: string): Promise<ShortDramaExpandResult> {
  const userText = (rawIdea || '').trim() || '（用户未填写，请基于「都市女频复仇」生成示例）';

  const rawText = await compassChatCompletion({
    systemPrompt: SHORT_DRAMA_EXPAND_SYSTEM,
    userText,
    temperature: 0.45,
    maxTokens: 8192,
  });
  const jsonStr = extractJson(rawText);
  try {
    const parsed = JSON.parse(jsonStr) as {
      summary?: Partial<ShortDramaSummary>;
      scriptContent?: string;
    };
    const s = parsed.summary ?? {};
    const summary: ShortDramaSummary = {
      protagonist: typeof s.protagonist === 'string' ? s.protagonist.trim() : '',
      storyGenre: typeof s.storyGenre === 'string' ? s.storyGenre.trim() : '',
      synopsis: typeof s.synopsis === 'string' ? s.synopsis.trim() : '',
      background: typeof s.background === 'string' ? s.background.trim() : '',
      setting: typeof s.setting === 'string' ? s.setting.trim() : '',
      oneLineStory: typeof s.oneLineStory === 'string' ? s.oneLineStory.trim() : '',
    };
    const scriptContent =
      typeof parsed.scriptContent === 'string' ? parsed.scriptContent.replace(/\\n/g, '\n').trim() : '';
    if (!summary.protagonist && !summary.synopsis && !scriptContent) {
      throw new Error('模型返回为空');
    }
    return { summary, scriptContent: scriptContent || summary.oneLineStory };
  } catch (e) {
    if (e instanceof Error && e.message === '模型返回为空') throw e;
    throw new Error('剧本解析失败，请重试或缩短创意描述');
  }
}

export async function translateCaptionForPost(
  caption: string,
  hashtags: string,
  targetLanguage: 'EN' | 'CN' | 'TH' | 'ID'
): Promise<CaptionResult> {
  const cap = (caption ?? '').trim();
  const tag = (hashtags ?? '').trim();
  if (!cap && !tag) {
    return { caption: cap, hashtags: tag || '#fyp #viral' };
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
      hashtags: typeof parsed.hashtags === 'string' ? normalizeHashtags(parsed.hashtags) : tag || '#fyp #viral',
    };
  } catch {
    return { caption: cap, hashtags: tag || '#fyp #viral' };
  }
}
