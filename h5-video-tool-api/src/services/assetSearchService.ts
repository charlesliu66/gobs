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
 * 按维度标签筛选资产（分页），支持 ai_category 直接筛选
 */
export function listAssets(query: SearchQuery): PagedResult {
  const { username, page = 1, pageSize = 20, filters, aiCategory, folderId } = query;
  const offset = (page - 1) * pageSize;

  const filterKeys = Object.keys(filters).filter(k => ALLOWED_FILTER_KEYS.has(k));

  const conditions: string[] = ['a.username = @username'];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const params: Record<string, any> = { username, limit: pageSize, offset };

  if (aiCategory) {
    conditions.push('a.ai_category = @aiCategory');
    params.aiCategory = aiCategory;
  }

  if (folderId) {
    conditions.push('a.folder_id = @folderId');
    params.folderId = folderId;
  }

  filterKeys.forEach((key, i) => {
    conditions.push(`
      EXISTS (
        SELECT 1 FROM asset_tags t${i}
        WHERE t${i}.asset_id = a.id
          AND t${i}.key = @key_${i}
          AND t${i}.value = @val_${i}
          AND t${i}.status != 'rejected'
      )
    `);
    params[`key_${i}`] = key;
    params[`val_${i}`] = filters[key];
  });

  const whereClause = conditions.join(' AND ');

  const total = (db.prepare(`SELECT COUNT(*) as cnt FROM assets a WHERE ${whereClause}`)
    .get(params) as { cnt: number }).cnt;

  const items = db.prepare(`
    SELECT a.* FROM assets a WHERE ${whereClause}
    ORDER BY a.created_at DESC LIMIT @limit OFFSET @offset
  `).all(params) as AssetRecord[];

  return { items, total, page, pageSize };
}

/**
 * 关键词搜索（filename + ai_description + tag value LIKE），支持 ai_category 筛选
 */
export function searchAssets(query: SearchQuery): PagedResult {
  const { username, q = '', page = 1, pageSize = 20, filters, aiCategory } = query;
  const offset = (page - 1) * pageSize;
  const likeQ = `%${q}%`;

  const filterKeys = Object.keys(filters).filter(k => ALLOWED_FILTER_KEYS.has(k));

  const conditions: string[] = ['a.username = @username'];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const params: Record<string, any> = { username, q: likeQ, limit: pageSize, offset };

  if (aiCategory) {
    conditions.push('a.ai_category = @aiCategory');
    params.aiCategory = aiCategory;
  }

  if (q) {
    conditions.push(`(
      a.filename LIKE @q
      OR a.ai_description LIKE @q
      OR a.ai_category LIKE @q
      OR EXISTS (
        SELECT 1 FROM asset_tags tq
        WHERE tq.asset_id = a.id AND tq.value LIKE @q AND tq.status != 'rejected'
      )
    )`);
  }

  filterKeys.forEach((key, i) => {
    conditions.push(`
      EXISTS (
        SELECT 1 FROM asset_tags t${i}
        WHERE t${i}.asset_id = a.id
          AND t${i}.key = @key_${i}
          AND t${i}.value = @val_${i}
          AND t${i}.status != 'rejected'
      )
    `);
    params[`key_${i}`] = key;
    params[`val_${i}`] = filters[key];
  });

  const whereClause = conditions.join(' AND ');

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
