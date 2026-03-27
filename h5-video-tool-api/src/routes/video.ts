/**
 * POST /api/video/generate
 * 调用 Compass Veo 视频生成 API（通过 Python SDK，与文档一致）
 * 支持参考照片：传 driveToken + materials（含 mimeType），首张图片作为参考图
 * 支持分镜图流程：直接传 imageBase64（来自 Imagen 分镜图）
 */
import { Router, Request, Response } from 'express';
import axios from 'axios';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { generateVideoWithPython } from '../services/veoPython.js';
import {
  createKlingVideoTaskOnly,
  fetchIngarenaVideoListPage,
  generateKlingVideo,
  isIngarenaKlingBaseUrl,
  isKlingModel,
  queryIngarenaKlingTask,
  type KlingRefImage,
  type KlingRefVideo,
} from '../services/klingVideo.js';
import {
  findRefCacheFile,
  isResolvableSocialVideoPageUrl,
  prepareSocialVideoUrlForKling,
  resolveSocialPageToDirectVideoUrl,
} from '../services/tiktokResolveVideoUrl.js';

export const videoRouter = Router();

const OUTPUT_DIR = process.env.VIDEO_OUTPUT_DIR || path.resolve(process.cwd(), 'output');

/**
 * Omni `video_url` 须为服务端可直接拉取的视频资源。社交「分享页」会导致拉取失败，ingarena 常报 DatabaseError。
 * 设 KLING_ALLOW_SOCIAL_VIDEO_URL=1 可跳过此校验（仅调试用，仍可能失败）。
 */
function assertOmniReferenceVideoUrlIsLikelyDirect(urlStr: string): void {
  if (process.env.KLING_ALLOW_SOCIAL_VIDEO_URL === '1') return;
  let host: string;
  try {
    host = new URL(urlStr).hostname.toLowerCase();
  } catch {
    throw new Error('参考视频地址不是合法 URL');
  }
  const socialPageHosts = [
    'tiktok.com',
    'www.tiktok.com',
    'vm.tiktok.com',
    'vt.tiktok.com',
    'douyin.com',
    'www.douyin.com',
    'iesdouyin.com',
    'instagram.com',
    'www.instagram.com',
    'x.com',
    'twitter.com',
    'facebook.com',
    'www.facebook.com',
  ];
  const isSocial = socialPageHosts.some((h) => host === h || host.endsWith(`.${h}`));
  if (isSocial) {
    throw new Error(
      '参考视频不能填 TikTok/抖音/YouTube 等分享页链接。请使用公网可访问的 MP4 等直链（先下载再传到对象存储/CDN），或清空参考视频仅依赖图片+文案。',
    );
  }
}

/**
 * 从请求体解析单条参考视频（Omni video_list）。
 * TikTok/抖音：yt-dlp 下载到 output/kling-ref-cache，再拼 API_PUBLIC_BASE_URL 供可灵拉取（避免 CDN 直链 DatabaseError）。
 * KLING_ALLOW_SOCIAL_VIDEO_URL=1：仍用 -g 直链（仅调试，可灵侧常失败）。
 */
async function referenceVideoFromBodyAsync(body: {
  referenceVideoUrl?: string;
  referenceVideoReferType?: 'feature' | 'base';
  referenceVideoKeepSound?: 'yes' | 'no';
}): Promise<KlingRefVideo[] | undefined> {
  const raw = body.referenceVideoUrl?.trim();
  if (!raw) return undefined;
  let url = raw;
  if (!/^https?:\/\//i.test(url)) {
    if (/^\/\//.test(url)) url = `https:${url}`;
    else throw new Error('参考视频地址需为 http(s) 开头');
  }

  if (isResolvableSocialVideoPageUrl(url)) {
    if (process.env.KLING_ALLOW_SOCIAL_VIDEO_URL === '1') {
      url = await resolveSocialPageToDirectVideoUrl(url);
    } else {
      url = await prepareSocialVideoUrlForKling(url);
    }
  } else {
    assertOmniReferenceVideoUrlIsLikelyDirect(url);
  }

  return [
    {
      videoUrl: url,
      referType: body.referenceVideoReferType === 'base' ? 'base' : 'feature',
      keepOriginalSound: body.referenceVideoKeepSound === 'yes' ? 'yes' : 'no',
    },
  ];
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

/** Veo +（若已配置 KLING_API_KEY）可灵模型 */
function getVideoModels(): string[] {
  const veo = getVeoModels();
  if (process.env.KLING_API_KEY?.trim()) {
    return [...veo, ...getKlingModelsForList()];
  }
  return veo;
}

videoRouter.get('/models', (_req: Request, res: Response) => {
  res.json({
    models: getVideoModels(),
    /** ingarena 网关：可灵单段可走「仅创建任务 + video-list 轮询」，不阻塞 HTTP */
    klingAsync: !!process.env.KLING_API_KEY?.trim() && isIngarenaKlingBaseUrl(),
  });
});

/** GET /api/video/kling/task/:taskId — 查询 ingarena video-list 中任务状态（供 H5 轮询） */
/** GET /api/video/kling/recent-list — 与 clipai.ingarena.net 视频列表同源（同一 API Key） */
videoRouter.get('/kling/recent-list', async (req: Request, res: Response) => {
  if (!process.env.KLING_API_KEY?.trim() || !isIngarenaKlingBaseUrl()) {
    res.json({ items: [], klingAvailable: false });
    return;
  }
  try {
    const page = Math.min(10, Math.max(1, parseInt(String(req.query.page), 10) || 1));
    const pageSize = Math.min(50, Math.max(1, parseInt(String(req.query.pageSize), 10) || 20));
    const items = await fetchIngarenaVideoListPage({ page, pageSize });
    res.json({ items, klingAvailable: true });
  } catch (err) {
    console.error('[video/kling/recent-list]', err);
    const msg = err instanceof Error ? err.message : '拉取可灵列表失败';
    res.status(500).json({ error: msg });
  }
});

videoRouter.get('/kling/task/:taskId', async (req: Request, res: Response) => {
  if (!process.env.KLING_API_KEY?.trim() || !isIngarenaKlingBaseUrl()) {
    res.status(400).json({ error: '当前未配置 ingarena 可灵（KLING_API_BASE_URL 需为 clipai.ingarena.net 等）' });
    return;
  }
  const raw = req.params.taskId;
  if (!raw?.trim()) {
    res.status(400).json({ error: '缺少 taskId' });
    return;
  }
  try {
    const r = await queryIngarenaKlingTask(decodeURIComponent(raw));
    res.json(r);
  } catch (err) {
    console.error('[video/kling/task]', err);
    const msg = err instanceof Error ? err.message : '查询失败';
    res.status(500).json({ error: msg });
  }
});

/**
 * GET /api/video/kling/video-proxy?url=
 * 同域代理 MP4，避免浏览器对 CDN 直链的跨域限制导致 <video> 无法播放。
 */
videoRouter.get('/kling/video-proxy', async (req: Request, res: Response) => {
  const u = req.query.url as string | undefined;
  if (!u || typeof u !== 'string' || !/^https?:\/\//i.test(u)) {
    res.status(400).json({ error: '请提供合法 http(s) url' });
    return;
  }
  try {
    const r = await axios.get(u, {
      responseType: 'stream',
      timeout: 300000,
      validateStatus: (s) => s < 500,
    });
    if (r.status >= 400) {
      res.status(r.status).json({ error: '上游拉取失败' });
      return;
    }
    const ct = r.headers['content-type'];
    if (ct) res.setHeader('Content-Type', ct);
    res.setHeader('Content-Disposition', 'inline');
    r.data.pipe(res);
  } catch (err) {
    console.error('[video/kling/video-proxy]', err);
    const msg = err instanceof Error ? err.message : '代理失败';
    res.status(500).json({ error: msg });
  }
});

/**
 * GET /api/video/kling/ref-cache/:cacheId
 * 可灵 Omni 拉取参考视频：由 prepareSocialVideoUrlForKling 写入的临时文件（UUID 文件名）。
 * 须与 API_PUBLIC_BASE_URL 指向本服务同一实例，且公网可达。
 */
videoRouter.get('/kling/ref-cache/:cacheId', async (req: Request, res: Response) => {
  const cacheId = typeof req.params.cacheId === 'string' ? req.params.cacheId.trim() : '';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cacheId)) {
    res.status(400).json({ error: '无效的 cacheId' });
    return;
  }
  try {
    const abs = await findRefCacheFile(cacheId);
    if (!abs) {
      res.status(404).json({ error: '参考视频不存在或已过期（默认约 30 分钟后清理）' });
      return;
    }
    const ext = path.extname(abs).toLowerCase();
    const mime =
      ext === '.webm' ? 'video/webm' : ext === '.mov' ? 'video/quicktime' : ext === '.mkv' ? 'video/x-matroska' : 'video/mp4';
    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', 'inline');
    res.sendFile(path.resolve(abs));
  } catch (err) {
    console.error('[video/kling/ref-cache]', err);
    res.status(500).json({ error: err instanceof Error ? err.message : '读取缓存失败' });
  }
});

/** GET /api/video/file?path=output/xxx.mp4 - 提供已生成视频文件访问，供历史记录预览 */
videoRouter.get('/file', async (req: Request, res: Response) => {
  const rawPath = req.query.path as string | undefined;
  if (!rawPath || typeof rawPath !== 'string') {
    res.status(400).json({ error: '请提供 path 参数' });
    return;
  }
  const outputDir = path.resolve(process.cwd(), 'output');
  const fullPath = path.resolve(process.cwd(), path.normalize(rawPath));
  if (!fullPath.startsWith(outputDir + path.sep) && fullPath !== outputDir) {
    res.status(400).json({ error: 'path 必须在 output 目录下' });
    return;
  }
  try {
    await fs.access(fullPath);
    res.sendFile(fullPath, { headers: { 'Content-Type': 'video/mp4' } });
  } catch {
    res.status(404).json({ error: '文件不存在' });
  }
});

/** 从 Drive 获取首张图片的 base64（用于 Veo 参考图） */
async function fetchDriveImageAsBase64(
  fileId: string,
  mimeType: string | undefined,
  driveToken: string
): Promise<{ base64: string; mimeType: string } | null> {
  const headers = { Authorization: `Bearer ${driveToken}` };
  const opts = { responseType: 'arraybuffer' as const, timeout: 15000 };
  try {
    const { data, status } = await axios.get<ArrayBuffer>(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`,
      {
        params: { alt: 'media', supportsAllDrives: true },
        ...opts,
        headers,
        validateStatus: (s) => s < 500,
      }
    );
    if (status >= 400) return null;
    const mime = mimeType?.startsWith('image/') ? mimeType : 'image/png';
    const base64 = Buffer.from(data).toString('base64');
    return { base64, mimeType: mime };
  } catch {
    return null;
  }
}

/** POST /api/video/generate-kling-async — 仅创建可灵任务（ingarena），不轮询；H5 用 GET /kling/task/:id 轮询 */
videoRouter.post('/generate-kling-async', async (req: Request, res: Response) => {
  if (!process.env.KLING_API_KEY?.trim() || !isIngarenaKlingBaseUrl()) {
    res.status(400).json({
      error:
        '仅 ingarena 可灵网关支持异步创建，请设置 KLING_API_BASE_URL（如 https://clipai.ingarena.net）',
    });
    return;
  }

  const {
    storyboardText,
    materials,
    driveToken,
    duration,
    aspectRatio,
    model,
    imageBase64: bodyImageBase64,
    imageMimeType: bodyImageMimeType,
    referenceImages,
    referenceVideoUrl,
    referenceVideoReferType,
    referenceVideoKeepSound,
  } = req.body as {
    storyboardText?: string;
    materials?: { id: string; name: string; mimeType?: string }[];
    driveToken?: string;
    duration?: number;
    aspectRatio?: string;
    model?: string;
    imageBase64?: string;
    imageMimeType?: string;
    referenceImages?: { base64: string; mimeType?: string; type?: 'first_frame' | 'end_frame' }[];
    /** Omni 参考视频公网直链（与 image_list 可同时传） */
    referenceVideoUrl?: string;
    referenceVideoReferType?: 'feature' | 'base';
    referenceVideoKeepSound?: 'yes' | 'no';
  };

  if (!storyboardText || typeof storyboardText !== 'string' || !storyboardText.trim()) {
    res.status(400).json({ error: '请提供 storyboardText（分镜文本）' });
    return;
  }

  const m = model?.trim();
  if (!isKlingModel(m)) {
    res.status(400).json({ error: '异步接口仅支持可灵模型' });
    return;
  }

  try {
    let videoList: KlingRefVideo[] | undefined;
    try {
      videoList = await referenceVideoFromBodyAsync({
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
    const maxKlingRef = Math.min(20, Math.max(1, parseInt(process.env.KLING_MAX_REF_IMAGES || '7', 10) || 7));

    let klingImageList: KlingRefImage[] | undefined;
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

    const taskId = await createKlingVideoTaskOnly({
      prompt: storyboardText.trim(),
      aspectRatio: aspectRatio ?? '16:9',
      duration: duration != null ? duration : undefined,
      model: m,
      imageList: klingImageList,
      imageBase64: klingImageList?.length ? undefined : imageBase64,
      imageMimeType: klingImageList?.length ? undefined : imageMimeType,
      videoList,
    });

    res.json({ taskId, status: 'pending' as const });
  } catch (err) {
    console.error('[video/generate-kling-async]', err);
    const msg = err instanceof Error ? err.message : '创建可灵任务失败';
    res.status(500).json({ error: msg });
  }
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
  };

  if (!storyboardText || typeof storyboardText !== 'string' || !storyboardText.trim()) {
    res.status(400).json({ error: '请提供 storyboardText（分镜文本）' });
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
    } else if (!imageBase64 && driveToken && materials?.length) {
      const firstImage = materials.find((x) => x.mimeType?.startsWith('image/'));
      if (firstImage) {
        const img = await fetchDriveImageAsBase64(firstImage.id, firstImage.mimeType, driveToken);
        if (img) {
          imageBase64 = img.base64;
          imageMimeType = img.mimeType;
        }
      }
    }

    const { taskId, videoUrl } = isKlingModel(m)
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
    let videoPath: string | undefined;
    try {
      await fs.mkdir(OUTPUT_DIR, { recursive: true });
      const slug = storyboardText
        .trim()
        .slice(0, 30)
        .replace(/[^\p{L}\p{N}\u4e00-\u9fff\w\s-]/gu, '')
        .replace(/\s+/g, '_')
        .trim() || 'video';
      const filename = `${slug}_${Date.now()}.mp4`;
      const savePath = path.join(OUTPUT_DIR, filename);
      const buf = Buffer.from(videoUrl.replace(/^data:video\/\w+;base64,/, ''), 'base64');
      await fs.writeFile(savePath, buf);
      const rel = path.relative(process.cwd(), savePath);
      videoPath = rel.startsWith('..') ? savePath : rel.replace(/\\/g, '/');
    } catch (e) {
      console.warn('[video/generate] 保存到 output/ 失败，仍返回 videoUrl', e);
    }

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

videoRouter.post('/generate-multishot', async (req: Request, res: Response) => {
  const { shots, aspectRatio = '16:9', outputPath: customOutputPath, materials, driveToken, model: bodyModel } = req.body as {
    shots?: { index: number; durationSeconds: number; prompt: string; imageBase64?: string }[];
    aspectRatio?: string;
    outputPath?: string;
    materials?: { id: string; name: string; mimeType?: string }[];
    driveToken?: string;
    /** 与单段生成一致：选可灵则每镜走可灵 */
    model?: string;
  };
  const multishotModel = typeof bodyModel === 'string' ? bodyModel.trim() : '';

  if (!shots?.length || !Array.isArray(shots)) {
    res.status(400).json({ error: '请提供 shots 数组（每项含 durationSeconds、prompt）' });
    return;
  }

  try {
    // 获取用户选中的素材作为参考图：第 1 张 = 主体设定图，用于每个镜头的视频生成
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

    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    const tmpDir = path.join(os.tmpdir(), `multishot_${Date.now()}`);
    await fs.mkdir(tmpDir, { recursive: true });

    const videoPaths: string[] = [];
    for (let i = 0; i < shots.length; i++) {
      const shot = shots[i];
      // 优先用该镜头自带的 imageBase64（来自 生成首尾帧），否则用用户选的第 1 张素材
      const refBase64 = shot.imageBase64?.replace(/^data:image\/\w+;base64,/, '') || materialsRefBase64;
      const shotDur = Math.max(4, Math.min(8, shot.durationSeconds || 5));
      const { videoUrl } = isKlingModel(multishotModel)
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
      const p = path.join(tmpDir, `shot_${i}.mp4`);
      await fs.writeFile(p, buf);
      videoPaths.push(p);
    }

    const outDir = customOutputPath ? path.resolve(customOutputPath) : OUTPUT_DIR;
    await fs.mkdir(outDir, { recursive: true });
    const finalPath = path.join(outDir, `多镜头_${Date.now()}.mp4`);
    await concatVideos(videoPaths, finalPath);

    for (const p of videoPaths) await fs.unlink(p).catch(() => {});
    await fs.rmdir(tmpDir).catch(() => {});

    const buf = await fs.readFile(finalPath);
    const videoUrl = `data:video/mp4;base64,${buf.toString('base64')}`;
    res.json({
      status: 'completed',
      videoUrl,
      outputPath: finalPath,
    });
  } catch (err) {
    console.error('[video/generate-multishot]', err);
    const msg = err instanceof Error ? err.message : '多镜头视频生成失败';
    res.status(500).json({ error: msg });
  }
});

export default videoRouter;
