/**
 * 模板存储：用户保存的模板 + 模板市场（后端未实现时用 localStorage 模拟）
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

const USER_TEMPLATES_KEY = 'h5-video-tool-user-templates';
const MARKET_TEMPLATES_KEY = 'h5-video-tool-market-templates';

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
