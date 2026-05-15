const API_BASE = '';

function readPromptAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem('gobs_token');
  } catch {
    return null;
  }
}

export function buildPromptRequestHeaders(tokenOverride?: string | null): Record<string, string> {
  const token = tokenOverride === undefined ? readPromptAuthToken() : tokenOverride;
  return token
    ? {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      }
    : {
        'Content-Type': 'application/json',
      };
}

export interface PromptTemplate {
  id: string;
  name: string;
  nameZh?: string;
  description: string;
  duration: number;
  aspectRatio: string;
  pipelineMode: 'single' | 'multishot';
}

export interface PolishResult {
  polishedPrompt: string;
  searchKeywords: string[];
  /** 文件夹语义提示：优先从 Scenario/Character/Weapon/Effect 等类型文件夹搜索 */
  folderHints?: string[];
  /** 传入 templateId 时，后端返回模板的 duration、aspectRatio、pipelineMode */
  template?: { duration: number; aspectRatio: string; pipelineMode: string };
  /** 多镜模板时：LLM 直接生成的分镜数组，每镜含 duration 与 prompt */
  shots?: { duration: number; prompt: string }[];
  /** 模板可选返回的主要人物/角色名称 */
  characters?: string[];
}

export interface PromptReferenceAsset {
  slotId?: string;
  title?: string;
  kind: 'image' | 'video' | 'audio';
  filename?: string;
  token: string;
  semanticRole?: 'role' | 'scene' | string;
}

async function safeParseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text?.trim()) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(res.status === 502 || res.status === 504 ? '后端未响应，请确认已启动 h5-video-tool-api' : '响应格式异常');
  }
}

/** 获取可用模板列表；后端未实现时使用静态降级 */
export async function getTemplates(): Promise<PromptTemplate[]> {
  try {
    const res = await fetch(`${API_BASE}/api/prompt/templates`);
    if (!res.ok) return FALLBACK_TEMPLATES;
    const data = await safeParseJson<{ templates?: PromptTemplate[] }>(res);
    if (Array.isArray(data?.templates) && data.templates.length > 0) {
      return data.templates;
    }
  } catch {
    // 后端未启动或未实现时使用静态数据
  }
  return FALLBACK_TEMPLATES;
}

export interface ShortDramaPreset {
  id: string;
  nameZh: string;
  description: string;
  templateId: string;
  defaultPrompt: string;
}

/** Legacy short-drama preset endpoint. Studio Phase 1 intentionally returns an empty list. */
export async function getShortDramaPresets(): Promise<ShortDramaPreset[]> {
  try {
    const res = await fetch(`${API_BASE}/api/prompt/short-drama-presets`);
    if (!res.ok) return FALLBACK_SHORT_DRAMA_PRESETS;
    const data = await safeParseJson<{ presets?: ShortDramaPreset[] }>(res);
    if (Array.isArray(data?.presets)) return data.presets;
  } catch {
    // 后端未启动时使用静态数据
  }
  return FALLBACK_SHORT_DRAMA_PRESETS;
}

const FALLBACK_SHORT_DRAMA_PRESETS: ShortDramaPreset[] = [];

/** 静态模板（后端未实现时降级使用）；必须与 Studio Phase 1 的可见模板保持一致。 */
const FALLBACK_TEMPLATES: PromptTemplate[] = [
  { id: 'viral-dance', name: 'Motion Transfer', nameZh: '动作迁移', description: '5-10秒，参考任意视频动作，让游戏角色动起来', duration: 8, aspectRatio: '9:16', pipelineMode: 'single' },
  { id: 'boss-showcase', name: 'Character Showcase', nameZh: '角色展示', description: '15秒，角色/皮肤/装备电影级展示，支持横竖屏', duration: 15, aspectRatio: '9:16', pipelineMode: 'multishot' },
];

const POLISH_TIMEOUT_MS = 45000;

export async function polishPrompt(
  raw: string,
  options?: string | {
    styleId?: string;
    templateId?: string;
    mode?: 'custom' | 'viral-dance' | 'boss-showcase';
    multishot?: boolean;
    duration?: number;
    aspectRatio?: string;
    referenceAssets?: PromptReferenceAsset[];
  }
): Promise<PolishResult> {
  const opts = typeof options === 'string' ? { styleId: options } : options ?? {};
  const body: Record<string, unknown> = { prompt: raw };
  if (opts.templateId) body.templateId = opts.templateId;
  else if (opts.styleId) body.style = opts.styleId;
  if (opts.multishot) body.multishot = true;
  if (opts.duration != null) body.duration = opts.duration;
  if (opts.aspectRatio) body.aspectRatio = opts.aspectRatio;
  if (opts.mode) body.mode = opts.mode;
  if (opts.referenceAssets?.length) body.referenceAssets = opts.referenceAssets;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), POLISH_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}/api/prompt/polish`, {
      method: 'POST',
      headers: buildPromptRequestHeaders(),
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const data = await safeParseJson<PolishResult & { error?: string }>(res);
    if (!res.ok) {
      throw new Error((data as { error?: string }).error || res.statusText || '优化失败');
    }
    const { polishedPrompt, searchKeywords, folderHints, template, shots, characters } = data;
    if (typeof polishedPrompt === 'string' && Array.isArray(searchKeywords)) {
      return { polishedPrompt, searchKeywords, folderHints, template, shots, characters };
    }
    return { polishedPrompt: raw, searchKeywords: [raw] };
  } catch (e) {
    clearTimeout(timeoutId);
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error('Prompt 优化超时，已切换到本地规则整理。');
    }
    throw e;
  }
}

export interface CaptionResult {
  caption: string;
  hashtags: string;
}

export interface CaptionByPlatformResult {
  byPlatform: Record<string, CaptionResult>;
}

export interface CaptionAccountContext {
  id?: string;
  username?: string;
  platform?: string;
  region?: string;
  remark?: string;
}

export interface CaptionCampaignContext {
  campaignObjective?: string;
  targetAudience?: string;
  callToAction?: string;
  targetMarket?: string;
  complianceNotes?: string;
  bannedPhrases?: string[];
}

export interface GenerateCaptionRequestOptions {
  existingCaption?: string;
  existingHashtags?: string;
  language?: 'EN' | 'CN' | 'TH' | 'ID';
  videoPath?: string;
  videoUrl?: string;
  accountContext?: CaptionAccountContext[];
  campaignContext?: CaptionCampaignContext;
}

export function buildGenerateCaptionRequestBody(
  prompt: string,
  platforms?: string[],
  opts?: GenerateCaptionRequestOptions,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    prompt: prompt.trim() || undefined,
    platforms: platforms?.length ? platforms : undefined,
  };
  if (opts?.existingCaption) body.existingCaption = opts.existingCaption;
  if (opts?.existingHashtags) body.existingHashtags = opts.existingHashtags;
  if (opts?.language) body.language = opts.language;
  if (opts?.videoPath) body.videoPath = opts.videoPath;
  if (opts?.videoUrl) body.videoUrl = opts.videoUrl;
  if (opts?.accountContext?.length) body.accountContext = opts.accountContext;
  if (opts?.campaignContext?.campaignObjective) body.campaignObjective = opts.campaignContext.campaignObjective;
  if (opts?.campaignContext?.targetAudience) body.targetAudience = opts.campaignContext.targetAudience;
  if (opts?.campaignContext?.callToAction) body.callToAction = opts.campaignContext.callToAction;
  if (opts?.campaignContext?.targetMarket) body.targetMarket = opts.campaignContext.targetMarket;
  if (opts?.campaignContext?.complianceNotes) body.complianceNotes = opts.campaignContext.complianceNotes;
  if (opts?.campaignContext?.bannedPhrases?.length) body.bannedPhrases = opts.campaignContext.bannedPhrases;
  return body;
}

/** 将现有文案与标签翻译为目标语言（EN/CN/TH/ID）。 */
export async function translateCaptionForPost(
  caption: string,
  hashtags: string,
  targetLanguage: 'EN' | 'CN' | 'TH' | 'ID'
): Promise<CaptionResult> {
  const body = {
    caption: (caption || '').trim(),
    hashtags: (hashtags || '').trim(),
    targetLanguage,
  };
  const res = await fetch(`${API_BASE}/api/prompt/translate-caption`, {
    method: 'POST',
    headers: buildPromptRequestHeaders(),
    body: JSON.stringify(body),
  });
  const data = await safeParseJson<CaptionResult & { error?: string }>(res);
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || res.statusText || '翻译失败');
  }
  return {
    caption: typeof data.caption === 'string' ? data.caption.trim() : '',
    hashtags: typeof data.hashtags === 'string' ? data.hashtags.trim() : '',
  };
}

/** 基于 prompt 生成文案与标签；若 existingCaption/existingHashtags 有值则优化而非生成。传入 platforms 时按平台优化。language 控制输出语言：EN/CN/TH/ID。 */
export async function generateCaptionForPost(
  prompt: string,
  platforms?: string[],
  opts?: GenerateCaptionRequestOptions
): Promise<CaptionResult | CaptionByPlatformResult> {
  const body = buildGenerateCaptionRequestBody(prompt, platforms, opts);
  const res = await fetch(`${API_BASE}/api/prompt/generate-caption`, {
    method: 'POST',
    headers: buildPromptRequestHeaders(),
    body: JSON.stringify(body),
  });
  const data = await safeParseJson<CaptionResult & CaptionByPlatformResult & { error?: string }>(res);
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || res.statusText || '生成失败');
  }
  if (data.byPlatform && typeof data.byPlatform === 'object') {
    return { byPlatform: data.byPlatform };
  }
  return {
    caption: typeof data.caption === 'string' ? data.caption.trim() : '',
    hashtags: typeof data.hashtags === 'string' ? data.hashtags.trim() : '',
  };
}
