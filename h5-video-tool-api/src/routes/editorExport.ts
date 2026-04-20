import { Router } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import type { EditorExportRequestBody } from '../editor/timelineSchema.js';
import { runFfmpegExport } from '../services/ffmpegExport.js';
import { getApiDataDir, getUploadsPath, getDefaultVideoOutputDir } from '../config/apiDataDir.js';
import { sanitizeUsername } from '../utils/safeUsername.js';

const router = Router();

type ExportJobStatus = 'queued' | 'processing' | 'done' | 'error';

interface ExportJob {
  id: string;
  /** 所属用户，用于状态/下载接口的权限校验 */
  username: string;
  status: ExportJobStatus;
  progress: number;
  progressMsg: string;
  downloadUrl: string | null;
  error: string | null;
  createdAt: number;
}

const jobs = new Map<string, ExportJob>();

/** 内存 job 超过一定容量 / 一定时间后淘汰，避免长期运行泄漏 */
const JOB_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const JOB_MAX = 500;
function pruneJobs() {
  const now = Date.now();
  for (const [id, j] of jobs) {
    if (now - j.createdAt > JOB_TTL_MS) jobs.delete(id);
  }
  if (jobs.size > JOB_MAX) {
    const sorted = [...jobs.entries()].sort((a, b) => a[1].createdAt - b[1].createdAt);
    const toDrop = sorted.length - JOB_MAX;
    for (let i = 0; i < toDrop; i++) jobs.delete(sorted[i]![0]);
  }
}

function validateTimelineBody(body: unknown): body is EditorExportRequestBody {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  if (!b.project || typeof b.project !== 'object') return false;
  const p = b.project as Record<string, unknown>;
  return typeof p.id === 'string' && Array.isArray(p.tracks);
}

/**
 * 从 asset URL 中提取本地文件路径。
 * 支持四种 API URL 格式：
 *   /api/video/file?path=output/xxx.mp4
 *   /api/batch-jobs/video/<jobId>
 *   /api/editor/music/files/<id>
 *   /api/editor/assets/files/<assetId>
 *
 * 安全：对 /api/video/file 路径做「用户域白名单校验」，保持与 video.ts 中 GET /api/video/file
 * 的权限模型一致，避免导出任务被用来读取非本用户目录下的文件（例如通过伪造 asset URL）。
 */
function resolveLocalPathFromUrl(url: string, username: string): string | null {
  const safeUser = sanitizeUsername(username);
  const outputRoot = getDefaultVideoOutputDir();
  /** 允许的根目录集合（所有结果必须落在其一之下） */
  const allowedRoots = [
    path.resolve(outputRoot, safeUser),
    path.resolve(outputRoot, 'multishot', safeUser),
    path.resolve(outputRoot, 'production', 'projects', safeUser),
    path.resolve(outputRoot, 'production', 'images', safeUser),
    path.resolve(outputRoot, 'batch-jobs', 'videos'),
    path.resolve(getApiDataDir(), 'output', safeUser),
    path.resolve(getApiDataDir(), 'output', 'batch-jobs', 'videos'),
    path.resolve(getUploadsPath('editor'), safeUser),
    path.resolve(getUploadsPath('editor', 'music')),
  ];
  const inAllowedRoot = (p: string): boolean => {
    const abs = path.resolve(p);
    return allowedRoots.some((root) => abs === root || abs.startsWith(root + path.sep));
  };

  try {
    const fakeBase = 'http://localhost';
    const parsed = new URL(url, fakeBase);

    // /api/video/file?path=output/admin/xxx.mp4
    if (parsed.pathname === '/api/video/file') {
      const relPath = parsed.searchParams.get('path');
      if (relPath) {
        const full = path.resolve(getApiDataDir(), path.normalize(relPath));
        if (fs.existsSync(full) && inAllowedRoot(full)) return full;
        if (fs.existsSync(full)) {
          console.warn('[export] /video/file path rejected by domain check:', full);
        }
      }
    }

    // /api/batch-jobs/video/<jobId> → <apiDataDir>/output/batch-jobs/videos/<jobId>.mp4
    const batchMatch = parsed.pathname.match(/^\/api\/batch-jobs\/video\/([a-zA-Z0-9_-]+)$/);
    if (batchMatch) {
      const jobId = batchMatch[1];
      const full = path.join(getApiDataDir(), 'output', 'batch-jobs', 'videos', `${jobId}.mp4`);
      if (fs.existsSync(full)) return full;
    }

    // P1-12：/api/production/image?path=output/production/images/<user>/xxx.png
    // 导出需要把分镜首帧图当作素材读回；旧实现缺这一分支会导致封面/首帧缺失。
    if (parsed.pathname === '/api/production/image') {
      const relPath = parsed.searchParams.get('path');
      if (relPath) {
        const full = path.resolve(getApiDataDir(), path.normalize(relPath));
        if (fs.existsSync(full) && inAllowedRoot(full)) return full;
        if (fs.existsSync(full)) {
          console.warn('[export] /production/image path rejected by domain check:', full);
        }
      }
    }

    // /api/editor/music/files/<id> → uploads/editor/music/<id>.(wav|mp3)
    const musicMatch = parsed.pathname.match(/^\/api\/editor\/music\/files\/([a-zA-Z0-9_-]+)$/);
    if (musicMatch) {
      const musicId = musicMatch[1];
      const musicDir = getUploadsPath('editor', 'music');
      for (const ext of ['wav', 'mp3']) {
        const full = path.join(musicDir, `${musicId}.${ext}`);
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
  console.warn('[export] resolveLocalPathFromUrl: no match for', url);
  return null;
}

/**
 * 把时间轴上所有 clip 的 assetId 映射到本地文件绝对路径。
 * 策略：URL 反解优先（最可靠，与浏览器能播放等价），目录搜索兜底。
 */
function resolveAssetPaths(
  tracks: EditorExportRequestBody['project']['tracks'],
  username: string,
  assetUrlMap?: Record<string, { url?: string; [k: string]: unknown }>,
): Record<string, string> {
  const safeUser = sanitizeUsername(username);
  const searchDirs = [
    path.join(getUploadsPath('editor'), safeUser),
    getUploadsPath('editor', 'music'),
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

      // 1) URL 反解（最可靠：前端能播放 = 后端能定位文件）
      if (assetUrlMap?.[assetId]?.url) {
        const resolved = resolveLocalPathFromUrl(assetUrlMap[assetId].url!, username);
        if (resolved) {
          map[assetId] = resolved;
          found = true;
        }
      }

      // 2) 目录搜索兜底（用户上传的素材可能没有 URL 映射）
      if (!found) {
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
      }

      if (!found) {
        const assetUrl = assetUrlMap?.[assetId]?.url;
        console.warn(`[export] ❌ asset not resolved: id=${assetId} track=${track.type} url=${assetUrl ?? '(none)'}`);
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
    username,
    status: 'queued',
    progress: 0,
    progressMsg: '已入队',
    downloadUrl: null,
    error: null,
    createdAt: Date.now(),
  };
  jobs.set(jobId, job);
  pruneJobs();

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

/** GET /api/editor/export/:jobId — 查询任务状态（仅允许查自己的 job） */
router.get('/export/:jobId', (req, res) => {
  const callerUser = sanitizeUsername(req.user?.username);
  const job = jobs.get(req.params.jobId);
  if (!job || job.username !== callerUser) {
    // P1-17：export job 目前只保存在进程内存中，PM2 重启 / 进程切换会清空。
    // 对于真实 404 与「PM2 重启后丢失」两种情形无法从返回值区分，
    // 这里给前端一个明确提示：请改用 /export/files 查看历史产物。
    res.status(404).json({
      error: 'Job not found（可能是服务重启导致进度丢失，请在「历史导出」列表重试）',
      errorCode: 'EXPORT_JOB_NOT_FOUND',
    });
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
