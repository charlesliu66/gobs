/**
 * TASK-A: 素材检索服务
 * 职责：分页+多维度筛选列表查询、关键词全文检索、facets 统计
 */
import db from '../db/assetDb.js';
import type { AssetRecord, SearchQuery, FacetResult } from '../types/assetLibrary.js';

// 维度筛选键白名单（防止 SQL 注入）
const ALLOWED_FILTER_KEYS = new Set([
  'ratio', 'type', 'orientation', 'duration_range', 'quality',
  'character', 'scene', 'purpose',
]);

interface PagedResult {
  items: AssetRecord[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * 按维度标签筛选资产（分页）
 */
export function listAssets(query: SearchQuery): PagedResult {
  const { username, page = 1, pageSize = 20, filters } = query;
  const offset = (page - 1) * pageSize;

  // 筛选维度（仅允许白名单键）
  const filterKeys = Object.keys(filters).filter(k => ALLOWED_FILTER_KEYS.has(k));

  if (filterKeys.length === 0) {
    // 无筛选，直接查 assets 表
    const total = (db.prepare(`SELECT COUNT(*) as cnt FROM assets WHERE username = @username`)
      .get({ username }) as { cnt: number }).cnt;

    const items = db.prepare(`
      SELECT * FROM assets WHERE username = @username
      ORDER BY created_at DESC LIMIT @limit OFFSET @offset
    `).all({ username, limit: pageSize, offset }) as AssetRecord[];

    return { items, total, page, pageSize };
  }

  // 有筛选：通过 JOIN asset_tags 筛选，每个维度一次 INTERSECT/EXISTS
  // 构建 EXISTS 子查询：每个 filter 条件
  const existsClauses = filterKeys.map((key, i) => `
    EXISTS (
      SELECT 1 FROM asset_tags t${i}
      WHERE t${i}.asset_id = a.id
        AND t${i}.key = @key_${i}
        AND t${i}.value = @val_${i}
        AND t${i}.status != 'rejected'
    )
  `);

  const whereClause = `a.username = @username AND ${existsClauses.join(' AND ')}`;

  // 构建参数
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const params: Record<string, any> = { username, limit: pageSize, offset };
  filterKeys.forEach((key, i) => {
    params[`key_${i}`] = key;
    params[`val_${i}`] = filters[key];
  });

  const total = (db.prepare(`SELECT COUNT(*) as cnt FROM assets a WHERE ${whereClause}`)
    .get(params) as { cnt: number }).cnt;

  const items = db.prepare(`
    SELECT a.* FROM assets a WHERE ${whereClause}
    ORDER BY a.created_at DESC LIMIT @limit OFFSET @offset
  `).all(params) as AssetRecord[];

  return { items, total, page, pageSize };
}

/**
 * 关键词全文搜索（filename + tag value LIKE）
 */
export function searchAssets(query: SearchQuery): PagedResult {
  const { username, q = '', page = 1, pageSize = 20, filters } = query;
  const offset = (page - 1) * pageSize;
  const likeQ = `%${q}%`;

  // 筛选维度
  const filterKeys = Object.keys(filters).filter(k => ALLOWED_FILTER_KEYS.has(k));

  // 构建 EXISTS 子查询
  const existsClauses = filterKeys.map((key, i) => `
    EXISTS (
      SELECT 1 FROM asset_tags t${i}
      WHERE t${i}.asset_id = a.id
        AND t${i}.key = @key_${i}
        AND t${i}.value = @val_${i}
        AND t${i}.status != 'rejected'
    )
  `);

  const keywordClause = q
    ? `(a.filename LIKE @q OR EXISTS (
        SELECT 1 FROM asset_tags tq
        WHERE tq.asset_id = a.id AND tq.value LIKE @q AND tq.status != 'rejected'
      ))`
    : '1=1';

  const filterClause = existsClauses.length > 0 ? `AND ${existsClauses.join(' AND ')}` : '';
  const whereClause = `a.username = @username AND ${keywordClause} ${filterClause}`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const params: Record<string, any> = { username, q: likeQ, limit: pageSize, offset };
  filterKeys.forEach((key, i) => {
    params[`key_${i}`] = key;
    params[`val_${i}`] = filters[key];
  });

  const total = (db.prepare(`SELECT COUNT(*) as cnt FROM assets a WHERE ${whereClause}`)
    .get(params) as { cnt: number }).cnt;

  const items = db.prepare(`
    SELECT a.* FROM assets a WHERE ${whereClause}
    ORDER BY a.created_at DESC LIMIT @limit OFFSET @offset
  `).all(params) as AssetRecord[];

  return { items, total, page, pageSize };
}

/**
 * Facets 统计：各维度 key 的 value 计数
 */
export function getFacets(username: string): FacetResult {
  const rows = db.prepare(`
    SELECT t.key, t.value, COUNT(*) as cnt
    FROM asset_tags t
    JOIN assets a ON t.asset_id = a.id
    WHERE a.username = @username AND t.status != 'rejected'
    GROUP BY t.key, t.value
    ORDER BY t.key, cnt DESC
  `).all({ username }) as Array<{ key: string; value: string; cnt: number }>;

  const result: FacetResult = {};
  for (const row of rows) {
    if (!result[row.key]) result[row.key] = {};
    result[row.key][row.value] = row.cnt;
  }
  return result;
}
