/**
 * QuickFilm API 路由
 */
import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { createJob, loadJob, runJobAsync, saveJob, quickfilmJobEvents, type QuickFilmJob } from '../services/quickFilmService.js';
import { nanoid } from 'nanoid';
import fs from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';
import { getApiDataDir } from '../config/apiDataDir.js';
import { addJob, type BatchJob } from '../services/batchJobsQueue.js';
import { isDreaminaEnabled, submitDreaminaVideo, checkDreaminaAuth } from '../services/dreaminaVideo.js';
import { sanitizeUsername } from '../utils/safeUsername.js';

const quickfilmRouter = Router();

/**
 * POST /api/quickfilm/start
 * Body: { story, protagonist, protagonistDesc?, style, styleImageBase64?, assetFiles? }
 */
quickfilmRouter.post('/start', async (req: Request, res: Response) => {
  const username = sanitizeUsername(req.user?.username);
  const {
    story,
    protagonist,
    protagonistDesc,
    style,
    projectId,
    styleImageBase64,
    assetFiles,
  } = req.body as {
    story?: string;
    protagonist?: string;
    protagonistDesc?: string;
    style?: string;
    projectId?: string;
    styleImageBase64?: string;
    assetFiles?: Array<{ name: string; base64: string }>;
  };

  const storyStr = typeof story === 'string' ? story.trim() : '';
  if (!storyStr) {
    res.status(400).json({ error: '请描述故事内容' });
    return;
  }

  const projectIdStr = typeof projectId === 'string' ? projectId.trim() : '';
  if (!projectIdStr || !isSafeId(projectIdStr)) {
    res.status(400).json({ error: '请提供有效的 projectId' });
    return;
  }

  const jobId = await createJob({
    story: storyStr,
    protagonist: typeof protagonist === 'string' ? protagonist.trim() : '主角',
    protagonistDesc: typeof protagonistDesc === 'string' ? protagonistDesc.trim() : '',
    style: typeof style === 'string' ? style.trim() : '现代',
    projectId: projectIdStr,
    username,
  });

  // 异步执行，不等待
  runJobAsync(jobId, {
    styleImageBase64: typeof styleImageBase64 === 'string' ? styleImageBase64 : undefined,
    assetFiles: Array.isArray(assetFiles) ? assetFiles : undefined,
    username,
  });

  res.json({ jobId });
});

/**
 * GET /api/quickfilm/:jobId/status
 */
quickfilmRouter.get('/:jobId/status', (req: Request, res: Response) => {
  const username = sanitizeUsername(req.user?.username);
  const { jobId } = req.params;
  if (!jobId) {
    res.status(400).json({ error: '缺少 jobId' });
    return;
  }

  const job = loadJob(jobId, username);
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
    projectId: job.projectId,
  });
});

/**
 * GET /api/quickfilm/:jobId/stream?token=<jwt> — SSE 实时推送
 */
quickfilmRouter.get('/:jobId/stream', (req: Request, res: Response) => {
  const token = req.query['token'] as string | undefined;
  if (!token) { res.status(401).json({ error: 'token required' }); return; }
  let username: string | undefined;
  try {
    const payload = jwt.verify(token, process.env['JWT_SECRET'] ?? 'dev-secret') as { username?: string };
    username = typeof payload.username === 'string' ? payload.username : undefined;
  } catch {
    res.status(401).json({ error: 'invalid token' }); return;
  }

  const { jobId } = req.params;
  const sanitizedUser = sanitizeUsername(username);

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  (res as unknown as { flushHeaders?: () => void }).flushHeaders?.();

  const send = (job: QuickFilmJob) => {
    if (job.id === jobId) {
      res.write(`data: ${JSON.stringify(job)}\n\n`);
    }
  };

  quickfilmJobEvents.on('update', send);

  // Send current state immediately
  const current = loadJob(jobId, sanitizedUser);
  if (current) res.write(`data: ${JSON.stringify(current)}\n\n`);

  req.on('close', () => {
    quickfilmJobEvents.off('update', send);
    res.end();
  });
});

/**
 * POST /api/quickfilm/:jobId/confirm
 * Body: { storyboard } — 用户确认/修改后的分镜
 */
quickfilmRouter.post('/:jobId/confirm', async (req: Request, res: Response) => {
  const username = sanitizeUsername(req.user?.username);
  const { jobId } = req.params;
  const { storyboard } = req.body as { storyboard?: unknown };

  if (!jobId) {
    res.status(400).json({ error: '缺少 jobId' });
    return;
  }

  const job = loadJob(jobId, username);
  if (!job) {
    res.status(404).json({ error: '任务不存在' });
    return;
  }

  if (!Array.isArray(storyboard)) {
    res.status(400).json({ error: '请提供 storyboard 数组' });
    return;
  }

  if (!isDreaminaEnabled()) {
    res.status(400).json({ error: '即梦未启用，无法执行一键成片。请先配置 dreamina-cli 并重启 API。' });
    return;
  }

  // 检查即梦 CLI 登录态
  const authCheck = await checkDreaminaAuth();
  if (!authCheck.loggedIn) {
    res.status(400).json({
      error: `即梦 CLI 未登录：${authCheck.error || '请在服务器执行 dreamina login'}`,
    });
    return;
  }

  // 保存用户确认的分镜
  job.storyboard = storyboard as typeof job.storyboard;
  const batchJobId = nanoid();
  job.batchJobId = batchJobId;

  saveJob(job, username);

  const projectId = job.projectId || `quickfilm-${jobId}`;
  const now = new Date().toISOString();
  const shots = storyboard as Array<{
    shotIndex?: number;
    durationSec?: number;
    subject?: string;
    action?: string;
    dialogue?: string;
    notes?: string;
    structuredStill?: { sp_subject?: string; sp_environment?: string };
    structuredMotion?: { mp_motion?: string; mp_camera?: string; mp_tempo?: string };
    userMatchedAssets?: { characterRef?: string; sceneRef?: string };
  }>;

  const queued: BatchJob[] = [];
  for (let i = 0; i < shots.length; i++) {
    const shot = shots[i]!;
    const prompt = [
      shot.subject ? `主体：${shot.subject}` : '',
      shot.action ? `动作：${shot.action}` : '',
      shot.structuredStill?.sp_environment ? `环境：${shot.structuredStill.sp_environment}` : '',
      shot.structuredStill?.sp_subject ? `画面主体：${shot.structuredStill.sp_subject}` : '',
      shot.structuredMotion?.mp_motion ? `运动：${shot.structuredMotion.mp_motion}` : '',
      shot.structuredMotion?.mp_camera ? `运镜：${shot.structuredMotion.mp_camera}` : '',
      shot.structuredMotion?.mp_tempo ? `节奏：${shot.structuredMotion.mp_tempo}` : '',
      shot.dialogue ? `对白：${shot.dialogue}` : '',
      shot.notes ? `备注：${shot.notes}` : '',
      `风格：${job.style}`,
    ]
      .filter(Boolean)
      .join('\n');

    const refBase64 = shot.userMatchedAssets?.characterRef || shot.userMatchedAssets?.sceneRef || undefined;
    const model = refBase64 ? 'dreamina-image2video' : 'dreamina-text2video';

    const { submitId, taskId } = await submitDreaminaVideo({
      prompt,
      aspectRatio: '9:16',
      duration: Math.max(4, Math.min(15, Math.round(shot.durationSec ?? 5))),
      model,
      imageBase64: refBase64,
      imageMimeType: refBase64 ? 'image/png' : undefined,
    });

    const id = `bj_${Date.now()}_${randomBytes(3).toString('hex')}`;
    const bj: BatchJob = {
      id,
      submitId,
      taskId: taskId || `dreamina-${submitId}`,
      projectId,
      source: 'quickfilm',
      shotIndex: shot.shotIndex ?? i,
      shotDescription: `${shot.subject ?? ''} ${shot.action ?? ''}`.trim() || `QuickFilm 分镜 ${i + 1}`,
      model,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };
    await addJob(bj);
    queued.push(bj);
  }

  console.log('[quickfilm/confirm] storyboard confirmed and queued:', { batchJobId, queued: queued.length, projectId });
  res.json({ batchJobId, queued: queued.length, projectId });
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

// ─── Session routes (Step2/3 恢复) ───────────────────────────────────────────

interface QuickFilmSessionBody {
  step?: 2 | 3;
  jobId?: string;
  projectId?: string;
  logline?: string;
  storyboard?: unknown;
  assetFiles?: Array<{ name?: string; base64?: string }>;
}

function getSessionsDir(username: string): string {
  if (!isSafeId(username)) throw new Error('非法用户名');
  return path.join(getApiDataDir(), 'quickfilm', 'sessions', username);
}

function getSessionPath(username: string): string {
  return path.join(getSessionsDir(username), 'latest.json');
}

/**
 * POST /api/quickfilm/session — 保存当前会话（Step2/3）
 */
quickfilmRouter.post('/session', async (req: Request, res: Response) => {
  const username = req.user!.username;
  const body = req.body as QuickFilmSessionBody;
  const step = body.step;
  const jobId = typeof body.jobId === 'string' ? body.jobId.trim() : '';
  const projectId = typeof body.projectId === 'string' ? body.projectId.trim() : '';
  if ((step !== 2 && step !== 3) || !jobId || !isSafeId(jobId)) {
    res.status(400).json({ error: '无效的会话参数' });
    return;
  }
  if (projectId && !isSafeId(projectId)) {
    res.status(400).json({ error: '无效的 projectId' });
    return;
  }

  const assetFiles = Array.isArray(body.assetFiles)
    ? body.assetFiles
        .filter((f) => f && typeof f.name === 'string' && typeof f.base64 === 'string')
        .map((f) => ({ name: f.name!.slice(0, 200), base64: f.base64! }))
        .slice(0, 100)
    : [];

  const session = {
    step,
    jobId,
    projectId: projectId || undefined,
    logline: typeof body.logline === 'string' ? body.logline : undefined,
    storyboard: Array.isArray(body.storyboard) ? body.storyboard : undefined,
    assetFiles,
    updatedAt: new Date().toISOString(),
  };

  try {
    const dir = getSessionsDir(username);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(getSessionPath(username), JSON.stringify(session, null, 2), 'utf-8');
    res.json({ success: true });
  } catch (err) {
    console.error('[quickfilm/session] save error', err);
    res.status(500).json({ error: '保存会话失败' });
  }
});

/**
 * GET /api/quickfilm/session — 读取最近会话
 */
quickfilmRouter.get('/session', async (req: Request, res: Response) => {
  const username = req.user!.username;
  try {
    const raw = fs.readFileSync(getSessionPath(username), 'utf-8');
    const data = JSON.parse(raw) as Record<string, unknown>;
    res.json(data);
  } catch {
    res.status(404).json({ error: '暂无可恢复会话' });
  }
});

/**
 * DELETE /api/quickfilm/session — 清空最近会话
 */
quickfilmRouter.delete('/session', async (req: Request, res: Response) => {
  const username = req.user!.username;
  try {
    fs.unlinkSync(getSessionPath(username));
    res.json({ success: true });
  } catch {
    res.status(404).json({ error: '暂无可清空会话' });
  }
});

