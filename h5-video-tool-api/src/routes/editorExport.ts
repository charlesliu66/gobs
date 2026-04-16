import { Router } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import type { EditorExportRequestBody } from '../editor/timelineSchema.js';
import { runFfmpegExport } from '../services/ffmpegExport.js';
import { getApiDataDir, getUploadsPath } from '../config/apiDataDir.js';
import { sanitizeUsername } from '../utils/safeUsername.js';

const router = Router();

type ExportJobStatus = 'queued' | 'processing' | 'done' | 'error';

interface ExportJob {
  id: string;
  status: ExportJobStatus;
  progress: number;
  progressMsg: string;
  downloadUrl: string | null;
  error: string | null;
  createdAt: number;
}

const jobs = new Map<string, ExportJob>();

function validateTimelineBody(body: unknown): body is EditorExportRequestBody {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  if (!b.project || typeof b.project !== 'object') return false;
  const p = b.project as Record<string, unknown>;
  return typeof p.id === 'string' && Array.isArray(p.tracks);
}

/**
 * 从 asset URL 中提取本地文件路径。
 * 支持 /api/video/file?path=xxx 和 /api/editor/assets/files/xxx 两种格式。
 */
function resolveLocalPathFromUrl(url: string, username: string): string | null {
  try {
    const fakeBase = 'http://localhost';
    const parsed = new URL(url, fakeBase);

    // /api/video/file?path=output/admin/xxx.mp4
    if (parsed.pathname === '/api/video/file') {
      const relPath = parsed.searchParams.get('path');
      if (relPath) {
        const full = path.resolve(getApiDataDir(), path.normalize(relPath));
        if (fs.existsSync(full)) return full;
      }
    }

    // /api/editor/assets/files/<assetId>
    const editorMatch = parsed.pathname.match(/^\/api\/editor\/assets\/files\/(.+)$/);
    if (editorMatch) {
      const fileId = decodeURIComponent(editorMatch[1]);
      const safeUser = sanitizeUsername(username);
      const editorDir = path.join(getUploadsPath('editor'), safeUser);
      const full = path.join(editorDir, fileId);
      if (fs.existsSync(full)) return full;
      try {
        const files = fs.readdirSync(editorDir);
        const match = files.find((f) => f === fileId || f.startsWith(fileId + '.'));
        if (match) return path.join(editorDir, match);
      } catch { /* ignore */ }
    }
  } catch { /* malformed URL — ignore */ }
  return null;
}

/** 把 assetId 映射到本地文件路径（多路查找 + asset URL 反解） */
function resolveAssetPaths(
  tracks: EditorExportRequestBody['project']['tracks'],
  username: string,
  assetUrlMap?: Record<string, { url?: string; [k: string]: unknown }>,
): Record<string, string> {
  const safeUser = sanitizeUsername(username);
  const searchDirs = [
    path.join(getUploadsPath('editor'), safeUser),
    path.join(getApiDataDir(), 'output', 'production', 'images', safeUser),
    path.join(getApiDataDir(), 'output', safeUser),
  ];

  const map: Record<string, string> = {};
  for (const track of tracks) {
    for (const clip of track.clips) {
      const c = clip as { assetId?: string };
      if (!c.assetId || map[c.assetId]) continue;
      if (c.assetId.startsWith('http')) {
        console.warn('[export] assetId is a URL, skipping:', c.assetId);
        continue;
      }
      const assetId = c.assetId;
      let found = false;

      // 1) 目录搜索（本地上传的素材）
      for (const dir of searchDirs) {
        if (!fs.existsSync(dir)) continue;
        if (fs.existsSync(path.join(dir, assetId))) {
          map[assetId] = path.join(dir, assetId);
          found = true;
          break;
        }
        try {
          const files = fs.readdirSync(dir);
          const match = files.find((f) => f === assetId || f.startsWith(assetId + '.'));
          if (match) {
            map[assetId] = path.join(dir, match);
            found = true;
            break;
          }
        } catch { /* ignore */ }
      }

      // 2) 从前端传来的 assets URL 反解本地路径（高级制片 prod_shot_* 等）
      if (!found && assetUrlMap?.[assetId]?.url) {
        const resolved = resolveLocalPathFromUrl(assetUrlMap[assetId].url!, username);
        if (resolved) {
          map[assetId] = resolved;
          found = true;
          console.log('[export] resolved asset via URL:', assetId, '->', resolved);
        }
      }

      if (!found) {
        console.warn('[export] asset not found locally:', assetId);
      }
    }
  }
  return map;
}

/** POST /api/editor/export — 提交导出任务（异步） */
router.post('/export', (req, res) => {
  const username = sanitizeUsername(req.user?.username);
  if (!validateTimelineBody(req.body)) {
    res.status(400).json({ error: 'Invalid body' });
    return;
  }

  const body = req.body as EditorExportRequestBody;
  const { project, assets: frontendAssets, aspectRatio, resolution = '1080p', format = 'mp4', quality = 'balanced' } = body;

  const jobId = `exp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const job: ExportJob = {
    id: jobId,
    status: 'queued',
    progress: 0,
    progressMsg: '已入队',
    downloadUrl: null,
    error: null,
    createdAt: Date.now(),
  };
  jobs.set(jobId, job);

  // 异步执行，不阻塞 HTTP 响应
  setImmediate(async () => {
    job.status = 'processing';
    job.progress = 5;
    job.progressMsg = '准备导出…';

    try {
      // 输出目录
      const outDir = path.join(getApiDataDir(), 'exports', username);
      await fs.promises.mkdir(outDir, { recursive: true });
      const outputPath = path.join(outDir, `${jobId}.${format}`);

      // 资产路径映射（传入前端 assets 以支持 prod_shot 等 URL 反解）
      const assets = resolveAssetPaths(project.tracks, username, frontendAssets);
      const effectiveAspect = aspectRatio ?? project.aspectRatio;

      await runFfmpegExport({
        project: { ...project, aspectRatio: effectiveAspect },
        assets,
        outputPath,
        resolution,
        format,
        quality,
        onProgress: (pct, msg) => {
          job.progress = pct;
          job.progressMsg = msg;
        },
      });

      // 生成下载 URL（相对于 API 根）
      job.status = 'done';
      job.progress = 100;
      job.progressMsg = '完成';
      job.downloadUrl = `/api/editor/export/download/${jobId}.${format}`;
      console.log('[editor/export] done', jobId, outputPath);

    } catch (e) {
      job.status = 'error';
      job.error = e instanceof Error ? e.message : String(e);
      console.error('[editor/export] error', jobId, job.error);
    }
  });

  res.json({ jobId, message: 'queued' });
});

/** GET /api/editor/export/files — 列出当前用户所有已导出文件（按时间倒序） */
router.get('/export/files', (req, res) => {
  const username = sanitizeUsername(req.user?.username);
  const dir = path.join(getApiDataDir(), 'exports', username);
  if (!fs.existsSync(dir)) {
    res.json({ files: [] });
    return;
  }
  try {
    const entries = fs.readdirSync(dir)
      .filter((f) => /\.(mp4|mov)$/i.test(f))
      .map((filename) => {
        const stat = fs.statSync(path.join(dir, filename));
        const size = stat.size;
        const mb = size / (1024 * 1024);
        const sizeLabel = mb >= 1 ? `${mb.toFixed(1)} MB` : `${(size / 1024).toFixed(0)} KB`;
        // 文件名格式 exp_<timestamp>_<random>.<ext>，从时间戳解析创建时间
        const tsMatch = filename.match(/exp_(\d+)_/);
        const createdAt = tsMatch ? parseInt(tsMatch[1], 10) : stat.mtimeMs;
        return {
          filename,
          size,
          sizeLabel,
          createdAt,
          downloadUrl: `/api/editor/export/download/${encodeURIComponent(filename)}`,
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt); // 最新在前
    res.json({ files: entries });
  } catch (e) {
    res.status(500).json({ error: '读取导出目录失败' });
  }
});

/** DELETE /api/editor/export/files/:filename — 删除指定导出文件 */
router.delete('/export/files/:filename', (req, res) => {
  const username = sanitizeUsername(req.user?.username);
  const filename = path.basename(req.params.filename);
  if (!filename || !/\.(mp4|mov)$/i.test(filename)) {
    res.status(400).json({ error: '无效文件名' });
    return;
  }
  const filePath = path.join(getApiDataDir(), 'exports', username, filename);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'File not found' });
    return;
  }
  try {
    fs.unlinkSync(filePath);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: '删除失败' });
  }
});

/** GET /api/editor/export/:jobId — 查询任务状态 */
router.get('/export/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }
  res.json({
    id: job.id,
    status: job.status,
    progress: job.progress,
    progressMsg: job.progressMsg,
    downloadUrl: job.downloadUrl,
    error: job.error,
  });
});

/** GET /api/editor/export/download/:filename — 下载导出文件 */
router.get('/export/download/:filename', (req, res) => {
  const username = sanitizeUsername(req.user?.username);
  const filename = path.basename(req.params.filename); // 防路径穿越
  const filePath = path.join(getApiDataDir(), 'exports', username, filename);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'File not found' });
    return;
  }
  res.download(filePath, filename);
});

export default router;
