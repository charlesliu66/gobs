import { Router } from 'express';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';
import { getApiDataDir } from '../config/apiDataDir.js';
import {
  addJob,
  batchJobEvents,
  cancelJob,
  getAllJobs,
  getJobById,
  getJobsByProject,
  pollJobNow,
  type BatchJob,
  type BatchJobSubmitParams,
} from '../services/batchJobsQueue.js';
import { fromBatchJobStatus } from '../domain/job-status.js';
import { resolveMediaRequestUsername } from '../utils/fileAccessToken.js';

const router = Router();

function normalizeShotIndexes(values: unknown): number[] {
  if (!Array.isArray(values)) return [];
  const seen = new Set<number>();
  const normalized: number[] = [];
  for (const value of values) {
    const shotIndex = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(shotIndex) || seen.has(shotIndex)) continue;
    seen.add(shotIndex);
    normalized.push(shotIndex);
  }
  return normalized;
}

function readTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

router.post('/', async (req, res) => {
  const username = req.user?.username?.trim();
  const { projectId, shots } = req.body as {
    projectId?: string;
    shots?: Array<{
      submitId: string;
      taskId?: string;
      shotIndex: number;
      primaryShotIndex?: number;
      segmentId?: string;
      sourceShotIndexes?: number[];
      shotDescription?: string;
      model?: string;
    }>;
  };
  if (!username) {
    res.status(401).json({ error: 'login required' });
    return;
  }
  if (!projectId || !Array.isArray(shots) || shots.length === 0) {
    res.status(400).json({ error: 'need projectId + shots[]' });
    return;
  }
  const now = new Date().toISOString();
  const added: BatchJob[] = [];
  for (const shot of shots) {
    const normalizedSourceShotIndexes = normalizeShotIndexes(shot.sourceShotIndexes);
    const resolvedPrimaryShotIndex = Number.isFinite(shot.primaryShotIndex)
      ? shot.primaryShotIndex
      : (Number.isFinite(shot.shotIndex) ? shot.shotIndex : normalizedSourceShotIndexes[0]);
    if (!shot.submitId || !Number.isFinite(resolvedPrimaryShotIndex)) continue;
    const primaryShotIndex = resolvedPrimaryShotIndex as number;
    const id = `bj_${Date.now()}_${randomBytes(3).toString('hex')}`;
    const job: BatchJob = {
      id,
      submitId: shot.submitId,
      taskId: shot.taskId ?? `dreamina-${shot.submitId}`,
      projectId,
      source: (shot as Record<string, unknown>).source === 'quickfilm' ? 'quickfilm' : 'production',
      username,
      shotIndex: primaryShotIndex,
      primaryShotIndex,
      segmentId: readTrimmedString(shot.segmentId) || undefined,
      sourceShotIndexes: normalizedSourceShotIndexes.length > 0 ? normalizedSourceShotIndexes : [primaryShotIndex],
      shotDescription: shot.shotDescription ?? '',
      model: shot.model ?? 'dreamina-multimodal',
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };
    await addJob(job);
    added.push(job);
  }
  if (added.length === 0) {
    res.status(400).json({ error: 'no valid shots' });
    return;
  }
  res.json({ added: added.length, jobs: added });
});

router.post('/enqueue', async (req, res) => {
  const username = req.user?.username?.trim();
  const { projectId, shotIndex, primaryShotIndex, segmentId, sourceShotIndexes, submitParams } = req.body as {
    projectId?: string;
    shotIndex?: number;
    primaryShotIndex?: number;
    segmentId?: string;
    sourceShotIndexes?: number[];
    submitParams?: BatchJobSubmitParams;
  };
  const normalizedSourceShotIndexes = normalizeShotIndexes(sourceShotIndexes);
  const resolvedPrimaryShotIndex = Number.isFinite(primaryShotIndex)
    ? primaryShotIndex
    : (Number.isFinite(shotIndex) ? shotIndex : normalizedSourceShotIndexes[0]);

  if (!username) {
    res.status(401).json({ error: '需要登录' });
    return;
  }
  if (
    !projectId
    || !Number.isFinite(resolvedPrimaryShotIndex)
    || !submitParams?.model
    || !submitParams.aspectRatio
  ) {
    res.status(400).json({ error: 'need projectId + (primaryShotIndex|shotIndex) + submitParams' });
    return;
  }
  const effectivePrimaryShotIndex = resolvedPrimaryShotIndex as number;

  const mine = (await getAllJobs()).filter(
    (job) => job.username === username && job.projectId === projectId && job.status === 'awaiting_submit',
  );
  if (mine.length >= 20) {
    res.status(429).json({ error: '本项目排队已满（20 个），请等现有任务完成或取消部分' });
    return;
  }

  const now = new Date().toISOString();
  const job: BatchJob = {
    id: `bj_${Date.now()}_${randomBytes(3).toString('hex')}`,
    submitId: '',
    taskId: '',
    projectId,
    source: 'production',
    username,
    shotIndex: effectivePrimaryShotIndex,
    primaryShotIndex: effectivePrimaryShotIndex,
    segmentId: readTrimmedString(segmentId) || undefined,
    sourceShotIndexes: normalizedSourceShotIndexes.length > 0
      ? normalizedSourceShotIndexes
      : [effectivePrimaryShotIndex],
    shotDescription: (submitParams.storyboardText ?? submitParams.prompt ?? '').slice(0, 120),
    model: submitParams.model,
    status: 'awaiting_submit',
    submitParams,
    createdAt: now,
    updatedAt: now,
  };
  await addJob(job);
  const saved = await getJobById(job.id);
  res.json({
    jobId: job.id,
    globalQueuePos: saved?.globalQueuePos ?? 0,
    etaSec: saved?.etaSec ?? 0,
    job: saved,
  });
});

router.get('/', async (req, res) => {
  const callerUsername = req.user?.username?.trim();
  if (!callerUsername) {
    res.status(401).json({ error: '需要登录' });
    return;
  }
  const { projectId } = req.query as { projectId?: string };
  const rawJobs = projectId ? await getJobsByProject(projectId) : await getAllJobs();
  const jobs = rawJobs
    .filter((job) => job.username === callerUsername)
    .map((job) => ({ ...job, unifiedStatus: fromBatchJobStatus(job.status) }));
  res.json({ jobs });
});

router.delete('/project/:projectId', async (req, res) => {
  const username = req.user?.username?.trim();
  const { projectId } = req.params;
  const shotIndexesParam = req.query['shotIndexes'];
  const shotIndexes = typeof shotIndexesParam === 'string'
    ? new Set(
        shotIndexesParam
          .split(',')
          .map((item) => Number.parseInt(item, 10))
          .filter((value) => Number.isFinite(value)),
      )
    : null;

  if (!username) {
    res.status(401).json({ error: '需要登录' });
    return;
  }
  if (!projectId) {
    res.status(400).json({ error: 'need projectId' });
    return;
  }

  const jobs = (await getJobsByProject(projectId)).filter((job) =>
    job.username === username
    && job.status !== 'processing'
    && (job.status === 'awaiting_submit' || job.status === 'pending' || job.status === 'queuing')
    && (
      !shotIndexes
      || (job.sourceShotIndexes ?? [job.primaryShotIndex ?? job.shotIndex]).some((index) => shotIndexes.has(index))
    ),
  );

  let cancelled = 0;
  for (const job of jobs) {
    const result = await cancelJob(job.id, 'user');
    if (result.ok) cancelled += 1;
  }
  res.json({ cancelled, total: jobs.length });
});

router.delete('/:id', async (req, res) => {
  const username = req.user?.username?.trim();
  const job = await getJobById(req.params.id);
  if (!job) {
    res.json({ ok: false, wasteCredit: false, note: '任务不存在', reason: 'not_found' });
    return;
  }
  if (!username || job.username !== username) {
    res.json({ ok: false, wasteCredit: false, note: '无权取消该任务', reason: 'forbidden' });
    return;
  }
  const result = await cancelJob(job.id, 'user');
  res.json(result);
});

router.post('/:id/poll-now', async (req, res) => {
  const username = req.user?.username?.trim();
  const id = req.params.id?.replace(/[^a-zA-Z0-9_-]/g, '');
  if (!username) {
    res.status(401).json({ error: 'login required' });
    return;
  }
  if (!id) {
    res.status(400).json({ error: 'invalid id' });
    return;
  }
  const existing = await getJobById(id);
  if (!existing) {
    res.status(404).json({ error: 'job not found' });
    return;
  }
  if (existing.username !== username) {
    res.status(403).json({ error: 'forbidden' });
    return;
  }
  const job = await pollJobNow(id);
  if (!job) {
    res.status(404).json({ error: 'job not found' });
    return;
  }
  res.json({ job });
});

router.post('/sync-now', async (req, res) => {
  const username = req.user?.username?.trim();
  if (!username) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  const all = await getAllJobs();
  const targets = all.filter(
    (job) => job.username === username && ['pending', 'queuing', 'processing'].includes(job.status),
  );

  const results: Array<{ id: string; status: string; videoUrl?: string; failReason?: string }> = [];
  const concurrency = 5;
  for (let index = 0; index < targets.length; index += concurrency) {
    const batch = targets.slice(index, index + concurrency);
    const pairs = await Promise.all(
      batch.map(async (job) => {
        try {
          const updated = await pollJobNow(job.id);
          return updated
            ? { id: updated.id, status: updated.status, videoUrl: updated.videoUrl, failReason: updated.failReason }
            : null;
        } catch (error) {
          return {
            id: job.id,
            status: 'error',
            failReason: error instanceof Error ? error.message : String(error),
          };
        }
      }),
    );
    for (const item of pairs) {
      if (item) results.push(item);
    }
  }

  let scan: { matched: string[]; expired: string[]; skipped: number } | null = null;
  try {
    const recovery = await import('../services/dreaminaRecovery.js');
    scan = await recovery.runRecoveryScan();
  } catch (error) {
    console.warn('[batch-jobs/sync-now] recovery scan skipped', error);
  }

  res.json({ polled: results.length, results, scan });
});

router.get('/stream', async (req, res) => {
  const token = req.query['token'] as string | undefined;
  if (!token) {
    res.status(401).json({ error: 'token required' });
    return;
  }

  let streamUsername: string | null = null;
  try {
    const payload = jwt.verify(token, process.env['JWT_SECRET'] ?? 'dev-secret') as { username?: string };
    streamUsername = typeof payload.username === 'string' ? payload.username.trim() : null;
  } catch {
    res.status(401).json({ error: 'invalid token' });
    return;
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

  const sendJob = (job: BatchJob) => {
    if (job.username !== streamUsername) return;
    const enriched = { ...job, unifiedStatus: fromBatchJobStatus(job.status) };
    res.write(`data: ${JSON.stringify(enriched)}\n\n`);
  };

  const sendSnapshot = (snapshot: unknown) => {
    res.write('event: queue-snapshot\n');
    res.write(`data: ${JSON.stringify(snapshot)}\n\n`);
  };

  batchJobEvents.on('update', sendJob);
  batchJobEvents.on('queue-snapshot', sendSnapshot);

  const currentJobs = await getAllJobs();
  currentJobs.forEach(sendJob);
  sendSnapshot({
    totalActive: currentJobs.filter((job) => ['pending', 'queuing', 'processing'].includes(job.status)).length,
    totalWaiting: currentJobs.filter((job) => job.status === 'awaiting_submit').length,
    avgSecPerJob: computeAvgSecPerJob(currentJobs),
  });

  req.on('close', () => {
    batchJobEvents.off('update', sendJob);
    batchJobEvents.off('queue-snapshot', sendSnapshot);
    res.end();
  });
});

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
  if (job.username !== callerUsername) {
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

function computeAvgSecPerJob(jobs: BatchJob[]): number {
  const doneRecent = jobs
    .filter((job) => job.status === 'done')
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 20);
  if (doneRecent.length === 0) return 120;
  return Math.max(
    1,
    Math.round(
      doneRecent.reduce((sum, job) => {
        const ageMs = new Date(job.updatedAt).getTime() - new Date(job.createdAt).getTime();
        return sum + Math.max(0, ageMs);
      }, 0) / doneRecent.length / 1000,
    ),
  );
}

export default router;
