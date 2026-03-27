const API_BASE = '';

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

/** 静态模板（后端未实现时降级使用，VEO 适配：viral-dance 8s） */
const FALLBACK_TEMPLATES: PromptTemplate[] = [
  { id: 'viral-dance', name: 'Viral Dance', nameZh: 'Viral 舞蹈', description: '8秒，角色跳近期流行MV舞蹈', duration: 8, aspectRatio: '9:16', pipelineMode: 'single' },
  { id: 'cg-trailer', name: 'CG Trailer', nameZh: '英雄宣传', description: '60秒，多镜头讲述角色故事', duration: 60, aspectRatio: '16:9', pipelineMode: 'multishot' },
  { id: 'short-drama', name: 'Short Drama', nameZh: '短剧', description: '人物参考→剧情+脚本→视频（后端开发中）', duration: 30, aspectRatio: '9:16', pipelineMode: 'multishot' },
  { id: 'boss-showcase', name: 'BOSS Showcase', nameZh: 'BOSS展示', description: '15秒，BOSS+场景双图，电影级展示视频', duration: 15, aspectRatio: '16:9', pipelineMode: 'multishot' },
];

const POLISH_TIMEOUT_MS = 90000; // 90 秒，Gemini 可能较慢

export async function polishPrompt(
  raw: string,
  options?: { styleId?: string; templateId?: string }
): Promise<PolishResult> {
  const opts = typeof options === 'string' ? { styleId: options } : options ?? {};
  const body: Record<string, unknown> = { prompt: raw };
  if (opts.templateId) body.templateId = opts.templateId;
  else if (opts.styleId) body.style = opts.styleId;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), POLISH_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}/api/prompt/polish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const data = await safeParseJson<PolishResult & { error?: string }>(res);
    if (!res.ok) {
      throw new Error((data as { error?: string }).error || res.statusText || '优化失败');
    }
    const { polishedPrompt, searchKeywords, folderHints, template, shots } = data;
    if (typeof polishedPrompt === 'string' && Array.isArray(searchKeywords)) {
      return { polishedPrompt, searchKeywords, folderHints, template, shots };
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

/** 基于 prompt 生成文案与标签；若 existingCaption/existingHashtags 有值则优化而非生成。传入 platforms 时按平台优化。 */
export async function generateCaptionForPost(
  prompt: string,
  platforms?: string[],
  opts?: { existingCaption?: string; existingHashtags?: string }
): Promise<CaptionResult | CaptionByPlatformResult> {
  const body: Record<string, unknown> = {
    prompt: prompt.trim() || undefined,
    platforms: platforms?.length ? platforms : undefined,
  };
  if (opts?.existingCaption) body.existingCaption = opts.existingCaption;
  if (opts?.existingHashtags) body.existingHashtags = opts.existingHashtags;
  const res = await fetch(`${API_BASE}/api/prompt/generate-caption`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
