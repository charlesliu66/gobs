import { Router } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import type { EditorExportRequestBody } from '../editor/timelineSchema.js';
import { runFfmpegExport } from '../services/ffmpegExport.js';
import { getApiDataDir, getUploadsPath } from '../config/apiDataDir.js';

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

/** 把 assetId 映射到本地文件路径（多路查找） */
function resolveAssetPaths(
  tracks: EditorExportRequestBody['project']['tracks'],
): Record<string, string> {
  // 素材可能在多个目录
  const searchDirs = [
    getUploadsPath('editor'),           // 剪辑上传目录
    path.join(getApiDataDir(), 'output', 'production', 'images'), // 高级制片图片
    path.join(getApiDataDir(), 'output'), // 通用输出目录
  ];

  const map: Record<string, string> = {};
  for (const track of tracks) {
    for (const clip of track.clips) {
      const c = clip as { assetId?: string };
      if (!c.assetId || map[c.assetId]) continue;
      // 跳过 http(s):// URL — 需要下载，暂不支持（日志提示）
      if (c.assetId.startsWith('http')) {
        console.warn('[export] assetId is a URL, skipping:', c.assetId);
        continue;
      }
      const assetId = c.assetId;
      let found = false;
      for (const dir of searchDirs) {
        if (!fs.existsSync(dir)) continue;
        // 精确匹配
        if (fs.existsSync(path.join(dir, assetId))) {
          map[assetId] = path.join(dir, assetId);
          found = true;
          break;
        }
        // 扫目录找前缀匹配（id 可能不含扩展名）
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
      if (!found) {
        console.warn('[export] asset not found locally:', assetId);
      }
    }
  }
  return map;
}

/** POST /api/editor/export — 提交导出任务（异步） */
router.post('/export', (req, res) => {
  if (!validateTimelineBody(req.body)) {
    res.status(400).json({ error: 'Invalid body' });
    return;
  }

  const body = req.body as EditorExportRequestBody;
  const { project, aspectRatio, resolution = '1080p', format = 'mp4', quality = 'balanced' } = body;

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
      const outDir = path.join(getApiDataDir(), 'exports');
      await fs.promises.mkdir(outDir, { recursive: true });
      const outputPath = path.join(outDir, `${jobId}.${format}`);

      // 资产路径映射
      const assets = resolveAssetPaths(project.tracks);
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
  const filename = path.basename(req.params.filename); // 防路径穿越
  const filePath = path.join(getApiDataDir(), 'exports', filename);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'File not found' });
    return;
  }
  res.download(filePath, filename);
});

export default router;
