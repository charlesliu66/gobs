/**
 * POST /api/video/generate
 * 调用 Compass Veo 视频生成 API（通过 Python SDK，与文档一致）
 * 支持参考照片：传 driveToken + materials（含 mimeType），首张图片作为参考图
 * 支持分镜图流程：直接传 imageBase64（来自 Imagen 分镜图）
 */
import { Router, Request, Response } from 'express';
import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { generateVideoWithPython } from '../services/veoPython.js';
import {
  generateKlingVideo,
  isIngarenaKlingBaseUrl,
  isKlingModel,
  type KlingRefImage,
  type KlingRefVideo,
} from '../services/klingVideo.js';
import {
  checkDreaminaAuth,
  generateDreaminaMultimodalVideo,
  generateDreaminaVideo,
  getDreaminaModelIds,
  isDreaminaEnabled,
  isDreaminaModel,
  isDreaminaMultimodalModel,
  pollDreaminaTask,
  submitDreaminaMultimodalVideo,
  submitDreaminaVideo,
} from '../services/dreaminaVideo.js';
import { composeDreaminaPrompt, type DreaminaPromptHints } from '../services/dreaminaPromptComposer.js';
import { getApiDataDir, getDefaultVideoOutputDir } from '../config/apiDataDir.js';
import { sanitizeUsername } from '../utils/safeUsername.js';
import { persistVideoUrlToOutput } from '../services/videoUtils.js';
import dreaminaRouter from './videoDreamina.js';
import klingRouter from './videoKling.js';
import {
  fetchDriveImageAsBase64,
  referenceVideoFromBodyAsync,
  resolveFirstDriveImageIfMissing,
} from '../services/videoReferenceUtils.js';

export const videoRouter = Router();

const OUTPUT_DIR = getDefaultVideoOutputDir();
const MULTISHOT_JOBS_ROOT = path.join(getApiDataDir(), 'multishot-jobs');

type MultishotJobStatus = 'pending' | 'running' | 'done' | 'error';
type MultishotShotStatus = 'pending' | 'running' | 'done' | 'error';

interface MultishotJobShot {
  index: number;
  status: MultishotShotStatus;
  promptSnippet: string;
  durationSeconds: number;
  videoPath?: string;
  error?: string;
}

interface MultishotJobRecord {
  jobId: string;
  username: string;
  status: MultishotJobStatus;
  aspectRatio: string;
  model?: string;
  shots: MultishotJobShot[];
  finalVideoPath?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

function getMultishotJobDir(username: string, jobId: string): string {
  return path.join(MULTISHOT_JOBS_ROOT, sanitizeUsername(username), jobId);
}

function getMultishotJobFile(username: string, jobId: string): string {
  return path.join(getMultishotJobDir(username, jobId), 'job.json');
}

function toApiRelativePath(absPath: string): string {
  return path.relative(getApiDataDir(), absPath).replace(/\\/g, '/');
}

async function writeMultishotJob(job: MultishotJobRecord): Promise<void> {
  const file = getMultishotJobFile(job.username, job.jobId);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(
    file,
    JSON.stringify({ ...job, updatedAt: new Date().toISOString() }, null, 2),
    'utf-8',
  );
}

async function readMultishotJob(username: string, jobId: string): Promise<MultishotJobRecord | null> {
  const file = getMultishotJobFile(username, jobId);
  try {
    const raw = await fs.readFile(file, 'utf-8');
    const parsed = JSON.parse(raw) as MultishotJobRecord;
    return parsed;
  } catch {
    return null;
  }
}

async function patchMultishotJob(
  username: string,
  jobId: string,
  patch: (job: MultishotJobRecord) => MultishotJobRecord,
): Promise<MultishotJobRecord | null> {
  const current = await readMultishotJob(username, jobId);
  if (!current) return null;
  const next = patch(current);
  await writeMultishotJob(next);
  return next;
}

async function ensureDreaminaAuthOrRespond(res: Response): Promise<boolean> {
  const status = await checkDreaminaAuth();
  if (status.loggedIn) return true;
  res.status(400).json({
    error: status.error || '即梦 CLI 未登录，请在服务器执行 dreamina login',
  });
  return false;
}

/** 默认仅展示 veo-2.0 模型（多数环境无需组织策略审批）
 * 若需使用 veo-3.x，在 .env 中设置 VEO_MODELS=veo-2.0-generate-001,veo-3.1-generate-001 等 */
const DEFAULT_VEO_MODELS = ['veo-2.0-generate-001', 'veo-2.0-generate-exp'];

/** 可灵模型列表：设置 KLING_API_KEY 后出现在下拉框；也可用 KLING_MODELS 覆盖 */
const DEFAULT_KLING_MODELS = ['kling-v2.6-pro', 'kling-v2.6-std'];

function getVeoModels(): string[] {
  const envList = process.env.VEO_MODELS?.trim();
  if (envList) {
    return envList.split(',').map((m) => m.trim()).filter(Boolean);
  }
  const list = [...DEFAULT_VEO_MODELS];
  // 配置了 VEO3 专用 Key 时在下拉中展示 VEO3（仍可用 VEO_MODELS 完全覆盖）
  if (process.env.COMPASS_API_KEY2?.trim() && !list.some((x) => /veo-3/i.test(x))) {
    list.push('veo-3.1-generate-001');
  }
  return list;
}

function getKlingModelsForList(): string[] {
  const envList = process.env.KLING_MODELS?.trim();
  if (envList) {
    return envList.split(',').map((m) => m.trim()).filter(Boolean);
  }
  return DEFAULT_KLING_MODELS;
}

/** 即梦 CLI + Veo +（若已配置 KLING_API_KEY）可灵模型 */
function getVideoModels(): string[] {
  const dreamina = isDreaminaEnabled() ? getDreaminaModelIds() : [];
  const veo = getVeoModels();
  if (process.env.KLING_API_KEY?.trim()) {
    return [...dreamina, ...veo, ...getKlingModelsForList()];
  }
  return [...dreamina, ...veo];
}

videoRouter.get('/models', (_req: Request, res: Response) => {
  res.json({
    models: getVideoModels(),
    /** ingarena 网关：可灵单段可走「仅创建任务 + video-list 轮询」，不阻塞 HTTP */
    klingAsync: !!process.env.KLING_API_KEY?.trim() && isIngarenaKlingBaseUrl(),
    /** 即梦：H5 可走 POST /dreamina/submit + GET /dreamina/task/:submitId 轮询，支持排队中并发生成 */
    dreaminaAsync: isDreaminaEnabled(),
  });
});

videoRouter.use('/dreamina', dreaminaRouter);
videoRouter.use('/', klingRouter);

/** GET /api/video/file?path=output/xxx.mp4 - 提供已生成视频文件访问，供历史记录预览 */
videoRouter.get('/file', async (req: Request, res: Response) => {
  const username = sanitizeUsername(req.user?.username);
  const rawPath = req.query.path as string | undefined;
  if (!rawPath || typeof rawPath !== 'string') {
    res.status(400).json({ error: '请提供 path 参数' });
    return;
  }
  const outputDir = getDefaultVideoOutputDir();
  const multishotUserDir = path.join(MULTISHOT_JOBS_ROOT, username);
  const fullPath = path.resolve(getApiDataDir(), path.normalize(rawPath));
  const userOutputDir = path.join(outputDir, username);
  const inOutputRoot = fullPath === outputDir || fullPath.startsWith(outputDir + path.sep);
  const inMultishotRoot = fullPath === multishotUserDir || fullPath.startsWith(multishotUserDir + path.sep);
  if (!inOutputRoot && !inMultishotRoot) {
    res.status(400).json({ error: 'path 必须在允许的视频目录下' });
    return;
  }
  const inUserOutputDir = fullPath === userOutputDir || fullPath.startsWith(userOutputDir + path.sep);
  const inUserMultishotDir = fullPath === multishotUserDir || fullPath.startsWith(multishotUserDir + path.sep);
  if (!inUserOutputDir && !inUserMultishotDir) {
    res.status(403).json({ error: '无权访问该视频' });
    return;
  }
  try {
    await fs.access(fullPath);
    res.sendFile(fullPath, { headers: { 'Content-Type': 'video/mp4' } });
  } catch {
    res.status(404).json({ error: '文件不存在' });
  }
});

/**
 * GET /api/video/output-recent — 扫描 data/output 下近期视频（即梦 CLI 等落盘成片），供前端「历史内容」拉取。
 * Query: limit (默认 50), dreaminaOnly=1 时仅路径/文件名含 dreamina 的条目。
 */
videoRouter.get('/output-recent', async (req: Request, res: Response) => {
  const username = sanitizeUsername(req.user?.username);
  const limit = Math.min(120, Math.max(1, parseInt(String(req.query.limit ?? '50'), 10) || 50));
  const onlyDreamina =
    String(req.query.dreaminaOnly ?? '') === '1' || String(req.query.filter ?? '').toLowerCase() === 'dreamina';
  const apiRoot = getApiDataDir();
  const outputDir = path.join(getDefaultVideoOutputDir(), username);
  const items: { path: string; mtimeMs: number; size: number }[] = [];

  async function walk(dir: string, depth: number): Promise<void> {
    if (depth > 10) return;
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      const abs = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        await walk(abs, depth + 1);
        continue;
      }
      const ext = path.extname(ent.name).toLowerCase();
      if (!['.mp4', '.webm', '.mov', '.mkv'].includes(ext)) continue;
      const rel = path.relative(apiRoot, abs).replace(/\\/g, '/');
      if (!rel.startsWith('output/')) continue;
      const lower = rel.toLowerCase();
      if (onlyDreamina && !lower.includes('dreamina')) continue;
      try {
        const st = await fs.stat(abs);
        items.push({ path: rel, mtimeMs: st.mtimeMs, size: st.size });
      } catch {
        /* ignore missing */
      }
    }
  }

  try {
    await walk(outputDir, 0);
  } catch (err) {
    console.error('[video/output-recent]', err);
  }
  items.sort((a, b) => b.mtimeMs - a.mtimeMs);
  res.json({ items: items.slice(0, limit) });
});

videoRouter.post('/generate', async (req: Request, res: Response) => {
  const {
    storyboardText,
    materials,
    driveToken,
    duration,
    aspectRatio,
    model,
    resolution,
    imageBase64: bodyImageBase64,
    imageMimeType: bodyImageMimeType,
    referenceImages,
    referenceVideoUrl,
    referenceVideoReferType,
    referenceVideoKeepSound,
    dreaminaModelVersion,
    autoComposePrompt,
    dreaminaPromptHints,
  } = req.body as {
    storyboardText?: string;
    materials?: { id: string; name: string; mimeType?: string }[];
    driveToken?: string;
    duration?: number;
    aspectRatio?: string;
    model?: string;
    resolution?: string;
    /** 分镜图先行流程：直接传入 base64 参考图（不含 data: 前缀） */
    imageBase64?: string;
    imageMimeType?: string;
    /** 可灵多图参考：与 Drive materials 二选一优先；每项对应 Omni image_list */
    referenceImages?: { base64: string; mimeType?: string; type?: 'first_frame' | 'end_frame' }[];
    referenceVideoUrl?: string;
    referenceVideoReferType?: 'feature' | 'base';
    referenceVideoKeepSound?: 'yes' | 'no';
    /** 即梦 CLI --model-version，覆盖单次请求的 DREAMINA_*_MODEL */
    dreaminaModelVersion?: string;
    /** 即梦全能参考 multimodal2video：与下方 storyboardText 一并作为 prompt；顺序即 @图片1 @视频1 编号顺序 */
    multimodalImages?: { base64: string; mimeType?: string }[];
    multimodalVideos?: { base64: string; mimeType?: string }[];
    multimodalAudios?: { base64: string; mimeType?: string }[];
    autoComposePrompt?: boolean;
    dreaminaPromptHints?: DreaminaPromptHints;
  };

  if (!storyboardText || typeof storyboardText !== 'string' || !storyboardText.trim()) {
    res.status(400).json({ error: '请提供 storyboardText（分镜文本）' });
    return;
  }

  const modelTrim = model?.trim();
  if (isDreaminaModel(modelTrim)) {
    if (!(await ensureDreaminaAuthOrRespond(res))) {
      return;
    }
  }
  if (isDreaminaMultimodalModel(modelTrim)) {
    try {
      const imgs = Array.isArray(req.body.multimodalImages) ? req.body.multimodalImages : [];
      const vids = Array.isArray(req.body.multimodalVideos) ? req.body.multimodalVideos : [];
      const auds = Array.isArray(req.body.multimodalAudios) ? req.body.multimodalAudios : [];
      const basePrompt = storyboardText.trim();
      const resolvedPrompt =
        autoComposePrompt === false
          ? basePrompt
          : await composeDreaminaPrompt({
              rawPrompt: basePrompt,
              imageCount: imgs.length,
              videoCount: vids.length,
              audioCount: auds.length,
              hints: dreaminaPromptHints,
            });
      const mv =
        typeof dreaminaModelVersion === 'string' && dreaminaModelVersion.trim()
          ? dreaminaModelVersion.trim()
          : undefined;
      const { videoUrl, taskId } = await generateDreaminaMultimodalVideo({
        prompt: resolvedPrompt,
        aspectRatio: aspectRatio ?? '16:9',
        duration: duration != null ? duration : undefined,
        images: imgs.filter((x: { base64?: string }) => x && typeof x.base64 === 'string'),
        videos: vids.filter((x: { base64?: string }) => x && typeof x.base64 === 'string'),
        audios: auds.filter((x: { base64?: string }) => x && typeof x.base64 === 'string'),
        modelVersion: mv,
      });
      const slug =
        storyboardText
          .trim()
          .slice(0, 30)
          .replace(/[^\p{L}\p{N}\u4e00-\u9fff\w\s-]/gu, '')
          .replace(/\s+/g, '_')
          .trim() || 'video';
      const videoPath = await persistVideoUrlToOutput(videoUrl, slug, req.user?.username);
      res.json({ taskId, status: 'completed' as const, videoUrl, videoPath, resolvedPrompt });
    } catch (err) {
      console.error('[video/generate dreamina-multimodal]', err);
      const msg = err instanceof Error ? err.message : '全能参考视频生成失败';
      res.status(500).json({ error: msg });
    }
    return;
  }

  try {
    let klingRefVideos: KlingRefVideo[] | undefined;
    try {
      klingRefVideos = await referenceVideoFromBodyAsync({
        referenceVideoUrl,
        referenceVideoReferType,
        referenceVideoKeepSound,
      });
    } catch (e) {
      res.status(400).json({ error: e instanceof Error ? e.message : '参考视频参数无效' });
      return;
    }

    let imageBase64: string | undefined = bodyImageBase64;
    let imageMimeType: string | undefined = bodyImageMimeType;

    const m = model?.trim();
    const maxKlingRef = Math.min(20, Math.max(1, parseInt(process.env.KLING_MAX_REF_IMAGES || '7', 10) || 7));

    /** 可灵多图：referenceImages > 请求体单图 > 素材顺序多图 > 首张素材 */
    let klingImageList: KlingRefImage[] | undefined;
    if (isKlingModel(m)) {
      if (Array.isArray(referenceImages) && referenceImages.length > 0) {
        klingImageList = referenceImages.slice(0, maxKlingRef).map((r) => ({
          imageBase64: r.base64,
          imageMimeType: r.mimeType,
          type: r.type,
        }));
      } else if (bodyImageBase64) {
        klingImageList = [{ imageBase64: bodyImageBase64, imageMimeType: bodyImageMimeType }];
      } else if (driveToken && materials?.length) {
        const imgs = materials.filter((x) => x.mimeType?.startsWith('image/'));
        const list: KlingRefImage[] = [];
        for (const mat of imgs.slice(0, maxKlingRef)) {
          const img = await fetchDriveImageAsBase64(mat.id, mat.mimeType, driveToken);
          if (img) list.push({ imageBase64: img.base64, imageMimeType: img.mimeType });
        }
        if (list.length) klingImageList = list;
      }
      if (!klingImageList?.length && driveToken && materials?.length) {
        const firstImage = materials.find((x) => x.mimeType?.startsWith('image/'));
        if (firstImage) {
          const img = await fetchDriveImageAsBase64(firstImage.id, firstImage.mimeType, driveToken);
          if (img) {
            klingImageList = [{ imageBase64: img.base64, imageMimeType: img.mimeType }];
          }
        }
      }
    } else {
      const r = await resolveFirstDriveImageIfMissing(imageBase64, imageMimeType, driveToken, materials);
      imageBase64 = r.imageBase64;
      imageMimeType = r.imageMimeType;
    }

    const { taskId, videoUrl } = isDreaminaModel(m)
      ? await generateDreaminaVideo({
          prompt: storyboardText.trim(),
          aspectRatio: aspectRatio ?? '16:9',
          duration: duration != null ? duration : undefined,
          model: m!,
          imageBase64,
          imageMimeType,
          modelVersion: typeof dreaminaModelVersion === 'string' ? dreaminaModelVersion.trim() : undefined,
        })
      : isKlingModel(m)
        ? await generateKlingVideo({
            prompt: storyboardText.trim(),
            aspectRatio: aspectRatio ?? '16:9',
            duration: duration != null ? duration : undefined,
            model: m,
            imageList: klingImageList,
            imageBase64: klingImageList?.length ? undefined : imageBase64,
            imageMimeType: klingImageList?.length ? undefined : imageMimeType,
            videoList: klingRefVideos,
          })
        : await generateVideoWithPython({
            prompt: storyboardText.trim(),
            aspectRatio: aspectRatio ?? '16:9',
            duration: duration != null ? duration : undefined,
            resolution: resolution?.trim() || undefined,
            model: m || undefined,
            imageBase64,
            imageMimeType,
          });

    /** 保存到 output/ 并返回 videoPath，供 GeeLark 推送时用本地路径避免 base64 传输问题 */
    const slug =
      storyboardText
        .trim()
        .slice(0, 30)
        .replace(/[^\p{L}\p{N}\u4e00-\u9fff\w\s-]/gu, '')
        .replace(/\s+/g, '_')
        .trim() || 'video';
    const videoPath = await persistVideoUrlToOutput(videoUrl, slug, req.user?.username);

    res.json({
      taskId,
      status: 'completed',
      videoUrl,
      videoPath,
    });
  } catch (err) {
    console.error('[video/generate]', err);
    const msg = err instanceof Error ? err.message : '视频生成失败';
    res.status(500).json({ error: msg });
  }
});

/** ffmpeg 拼接视频片段 */
async function concatVideos(videoPaths: string[], outputPath: string): Promise<void> {
  const listPath = path.join(os.tmpdir(), `concat_${Date.now()}.txt`);
  const listContent = videoPaths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join('\n');
  await fs.writeFile(listPath, listContent, 'utf-8');
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', outputPath], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stderr = '';
    proc.stderr?.on('data', (d) => (stderr += d.toString()));
    proc.on('close', (code) => {
      fs.unlink(listPath).catch(() => {});
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg 拼接失败: ${stderr}`));
    });
    proc.on('error', reject);
  });
}

async function runMultishotJob(args: {
  username: string;
  jobId: string;
  shots: { index: number; durationSeconds: number; prompt: string; imageBase64?: string }[];
  aspectRatio: string;
  materials?: { id: string; name: string; mimeType?: string }[];
  driveToken?: string;
  model?: string;
}) {
  const { username, jobId, shots, aspectRatio, materials, driveToken } = args;
  const multishotModel = args.model?.trim() || '';
  const jobDir = getMultishotJobDir(username, jobId);
  try {
    await patchMultishotJob(username, jobId, (job) => ({ ...job, status: 'running', error: undefined }));
    await fs.mkdir(jobDir, { recursive: true });

    let materialsRefBase64: string | undefined;
    let materialsRefMime: string | undefined;
    if (driveToken && materials?.length) {
      const firstImg = materials.find((m) => m.mimeType?.startsWith('image/'));
      if (firstImg) {
        const img = await fetchDriveImageAsBase64(firstImg.id, firstImg.mimeType, driveToken);
        if (img) {
          materialsRefBase64 = img.base64;
          materialsRefMime = img.mimeType;
        }
      }
    }

    const doneAbsPaths: string[] = [];
    for (let i = 0; i < shots.length; i++) {
      const shot = shots[i];
      await patchMultishotJob(username, jobId, (job) => ({
        ...job,
        shots: job.shots.map((s) => (s.index === i ? { ...s, status: 'running', error: undefined } : s)),
      }));
      try {
        const refBase64 = shot.imageBase64?.replace(/^data:image\/\w+;base64,/, '') || materialsRefBase64;
        const shotDur = Math.max(4, Math.min(8, shot.durationSeconds || 5));
        const { videoUrl } = isDreaminaModel(multishotModel)
          ? await generateDreaminaVideo({
              prompt: shot.prompt.trim(),
              aspectRatio: aspectRatio ?? '16:9',
              duration: shotDur,
              model: multishotModel,
              imageBase64: refBase64,
              imageMimeType: refBase64 ? (shot.imageBase64 ? 'image/png' : materialsRefMime ?? 'image/png') : undefined,
            })
          : isKlingModel(multishotModel)
            ? await generateKlingVideo({
                prompt: shot.prompt.trim(),
                aspectRatio: aspectRatio ?? '16:9',
                duration: shotDur,
                model: multishotModel,
                imageBase64: refBase64,
                imageMimeType: refBase64 ? (shot.imageBase64 ? 'image/png' : materialsRefMime ?? 'image/png') : undefined,
              })
            : await generateVideoWithPython({
                prompt: shot.prompt.trim(),
                aspectRatio: aspectRatio ?? '16:9',
                duration: shotDur,
                model: multishotModel || undefined,
                imageBase64: refBase64,
                imageMimeType: refBase64 ? (shot.imageBase64 ? 'image/png' : materialsRefMime ?? 'image/png') : undefined,
              });
        const buf = Buffer.from(videoUrl.replace(/^data:video\/\w+;base64,/, ''), 'base64');
        const absPath = path.join(jobDir, `shot_${i}.mp4`);
        await fs.writeFile(absPath, buf);
        doneAbsPaths.push(absPath);
        const relPath = toApiRelativePath(absPath);
        await patchMultishotJob(username, jobId, (job) => ({
          ...job,
          shots: job.shots.map((s) =>
            s.index === i ? { ...s, status: 'done', videoPath: relPath, error: undefined } : s,
          ),
        }));
      } catch (e) {
        const msg = e instanceof Error ? e.message : '该镜头生成失败';
        await patchMultishotJob(username, jobId, (job) => ({
          ...job,
          shots: job.shots.map((s) => (s.index === i ? { ...s, status: 'error', error: msg } : s)),
        }));
      }
    }

    if (!doneAbsPaths.length) {
      await patchMultishotJob(username, jobId, (job) => ({
        ...job,
        status: 'error',
        error: '所有镜头均生成失败',
      }));
      return;
    }

    const finalAbsPath = path.join(jobDir, `final_${Date.now()}.mp4`);
    await concatVideos(doneAbsPaths, finalAbsPath);
    const finalRelPath = toApiRelativePath(finalAbsPath);
    await patchMultishotJob(username, jobId, (job) => ({
      ...job,
      status: 'done',
      finalVideoPath: finalRelPath,
      error: undefined,
    }));
  } catch (err) {
    const msg = err instanceof Error ? err.message : '多镜头任务执行失败';
    console.error('[video/multishot-job-runner]', err);
    await patchMultishotJob(username, jobId, (job) => ({
      ...job,
      status: 'error',
      error: msg,
    }));
  }
}

videoRouter.post('/generate-multishot', async (req: Request, res: Response) => {
  const { shots, aspectRatio = '16:9', materials, driveToken, model: bodyModel } = req.body as {
    shots?: { index: number; durationSeconds: number; prompt: string; imageBase64?: string }[];
    aspectRatio?: string;
    materials?: { id: string; name: string; mimeType?: string }[];
    driveToken?: string;
    model?: string;
  };
  if (!shots?.length || !Array.isArray(shots)) {
    res.status(400).json({ error: '请提供 shots 数组（每项含 durationSeconds、prompt）' });
    return;
  }
  const username = sanitizeUsername(req.user?.username);
  const jobId = `ms_${Date.now()}_${randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();
  const initial: MultishotJobRecord = {
    jobId,
    username,
    status: 'pending',
    aspectRatio: aspectRatio ?? '16:9',
    model: typeof bodyModel === 'string' ? bodyModel.trim() : undefined,
    shots: shots.map((s, i) => ({
      index: i,
      status: 'pending',
      durationSeconds: Math.max(4, Math.min(8, s.durationSeconds || 5)),
      promptSnippet: s.prompt.trim().slice(0, 120),
    })),
    createdAt: now,
    updatedAt: now,
  };

  try {
    await writeMultishotJob(initial);
    res.json({ jobId, status: 'pending' as const });
    setImmediate(() => {
      void runMultishotJob({
        username,
        jobId,
        shots,
        aspectRatio: aspectRatio ?? '16:9',
        materials,
        driveToken,
        model: typeof bodyModel === 'string' ? bodyModel : undefined,
      });
    });
  } catch (err) {
    console.error('[video/generate-multishot]', err);
    const msg = err instanceof Error ? err.message : '多镜头任务创建失败';
    res.status(500).json({ error: msg });
  }
});

videoRouter.get('/multishot-job/:jobId', async (req: Request, res: Response) => {
  const username = sanitizeUsername(req.user?.username);
  const jobId = String(req.params.jobId || '').trim();
  if (!jobId) {
    res.status(400).json({ error: '缺少 jobId' });
    return;
  }
  const job = await readMultishotJob(username, jobId);
  if (!job) {
    res.status(404).json({ error: '任务不存在' });
    return;
  }
  const done = job.shots.filter((s) => s.status === 'done').length;
  const failed = job.shots.filter((s) => s.status === 'error').length;
  const running = job.shots.filter((s) => s.status === 'running').length;
  res.json({
    jobId: job.jobId,
    status: job.status,
    shots: job.shots,
    finalVideoPath: job.finalVideoPath,
    error: job.error,
    progress: {
      total: job.shots.length,
      done,
      failed,
      running,
      pending: Math.max(0, job.shots.length - done - failed - running),
    },
    updatedAt: job.updatedAt,
  });
});

export default videoRouter;
