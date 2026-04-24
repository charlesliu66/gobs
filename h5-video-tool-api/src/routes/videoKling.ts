import { Router, type Request, type Response } from 'express';
import axios from 'axios';
import path from 'path';
import { classifyError } from '../domain/job-status.js';
import {
  createKlingVideoTaskOnly,
  fetchIngarenaVideoListPage,
  isIngarenaKlingBaseUrl,
  isKlingModel,
  queryIngarenaKlingTask,
  type KlingRefImage,
  type KlingRefVideo,
} from '../services/klingVideo.js';
import {
  findRefCacheFile,
} from '../services/tiktokResolveVideoUrl.js';
import { fetchDriveImageAsBase64, referenceVideoFromBodyAsync } from '../services/videoReferenceUtils.js';

const klingRouter = Router();

/** GET /api/video/kling/recent-list — 与 clipai.ingarena.net 视频列表同源（同一 API Key） */
klingRouter.get('/kling/recent-list', async (req: Request, res: Response) => {
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
    const { errorCode, errorMessage } = classifyError(err);
    res.status(500).json({ error: errorMessage, errorCode });
  }
});

/** GET /api/video/kling/task/:taskId — 查询 ingarena video-list 中任务状态（供 H5 轮询） */
klingRouter.get('/kling/task/:taskId', async (req: Request, res: Response) => {
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
    const { errorCode, errorMessage } = classifyError(err);
    res.status(500).json({ error: errorMessage, errorCode });
  }
});

/** GET /api/video/kling/video-proxy?url= 同域代理 MP4 */
klingRouter.get('/kling/video-proxy', async (req: Request, res: Response) => {
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
    if (typeof ct === 'string' || typeof ct === 'number' || Array.isArray(ct)) {
      res.setHeader('Content-Type', ct);
    }
    res.setHeader('Content-Disposition', 'inline');
    r.data.pipe(res);
  } catch (err) {
    console.error('[video/kling/video-proxy]', err);
    const msg = err instanceof Error ? err.message : '代理失败';
    res.status(500).json({ error: msg });
  }
});

/** GET /api/video/kling/ref-cache/:cacheId */
klingRouter.get('/kling/ref-cache/:cacheId', async (req: Request, res: Response) => {
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
    const { errorCode, errorMessage } = classifyError(err);
    res.status(500).json({ error: errorMessage, errorCode });
  }
});

/** POST /api/video/generate-kling-async — 仅创建可灵任务，不轮询 */
klingRouter.post('/generate-kling-async', async (req: Request, res: Response) => {
  if (!process.env.KLING_API_KEY?.trim() || !isIngarenaKlingBaseUrl()) {
    res.status(400).json({
      error: '仅 ingarena 可灵网关支持异步创建，请设置 KLING_API_BASE_URL（如 https://clipai.ingarena.net）',
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
    const { errorCode, errorMessage } = classifyError(err);
    res.status(500).json({ error: errorMessage, errorCode });
  }
});

export default klingRouter;
