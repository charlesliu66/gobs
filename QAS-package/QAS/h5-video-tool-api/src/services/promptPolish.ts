/**
 * 基于模糊视频创意 prompt，用 LLM 优化为 VEO 可用的视频描述，
 * 并提取适合 Google Drive 文件名搜索的关键词（中英双语）。
 * 使用 Gemini REST API + axios，确保 GEMINI_PROXY 代理生效。
 *
 * 支持模板（templateId）：viral-dance 单镜、cg-trailer/short-drama 多镜分镜。
 */
import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { getTemplate } from '../config/prompt-templates/index.js';

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
}

function createGeminiAxios() {
  const proxyUrl = process.env.GEMINI_PROXY?.trim();
  const config: Parameters<typeof axios.create>[0] = {
    baseURL: 'https://generativelanguage.googleapis.com/v1beta',
    timeout: 60000,
    headers: { 'Content-Type': 'application/json' },
  };
  if (proxyUrl) {
    config.httpsAgent = new HttpsProxyAgent(proxyUrl);
    config.proxy = false;
  }
  return axios.create(config);
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

export type PolishOptions = { styleId?: string; templateId?: string };

export async function polishPrompt(
  rawPrompt: string,
  options?: PolishOptions | string
): Promise<PolishResult> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new Error('GEMINI_API_KEY 未配置');

  const opts = typeof options === 'string' ? { styleId: options } : options ?? {};
  const template = opts.templateId ? getTemplate(opts.templateId) : undefined;

  const client = createGeminiAxios();
  const userText = rawPrompt.trim() || '请输入视频创意';

  let systemPrompt: string;
  if (template) {
    const base = template.outputMode === 'single-shot' ? VEO_SINGLE_SHOT_SYSTEM : VEO_MULTI_SHOT_SYSTEM;
    systemPrompt = `${base}\n\n## 模板专属要求\n${template.systemPromptSuffix}\n`;
  } else {
    const styleHint = opts.styleId && STYLE_HINTS[opts.styleId]
      ? `\n## 风格要求\n${STYLE_HINTS[opts.styleId]}\n`
      : '';
    systemPrompt = FALLBACK_STYLE_SYSTEM + styleHint;
  }

  const { data } = await client.post<{
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    error?: { message?: string };
  }>(
    `/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(key)}`,
    {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: userText }] }],
      generationConfig: { temperature: 0.3 },
    },
  );

  if (data.error) {
    throw new Error(data.error.message || 'Gemini API 错误');
  }

  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';

  const jsonStr = extractJson(rawText);
  try {
    const parsed = JSON.parse(jsonStr) as {
      polishedPrompt?: string;
      shots?: Array<{ duration?: number; prompt?: string }>;
      searchKeywords?: string[];
      folderHints?: string[];
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
    }
    if (template?.outputMode === 'multi-shot' && Array.isArray(parsed.shots) && parsed.shots.length > 0) {
      let normalized = parsed.shots
        .map((s) => ({
          duration: Math.min(8, Math.max(5, Number(s.duration) || 5)),
          prompt: (typeof s.prompt === 'string' ? s.prompt : '').replace(/\\n/g, '\n').trim(),
        }))
        .filter((s) => s.prompt.length > 0);
      // BOSS 展示：强制 3 镜 × 5s = 15s
      if (template.id === 'boss-showcase') {
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

const CAPTION_SYSTEM_PROMPT = `你是社媒文案助手。根据用户提供的视频创意 prompt，生成适合 TikTok 的发布文案和标签。
- **caption**：1-2 句吸引人，可带 emoji
- **hashtags**：5-8 个，空格分隔，如 #fyp #viral
输出格式（严格 JSON）：{"caption":"...","hashtags":"#tag1 #tag2"}`;

const PLATFORM_CAPTION_SYSTEM_PROMPT = `你是社媒文案助手。根据视频 prompt 按**指定平台**生成文案和标签。
TikTok：30–80 字，口语化，#fyp + 垂直
Instagram：Hook + 正文 + CTA，#reels #viral
YouTube Shorts：8–15 词标题，关键词靠前
Facebook：故事式/分享邀请
输出格式：{"tiktok":{"caption":"...","hashtags":"..."},"instagram":{...}}`;

const PLATFORM_OPTIMIZE_SYSTEM_PROMPT = `你是社媒文案优化助手。用户已填写了部分文案，请按**指定平台**的传播规则进行优化。
- 保留用户原意与风格，但使其更易传播、更吸引人
- TikTok：口语化、情绪钩子、前 3 秒抓注意力、#fyp + 垂直领域标签
- Instagram：Hook + 正文 + CTA，#reels #viral
- YouTube Shorts：标题关键词靠前、简洁有力
- Facebook：故事式、分享邀请感
输出格式：{"tiktok":{"caption":"...","hashtags":"..."},"instagram":{...}}`;

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

export interface GenerateCaptionOptions {
  existingCaption?: string;
  existingHashtags?: string;
}

export async function generateCaptionForPost(
  prompt: string,
  platforms?: string[],
  options?: GenerateCaptionOptions
): Promise<CaptionResult | CaptionByPlatformResult> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new Error('GEMINI_API_KEY 未配置');

  const client = createGeminiAxios();
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
  const systemPrompt = usePlatformMode
    ? isOptimizeMode
      ? `${PLATFORM_OPTIMIZE_SYSTEM_PROMPT}\n\n平台：${uniquePlatforms.join(', ')}`
      : `${PLATFORM_CAPTION_SYSTEM_PROMPT}\n\n平台：${uniquePlatforms.join(', ')}`
    : hasExistingDraft
      ? `你是社媒文案优化助手。用户已填写了部分文案，请按 TikTok 传播规则优化：保留原意，使其更口语化、更易传播，补充合适的 hashtag。输出 JSON：{"caption":"...","hashtags":"#tag1 #tag2"}`
      : CAPTION_SYSTEM_PROMPT;

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

  const { data } = await client.post<{
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    error?: { message?: string };
  }>(
    `/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(key)}`,
    {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: userContent }] }],
      generationConfig: { temperature: 0.3 },
    },
  );

  if (data.error) throw new Error(data.error.message || 'Gemini API 错误');

  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';

  if (usePlatformMode) {
    try {
      const parsed = JSON.parse(extractJson(rawText)) as Record<string, { caption?: string; hashtags?: string }>;
      const byPlatform: Record<string, CaptionResult> = {};
      for (const p of uniquePlatforms) {
        const item = parsed[p] || parsed[p.toLowerCase()];
        byPlatform[p] = {
          caption: typeof item?.caption === 'string' ? item.caption.trim() : 'Check this out 🔥',
          hashtags: normalizeHashtags(typeof item?.hashtags === 'string' ? item.hashtags : ''),
        };
      }
      return { byPlatform };
    } catch {
      const fallback: CaptionResult = { caption: 'Check this out 🔥', hashtags: '#fyp #viral' };
      return { byPlatform: Object.fromEntries(uniquePlatforms.map((p) => [p, fallback])) };
    }
  }

  try {
    const parsed = JSON.parse(extractJson(rawText)) as { caption?: string; hashtags?: string };
    return {
      caption: typeof parsed.caption === 'string' ? parsed.caption.trim() : 'Check this out 🔥',
      hashtags: normalizeHashtags(parsed.hashtags ?? ''),
    };
  } catch {
    return { caption: 'Check this out 🔥', hashtags: '#fyp #viral' };
  }
}
