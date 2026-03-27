/**
 * 模板存储：用户保存的模板 + 模板市场（后端未实现时用 localStorage 模拟）
 * 支持引用量、点赞、收藏
 */

export interface SavedTemplate {
  id: string;
  title: string;
  description?: string;
  prompt: string;
  tags: string[];
  aspectRatio?: string;
  duration?: number;
  createdAt: number;
  /** user = 本地保存，market = 来自市场（分享后） */
  source: 'user' | 'market';
  /** 分享到市场后由后端分配，本地用 UUID 模拟 */
  marketId?: string;
}

export interface TemplateStats {
  useCount: number;
  likeCount: number;
}

const USER_TEMPLATES_KEY = 'h5-video-tool-user-templates';
const MARKET_TEMPLATES_KEY = 'h5-video-tool-market-templates';
const TEMPLATE_STATS_KEY = 'h5-video-tool-template-stats';
const USER_LIKES_KEY = 'h5-video-tool-user-likes';
const USER_FAVORITES_KEY = 'h5-video-tool-user-favorites';

function loadUserTemplates(): SavedTemplate[] {
  try {
    const raw = localStorage.getItem(USER_TEMPLATES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveUserTemplates(list: SavedTemplate[]) {
  localStorage.setItem(USER_TEMPLATES_KEY, JSON.stringify(list));
}

/** 获取用户保存的模板 */
export function getUserTemplates(): SavedTemplate[] {
  return loadUserTemplates();
}

/** 保存为本地模板 */
export function saveAsUserTemplate(
  input: Omit<SavedTemplate, 'id' | 'createdAt' | 'source'>
): SavedTemplate {
  const list = loadUserTemplates();
  const id = `user-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const item: SavedTemplate = {
    ...input,
    id,
    createdAt: Date.now(),
    source: 'user',
  };
  list.unshift(item);
  saveUserTemplates(list);
  return item;
}

/** 删除用户模板 */
export function deleteUserTemplate(id: string): boolean {
  const list = loadUserTemplates().filter((t) => t.id !== id);
  if (list.length === loadUserTemplates().length) return false;
  saveUserTemplates(list);
  return true;
}

/** 获取模板市场列表（后端未实现时从 localStorage 读取「已分享」的模板） */
export function getMarketTemplates(): SavedTemplate[] {
  try {
    const raw = localStorage.getItem(MARKET_TEMPLATES_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return list;
  } catch {
    return [];
  }
}

/** 分享到模板市场（前端模拟：将用户模板复制到 market 列表；后端实现后改为 API 调用） */
export function shareToMarket(template: SavedTemplate): SavedTemplate {
  const market = getMarketTemplates();
  const marketId = `market-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const item: SavedTemplate = {
    ...template,
    id: marketId,
    marketId,
    source: 'market',
  };
  market.unshift(item);
  localStorage.setItem(MARKET_TEMPLATES_KEY, JSON.stringify(market));
  return item;
}

function loadTemplateStats(): Record<string, TemplateStats> {
  try {
    const raw = localStorage.getItem(TEMPLATE_STATS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveTemplateStats(stats: Record<string, TemplateStats>) {
  localStorage.setItem(TEMPLATE_STATS_KEY, JSON.stringify(stats));
}

/** 获取模板的引用量、点赞数（合并用户点赞状态） */
export function getTemplateStats(id: string): TemplateStats & { isLiked?: boolean } {
  const stats = loadTemplateStats();
  const base = stats[id] ?? { useCount: 0, likeCount: 0 };
  const likes = loadUserLikes();
  return { ...base, isLiked: likes.has(id) };
}

/** 引用模板时调用，引用量 +1 */
export function incrementUseCount(id: string): void {
  const stats = loadTemplateStats();
  const cur = stats[id] ?? { useCount: 0, likeCount: 0 };
  stats[id] = { ...cur, useCount: cur.useCount + 1 };
  saveTemplateStats(stats);
}

function loadUserLikes(): Set<string> {
  try {
    const raw = localStorage.getItem(USER_LIKES_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveUserLikes(ids: string[]) {
  localStorage.setItem(USER_LIKES_KEY, JSON.stringify(ids));
}

const PLATFORM_TEMPLATE_IDS = new Set(['product-showcase', 'character-action', 'lifestyle-vlog', 'brand-story']);

/** 切换点赞状态，并同步更新模板的 likeCount（仅市场模板，平台模板不修改统计） */
export function toggleLike(id: string): boolean {
  const likes = loadUserLikes();
  const wasLiked = likes.has(id);
  const next = new Set(likes);
  if (wasLiked) next.delete(id);
  else next.add(id);
  saveUserLikes([...next]);

  if (!PLATFORM_TEMPLATE_IDS.has(id)) {
    const stats = loadTemplateStats();
    const cur = stats[id] ?? { useCount: 0, likeCount: 0 };
    stats[id] = { ...cur, likeCount: Math.max(0, cur.likeCount + (wasLiked ? -1 : 1)) };
    saveTemplateStats(stats);
  }

  return next.has(id);
}

/** 获取用户已点赞的模板 ID 集合 */
export function getUserLikes(): Set<string> {
  return loadUserLikes();
}

function loadUserFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(USER_FAVORITES_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveUserFavorites(ids: string[]) {
  localStorage.setItem(USER_FAVORITES_KEY, JSON.stringify(ids));
}

/** 切换收藏状态 */
export function toggleFavorite(id: string): boolean {
  const fav = loadUserFavorites();
  const next = new Set(fav);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  saveUserFavorites([...next]);
  return next.has(id);
}

/** 获取用户已收藏的模板 ID 集合 */
export function getUserFavorites(): Set<string> {
  return loadUserFavorites();
}

/** 获取所有模板的统计（用于排序） */
export function getAllTemplateStats(): Record<string, TemplateStats> {
  return loadTemplateStats();
}
