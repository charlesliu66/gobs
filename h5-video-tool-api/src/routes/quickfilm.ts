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

// ─── Draft routes ─────────────────────────────────────────────────────────────

import { Router as DraftRouter } from 'express';
const draftsRouter = DraftRouter();

function isSafeId(id: string): boolean {
  return /^[\w-]{1,64}$/.test(id);
}

function getDraftsDir(username: string): string {
  if (!isSafeId(username)) throw new Error('非法用户名');
  return path.join(getApiDataDir(), 'quickfilm', 'drafts', username);
}

interface DraftBody {
  id?: string;
  name?: string;
  story?: string;
  protagonist?: string;
  protagonistDesc?: string;
  style?: string;
  customStyle?: string;
  styleImageBase64?: string;
  assetFiles?: Array<{ name: string; base64: string }>;
}

/**
 * POST /api/quickfilm/drafts — 保存草稿
 */
draftsRouter.post('/', async (req: Request, res: Response) => {
  const username = req.user!.username;
  const body = req.body as DraftBody;
  const draftId = (body.id && isSafeId(body.id)) ? body.id : nanoid(12);
  const dir = getDraftsDir(username);
  const now = new Date().toISOString();

  const draft = {
    id: draftId,
    name: body.name || (body.story?.slice(0, 20) || '未命名草稿'),
    story: body.story ?? '',
    protagonist: body.protagonist ?? '',
    protagonistDesc: body.protagonistDesc ?? '',
    style: body.style ?? '现代',
    customStyle: body.customStyle ?? '',
    styleImageBase64: body.styleImageBase64,
    assetFiles: body.assetFiles ?? [],
    updatedAt: now,
    createdAt: now,
  };

  // If updating existing draft, preserve createdAt
  const filePath = path.join(dir, `${draftId}.json`);
  try {
    const existing = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as { createdAt?: string };
    if (existing.createdAt) draft.createdAt = existing.createdAt;
  } catch { /* new draft */ }

  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(draft, null, 2), 'utf-8');
    res.json({ success: true, id: draftId });
  } catch (err) {
    console.error('[quickfilm/drafts] save error', err);
    res.status(500).json({ error: '保存草稿失败' });
  }
});

/**
 * GET /api/quickfilm/drafts — 列出草稿
 */
draftsRouter.get('/', async (req: Request, res: Response) => {
  const username = req.user!.username;
  const dir = getDraftsDir(username);

  try {
    fs.mkdirSync(dir, { recursive: true });
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
    const drafts = files.map((f) => {
      const raw = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8')) as Record<string, unknown>;
      return { id: raw.id as string, name: raw.name as string, updatedAt: raw.updatedAt as string, createdAt: raw.createdAt as string };
    });
    drafts.sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1));
    res.json({ success: true, drafts });
  } catch (err) {
    console.error('[quickfilm/drafts] list error', err);
    res.status(500).json({ error: '读取草稿列表失败' });
  }
});

/**
 * GET /api/quickfilm/drafts/:id — 读取草稿
 */
draftsRouter.get('/:id', async (req: Request, res: Response) => {
  const username = req.user!.username;
  const { id } = req.params;
  if (!isSafeId(id)) { res.status(400).json({ error: '无效的草稿 id' }); return; }

  try {
    const raw = fs.readFileSync(path.join(getDraftsDir(username), `${id}.json`), 'utf-8');
    res.json(JSON.parse(raw));
  } catch {
    res.status(404).json({ error: '草稿不存在' });
  }
});

/**
 * DELETE /api/quickfilm/drafts/:id — 删除草稿
 */
draftsRouter.delete('/:id', async (req: Request, res: Response) => {
  const username = req.user!.username;
  const { id } = req.params;
  if (!isSafeId(id)) { res.status(400).json({ error: '无效的草稿 id' }); return; }

  try {
    fs.unlinkSync(path.join(getDraftsDir(username), `${id}.json`));
    res.json({ success: true });
  } catch {
    res.status(404).json({ error: '草稿不存在' });
  }
});

export { draftsRouter };
