import { Router } from 'express';
import type { EditorExportRequestBody } from '../editor/timelineSchema.js';

const router = Router();

type ExportJobStatus = 'queued' | 'processing' | 'done' | 'error';

interface ExportJob {
  id: string;
  status: ExportJobStatus;
  progress: number;
  downloadUrl: string | null;
  error: string | null;
  createdAt: number;
  mock: boolean;
}

const jobs = new Map<string, ExportJob>();

function validateTimelineBody(body: unknown): body is EditorExportRequestBody {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  if (!b.project || typeof b.project !== 'object') return false;
  const p = b.project as Record<string, unknown>;
  return typeof p.id === 'string' && Array.isArray(p.tracks);
}

/** POST 提交导出任务 */
router.post('/export', (req, res) => {
  if (!validateTimelineBody(req.body)) {
    res.status(400).json({ error: 'Invalid body: need { project: { id, tracks, ... } }' });
    return;
  }
  const { project, aspectRatio } = req.body as EditorExportRequestBody;
  const jobId = `exp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const job: ExportJob = {
    id: jobId,
    status: 'queued',
    progress: 0,
    downloadUrl: null,
    error: null,
    createdAt: Date.now(),
    mock: true,
  };
  jobs.set(jobId, job);

  // Mock：短时后标记完成（真实 FFmpeg 合成将使用 project + aspectRatio）
  setTimeout(() => {
    const j = jobs.get(jobId);
    if (!j) return;
    j.status = 'processing';
    j.progress = 50;
  }, 400);

  setTimeout(() => {
    const j = jobs.get(jobId);
    if (!j) return;
    j.status = 'done';
    j.progress = 100;
    j.downloadUrl = null;
    console.debug('[editor/export mock done]', project.id, aspectRatio ?? project.aspectRatio);
  }, 1500);

  res.json({ jobId, message: 'queued' });
});

/** GET 查询导出任务 */
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
    downloadUrl: job.downloadUrl,
    error: job.error,
    mock: job.mock,
  });
});

export default router;
