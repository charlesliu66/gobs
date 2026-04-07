import { Router, type Request } from 'express';
import fs from 'fs';
import { promises as fsp } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import multer from 'multer';
import { decodeMultipartFilename } from '../utils/multipartFilename.js';

const router = Router();

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'editor');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const UPLOAD_MAX_MB = Math.min(
  4096,
  Math.max(64, Number.parseInt(process.env.EDITOR_UPLOAD_MAX_MB || '500', 10) || 500),
);
const UPLOAD_MAX_BYTES = UPLOAD_MAX_MB * 1024 * 1024;

export interface StoredEditorAsset {
  id: string;
  filename: string;
  originalName: string;
  mime: string;
  size: number;
  createdAt: string;
}

const assetsById = new Map<string, StoredEditorAsset>();

const REGISTRY_FILE = path.join(UPLOAD_DIR, '_assets_registry.json');

function loadAssetsRegistry(): void {
  try {
    if (!fs.existsSync(REGISTRY_FILE)) return;
    const raw = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8')) as unknown;
    if (!Array.isArray(raw)) return;
    for (const row of raw) {
      if (!row || typeof row !== 'object') continue;
      const r = row as StoredEditorAsset;
      if (typeof r.id === 'string' && r.filename && fs.existsSync(path.join(UPLOAD_DIR, r.filename))) {
        assetsById.set(r.id, r);
      }
    }
  } catch {
    /* ignore */
  }
}

function saveAssetsRegistry(): void {
  try {
    const list = [...assetsById.values()];
    fs.writeFileSync(REGISTRY_FILE, JSON.stringify(list, null, 2), 'utf8');
  } catch {
    /* ignore */
  }
}

loadAssetsRegistry();

/** 供抽帧/音频分析等读取磁盘上的源文件（仅已上传素材） */
export function getEditorAssetAbsolutePath(id: string): string | null {
  const meta = assetsById.get(id);
  if (!meta) return null;
  const abs = path.join(UPLOAD_DIR, meta.filename);
  if (!fs.existsSync(abs)) return null;
  return abs;
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const id = randomUUID();
    const ext = path.extname(file.originalname) || '.mp4';
    cb(null, `${id}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: UPLOAD_MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
      return;
    }
    cb(new Error('仅支持视频文件（video/*）'));
  },
});

function resolveOriginalName(req: Request, multerOriginal: string): string {
  const fromBody = req.body?.originalName;
  if (typeof fromBody === 'string') {
    const t = fromBody.trim();
    if (t.length > 0 && t.length <= 512) return t;
  }
  return decodeMultipartFilename(multerOriginal);
}

/** POST multipart：字段 file；可选 originalName（浏览器端 UTF-8 真名，避免 multer 乱码） */
router.post('/assets/upload', (req, res) => {
  upload.single('file')(req, res, (err: unknown) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        res.status(413).json({
          error: `文件过大，单文件最大 ${UPLOAD_MAX_MB}MB。可在服务端设置环境变量 EDITOR_UPLOAD_MAX_MB（64–4096）后重启 API。`,
          maxMb: UPLOAD_MAX_MB,
        });
        return;
      }
      if (err instanceof multer.MulterError) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.status(400).json({ error: err instanceof Error ? err.message : '上传失败' });
      return;
    }

    const f = req.file;
    if (!f) {
      res.status(400).json({ error: '缺少文件，请使用字段名 file' });
      return;
    }
    const id = path.parse(f.filename).name;
    const originalName = resolveOriginalName(req, f.originalname);
    const rec: StoredEditorAsset = {
      id,
      filename: f.filename,
      originalName,
      mime: f.mimetype,
      size: f.size,
      createdAt: new Date().toISOString(),
    };
    assetsById.set(id, rec);
    saveAssetsRegistry();
    const base = `/api/editor/assets/files/${id}`;
    res.json({
      asset: {
        id,
        url: base,
        kind: 'video' as const,
        originalName: rec.originalName,
        mime: rec.mime,
        size: rec.size,
        createdAt: rec.createdAt,
      },
    });
  });
});

/** 与前端校验一致：单文件上限（MB） */
router.get('/upload-config', (_req, res) => {
  res.json({ maxMb: UPLOAD_MAX_MB, maxBytes: UPLOAD_MAX_BYTES });
});

/** DELETE 删除已上传素材（磁盘文件 + 注册表） */
router.delete('/assets/:id', async (req, res) => {
  const id = req.params.id;
  if (!id || id.includes('..') || id.includes('/') || id.includes('\\')) {
    res.status(400).json({ error: '无效的素材 id' });
    return;
  }
  const meta = assetsById.get(id);
  if (!meta) {
    res.status(404).json({ error: '素材不存在' });
    return;
  }
  const abs = path.join(UPLOAD_DIR, meta.filename);
  try {
    await fsp.unlink(abs).catch((e: NodeJS.ErrnoException) => {
      if (e.code !== 'ENOENT') throw e;
    });
  } catch (e) {
    console.error('[editor assets delete]', e);
    res.status(500).json({ error: '删除文件失败' });
    return;
  }
  assetsById.delete(id);
  saveAssetsRegistry();
  res.json({ ok: true });
});

/** GET 列表 */
router.get('/assets', (_req, res) => {
  const list = [...assetsById.values()].map((a) => ({
    id: a.id,
    url: `/api/editor/assets/files/${a.id}`,
    kind: 'video' as const,
    originalName: decodeMultipartFilename(a.originalName),
    mime: a.mime,
    size: a.size,
    createdAt: a.createdAt,
  }));
  list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  res.json({ assets: list });
});

/** GET 文件流（预览 / 导出用） */
router.get('/assets/files/:id', (req, res) => {
  const id = req.params.id;
  const meta = assetsById.get(id);
  if (!meta) {
    res.status(404).json({ error: '素材不存在' });
    return;
  }
  const abs = path.join(UPLOAD_DIR, meta.filename);
  if (!fs.existsSync(abs)) {
    res.status(404).json({ error: '文件已丢失' });
    return;
  }
  res.setHeader('Content-Type', meta.mime || 'video/mp4');
  res.sendFile(abs, (err) => {
    if (err && !res.headersSent) {
      res.status(500).json({ error: '读取文件失败' });
    }
  });
});

export default router;
