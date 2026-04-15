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
import { getHighlightCandidates } from '../services/assetHighlightService.js';

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

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.ASSET_UPLOAD_MAX_MB || '500', 10) * 1024 * 1024,
    files: 500,
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

  const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string || '20', 10)));

  const FILTER_KEYS = ['ratio', 'type', 'orientation', 'duration_range', 'quality', 'character', 'scene', 'purpose'];
  const filters: Record<string, string> = {};
  for (const key of FILTER_KEYS) {
    const val = req.query[key];
    if (typeof val === 'string' && val) {
      filters[key] = val;
    }
  }

  const result = listAssets({ username, page, pageSize, filters });
  const token = req.headers.authorization?.slice(7) ?? '';
  const itemsWithUrl = result.items.map((item) => ({
    ...item,
    file_url: `/api/asset-library/assets/${item.id}/file?token=${encodeURIComponent(token)}`,
  }));
  const assetsWithTags = attachTags(itemsWithUrl as Array<Record<string, unknown>>);
  res.json({ total: result.total, page: result.page, pageSize: result.pageSize, assets: assetsWithTags });
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

  const { id: assetId } = req.params;
  const asset = db.prepare(
    `SELECT id, username, filepath, mimetype, filename FROM assets WHERE id = @id`
  ).get({ id: assetId }) as { id: string; username: string; filepath: string; mimetype: string; filename: string } | undefined;

  if (!asset) {
    res.status(404).json({ error: '资产不存在' });
    return;
  }
  if (asset.username !== username) {
    res.status(403).json({ error: '无权访问他人资产' });
    return;
  }
  if (!fs.existsSync(asset.filepath)) {
    res.status(404).json({ error: '文件不存在' });
    return;
  }

  res.setHeader('Content-Type', asset.mimetype || 'application/octet-stream');
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(asset.filename)}"`);
  res.setHeader('Cache-Control', 'private, max-age=3600');
  const stream = fs.createReadStream(asset.filepath);
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

// ── GET /search ────────────────────────────────────────────────────────────────
// 关键词全文搜索 + 维度筛选

router.get('/search', (req: Request, res: Response) => {
  const username = requireUser(req, res);
  if (!username) return;

  const q = typeof req.query.q === 'string' ? req.query.q : '';
  const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string || '20', 10)));

  const FILTER_KEYS = ['ratio', 'type', 'orientation', 'duration_range', 'quality', 'character', 'scene', 'purpose'];
  const filters: Record<string, string> = {};
  for (const key of FILTER_KEYS) {
    const val = req.query[key];
    if (typeof val === 'string' && val) {
      filters[key] = val;
    }
  }

  const result = searchAssets({ username, q, page, pageSize, filters });
  const token = req.headers.authorization?.slice(7) ?? '';
  const itemsWithUrl = result.items.map((item) => ({
    ...item,
    file_url: `/api/asset-library/assets/${item.id}/file?token=${encodeURIComponent(token)}`,
  }));
  const assetsWithTags = attachTags(itemsWithUrl as Array<Record<string, unknown>>);
  res.json({ total: result.total, page: result.page, pageSize: result.pageSize, assets: assetsWithTags });
});

// ── GET /facets ────────────────────────────────────────────────────────────────

router.get('/facets', (req: Request, res: Response) => {
  const username = requireUser(req, res);
  if (!username) return;

  const result = getFacets(username);
  res.json(result);
});

export default router;
