/**
 * 本地文件上传 API（按用户目录隔离）
 * POST /api/upload/local      — 上传文件（图片/视频/音频），返回 assetId + url
 * GET  /api/upload/file/:id   — 读取已上传文件（仅属主可读）
 * GET  /api/upload/list       — 列出当前用户已上传文件
 * DELETE /api/upload/:id      — 删除文件（仅属主可删）
 *
 * 该路由处于 JWT 鉴权白名单之外，因此所有请求都必须携带 Authorization: Bearer。
 * 文件落盘位置：<dataRoot>/uploads/<sanitizedUsername>/<id>.<ext>
 *
 * 说明：历史版本使用全局扁平目录且内存 registry 未按用户隔离，存在跨用户读取风险。
 * 本次改造强制按用户分桶；未迁移的旧文件在新目录下不可见（原文件仍在磁盘，安全，但对用户不可达）。
 */
import { Router, Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';
import { resolvePath } from '../infra/storage/resolver.js';
import { sanitizeUsername } from '../utils/safeUsername.js';

export const localUploadRouter = Router();

const UPLOAD_ROOT = resolvePath('uploads');
fsSync.mkdirSync(UPLOAD_ROOT, { recursive: true });

const MAX_MB = Math.min(
  4096,
  Math.max(64, parseInt(process.env.EDITOR_UPLOAD_MAX_MB || '500', 10) || 500),
);

function getUserDir(username: string): string {
  const dir = path.join(UPLOAD_ROOT, sanitizeUsername(username));
  fsSync.mkdirSync(dir, { recursive: true });
  return dir;
}

function requireUser(req: Request, res: Response): string | null {
  const username = req.user?.username?.trim();
  if (!username) {
    res.status(401).json({ error: '需要登录' });
    return null;
  }
  return username;
}

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const username = req.user?.username?.trim();
    if (!username) {
      cb(new Error('未登录'), '');
      return;
    }
    cb(null, getUserDir(username));
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '';
    const id = `${Date.now()}_${randomBytes(4).toString('hex')}`;
    cb(null, `${id}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(jpe?g|png|webp|gif|mp4|mov|webm|mkv|avi|mp3|wav|m4a)$/i;
    if (allowed.test(file.originalname)) cb(null, true);
    else cb(new Error(`不支持的文件类型: ${file.originalname}`));
  },
});

type UploadKind = 'image' | 'video' | 'audio' | 'other';

function classifyKind(ext: string): UploadKind {
  if (/\.(jpe?g|png|webp|gif)$/i.test(ext)) return 'image';
  if (/\.(mp4|mov|webm|mkv|avi)$/i.test(ext)) return 'video';
  if (/\.(mp3|wav|m4a)$/i.test(ext)) return 'audio';
  return 'other';
}

function guessMime(kind: UploadKind, ext: string): string {
  if (kind === 'image') {
    if (/\.png$/i.test(ext)) return 'image/png';
    if (/\.webp$/i.test(ext)) return 'image/webp';
    if (/\.gif$/i.test(ext)) return 'image/gif';
    return 'image/jpeg';
  }
  if (kind === 'video') {
    if (/\.webm$/i.test(ext)) return 'video/webm';
    if (/\.mov$/i.test(ext)) return 'video/quicktime';
    if (/\.mkv$/i.test(ext)) return 'video/x-matroska';
    return 'video/mp4';
  }
  if (kind === 'audio') {
    if (/\.mp3$/i.test(ext)) return 'audio/mpeg';
    if (/\.wav$/i.test(ext)) return 'audio/wav';
    return 'audio/mp4';
  }
  return 'application/octet-stream';
}

async function findFileForUser(username: string, id: string): Promise<string | null> {
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '');
  if (!safeId) return null;
  const dir = getUserDir(username);
  try {
    const files = await fs.readdir(dir);
    const match = files.find((f) => f.startsWith(`${safeId}.`));
    if (match) return path.join(dir, match);
  } catch {
    /* ignore */
  }
  return null;
}

localUploadRouter.post('/local', (req: Request, res: Response) => {
  const username = requireUser(req, res);
  if (!username) return;
  upload.single('file')(req, res, (err) => {
    if (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '上传失败' });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: '请选择文件' });
      return;
    }
    const f = req.file;
    const ext = path.extname(f.originalname).toLowerCase();
    const kind = classifyKind(ext);
    const id = f.filename.replace(/\.[^.]+$/, '');
    res.json({
      id,
      originalName: f.originalname,
      url: `/api/upload/file/${id}`,
      kind,
      size: f.size,
      mimeType: f.mimetype,
    });
  });
});

localUploadRouter.get('/file/:id', async (req: Request, res: Response) => {
  const username = requireUser(req, res);
  if (!username) return;
  const abs = await findFileForUser(username, req.params.id);
  if (!abs) {
    res.status(404).json({ error: '文件不存在' });
    return;
  }
  try {
    await fs.access(abs);
    const ext = path.extname(abs).toLowerCase();
    const kind = classifyKind(ext);
    res.setHeader('Content-Type', guessMime(kind, ext));
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.sendFile(abs);
  } catch {
    res.status(404).json({ error: '文件已丢失' });
  }
});

localUploadRouter.get('/list', async (req: Request, res: Response) => {
  const username = requireUser(req, res);
  if (!username) return;
  const dir = getUserDir(username);
  try {
    const files = await fs.readdir(dir);
    const items = await Promise.all(
      files
        .filter((f) => !f.startsWith('.'))
        .map(async (f) => {
          const ext = path.extname(f).toLowerCase();
          const kind = classifyKind(ext);
          const abs = path.join(dir, f);
          const stat = await fs.stat(abs).catch(() => null);
          const id = f.replace(/\.[^.]+$/, '');
          return {
            id,
            originalName: f,
            filename: f,
            mimeType: guessMime(kind, ext),
            size: stat?.size ?? 0,
            uploadedAt: stat?.mtime.toISOString() ?? new Date().toISOString(),
            kind,
            url: `/api/upload/file/${id}`,
          };
        }),
    );
    items.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
    res.json({ items, maxMb: MAX_MB });
  } catch {
    res.json({ items: [], maxMb: MAX_MB });
  }
});

localUploadRouter.delete('/:id', async (req: Request, res: Response) => {
  const username = requireUser(req, res);
  if (!username) return;
  const abs = await findFileForUser(username, req.params.id);
  if (!abs) {
    res.status(404).json({ error: '文件不存在' });
    return;
  }
  try {
    await fs.unlink(abs);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: '删除失败' });
  }
});

export default localUploadRouter;
