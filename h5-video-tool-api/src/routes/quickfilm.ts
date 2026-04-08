/**
 * QuickFilm API 路由
 */
import { Router, Request, Response } from 'express';
import { createJob, loadJob, runJobAsync } from '../services/quickFilmService.js';
import { nanoid } from 'nanoid';
import fs from 'fs';
import path from 'path';
import { getApiDataDir } from '../config/apiDataDir.js';

const quickfilmRouter = Router();

/**
 * POST /api/quickfilm/start
 * Body: { story, protagonist, protagonistDesc?, style, styleImageBase64?, assetFiles? }
 */
quickfilmRouter.post('/start', async (req: Request, res: Response) => {
  const {
    story,
    protagonist,
    protagonistDesc,
    style,
    styleImageBase64,
    assetFiles,
  } = req.body as {
    story?: string;
    protagonist?: string;
    protagonistDesc?: string;
    style?: string;
    styleImageBase64?: string;
    assetFiles?: Array<{ name: string; base64: string }>;
  };

  const storyStr = typeof story === 'string' ? story.trim() : '';
  if (!storyStr) {
    res.status(400).json({ error: '请描述故事内容' });
    return;
  }

  const jobId = await createJob({
    story: storyStr,
    protagonist: typeof protagonist === 'string' ? protagonist.trim() : '主角',
    protagonistDesc: typeof protagonistDesc === 'string' ? protagonistDesc.trim() : '',
    style: typeof style === 'string' ? style.trim() : '现代',
  });

  // 异步执行，不等待
  runJobAsync(jobId, {
    styleImageBase64: typeof styleImageBase64 === 'string' ? styleImageBase64 : undefined,
    assetFiles: Array.isArray(assetFiles) ? assetFiles : undefined,
  });

  res.json({ jobId });
});

/**
 * GET /api/quickfilm/:jobId/status
 */
quickfilmRouter.get('/:jobId/status', (req: Request, res: Response) => {
  const { jobId } = req.params;
  if (!jobId) {
    res.status(400).json({ error: '缺少 jobId' });
    return;
  }

  const job = loadJob(jobId);
  if (!job) {
    res.status(404).json({ error: '任务不存在' });
    return;
  }

  res.json({
    status: job.status,
    progress: job.progress,
    steps: job.steps,
    storyboard: job.status === 'done' ? job.storyboard : undefined,
    error: job.error,
    logline: job.storyArc?.logline,
    title: job.story.slice(0, 30),
  });
});

/**
 * POST /api/quickfilm/:jobId/confirm
 * Body: { storyboard } — 用户确认/修改后的分镜
 */
quickfilmRouter.post('/:jobId/confirm', async (req: Request, res: Response) => {
  const { jobId } = req.params;
  const { storyboard } = req.body as { storyboard?: unknown };

  if (!jobId) {
    res.status(400).json({ error: '缺少 jobId' });
    return;
  }

  const job = loadJob(jobId);
  if (!job) {
    res.status(404).json({ error: '任务不存在' });
    return;
  }

  if (!Array.isArray(storyboard)) {
    res.status(400).json({ error: '请提供 storyboard 数组' });
    return;
  }

  // 保存用户确认的分镜
  job.storyboard = storyboard as typeof job.storyboard;
  const batchJobId = nanoid();
  job.batchJobId = batchJobId;

  fs.writeFileSync(
    path.join(getApiDataDir(), 'quickfilm', `${jobId}.json`),
    JSON.stringify(job, null, 2),
    'utf-8',
  );

  // TODO: 触发视频批量生成任务（接入现有 batchJobsQueue）
  console.log('[quickfilm/confirm] storyboard confirmed, batchJobId:', batchJobId);

  res.json({ batchJobId });
});

export default quickfilmRouter;
