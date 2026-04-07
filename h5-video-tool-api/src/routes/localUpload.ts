/**
 * 本地文件上传 API
 * POST /api/upload/local   — 上传文件（图片/视频），返回 assetId + url
 * GET  /api/upload/file/:id — 读取已上传文件
 * GET  /api/upload/list     — 列出已上传文件
 * DELETE /api/upload/:id    — 删除文件
 */
import { Router, Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';

export const localUploadRouter = Router();

const OUTPUT_BASE = process.env.VIDEO_OUTPUT_DIR
  ? path.resolve(process.env.VIDEO_OUTPUT_DIR)
  : path.resolve(process.cwd(), 'output');

const UPLOAD_DIR = path.join(OUTPUT_BASE, 'uploads');
fsSync.mkdirSync(UPLOAD_DIR, { recursive: true });

const MAX_MB = Math.min(
  4096,
  Math.max(64, parseInt(process.env.EDITOR_UPLOAD_MAX_MB || '500', 10) || 500),
);

// multer 配置
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
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

// 内存中维护上传记录（重启后丢失，但文件还在）
interface UploadRecord {
  id: string;
  originalName: string;
  filename: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  kind: 'image' | 'video' | 'audio' | 'other';
}

const uploadRegistry = new Map<string, UploadRecord>();

// 启动时扫描已有文件，恢复 registry
(async () => {
  try {
    const files = await fs.readdir(UPLOAD_DIR);
    for (const f of files) {
      if (f.startsWith('.')) continue;
      const ext = path.extname(f).toLowerCase();
      const kind: UploadRecord['kind'] =
        /\.(jpe?g|png|webp|gif)$/.test(ext) ? 'image'
        : /\.(mp4|mov|webm|mkv|avi)$/.test(ext) ? 'video'
        : /\.(mp3|wav|m4a)$/.test(ext) ? 'audio'
        : 'other';
      const id = f.replace(/\.[^.]+$/, '');
      if (!uploadRegistry.has(id)) {
        const stat = await fs.stat(path.join(UPLOAD_DIR, f)).catch(() => null);
        uploadRegistry.set(id, {
          id,
          originalName: f,
          filename: f,
          mimeType: kind === 'image' ? 'image/jpeg' : kind === 'video' ? 'video/mp4' : 'application/octet-stream',
          size: stat?.size ?? 0,
          uploadedAt: stat?.birthtime.toISOString() ?? new Date().toISOString(),
          kind,
        });
      }
    }
  } catch { /* ignore */ }
})();

// ── 上传 ─────────────────────────────────────────────────────────────────────

localUploadRouter.post('/local', (req: Request, res: Response) => {
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
    const kind: UploadRecord['kind'] =
      /\.(jpe?g|png|webp|gif)$/.test(ext) ? 'image'
      : /\.(mp4|mov|webm|mkv|avi)$/.test(ext) ? 'video'
      : /\.(mp3|wav|m4a)$/.test(ext) ? 'audio'
      : 'other';

    const id = f.filename.replace(/\.[^.]+$/, '');
    const record: UploadRecord = {
      id,
      originalName: f.originalname,
      filename: f.filename,
      mimeType: f.mimetype,
      size: f.size,
      uploadedAt: new Date().toISOString(),
      kind,
    };
    uploadRegistry.set(id, record);

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

// ── 读取文件 ─────────────────────────────────────────────────────────────────

localUploadRouter.get('/file/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const record = uploadRegistry.get(id);
  if (!record) {
    // 尝试扫描目录找文件
    try {
      const files = await fs.readdir(UPLOAD_DIR);
      const match = files.find((f) => f.startsWith(id));
      if (match) {
        const abs = path.join(UPLOAD_DIR, match);
        res.sendFile(abs);
        return;
      }
    } catch { /* ignore */ }
    res.status(404).json({ error: '文件不存在' });
    return;
  }
  const abs = path.join(UPLOAD_DIR, record.filename);
  try {
    await fs.access(abs);
    res.setHeader('Content-Type', record.mimeType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.sendFile(abs);
  } catch {
    res.status(404).json({ error: '文件已丢失' });
  }
});

// ── 列出文件 ─────────────────────────────────────────────────────────────────

localUploadRouter.get('/list', (_req: Request, res: Response) => {
  const items = [...uploadRegistry.values()]
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
    .map((r) => ({ ...r, url: `/api/upload/file/${r.id}` }));
  res.json({ items, maxMb: MAX_MB });
});

// ── 删除文件 ─────────────────────────────────────────────────────────────────

localUploadRouter.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const record = uploadRegistry.get(id);
  if (!record) { res.status(404).json({ error: '文件不存在' }); return; }
  try {
    await fs.unlink(path.join(UPLOAD_DIR, record.filename));
    uploadRegistry.delete(id);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: '删除失败' });
  }
});

export default localUploadRouter;
