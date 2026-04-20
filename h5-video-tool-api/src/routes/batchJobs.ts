import { Router } from 'express';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';
import { getApiDataDir } from '../config/apiDataDir.js';
import {
  getAllJobs,
  getJobsByProject,
  getJobById,
  addJob,
  cancelJob,
  pollJobNow,
  batchJobEvents,
  type BatchJob,
} from '../services/batchJobsQueue.js';
import { fromBatchJobStatus } from '../domain/job-status.js';
import { resolveMediaRequestUsername } from '../utils/fileAccessToken.js';

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
      source: (s as Record<string, unknown>).source === 'quickfilm' ? 'quickfilm' : 'production',
      username: req.user?.username,
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

/** GET /api/batch-jobs?projectId=xxx — 查询项目的所有任务（仅返回当前登录用户的任务） */
router.get('/', async (req, res) => {
  const callerUsername = req.user?.username?.trim();
  if (!callerUsername) {
    res.status(401).json({ error: '需要登录' });
    return;
  }
  const { projectId } = req.query as { projectId?: string };
  const rawJobs = projectId ? await getJobsByProject(projectId) : await getAllJobs();
  const jobs = rawJobs.filter((j) => j.username === callerUsername);
  const enriched = jobs.map((j) => ({ ...j, unifiedStatus: fromBatchJobStatus(j.status) }));
  res.json({ jobs: enriched });
});

/** DELETE /api/batch-jobs/project/:projectId — 批量取消项目内所有未完成任务 */
router.delete('/project/:projectId', async (req, res) => {
  const { projectId } = req.params;
  if (!projectId) { res.status(400).json({ error: 'need projectId' }); return; }
  const jobs = await getJobsByProject(projectId);
  const cancellable = jobs.filter((j) =>
    j.status === 'pending' || j.status === 'queuing' || j.status === 'processing' || j.status === 'awaiting_submit',
  );
  let cancelled = 0;
  for (const j of cancellable) {
    if (await cancelJob(j.id)) cancelled++;
  }
  res.json({ cancelled, total: cancellable.length });
});

/** DELETE /api/batch-jobs/:id — 取消任务 */
router.delete('/:id', async (req, res) => {
  const ok = await cancelJob(req.params.id);
  res.json({ ok });
});

/** POST /api/batch-jobs/:id/poll-now — 用户手动触发立即轮询 */
router.post('/:id/poll-now', async (req, res) => {
  const id = req.params.id?.replace(/[^a-zA-Z0-9_-]/g, '');
  if (!id) { res.status(400).json({ error: 'invalid id' }); return; }
  const job = await pollJobNow(id);
  if (!job) { res.status(404).json({ error: 'job not found' }); return; }
  res.json({ job });
});

/** GET /api/batch-jobs/stream?token=<jwt> — SSE 实时推送（按用户过滤） */
router.get('/stream', (req, res) => {
  const token = req.query['token'] as string | undefined;
  if (!token) { res.status(401).json({ error: 'token required' }); return; }
  let streamUsername: string | null = null;
  try {
    const payload = jwt.verify(token, process.env['JWT_SECRET'] ?? 'dev-secret') as { username?: string };
    streamUsername = typeof payload.username === 'string' ? payload.username.trim() : null;
  } catch {
    res.status(401).json({ error: 'invalid token' }); return;
  }
  if (!streamUsername) {
    res.status(401).json({ error: 'token missing username' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  (res as unknown as { flushHeaders?: () => void }).flushHeaders?.();

  const send = (job: BatchJob) => {
    // 仅推送属于当前登录用户的任务，防止跨用户元数据泄露
    if (job.username !== streamUsername) return;
    const enriched = { ...job, unifiedStatus: fromBatchJobStatus(job.status) };
    res.write(`data: ${JSON.stringify(enriched)}\n\n`);
  };

  batchJobEvents.on('update', send);

  // Send all current jobs immediately (post-filter)
  void getAllJobs().then((jobs) => jobs.forEach(send));

  req.on('close', () => {
    batchJobEvents.off('update', send);
    res.end();
  });
});

/** GET /api/batch-jobs/video/:id — 下载成品视频
 *
 * 放行在 auth 中间件中（<video> 无法携带 Bearer），此处通过 JWT 或 ?fat= 校验调用者，
 * 并对照 batch job 的 username 确保跨用户不可拉取。
 */
router.get('/video/:id', async (req, res) => {
  const id = req.params.id.replace(/[^a-zA-Z0-9_-]/g, '');
  if (!id) {
    res.status(400).json({ error: 'invalid id' });
    return;
  }
  const callerUsername = resolveMediaRequestUsername(req);
  if (!callerUsername) {
    res.status(401).json({ error: '需要登录或有效的 fat 访问 token' });
    return;
  }
  const job = await getJobById(id);
  if (!job) {
    res.status(404).json({ error: 'job not found' });
    return;
  }
  if (job.username && job.username !== callerUsername) {
    res.status(403).json({ error: '无权访问该任务视频' });
    return;
  }
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
