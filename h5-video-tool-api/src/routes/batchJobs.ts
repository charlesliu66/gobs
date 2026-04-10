import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';
import { getApiDataDir } from '../config/apiDataDir.js';
import {
  getAllJobs,
  getJobsByProject,
  addJob,
  cancelJob,
  type BatchJob,
} from '../services/batchJobsQueue.js';

const router = Router();

/** POST /api/batch-jobs — 批量提交（已有 submitId 的分镜直接加入队列） */
router.post('/', async (req, res) => {
  const { projectId, shots } = req.body as {
    projectId?: string;
    shots?: Array<{
      submitId: string;
      taskId?: string;
      shotIndex: number;
      shotDescription?: string;
      model?: string;
    }>;
  };
  if (!projectId || !Array.isArray(shots) || shots.length === 0) {
    res.status(400).json({ error: 'need projectId + shots[]' });
    return;
  }
  const now = new Date().toISOString();
  const added: BatchJob[] = [];
  for (const s of shots) {
    if (!s.submitId) continue;
    const id = `bj_${Date.now()}_${randomBytes(3).toString('hex')}`;
    const job: BatchJob = {
      id,
      submitId: s.submitId,
      taskId: s.taskId ?? `dreamina-${s.submitId}`,
      projectId,
      source: 'production',
      shotIndex: s.shotIndex,
      shotDescription: s.shotDescription ?? '',
      model: s.model ?? 'dreamina-multimodal',
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };
    await addJob(job);
    added.push(job);
  }
  res.json({ added: added.length, jobs: added });
});

/** GET /api/batch-jobs?projectId=xxx — 查询项目的所有任务 */
router.get('/', async (req, res) => {
  const { projectId } = req.query as { projectId?: string };
  const jobs = projectId ? await getJobsByProject(projectId) : await getAllJobs();
  res.json({ jobs });
});

/** DELETE /api/batch-jobs/:id — 取消任务 */
router.delete('/:id', async (req, res) => {
  const ok = await cancelJob(req.params.id);
  res.json({ ok });
});

/** GET /api/batch-jobs/video/:id — 下载成品视频 */
router.get('/video/:id', (req, res) => {
  const id = req.params.id.replace(/[^a-zA-Z0-9_-]/g, '');
  const filePath = path.join(getApiDataDir(), 'output', 'batch-jobs', 'videos', `${id}.mp4`);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'video not found' });
    return;
  }
  res.setHeader('Content-Type', 'video/mp4');
  res.setHeader('Content-Disposition', `inline; filename="${id}.mp4"`);
  fs.createReadStream(filePath).pipe(res);
});

export default router;
