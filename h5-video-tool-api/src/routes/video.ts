/**
 * 视频生成路由（VEO / Dreamina / Kling）
 *
 * 路由：
 *   GET  /api/video/models        — 获取可用模型列表
 *   GET  /api/video/file          — 提供已生成视频文件访问
 *   GET  /api/video/output-recent — 扫描近期视频（历史记录）
 *   POST /api/video/generate      — 单段视频生成（同步）
 *
 * 多镜头路由已拆分到 videoMultishot.ts
 */
import { Router, Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { generateVideoWithPython } from '../services/veoPython.js';
import { classifyError } from '../domain/job-status.js';
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
} from '../services/dreaminaVideo.js';
import { composeDreaminaPrompt, type DreaminaPromptHints } from '../services/dreaminaPromptComposer.js';
import { getApiDataDir, getDefaultVideoOutputDir } from '../config/apiDataDir.js';
import { sanitizeUsername } from '../utils/safeUsername.js';
import { resolveMediaRequestUsername } from '../utils/fileAccessToken.js';
import { persistVideoUrlToOutput } from '../services/videoUtils.js';
import {
  dedupeOutputRecentVideoItems,
  runRecentDreaminaSyncLocked,
  type OutputRecentVideoEntry,
} from '../services/dreaminaRecentSync.js';
import dreaminaRouter from './videoDreamina.js';
import klingRouter from './videoKling.js';
import { multishotRouter, MULTISHOT_JOBS_ROOT } from './videoMultishot.js';
import {
  fetchDriveImageAsBase64,
  referenceVideoFromBodyAsync,
  resolveFirstDriveImageIfMissing,
} from '../services/videoReferenceUtils.js';

export const videoRouter = Router();

const OUTPUT_DIR = getDefaultVideoOutputDir();

async function ensureDreaminaAuthOrRespond(res: Response): Promise<boolean> {
  const status = await checkDreaminaAuth();
  if (status.loggedIn) return true;
  res.status(400).json({
    error: status.error || '即梦 CLI 未登录，请在服务器执行 dreamina login',
    errorCode: 'DREAMINA_NOT_LOGGED_IN',
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
videoRouter.use('/', multishotRouter);

async function collectOutputRecentItems(options: {
  username: string;
  onlyDreamina: boolean;
}): Promise<OutputRecentVideoEntry[]> {
  const apiRoot = getApiDataDir();
  const outputDir = path.join(getDefaultVideoOutputDir(), options.username);
  const items: OutputRecentVideoEntry[] = [];

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
      if (options.onlyDreamina && !lower.includes('dreamina')) continue;
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
  return items;
}

/** GET /api/video/file?path=output/xxx.mp4 - 提供已生成视频文件访问，供历史记录预览
 *
 * 此接口在 auth 中间件中已针对 <video> 标签的无 Bearer 请求放行。
 * 身份通过以下任一方式解析，强制要求命中当前用户目录：
 *   1. Authorization: Bearer <JWT>  — fetch() 请求带
 *   2. ?fat=<fileAccessToken>       — <video>/<img> 标签无法带 Bearer，登录响应中已下发
 * 两者皆无时拒绝访问，防止未登录枚举 output/<其他用户>/。
 */
videoRouter.get('/file', async (req: Request, res: Response) => {
  const rawPath = req.query.path as string | undefined;
  if (!rawPath || typeof rawPath !== 'string') {
    res.status(400).json({ error: '请提供 path 参数' });
    return;
  }
  const callerUsername = resolveMediaRequestUsername(req);
  if (!callerUsername) {
    res.status(401).json({ error: '需要登录或有效的 fat 访问 token' });
    return;
  }
  const username = sanitizeUsername(callerUsername);
  const outputDir = getDefaultVideoOutputDir();
  const fullPath = path.resolve(getApiDataDir(), path.normalize(rawPath));
  const userOutputDir = path.join(outputDir, username);
  const userMultishotDir = path.join(MULTISHOT_JOBS_ROOT, username);

  const inUserOutputDir = fullPath === userOutputDir || fullPath.startsWith(userOutputDir + path.sep);
  const inUserMultishotDir = fullPath === userMultishotDir || fullPath.startsWith(userMultishotDir + path.sep);

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
  const rawItems = await collectOutputRecentItems({ username, onlyDreamina });
  const deduped = dedupeOutputRecentVideoItems(rawItems);
  res.json({ items: deduped.items.slice(0, limit), duplicateCollapsedCount: deduped.collapsedCount });
});

videoRouter.post('/output-recent/sync-dreamina', async (req: Request, res: Response) => {
  const username = sanitizeUsername(req.user?.username);
  const rawItems = await collectOutputRecentItems({ username, onlyDreamina: false });
  const syncResult = await runRecentDreaminaSyncLocked({
    username: req.user?.username,
    existingPaths: rawItems.map((item) => item.path),
    listLimit: 120,
    maxSync: 24,
  });
  res.json(syncResult);
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

export default videoRouter;
