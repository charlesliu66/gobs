/**
 * TASK-A: 资产中台路由
 * 前缀: /api/asset-library
 * 全部需要 JWT 鉴权（由全局 jwtAuthMiddleware 保障）
 * TASK-D: 新增 GET /assets/:id/file 和 GET /assets/:id/highlights
 */
import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import os from 'os';
import jwt from 'jsonwebtoken';
import db from '../db/assetDb.js';
import {
  createImportJob,
  processImportJob,
  getJobStatus,
  decodeFilename,
  fixGarbledFilenames,
} from '../services/assetIngestService.js';

// 服务启动时一次性修复历史乱码文件名
fixGarbledFilenames();
import {
  listAssets,
  searchAssets,
  getFacets,
} from '../services/assetSearchService.js';
import {
  canActorReadAsset,
  normalizeAssetOwnershipScope,
  normalizeAssetSourceProvider,
  normalizeAssetStorageProvider,
  normalizeAssetVisibility,
  resolveActorTeamId,
  type AssetOwnershipScope,
  type AssetVisibility,
} from '../services/assetLibrary.js';
import { getHighlightCandidates } from '../services/assetHighlightService.js';
import { getThumbPath, ensureThumbnail } from '../services/assetThumbnailService.js';
import { buildAssetReuseFields, isTeamAssetCategory } from '../services/assetReuseService.js';

const router = Router();

// ── multer 配置（临时目录，ingestService 负责落盘到最终位置）────────────────────

const MULTER_TMP_DIR = path.join(os.tmpdir(), 'asset-lib-uploads');
import fs from 'fs';
fs.mkdirSync(MULTER_TMP_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, MULTER_TMP_DIR),
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    // 修复 multer latin1→utf8 乱码，临时文件名只保留 ASCII 安全字符
    const decoded = decodeFilename(file.originalname);
    const safe = decoded.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${timestamp}-${safe}`);
  },
});

/**
 * 与 assetIngestService 支持矩阵一致的 MIME + 扩展名白名单。
 * 前端 AssetImportPanel.tsx accept 属性已做初筛；这里是服务器端兜底。
 */
const ASSET_ALLOWED_EXT = /\.(jpe?g|png|webp|gif|bmp|heic|heif|mp4|mov|mkv|avi|webm|ts|flv|wmv|m4v|3gp|ogv|mp3|wav|m4a|aac|ogg)$/i;
function isAllowedAssetFile(file: Express.Multer.File): boolean {
  const mt = (file.mimetype || '').toLowerCase();
  if (mt.startsWith('image/') || mt.startsWith('video/') || mt.startsWith('audio/')) return true;
  return ASSET_ALLOWED_EXT.test(file.originalname);
}

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.ASSET_UPLOAD_MAX_MB || '500', 10) * 1024 * 1024,
    files: 500,
  },
  fileFilter: (_req, file, cb) => {
    if (isAllowedAssetFile(file)) {
      cb(null, true);
      return;
    }
    cb(new Error(`不支持的文件类型（${file.mimetype || path.extname(file.originalname) || '未知'}）`));
  },
});

// ── 辅助函数 ───────────────────────────────────────────────────────────────────

function requireUser(req: Request, res: Response): string | null {
  const username = req.user?.username;
  if (!username) {
    res.status(401).json({ error: '未鉴权' });
    return null;
  }
  return username;
}

function getUsernameFromRequestOrToken(req: Request, res: Response): string | null {
  if (req.user?.username) {
    return req.user.username;
  }

  const queryToken = req.query.token as string | undefined;
  if (!queryToken) {
    res.status(401).json({ error: '未鉴权' });
    return null;
  }

  const secret = process.env.JWT_SECRET || 'gobs-secret-change-in-production';
  try {
    const payload = jwt.verify(queryToken, secret) as { username: string };
    return payload.username;
  } catch {
    res.status(401).json({ error: 'token 无效或已过期' });
    return null;
  }
}

interface ActorContext {
  username: string;
  teamId: string;
}

function getActorContext(username: string): ActorContext {
  return {
    username,
    teamId: resolveActorTeamId(username),
  };
}

function parseVisibilityParam(value: unknown): AssetVisibility | undefined {
  if (value !== 'private' && value !== 'team') {
    return undefined;
  }
  return normalizeAssetVisibility(value);
}

function buildAssetReadConditions(
  alias: string,
  actor: ActorContext,
  scope: AssetOwnershipScope,
  visibility?: AssetVisibility,
): { conditions: string[]; params: Record<string, string> } {
  const prefix = alias ? `${alias}.` : '';
  const conditions: string[] = [];
  const params: Record<string, string> = {
    username: actor.username,
    actorTeamId: actor.teamId,
  };

  if (scope === 'team') {
    conditions.push(`${prefix}visibility = 'team'`);
    conditions.push(`${prefix}team_id = @actorTeamId`);
  } else if (scope === 'all') {
    conditions.push(`(${prefix}username = @username OR (${prefix}visibility = 'team' AND ${prefix}team_id = @actorTeamId))`);
  } else {
    conditions.push(`${prefix}username = @username`);
  }

  if (visibility) {
    conditions.push(`${prefix}visibility = @visibility`);
    params.visibility = visibility;
  }

  return { conditions, params };
}

function canActorReadAssetRecord(item: Record<string, unknown>, actor: ActorContext): boolean {
  return canActorReadAsset(
    {
      ownerId: typeof item.username === 'string' ? item.username : undefined,
      teamId: typeof item.team_id === 'string' ? item.team_id : undefined,
      visibility: typeof item.visibility === 'string' ? normalizeAssetVisibility(item.visibility) : undefined,
    },
    actor,
  );
}

function addAssetResponseFields(item: Record<string, unknown>, token: string, actor: ActorContext) {
  const id = item.id as string;
  const fileUrl = `/api/asset-library/assets/${id}/file?token=${encodeURIComponent(token)}`;
  const thumbUrl = `/api/asset-library/assets/${id}/thumb?token=${encodeURIComponent(token)}`;
  const thumbExists = item.filepath ? fs.existsSync(getThumbPath(item.filepath as string)) : false;
  const ownerId = typeof item.username === 'string' ? item.username : '';
  const sourceProvider = normalizeAssetSourceProvider(
    item.source_provider ?? (item.project_id === 'character-library' ? 'generated' : 'upload'),
  );
  return {
    ...item,
    owner_id: ownerId,
    team_id: typeof item.team_id === 'string' && item.team_id.trim() ? item.team_id : resolveActorTeamId(ownerId),
    visibility: normalizeAssetVisibility(item.visibility),
    storage_provider: normalizeAssetStorageProvider(item.storage_provider),
    storage_key: typeof item.storage_key === 'string' && item.storage_key.trim()
      ? item.storage_key
      : (item.filepath as string | undefined) ?? '',
    source_provider: sourceProvider,
    source_external_id: typeof item.source_external_id === 'string' ? item.source_external_id : null,
    source_name: typeof item.source_name === 'string' && item.source_name.trim()
      ? item.source_name
      : (item.filename as string | undefined) ?? '',
    owned_by_actor: ownerId === actor.username,
    ...buildAssetReuseFields(item as never, { thumbnailReady: thumbExists }),
    file_url: fileUrl,
    thumbnail_url: thumbExists ? thumbUrl : fileUrl,
  };
}

// ── POST /import ───────────────────────────────────────────────────────────────
// 接收 multipart files, 创建 import job 并异步处理

router.post('/import', (req: Request, res: Response) => {
  upload.array('files', 500)(req, res, (err) => {
    if (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '上传失败' });
      return;
    }

    const username = requireUser(req, res);
    if (!username) return;

    const files = (req.files as Express.Multer.File[]) ?? [];
    if (files.length === 0) {
      res.status(400).json({ error: '请选择要上传的文件' });
      return;
    }

    const jobId = createImportJob(username, files.length);
    processImportJob(jobId, username, files);

    res.json({ jobId, total: files.length });
  });
});

// ── GET /import/:jobId ─────────────────────────────────────────────────────────

router.get('/import/:jobId', (req: Request, res: Response) => {
  const username = requireUser(req, res);
  if (!username) return;

  const { jobId } = req.params;
  const job = getJobStatus(jobId, username);
  if (!job) {
    res.status(404).json({ error: '任务不存在' });
    return;
  }
  res.json(job);
});

// ── 辅助：批量加载 tags 并附加到素材列表 ──────────────────────────────────────

function attachTags(items: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  if (items.length === 0) return items;
  const ids = items.map((i) => i.id as string);
  // better-sqlite3 不支持数组绑定，用命名参数展开
  const placeholders = ids.map((_id, idx) => `@id${idx}`).join(',');
  const params: Record<string, string> = {};
  ids.forEach((id, idx) => { params[`id${idx}`] = id; });
  const tagRows = db.prepare(`
    SELECT asset_id, key, value, source, confidence, status
    FROM asset_tags
    WHERE asset_id IN (${placeholders}) AND status != 'rejected'
    ORDER BY asset_id, created_at
  `).all(params) as Array<{
    asset_id: string; key: string; value: string;
    source: string; confidence: number; status: string;
  }>;

  const tagMap = new Map<string, typeof tagRows>();
  for (const row of tagRows) {
    if (!tagMap.has(row.asset_id)) tagMap.set(row.asset_id, []);
    tagMap.get(row.asset_id)!.push(row);
  }
  return items.map((item) => ({
    ...item,
    tags: tagMap.get(item.id as string) ?? [],
  }));
}

// ── GET /assets ────────────────────────────────────────────────────────────────
// 支持维度筛选：ratio, type, orientation, duration_range, quality, character, scene, purpose

router.get('/assets', (req: Request, res: Response) => {
  const username = requireUser(req, res);
  if (!username) return;
  const actor = getActorContext(username);

  const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string || '20', 10)));
  const scope = normalizeAssetOwnershipScope(req.query.scope);
  const visibility = parseVisibilityParam(req.query.visibility);

  const aiCategory = typeof req.query.ai_category === 'string' ? req.query.ai_category : '';
  const folderId = typeof req.query.folder_id === 'string' ? req.query.folder_id : '';

  const FILTER_KEYS = ['ratio', 'type', 'orientation', 'duration_range', 'quality', 'character', 'scene', 'purpose'];
  const filters: Record<string, string> = {};
  for (const key of FILTER_KEYS) {
    const val = req.query[key];
    if (typeof val === 'string' && val) {
      filters[key] = val;
    }
  }

  const result = listAssets({
    username, page, pageSize, filters,
    aiCategory: aiCategory || undefined,
    folderId: folderId || undefined,
    actorTeamId: actor.teamId,
    scope,
    visibility,
  });

  const token = req.headers.authorization?.slice(7) ?? '';

  const favoriteSet = new Set(
    (db.prepare(`SELECT asset_id FROM asset_favorites WHERE user_id = @user_id`)
      .all({ user_id: username }) as Array<{ asset_id: string }>)
      .map(r => r.asset_id)
  );

  const itemsWithUrl = result.items.map((item) => ({
    ...addAssetResponseFields(item as unknown as Record<string, unknown>, token, actor),
    is_favorite: favoriteSet.has(item.id),
  }));
  const assetsWithTags = attachTags(itemsWithUrl as Array<Record<string, unknown>>);
  res.json({ total: result.total, page: result.page, pageSize: result.pageSize, assets: assetsWithTags });
});

// ── GET /assets/:id/thumb ──────────────────────────────────────────────────────

router.get('/assets/:id/thumb', (req: Request, res: Response) => {
  let username = req.user?.username;
  if (!username) {
    const queryToken = req.query.token as string | undefined;
    if (queryToken) {
      const secret = process.env.JWT_SECRET || 'gobs-secret-change-in-production';
      try {
        const payload = jwt.verify(queryToken, secret) as { username: string };
        username = payload.username;
      } catch {
        res.status(401).json({ error: 'token 无效或已过期' });
        return;
      }
    } else {
      res.status(401).json({ error: '未鉴权' });
      return;
    }
  }
  const actor = getActorContext(username);

  const { id: assetId } = req.params;
  const asset = db.prepare(
    `SELECT id, username, team_id, visibility, filepath, mimetype FROM assets WHERE id = @id`
  ).get({ id: assetId }) as Record<string, unknown> | undefined;

  if (!asset) { res.status(404).json({ error: '资产不存在' }); return; }
  if (!canActorReadAssetRecord(asset, actor)) { res.status(403).json({ error: '无权访问' }); return; }

  const filepath = asset.filepath as string;
  const mimetype = (asset.mimetype as string) || 'application/octet-stream';
  const thumbPath = getThumbPath(filepath);
  if (fs.existsSync(thumbPath)) {
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'private, max-age=86400');
    const stream = fs.createReadStream(thumbPath);
    stream.pipe(res);
    stream.on('error', () => {
      if (!res.headersSent) res.status(500).json({ error: '读取失败' });
    });
    return;
  }

  // 缩略图不存在时异步生成并回退到原文件
  void ensureThumbnail(filepath, mimetype);
  if (fs.existsSync(filepath)) {
    res.setHeader('Content-Type', mimetype);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    const stream = fs.createReadStream(filepath);
    stream.pipe(res);
    stream.on('error', () => {
      if (!res.headersSent) res.status(500).json({ error: '文件读取失败' });
    });
  } else {
    res.status(404).json({ error: '文件不存在' });
  }
});

// ── GET /assets/:id/file ───────────────────────────────────────────────────────
// TASK-D: 提供资产文件直接访问（支持 ?token= query 认证，供 img/video 标签使用）

router.get('/assets/:id/file', (req: Request, res: Response) => {
  // 支持从 query param 获取 token（img/video 标签无法携带 Authorization header）
  let username = req.user?.username;
  if (!username) {
    const queryToken = req.query.token as string | undefined;
    if (queryToken) {
      const secret = process.env.JWT_SECRET || 'gobs-secret-change-in-production';
      try {
        const payload = jwt.verify(queryToken, secret) as { username: string };
        username = payload.username;
      } catch {
        res.status(401).json({ error: 'token 无效或已过期' });
        return;
      }
    } else {
      res.status(401).json({ error: '未鉴权' });
      return;
    }
  }
  const actor = getActorContext(username);

  const { id: assetId } = req.params;
  const asset = db.prepare(
    `SELECT id, username, team_id, visibility, filepath, mimetype, filename FROM assets WHERE id = @id`
  ).get({ id: assetId }) as Record<string, unknown> | undefined;

  if (!asset) {
    res.status(404).json({ error: '资产不存在' });
    return;
  }
  if (!canActorReadAssetRecord(asset, actor)) {
    res.status(403).json({ error: '无权访问他人资产' });
    return;
  }
  const filepath = asset.filepath as string;
  const mimetype = (asset.mimetype as string) || 'application/octet-stream';
  const filename = (asset.filename as string) || 'asset';
  if (!fs.existsSync(filepath)) {
    res.status(404).json({ error: '文件不存在' });
    return;
  }

  res.setHeader('Content-Type', mimetype);
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);
  res.setHeader('Cache-Control', 'private, max-age=3600');
  const stream = fs.createReadStream(filepath);
  stream.pipe(res);
  stream.on('error', () => {
    if (!res.headersSent) res.status(500).json({ error: '文件读取失败' });
  });
});

// ── GET /assets/:id/highlights ─────────────────────────────────────────────────
// TASK-D: 视频素材高光候选时间点

router.get('/assets/:id/highlights', (req: Request, res: Response) => {
  const username = requireUser(req, res);
  if (!username) return;
  const actor = getActorContext(username);

  const { id: assetId } = req.params;

  // 验证资产归属
  const asset = db.prepare(`SELECT id, username, team_id, visibility FROM assets WHERE id = @id`).get({ id: assetId }) as
    | Record<string, unknown>
    | undefined;

  if (!asset) {
    res.status(404).json({ error: '资产不存在' });
    return;
  }
  if (!canActorReadAssetRecord(asset, actor)) {
    res.status(403).json({ error: '无权访问他人资产' });
    return;
  }

  // 异步执行，不阻塞事件循环
  getHighlightCandidates(assetId)
    .then((highlights) => res.json({ highlights }))
    .catch((err) => {
      console.error('[highlights] error:', err);
      res.json({ highlights: [] });
    });
});

// ── PATCH /assets/:id/tags ─────────────────────────────────────────────────────
// 单条标签编辑（confirm / reject / modify）
// body: { key, value, status?, action: 'upsert' | 'delete' }

router.patch('/assets/:id/tags', (req: Request, res: Response) => {
  const username = requireUser(req, res);
  if (!username) return;

  const { id: assetId } = req.params;

  // 验证资产归属
  const asset = db.prepare(`SELECT id, username FROM assets WHERE id = @id`).get({ id: assetId }) as
    | { id: string; username: string }
    | undefined;

  if (!asset) {
    res.status(404).json({ error: '资产不存在' });
    return;
  }
  if (asset.username !== username) {
    res.status(403).json({ error: '无权操作他人资产' });
    return;
  }

  const { key, value, status = 'confirmed', action = 'upsert', source = 'human' } = req.body as {
    key: string;
    value: string;
    status?: string;
    action?: 'upsert' | 'delete';
    source?: string;
  };

  if (!key) {
    res.status(400).json({ error: '缺少 key 字段' });
    return;
  }

  const now = new Date().toISOString();

  if (action === 'delete') {
    // 删除匹配的 tag
    db.prepare(`DELETE FROM asset_tags WHERE asset_id = @asset_id AND key = @key AND value = @value`)
      .run({ asset_id: assetId, key, value });
    res.json({ ok: true, action: 'deleted' });
    return;
  }

  // upsert: 先删除同 key 的旧 tag（human 操作覆盖），再 INSERT
  if (source === 'human') {
    db.prepare(`DELETE FROM asset_tags WHERE asset_id = @asset_id AND key = @key AND source = 'human'`)
      .run({ asset_id: assetId, key });
  }

  db.prepare(`
    INSERT INTO asset_tags (asset_id, key, value, source, confidence, status, created_at)
    VALUES (@asset_id, @key, @value, @source, 1.0, @status, @created_at)
  `).run({ asset_id: assetId, key, value, source, status, created_at: now });

  // 同时更新 assets.updated_at
  db.prepare(`UPDATE assets SET updated_at = @now WHERE id = @id`).run({ now, id: assetId });

  res.json({ ok: true, action: 'upserted' });
});

// ── PATCH /assets/:id/category ────────────────────────────────────────────────
// 手动修正团队复用分类，保留 AI 分类原始结果。

router.patch('/assets/:id/category', (req: Request, res: Response) => {
  const username = requireUser(req, res);
  if (!username) return;
  const actor = getActorContext(username);

  const { id: assetId } = req.params;
  const { teamCategory, team_category: snakeTeamCategory } = req.body as {
    teamCategory?: string;
    team_category?: string;
  };
  const requestedCategory = (teamCategory ?? snakeTeamCategory ?? '').trim();
  if (!isTeamAssetCategory(requestedCategory)) {
    res.status(400).json({ error: '不支持的素材分类' });
    return;
  }

  const asset = db.prepare(`SELECT * FROM assets WHERE id = @id`).get({ id: assetId }) as
    | Record<string, unknown>
    | undefined;

  if (!asset) {
    res.status(404).json({ error: '资产不存在' });
    return;
  }
  if (asset.username !== username) {
    res.status(403).json({ error: '无权操作他人资产' });
    return;
  }

  const now = new Date().toISOString();
  db.transaction(() => {
    db.prepare(`
      UPDATE assets SET team_category = @team_category, updated_at = @now WHERE id = @id
    `).run({ id: assetId, team_category: requestedCategory, now });

    db.prepare(`
      DELETE FROM asset_tags WHERE asset_id = @asset_id AND key = 'team_category' AND source = 'human'
    `).run({ asset_id: assetId });

    db.prepare(`
      INSERT INTO asset_tags (asset_id, key, value, source, confidence, status, created_at)
      VALUES (@asset_id, 'team_category', @value, 'human', 1.0, 'confirmed', @created_at)
    `).run({ asset_id: assetId, value: requestedCategory, created_at: now });
  })();

  const updated = db.prepare(`SELECT * FROM assets WHERE id = @id`).get({ id: assetId }) as Record<string, unknown>;
  const token = req.headers.authorization?.slice(7) ?? '';
  const withTags = attachTags([addAssetResponseFields(updated, token, actor)])[0];
  res.json({ ok: true, asset: withTags });
});

// ── POST /assets/batch-tags ────────────────────────────────────────────────────
// 批量更新标签
// body: { updates: Array<{ assetId, key, value, status?, action? }> }

router.post('/assets/batch-tags', (req: Request, res: Response) => {
  const username = requireUser(req, res);
  if (!username) return;

  const { updates } = req.body as {
    updates: Array<{
      assetId: string;
      key: string;
      value: string;
      status?: string;
      action?: 'upsert' | 'delete';
      source?: string;
    }>;
  };

  if (!Array.isArray(updates) || updates.length === 0) {
    res.status(400).json({ error: '缺少 updates 数组' });
    return;
  }

  const now = new Date().toISOString();
  const results: Array<{ assetId: string; key: string; result: string }> = [];

  const batchUpdate = db.transaction(() => {
    for (const u of updates) {
      const { assetId, key, value, status = 'confirmed', action = 'upsert', source = 'human' } = u;

      // 验证归属
      const asset = db.prepare(`SELECT username FROM assets WHERE id = @id`).get({ id: assetId }) as
        | { username: string }
        | undefined;

      if (!asset || asset.username !== username) {
        results.push({ assetId, key, result: 'forbidden' });
        continue;
      }

      if (action === 'delete') {
        db.prepare(`DELETE FROM asset_tags WHERE asset_id = @asset_id AND key = @key AND value = @value`)
          .run({ asset_id: assetId, key, value });
        results.push({ assetId, key, result: 'deleted' });
      } else {
        if (source === 'human') {
          db.prepare(`DELETE FROM asset_tags WHERE asset_id = @asset_id AND key = @key AND source = 'human'`)
            .run({ asset_id: assetId, key });
        }
        db.prepare(`
          INSERT INTO asset_tags (asset_id, key, value, source, confidence, status, created_at)
          VALUES (@asset_id, @key, @value, @source, 1.0, @status, @created_at)
        `).run({ asset_id: assetId, key, value, source, status, created_at: now });
        db.prepare(`UPDATE assets SET updated_at = @now WHERE id = @id`).run({ now, id: assetId });
        results.push({ assetId, key, result: 'upserted' });
      }
    }
  });

  batchUpdate();
  res.json({ ok: true, results });
});

// ── GET /pending-tags ──────────────────────────────────────────────────────────
// 分页返回待确认标签，避免一次拉取全部

router.get('/pending-tags', (req: Request, res: Response) => {
  const username = requireUser(req, res);
  if (!username) return;

  const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
  const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize as string || '20', 10)));
  const offset = (page - 1) * pageSize;

  const totalRow = db.prepare(`
    SELECT COUNT(*) as cnt FROM asset_tags t
    JOIN assets a ON a.id = t.asset_id
    WHERE a.username = @username AND t.status = 'pending'
  `).get({ username }) as { cnt: number };

  const rows = db.prepare(`
    SELECT t.asset_id, t.key, t.value, t.source, t.confidence, t.status, t.created_at,
           a.filename, a.mimetype, a.ai_category
    FROM asset_tags t
    JOIN assets a ON a.id = t.asset_id
    WHERE a.username = @username AND t.status = 'pending'
    ORDER BY t.created_at DESC
    LIMIT @limit OFFSET @offset
  `).all({ username, limit: pageSize, offset }) as Array<{
    asset_id: string; key: string; value: string; source: string;
    confidence: number; status: string; created_at: string;
    filename: string; mimetype: string; ai_category: string;
  }>;

  res.json({
    total: totalRow.cnt,
    page,
    pageSize,
    items: rows.map((r) => ({
      asset_id: r.asset_id,
      filename: r.filename,
      mimetype: r.mimetype,
      ai_category: r.ai_category,
      tag: { key: r.key, value: r.value, source: r.source, confidence: r.confidence, status: r.status },
    })),
  });
});

// ── GET /search ────────────────────────────────────────────────────────────────
// 关键词全文搜索 + 维度筛选

router.get('/search', (req: Request, res: Response) => {
  const username = requireUser(req, res);
  if (!username) return;
  const actor = getActorContext(username);

  const q = typeof req.query.q === 'string' ? req.query.q : '';
  const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string || '20', 10)));
  const aiCategory = typeof req.query.ai_category === 'string' ? req.query.ai_category : '';
  const scope = normalizeAssetOwnershipScope(req.query.scope);
  const visibility = parseVisibilityParam(req.query.visibility);

  const FILTER_KEYS = ['ratio', 'type', 'orientation', 'duration_range', 'quality', 'character', 'scene', 'purpose'];
  const filters: Record<string, string> = {};
  for (const key of FILTER_KEYS) {
    const val = req.query[key];
    if (typeof val === 'string' && val) {
      filters[key] = val;
    }
  }

  const result = searchAssets({
    username,
    q,
    page,
    pageSize,
    filters,
    aiCategory,
    actorTeamId: actor.teamId,
    scope,
    visibility,
  });
  const token = req.headers.authorization?.slice(7) ?? '';

  const favoriteSet = new Set(
    (db.prepare(`SELECT asset_id FROM asset_favorites WHERE user_id = @user_id`)
      .all({ user_id: username }) as Array<{ asset_id: string }>)
      .map(r => r.asset_id)
  );

  const itemsWithUrl = result.items.map((item) => ({
    ...addAssetResponseFields(item as unknown as Record<string, unknown>, token, actor),
    is_favorite: favoriteSet.has(item.id),
  }));
  const assetsWithTags = attachTags(itemsWithUrl as Array<Record<string, unknown>>);
  res.json({ total: result.total, page: result.page, pageSize: result.pageSize, assets: assetsWithTags });
});

// ── GET /facets ────────────────────────────────────────────────────────────────

router.get('/facets', (req: Request, res: Response) => {
  const username = requireUser(req, res);
  if (!username) return;
  const actor = getActorContext(username);
  const scope = normalizeAssetOwnershipScope(req.query.scope);
  const visibility = parseVisibilityParam(req.query.visibility);

  const result = getFacets({
    username,
    actorTeamId: actor.teamId,
    scope,
    visibility,
  });
  res.json(result);
});

// ── GET /categories ─────────────────────────────────────────────────────────
// 返回团队分类优先、AI 分类兜底的素材计数（虚拟文件夹）

router.get('/categories', (req: Request, res: Response) => {
  const username = requireUser(req, res);
  if (!username) return;
  const actor = getActorContext(username);
  const scope = normalizeAssetOwnershipScope(req.query.scope);
  const visibility = parseVisibilityParam(req.query.visibility);
  const scoped = buildAssetReadConditions('', actor, scope, visibility);

  const rows = db.prepare(`
    SELECT COALESCE(team_category, ai_category, '未分类') as category, COUNT(*) as count
    FROM assets
    WHERE deleted_at IS NULL AND ${scoped.conditions.join(' AND ')}
    GROUP BY COALESCE(team_category, ai_category, '未分类')
    ORDER BY count DESC
  `).all(scoped.params) as Array<{ category: string; count: number }>;

  const total = rows.reduce((s, r) => s + r.count, 0);
  res.json({ categories: rows, total });
});

// ── POST /favorites/:assetId ────────────────────────────────────────────────
// 收藏素材

router.post('/favorites/:assetId', (req: Request, res: Response) => {
  const username = requireUser(req, res);
  if (!username) return;
  const actor = getActorContext(username);

  const { assetId } = req.params;
  const asset = db.prepare(`SELECT id, username, team_id, visibility FROM assets WHERE id = @id`)
    .get({ id: assetId }) as Record<string, unknown> | undefined;
  if (!asset) {
    res.status(404).json({ error: '素材不存在' });
    return;
  }
  if (!canActorReadAssetRecord(asset, actor)) {
    res.status(403).json({ error: '无权访问' });
    return;
  }

  db.prepare(`
    INSERT OR IGNORE INTO asset_favorites (user_id, asset_id, created_at)
    VALUES (@user_id, @asset_id, datetime('now'))
  `).run({ user_id: username, asset_id: assetId });

  res.json({ ok: true });
});

// ── DELETE /assets/:id ──────────────────────────────────────────────────────
// 软删除单个素材（标记 deleted_at，不物理删文件）

router.delete('/assets/:id', (req: Request, res: Response) => {
  const username = requireUser(req, res);
  if (!username) return;

  const { id } = req.params;
  const asset = db.prepare(`SELECT id, username FROM assets WHERE id = @id`)
    .get({ id }) as { id: string; username: string } | undefined;

  if (!asset) { res.status(404).json({ error: '素材不存在' }); return; }
  if (asset.username !== username) { res.status(403).json({ error: '无权操作' }); return; }

  db.prepare(`UPDATE assets SET deleted_at = datetime('now') WHERE id = @id`).run({ id });
  db.prepare(`DELETE FROM asset_favorites WHERE asset_id = @id`).run({ id });

  res.json({ ok: true });
});

// ── POST /assets/batch-delete ──────────────────────────────────────────────
// 批量软删除素材

router.post('/assets/batch-delete', (req: Request, res: Response) => {
  const username = requireUser(req, res);
  if (!username) return;

  const { ids } = req.body as { ids?: string[] };
  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: '请提供要删除的素材 ID 列表' });
    return;
  }
  if (ids.length > 200) {
    res.status(400).json({ error: '单次最多删除 200 个素材' });
    return;
  }

  const deletedIds: string[] = [];
  const txn = db.transaction(() => {
    for (const id of ids) {
      const asset = db.prepare(`SELECT id, username FROM assets WHERE id = @id AND deleted_at IS NULL`)
        .get({ id }) as { id: string; username: string } | undefined;
      if (!asset || asset.username !== username) continue;

      db.prepare(`UPDATE assets SET deleted_at = datetime('now') WHERE id = @id`).run({ id });
      db.prepare(`DELETE FROM asset_favorites WHERE asset_id = @id`).run({ id });
      deletedIds.push(id);
    }
  });
  txn();

  res.json({ ok: true, deleted: deletedIds.length, ids: deletedIds });
});

// ── DELETE /favorites/:assetId ──────────────────────────────────────────────
// 取消收藏

router.delete('/favorites/:assetId', (req: Request, res: Response) => {
  const username = requireUser(req, res);
  if (!username) return;

  const { assetId } = req.params;
  db.prepare(`DELETE FROM asset_favorites WHERE user_id = @user_id AND asset_id = @asset_id`)
    .run({ user_id: username, asset_id: assetId });

  res.json({ ok: true });
});

// ── GET /favorites ──────────────────────────────────────────────────────────
// 收藏列表

router.get('/favorites', (req: Request, res: Response) => {
  const username = requireUser(req, res);
  if (!username) return;
  const actor = getActorContext(username);

  const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string || '24', 10)));
  const offset = (page - 1) * pageSize;

  const total = (db.prepare(`
    SELECT COUNT(*) as cnt FROM asset_favorites f
    JOIN assets a ON f.asset_id = a.id
    WHERE f.user_id = @username
      AND (a.username = @username OR (a.visibility = 'team' AND a.team_id = @actorTeamId))
  `).get({ username, actorTeamId: actor.teamId }) as { cnt: number }).cnt;

  const items = db.prepare(`
    SELECT a.* FROM assets a
    JOIN asset_favorites f ON f.asset_id = a.id
    WHERE f.user_id = @username
      AND (a.username = @username OR (a.visibility = 'team' AND a.team_id = @actorTeamId))
    ORDER BY f.created_at DESC
    LIMIT @limit OFFSET @offset
  `).all({ username, actorTeamId: actor.teamId, limit: pageSize, offset }) as Array<Record<string, unknown>>;

  const token = req.headers.authorization?.slice(7) ?? '';
  const itemsWithUrl = items.map((item) => ({
    ...addAssetResponseFields(item, token, actor),
    is_favorite: true,
  }));
  const assetsWithTags = attachTags(itemsWithUrl);

  res.json({ assets: assetsWithTags, total, page, pageSize });
});

// ── POST /usage ─────────────────────────────────────────────────────────────
// 记录素材使用

router.post('/usage', (req: Request, res: Response) => {
  const username = requireUser(req, res);
  if (!username) return;
  const actor = getActorContext(username);

  const { assetId, context } = req.body as { assetId?: string; context?: string };
  if (!assetId) {
    res.status(400).json({ error: '缺少 assetId' });
    return;
  }
  const asset = db.prepare(`SELECT id, username, team_id, visibility FROM assets WHERE id = @id`)
    .get({ id: assetId }) as Record<string, unknown> | undefined;
  if (!asset) {
    res.status(404).json({ error: '素材不存在' });
    return;
  }
  if (!canActorReadAssetRecord(asset, actor)) {
    res.status(403).json({ error: '无权访问' });
    return;
  }

  db.prepare(`
    INSERT INTO asset_usage_log (user_id, asset_id, context, used_at)
    VALUES (@user_id, @asset_id, @context, datetime('now'))
  `).run({ user_id: username, asset_id: assetId, context: context ?? null });

  res.json({ ok: true });
});

// ── GET /recent ─────────────────────────────────────────────────────────────
// 最近使用列表（去重，按最后使用时间排序）

router.get('/recent', (req: Request, res: Response) => {
  const username = requireUser(req, res);
  if (!username) return;
  const actor = getActorContext(username);

  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string || '50', 10)));

  const items = db.prepare(`
    SELECT a.*, MAX(u.used_at) as last_used_at FROM assets a
    JOIN asset_usage_log u ON u.asset_id = a.id
    WHERE u.user_id = @username
      AND (a.username = @username OR (a.visibility = 'team' AND a.team_id = @actorTeamId))
    GROUP BY a.id
    ORDER BY last_used_at DESC
    LIMIT @limit
  `).all({ username, actorTeamId: actor.teamId, limit }) as Array<Record<string, unknown>>;

  const token = req.headers.authorization?.slice(7) ?? '';

  const favoriteSet = new Set(
    (db.prepare(`SELECT asset_id FROM asset_favorites WHERE user_id = @user_id`)
      .all({ user_id: username }) as Array<{ asset_id: string }>)
      .map(r => r.asset_id)
  );

  const itemsWithUrl = items.map((item) => ({
    ...addAssetResponseFields(item, token, actor),
    is_favorite: favoriteSet.has(item.id as string),
  }));
  const assetsWithTags = attachTags(itemsWithUrl);

  res.json({ assets: assetsWithTags, total: items.length });
});

// ── POST /generate-thumbnails ───────────────────────────────────────────────
// 批量为存量素材补生成缩略图

router.post('/generate-thumbnails', async (req: Request, res: Response) => {
  const username = requireUser(req, res);
  if (!username) return;

  try {
    const assets = db.prepare(
      `SELECT id, filepath, mimetype FROM assets WHERE username = @username`
    ).all({ username }) as Array<{ id: string; filepath: string; mimetype: string }>;

    let generated = 0;
    let skipped = 0;
    let failed = 0;

    for (const asset of assets) {
      if (!asset.filepath || !fs.existsSync(asset.filepath)) { failed++; continue; }
      if (fs.existsSync(getThumbPath(asset.filepath))) { skipped++; continue; }
      const result = await ensureThumbnail(asset.filepath, asset.mimetype);
      if (result) generated++;
      else failed++;
    }

    res.json({ total: assets.length, generated, skipped, failed });
  } catch (err) {
    console.error('[generate-thumbnails]', err);
    res.status(500).json({ error: err instanceof Error ? err.message : '缩略图生成失败' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// Phase 3: 自定义文件夹 CRUD
// ══════════════════════════════════════════════════════════════════════════════

// ── GET /folders ─────────────────────────────────────────────────────────────

router.get('/folders', (req: Request, res: Response) => {
  const username = requireUser(req, res);
  if (!username) return;

  const rows = db.prepare(`
    SELECT f.*, (SELECT COUNT(*) FROM assets a WHERE a.folder_id = f.id AND a.username = @username) as asset_count
    FROM asset_folders f
    WHERE f.username = @username
    ORDER BY f.sort_order, f.name
  `).all({ username }) as Array<Record<string, unknown>>;

  res.json({ folders: rows });
});

// ── POST /folders ────────────────────────────────────────────────────────────

router.post('/folders', (req: Request, res: Response) => {
  const username = requireUser(req, res);
  if (!username) return;

  const { name, parentId } = req.body as { name?: string; parentId?: string };
  if (!name || !name.trim()) {
    res.status(400).json({ error: '文件夹名称不能为空' });
    return;
  }

  if (parentId) {
    const depth = getFolderDepth(parentId, username);
    if (depth >= 3) {
      res.status(400).json({ error: '文件夹最多嵌套 3 层' });
      return;
    }
  }

  const id = `folder_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO asset_folders (id, username, parent_id, name, sort_order, created_at, updated_at)
    VALUES (@id, @username, @parent_id, @name, 0, @now, @now)
  `).run({ id, username, parent_id: parentId ?? null, name: name.trim(), now });

  res.json({ folder: { id, username, parent_id: parentId ?? null, name: name.trim(), sort_order: 0, created_at: now, updated_at: now } });
});

// ── PATCH /folders/:id ───────────────────────────────────────────────────────

router.patch('/folders/:id', (req: Request, res: Response) => {
  const username = requireUser(req, res);
  if (!username) return;

  const { id } = req.params;
  const folder = db.prepare(`SELECT * FROM asset_folders WHERE id = @id AND username = @username`)
    .get({ id, username }) as Record<string, unknown> | undefined;

  if (!folder) {
    res.status(404).json({ error: '文件夹不存在' });
    return;
  }

  const { name, sortOrder } = req.body as { name?: string; sortOrder?: number };
  const now = new Date().toISOString();

  if (name !== undefined) {
    if (!name.trim()) { res.status(400).json({ error: '名称不能为空' }); return; }
    db.prepare(`UPDATE asset_folders SET name = @name, updated_at = @now WHERE id = @id`)
      .run({ name: name.trim(), now, id });
  }
  if (sortOrder !== undefined) {
    db.prepare(`UPDATE asset_folders SET sort_order = @sort, updated_at = @now WHERE id = @id`)
      .run({ sort: sortOrder, now, id });
  }

  res.json({ ok: true });
});

// ── DELETE /folders/:id ──────────────────────────────────────────────────────

router.delete('/folders/:id', (req: Request, res: Response) => {
  const username = requireUser(req, res);
  if (!username) return;

  const { id } = req.params;
  const folder = db.prepare(`SELECT * FROM asset_folders WHERE id = @id AND username = @username`)
    .get({ id, username }) as Record<string, unknown> | undefined;

  if (!folder) {
    res.status(404).json({ error: '文件夹不存在' });
    return;
  }

  db.transaction(() => {
    db.prepare(`UPDATE assets SET folder_id = NULL WHERE folder_id = @id AND username = @username`)
      .run({ id, username });
    db.prepare(`UPDATE asset_folders SET parent_id = NULL WHERE parent_id = @id AND username = @username`)
      .run({ id, username });
    db.prepare(`DELETE FROM asset_folders WHERE id = @id AND username = @username`)
      .run({ id, username });
  })();

  res.json({ ok: true });
});

// ── POST /folders/:id/move-assets ────────────────────────────────────────────

router.post('/folders/:id/move-assets', (req: Request, res: Response) => {
  const username = requireUser(req, res);
  if (!username) return;

  const { id: folderId } = req.params;
  const { assetIds } = req.body as { assetIds?: string[] };

  if (!Array.isArray(assetIds) || assetIds.length === 0) {
    res.status(400).json({ error: '缺少 assetIds' });
    return;
  }

  const targetFolderId = folderId === 'none' ? null : folderId;

  if (targetFolderId) {
    const folder = db.prepare(`SELECT id FROM asset_folders WHERE id = @id AND username = @username`)
      .get({ id: targetFolderId, username }) as { id: string } | undefined;
    if (!folder) {
      res.status(404).json({ error: '目标文件夹不存在' });
      return;
    }
  }

  const now = new Date().toISOString();
  const stmt = db.prepare(`UPDATE assets SET folder_id = @folder_id, updated_at = @now WHERE id = @id AND username = @username`);
  const moveAll = db.transaction(() => {
    for (const aid of assetIds) {
      stmt.run({ folder_id: targetFolderId, now, id: aid, username });
    }
  });
  moveAll();

  res.json({ ok: true, moved: assetIds.length });
});

function getFolderDepth(folderId: string, username: string): number {
  let depth = 1;
  let current = folderId;
  while (depth < 10) {
    const row = db.prepare(`SELECT parent_id FROM asset_folders WHERE id = @id AND username = @username`)
      .get({ id: current, username }) as { parent_id: string | null } | undefined;
    if (!row || !row.parent_id) break;
    current = row.parent_id;
    depth++;
  }
  return depth;
}

// ══════════════════════════════════════════════════════════════════════════════
// AI 一键整理
// ══════════════════════════════════════════════════════════════════════════════

router.post('/auto-organize', async (req: Request, res: Response) => {
  const username = requireUser(req, res);
  if (!username) return;

  try {
    const now = new Date().toISOString();

    // Step 1: AI 打标所有 ai_category='未分类' 的素材
    const uncategorized = db.prepare(
      `SELECT id FROM assets WHERE username = @username AND (ai_category IS NULL OR ai_category = '未分类')`
    ).all({ username }) as Array<{ id: string }>;

    let taggedCount = 0;
    if (uncategorized.length > 0) {
      const { aiTagAsset } = await import('../services/assetTaggingService.js');
      for (const row of uncategorized) {
        try {
          await aiTagAsset(row.id);
          taggedCount++;
        } catch {
          // non-blocking
        }
      }
    }

    // Step 2: 文件名前缀分析 — 对仍然未分类的素材，用文件名前缀推断分组
    const stillUncategorized = db.prepare(
      `SELECT id, filename FROM assets WHERE username = @username AND (ai_category IS NULL OR ai_category = '未分类') AND (folder_id IS NULL)`
    ).all({ username }) as Array<{ id: string; filename: string }>;

    const prefixGroups = new Map<string, string[]>();
    for (const row of stillUncategorized) {
      const base = row.filename.replace(/\.[^.]+$/, '');
      // 提取中文前缀（去掉尾部数字/标点）或英文前缀
      const m = base.match(/^([\u4e00-\u9fff]+)/);
      if (m && m[1].length >= 2) {
        const prefix = m[1];
        if (!prefixGroups.has(prefix)) prefixGroups.set(prefix, []);
        prefixGroups.get(prefix)!.push(row.id);
      }
    }
    // 只对 >=2 个文件共享前缀的才建文件夹
    for (const [prefix, ids] of prefixGroups) {
      if (ids.length < 2) prefixGroups.delete(prefix);
    }

    // Step 3: 获取用户现有文件夹（name -> id 映射）
    const existingFolders = db.prepare(
      `SELECT id, name FROM asset_folders WHERE username = @username AND parent_id IS NULL`
    ).all({ username }) as Array<{ id: string; name: string }>;

    const folderMap = new Map<string, string>();
    for (const f of existingFolders) {
      folderMap.set(f.name, f.id);
    }

    function getOrCreateFolder(name: string): string {
      if (folderMap.has(name)) return folderMap.get(name)!;
      const id = `folder_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      db.prepare(`
        INSERT INTO asset_folders (id, username, parent_id, name, sort_order, created_at, updated_at)
        VALUES (@id, @username, NULL, @name, 0, @now, @now)
      `).run({ id, username, name, now });
      folderMap.set(name, id);
      return id;
    }

    const createdFolders: string[] = [];
    let movedCount = 0;
    const initialFolderCount = existingFolders.length;

    // Step 4: 按 ai_category 归入文件夹
    const categorized = db.prepare(
      `SELECT id, ai_category FROM assets WHERE username = @username AND ai_category IS NOT NULL AND ai_category != '未分类' AND (folder_id IS NULL)`
    ).all({ username }) as Array<{ id: string; ai_category: string }>;

    const updateFolder = db.prepare(
      `UPDATE assets SET folder_id = @folder_id, updated_at = @now WHERE id = @id AND username = @username`
    );

    db.transaction(() => {
      for (const row of categorized) {
        const folderId = getOrCreateFolder(row.ai_category);
        updateFolder.run({ folder_id: folderId, now, id: row.id, username });
        movedCount++;
      }

      // Step 5: 文件名前缀分组归入
      for (const [prefix, ids] of prefixGroups) {
        const folderId = getOrCreateFolder(prefix);
        for (const id of ids) {
          updateFolder.run({ folder_id: folderId, now, id, username });
          movedCount++;
        }
      }
    })();

    // 计算新建的文件夹
    for (const [name] of folderMap) {
      if (!existingFolders.find(f => f.name === name)) {
        createdFolders.push(name);
      }
    }

    const stillUncat = (db.prepare(
      `SELECT COUNT(*) as cnt FROM assets WHERE username = @username AND (folder_id IS NULL)`
    ).get({ username }) as { cnt: number }).cnt;

    res.json({
      created_folders: createdFolders,
      moved_count: movedCount,
      tagged_count: taggedCount,
      still_uncategorized: stillUncat,
      total_folders: initialFolderCount + createdFolders.length,
    });

  } catch (err) {
    console.error('[auto-organize] Error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
});

export default router;
