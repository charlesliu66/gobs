import { Router, type Request } from 'express';
import fs from 'fs';
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import { spawn } from 'child_process';
import multer from 'multer';
import { decodeMultipartFilename } from '../utils/multipartFilename.js';
import { getUploadsPath } from '../config/apiDataDir.js';
import { sanitizeUsername } from '../utils/safeUsername.js';
import { getRequestAccount } from '../services/requestContext.js';
import { getFfmpegPath } from '../services/video/ffmpegPaths.js';

const router = Router();

const UPLOAD_ROOT = getUploadsPath('editor');
fs.mkdirSync(UPLOAD_ROOT, { recursive: true });

const UPLOAD_MAX_MB = Math.min(
  4096,
  Math.max(64, Number.parseInt(process.env.EDITOR_UPLOAD_MAX_MB || '2048', 10) || 2048),
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

type UserAssetStore = {
  loaded: boolean;
  assetsById: Map<string, StoredEditorAsset>;
};

const stores = new Map<string, UserAssetStore>();

function getStore(username: string): UserAssetStore {
  const key = sanitizeUsername(username);
  const exists = stores.get(key);
  if (exists) return exists;
  const created: UserAssetStore = { loaded: false, assetsById: new Map<string, StoredEditorAsset>() };
  stores.set(key, created);
  return created;
}

function getUserUploadDir(username: string): string {
  return path.join(UPLOAD_ROOT, sanitizeUsername(username));
}

function getRegistryFile(username: string): string {
  return path.join(getUserUploadDir(username), '_assets_registry.json');
}

function loadAssetsRegistry(username: string): void {
  const safeUser = sanitizeUsername(username);
  const store = getStore(safeUser);
  if (store.loaded) return;
  store.loaded = true;
  const userDir = getUserUploadDir(safeUser);
  fs.mkdirSync(userDir, { recursive: true });
  try {
    const registryFile = getRegistryFile(safeUser);
    if (!fs.existsSync(registryFile)) return;
    const raw = JSON.parse(fs.readFileSync(registryFile, 'utf8')) as unknown;
    if (!Array.isArray(raw)) return;
    for (const row of raw) {
      if (!row || typeof row !== 'object') continue;
      const r = row as StoredEditorAsset;
      if (typeof r.id === 'string' && r.filename && fs.existsSync(path.join(userDir, r.filename))) {
        store.assetsById.set(r.id, r);
      }
    }
  } catch {
    /* ignore */
  }
}

function saveAssetsRegistry(username: string): void {
  const safeUser = sanitizeUsername(username);
  const store = getStore(safeUser);
  try {
    const userDir = getUserUploadDir(safeUser);
    fs.mkdirSync(userDir, { recursive: true });
    const list = [...store.assetsById.values()];
    fs.writeFileSync(getRegistryFile(safeUser), JSON.stringify(list, null, 2), 'utf8');
  } catch {
    /* ignore */
  }
}

function resolveUsername(req?: Request): string {
  return sanitizeUsername(req?.user?.username ?? getRequestAccount());
}

/**
 * GET /assets/files/:id is auth-bypassed so <video> tags can play without Bearer.
 * In that case req.user is undefined → resolveUsername returns '_default', which
 * won't find files uploaded by 'admin'. Fall back to scanning all user dirs.
 */
function findAssetAcrossUsers(id: string, hint: string): { meta: StoredEditorAsset; username: string } | null {
  // Try the hinted user first (fast path when auth is present)
  loadAssetsRegistry(hint);
  const hintMeta = getStore(hint).assetsById.get(id);
  if (hintMeta) return { meta: hintMeta, username: hint };

  // Scan all user directories (only needed when auth is bypassed)
  try {
    const userDirs = fs
      .readdirSync(UPLOAD_ROOT, { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name !== 'chunks')
      .map((d) => d.name);
    for (const uname of userDirs) {
      if (uname === hint) continue;
      loadAssetsRegistry(uname);
      const meta = getStore(uname).assetsById.get(id);
      if (meta) return { meta, username: uname };
    }
  } catch { /* scan failed, fall through to 404 */ }
  return null;
}

/** 供抽帧/音频分析等读取磁盘上的源文件（仅已上传素材） */
export function getEditorAssetAbsolutePath(id: string, username?: string): string | null {
  const safeUser = sanitizeUsername(username ?? getRequestAccount());
  loadAssetsRegistry(safeUser);
  const store = getStore(safeUser);
  const meta = store.assetsById.get(id);
  if (!meta) return null;
  const abs = path.join(getUserUploadDir(safeUser), meta.filename);
  if (!fs.existsSync(abs)) return null;
  return abs;
}

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const user = resolveUsername(req as Request);
    const dir = getUserUploadDir(user);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
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
    const ok =
      file.mimetype.startsWith('video/') ||
      // 部分视频文件 mime 识别为 octet-stream（如 .ts .mkv），按扩展名放行
      (file.mimetype === 'application/octet-stream' &&
        /\.(mp4|mov|mkv|avi|webm|ts|flv|wmv|m4v|3gp|ogv)$/i.test(file.originalname));
    if (ok) { cb(null, true); return; }
    cb(new Error(`不支持的文件类型（${file.mimetype}），请上传 mp4/mov/webm/mkv 等视频文件`));
  },
});

// 分片上传：单个 chunk 限制（默认 20MB，允许 1–64MB 可调）
const CHUNK_MAX_MB = Math.min(
  64,
  Math.max(1, Number.parseInt(process.env.EDITOR_CHUNK_MAX_MB || '20', 10) || 20),
);
const CHUNK_MAX_BYTES = CHUNK_MAX_MB * 1024 * 1024;
// 分片数量上限，配合 UPLOAD_MAX_BYTES 防止装配后超过单文件上限
const MAX_TOTAL_CHUNKS = Math.max(
  1,
  Math.ceil(UPLOAD_MAX_BYTES / (CHUNK_MAX_BYTES || 1)) + 2,
);

// 分片上传使用内存存储（单片小，便于直接落盘）；显式限制单片大小。
const chunkUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: CHUNK_MAX_BYTES },
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
    const username = resolveUsername(req as Request);
    loadAssetsRegistry(username);
    const store = getStore(username);
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
    store.assetsById.set(id, rec);
    saveAssetsRegistry(username);
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
  const username = resolveUsername(req as Request);
  loadAssetsRegistry(username);
  const store = getStore(username);
  const id = req.params.id;
  if (!id || id.includes('..') || id.includes('/') || id.includes('\\')) {
    res.status(400).json({ error: '无效的素材 id' });
    return;
  }
  const meta = store.assetsById.get(id);
  if (!meta) {
    res.status(404).json({ error: '素材不存在' });
    return;
  }
  const abs = path.join(getUserUploadDir(username), meta.filename);
  try {
    await fsp.unlink(abs).catch((e: NodeJS.ErrnoException) => {
      if (e.code !== 'ENOENT') throw e;
    });
  } catch (e) {
    console.error('[editor assets delete]', e);
    res.status(500).json({ error: '删除文件失败' });
    return;
  }
  store.assetsById.delete(id);
  saveAssetsRegistry(username);
  res.json({ ok: true });
});

/** GET 列表 */
router.get('/assets', (req, res) => {
  const username = resolveUsername(req as Request);
  loadAssetsRegistry(username);
  const store = getStore(username);
  const list = [...store.assetsById.values()].map((a) => ({
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
  const hint = resolveUsername(req as Request);
  const found = findAssetAcrossUsers(id, hint);
  if (!found) {
    res.status(404).json({ error: '素材不存在' });
    return;
  }
  const { meta, username } = found;
  const abs = path.join(getUserUploadDir(username), meta.filename);
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

/** POST multipart：分片上传 — 接收单个 chunk 并写入临时目录 */
router.post('/assets/upload-chunk', (req, res) => {
  chunkUpload.single('chunk')(req, res, (err: unknown) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        res.status(413).json({
          error: `分片过大，单分片最大 ${CHUNK_MAX_MB}MB。可通过 EDITOR_CHUNK_MAX_MB 环境变量调整（1–64）。`,
          maxMb: CHUNK_MAX_MB,
        });
        return;
      }
      res.status(400).json({ error: err instanceof Error ? err.message : '分片上传失败' });
      return;
    }
    const { uploadId, chunkIndex, totalChunks } = req.body as {
      uploadId?: string;
      chunkIndex?: string;
      totalChunks?: string;
    };
    if (!uploadId || typeof uploadId !== 'string' || !/^[\w-]+$/.test(uploadId)) {
      res.status(400).json({ error: '缺少或无效的 uploadId' });
      return;
    }
    const idx = Number.parseInt(chunkIndex ?? '', 10);
    const total = Number.parseInt(totalChunks ?? '', 10);
    if (Number.isNaN(idx) || Number.isNaN(total) || idx < 0 || total < 1) {
      res.status(400).json({ error: '缺少或无效的 chunkIndex / totalChunks' });
      return;
    }
    if (total > MAX_TOTAL_CHUNKS) {
      res.status(413).json({
        error: `分片数超限：${total} > ${MAX_TOTAL_CHUNKS}（对应单文件 ${UPLOAD_MAX_MB}MB 上限）`,
      });
      return;
    }
    if (idx >= total) {
      res.status(400).json({ error: 'chunkIndex 超出 totalChunks 范围' });
      return;
    }
    const chunk = req.file;
    if (!chunk || !chunk.buffer) {
      res.status(400).json({ error: '缺少 chunk 文件' });
      return;
    }
    const chunkDir = path.join(UPLOAD_ROOT, 'chunks', uploadId);
    fs.mkdirSync(chunkDir, { recursive: true });
    const chunkPath = path.join(chunkDir, `chunk_${idx}`);
    try {
      fs.writeFileSync(chunkPath, chunk.buffer);
    } catch (writeErr) {
      console.error('[editor chunk write]', writeErr);
      res.status(500).json({ error: '写入分片失败' });
      return;
    }
    res.json({ success: true, chunkIndex: idx, totalChunks: total });
  });
});

/** POST JSON：组装已上传的分片为完整文件，然后写入素材注册表 */
router.post('/assets/upload-assemble', async (req, res) => {
  const { uploadId, originalName, expectedTotalSize } = req.body as {
    uploadId?: unknown;
    originalName?: unknown;
    expectedTotalSize?: unknown;
  };
  if (
    typeof uploadId !== 'string' ||
    !uploadId ||
    !/^[\w-]+$/.test(uploadId)
  ) {
    res.status(400).json({ error: '缺少或无效的 uploadId' });
    return;
  }
  if (typeof originalName !== 'string' || !originalName.trim()) {
    res.status(400).json({ error: '缺少 originalName' });
    return;
  }
  const expectedSize =
    typeof expectedTotalSize === 'number' && Number.isFinite(expectedTotalSize) && expectedTotalSize > 0
      ? Math.floor(expectedTotalSize)
      : null;
  if (expectedSize !== null && expectedSize > UPLOAD_MAX_BYTES) {
    res.status(413).json({
      error: `文件超出单文件上限（${UPLOAD_MAX_MB}MB）`,
      maxMb: UPLOAD_MAX_MB,
      size: expectedSize,
    });
    return;
  }
  const chunkDir = path.join(UPLOAD_ROOT, 'chunks', uploadId);
  const cleanup = () => {
    try {
      fs.rmSync(chunkDir, { recursive: true, force: true });
    } catch { /* best effort */ }
  };

  if (!fs.existsSync(chunkDir)) {
    res.status(400).json({ error: '找不到分片目录，uploadId 可能无效或已过期' });
    return;
  }

  // 读取并排序所有分片
  let chunkFiles: string[];
  try {
    chunkFiles = fs
      .readdirSync(chunkDir)
      .filter((f) => /^chunk_\d+$/.test(f))
      .sort((a, b) => {
        const ia = Number.parseInt(a.replace('chunk_', ''), 10);
        const ib = Number.parseInt(b.replace('chunk_', ''), 10);
        return ia - ib;
      });
  } catch (e) {
    console.error('[editor assemble readdir]', e);
    cleanup();
    res.status(500).json({ error: '读取分片目录失败' });
    return;
  }
  if (chunkFiles.length === 0) {
    cleanup();
    res.status(400).json({ error: '分片目录为空' });
    return;
  }

  const username = resolveUsername(req as Request);
  loadAssetsRegistry(username);
  const store = getStore(username);
  const userDir = getUserUploadDir(username);
  fs.mkdirSync(userDir, { recursive: true });

  const id = randomUUID();
  const ext = path.extname(originalName.trim()) || '.mp4';
  const filename = `${id}${ext}`;
  const destPath = path.join(userDir, filename);

  // 预估总大小，提前拒绝超出单文件上限的组装请求
  let sumSize = 0;
  for (const f of chunkFiles) {
    try {
      sumSize += fs.statSync(path.join(chunkDir, f)).size;
    } catch {
      cleanup();
      res.status(500).json({ error: '分片元信息读取失败' });
      return;
    }
  }
  if (sumSize > UPLOAD_MAX_BYTES) {
    cleanup();
    res.status(413).json({
      error: `组装后的文件超出单文件上限（${UPLOAD_MAX_MB}MB）`,
      maxMb: UPLOAD_MAX_MB,
      size: sumSize,
    });
    return;
  }
  /** 与客户端声明的总大小做一致性校验（防止客户端声称 10MB 却传了 10GB 分片绕过 multer 限制） */
  if (expectedSize !== null && Math.abs(sumSize - expectedSize) > 1024) {
    cleanup();
    res.status(400).json({
      error: `分片总大小与客户端声明不一致（期望 ${expectedSize}，实际 ${sumSize}）`,
    });
    return;
  }

  // 流式拼接：依次 pipe 每个分片到目标文件，避免把整个 chunk 读进内存
  try {
    const out = fs.createWriteStream(destPath);
    await new Promise<void>((resolve, reject) => {
      out.on('error', reject);
      const pipeNext = (i: number): void => {
        if (i >= chunkFiles.length) {
          out.end();
          return;
        }
        const inStream = fs.createReadStream(path.join(chunkDir, chunkFiles[i]), {
          highWaterMark: 1024 * 1024,
        });
        inStream.on('error', reject);
        inStream.on('end', () => pipeNext(i + 1));
        inStream.pipe(out, { end: false });
      };
      out.on('finish', resolve);
      pipeNext(0);
    });
  } catch (assembleErr) {
    console.error('[editor assemble write]', assembleErr);
    cleanup();
    try { fs.unlinkSync(destPath); } catch { /* ignore */ }
    res.status(500).json({ error: '组装分片失败' });
    return;
  }

  cleanup();

  const stat = fs.statSync(destPath);
  // 推断 mime
  const extLower = ext.toLowerCase();
  const mimeMap: Record<string, string> = {
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.webm': 'video/webm',
    '.mkv': 'video/x-matroska',
    '.avi': 'video/x-msvideo',
    '.ts': 'video/mp2t',
  };
  const mime = mimeMap[extLower] ?? 'video/mp4';

  const rec: StoredEditorAsset = {
    id,
    filename,
    originalName: originalName.trim(),
    mime,
    size: stat.size,
    createdAt: new Date().toISOString(),
  };
  store.assetsById.set(id, rec);
  saveAssetsRegistry(username);

  res.json({
    asset: {
      id,
      url: `/api/editor/assets/files/${id}`,
      kind: 'video' as const,
      originalName: rec.originalName,
      mime: rec.mime,
      size: rec.size,
      createdAt: rec.createdAt,
    },
  });
});

/** GET 波形图（showwavespic）— 缓存在系统 tmpdir，按 id+宽高 命名 */
router.get('/assets/:id/waveform', async (req, res) => {
  const id = req.params.id;
  if (!id || id.includes('..') || id.includes('/') || id.includes('\\')) {
    res.status(400).json({ error: '无效的素材 id' });
    return;
  }
  const w = Math.min(4000, Math.max(20, Number.parseInt(String(req.query.w ?? '400'), 10) || 400));
  const h = Math.min(200, Math.max(8, Number.parseInt(String(req.query.h ?? '40'), 10) || 40));

  const hint = resolveUsername(req as Request);
  const found = findAssetAcrossUsers(id, hint);
  if (!found) {
    res.status(404).json({ error: '素材不存在' });
    return;
  }
  const { meta, username } = found;
  const src = path.join(getUserUploadDir(username), meta.filename);
  if (!fs.existsSync(src)) {
    res.status(404).json({ error: '文件已丢失' });
    return;
  }

  const cacheDir = path.join(os.tmpdir(), 'gobs-waveform-cache');
  fs.mkdirSync(cacheDir, { recursive: true });
  const cachePath = path.join(cacheDir, `${id}_${w}x${h}.png`);

  if (!fs.existsSync(cachePath)) {
    const bin = getFfmpegPath();
    await new Promise<void>((resolve, reject) => {
      const proc = spawn(bin, [
        '-y', '-i', src,
        '-filter_complex', `showwavespic=s=${w}x${h}:colors=rgba(99,102,241,0.85):scale=sqrt`,
        '-frames:v', '1',
        cachePath,
      ], { windowsHide: true });
      proc.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`showwavespic exited ${code}`));
      });
      proc.on('error', reject);
    }).catch((e) => {
      console.error('[waveform] ffmpeg error', e);
    });
  }

  if (!fs.existsSync(cachePath)) {
    res.status(500).json({ error: '波形图生成失败' });
    return;
  }
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.sendFile(cachePath);
});

export default router;
