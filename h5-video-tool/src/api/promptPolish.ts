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
  /** 短剧/猫猫后宫模板时：剧本中的主要人物/角色名称 */
  characters?: string[];
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

/** 短剧剧情预设（猫猫后宫、隐藏大佬等） */
export async function getShortDramaPresets(): Promise<ShortDramaPreset[]> {
  try {
    const res = await fetch(`${API_BASE}/api/prompt/short-drama-presets`);
    if (!res.ok) return FALLBACK_SHORT_DRAMA_PRESETS;
    const data = await safeParseJson<{ presets?: ShortDramaPreset[] }>(res);
    if (Array.isArray(data?.presets) && data.presets.length > 0) return data.presets;
  } catch {
    // 后端未启动时使用静态数据
  }
  return FALLBACK_SHORT_DRAMA_PRESETS;
}

const FALLBACK_SHORT_DRAMA_PRESETS: ShortDramaPreset[] = [
  { id: 'cat-harem', nameZh: '猫猫后宫剧', description: '橘座的三选一，4只猫争宠打脸', templateId: 'cat-harem', defaultPrompt: '猫猫后宫剧《橘座的三选一》：橘猫男主被高冷白猫、撒娇布偶、傲娇黑猫三只追求。三猫争宠吃醋互相嘲讽，橘座淡定选中布偶并打脸。上传的主角图按顺序对应：@图片1=橘猫男主 @图片2=白猫 @图片3=布偶 @图片4=黑猫。请生成6镜30秒分镜。' },
  { id: 'hidden-boss', nameZh: '隐藏大佬打脸', description: '总裁装穷被嘲讽，餐厅揭晓身份', templateId: 'short-drama', defaultPrompt: '隐藏大佬总裁装穷体验生活，被前女友和现男友嘲讽。男主穿服务员制服端茶倒水，经理鞠躬喊顾总，前女友愣住被请出黑名单。请生成6镜30秒分镜。' },
  { id: 'custom', nameZh: '自定义', description: '自由输入创意，按 drama-creator 方法论生成', templateId: 'short-drama', defaultPrompt: '' },
];

/** 静态模板（后端未实现时降级使用）；cat-harem 供短剧子模板使用，TemplatePicker 会过滤 */
const FALLBACK_TEMPLATES: PromptTemplate[] = [
  { id: 'viral-dance', name: 'Viral Dance', nameZh: 'Viral 舞蹈', description: '8秒，角色跳近期流行MV舞蹈', duration: 8, aspectRatio: '9:16', pipelineMode: 'single' },
  { id: 'cg-trailer', name: 'CG Trailer', nameZh: '英雄宣传', description: '60秒，多镜头讲述角色故事', duration: 60, aspectRatio: '16:9', pipelineMode: 'multishot' },
  { id: 'short-drama', name: 'Short Drama', nameZh: '短剧', description: '30秒，含剧情预设（猫猫后宫、隐藏大佬等）→ 人物参考→脚本→视频', duration: 30, aspectRatio: '9:16', pipelineMode: 'multishot' },
  { id: 'cat-harem', name: 'Cat Harem', nameZh: '猫猫后宫剧', description: '30秒，4只猫争宠打脸（短剧子模板）', duration: 30, aspectRatio: '9:16', pipelineMode: 'multishot' },
  { id: 'boss-showcase', name: 'BOSS Showcase', nameZh: 'BOSS展示', description: '15秒，BOSS+场景双图，电影级展示视频', duration: 15, aspectRatio: '16:9', pipelineMode: 'multishot' },
];

const POLISH_TIMEOUT_MS = 90000; // 90 秒，Gemini 可能较慢

/** 短剧：模糊创意 → 剧本摘要 + 剧本正文 */
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

export async function expandShortDramaFromIdea(idea: string): Promise<ShortDramaExpandResult> {
  const raw = (idea || '').trim();
  if (!raw) {
    throw new Error('请先输入短剧创意');
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), POLISH_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}/api/prompt/expand-short-drama`, {
      method: 'POST',
      headers: buildPromptRequestHeaders(),
      body: JSON.stringify({ idea: raw }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const data = await safeParseJson<ShortDramaExpandResult & { error?: string }>(res);
    if (!res.ok) {
      throw new Error(data.error || res.statusText || '生成失败');
    }
    if (!data.summary || typeof data.scriptContent !== 'string') {
      throw new Error('响应格式异常');
    }
    return data;
  } catch (e) {
    clearTimeout(timeoutId);
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error('请求超时，请稍后重试');
    }
    throw e;
  }
}

export async function polishPrompt(
  raw: string,
  options?: { styleId?: string; templateId?: string; multishot?: boolean; duration?: number; aspectRatio?: string }
): Promise<PolishResult> {
  const opts = typeof options === 'string' ? { styleId: options } : options ?? {};
  const body: Record<string, unknown> = { prompt: raw };
  if (opts.templateId) body.templateId = opts.templateId;
  else if (opts.styleId) body.style = opts.styleId;
  if (opts.multishot) body.multishot = true;
  if (opts.duration != null) body.duration = opts.duration;
  if (opts.aspectRatio) body.aspectRatio = opts.aspectRatio;

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
      throw new Error('请求超时（约 90 秒），请检查网络或稍后重试。也可直接选择下方镜头预设。');
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
  opts?: { existingCaption?: string; existingHashtags?: string; language?: 'EN' | 'CN' | 'TH' | 'ID' }
): Promise<CaptionResult | CaptionByPlatformResult> {
  const body: Record<string, unknown> = {
    prompt: prompt.trim() || undefined,
    platforms: platforms?.length ? platforms : undefined,
  };
  if (opts?.existingCaption) body.existingCaption = opts.existingCaption;
  if (opts?.existingHashtags) body.existingHashtags = opts.existingHashtags;
  if (opts?.language) body.language = opts.language;
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
