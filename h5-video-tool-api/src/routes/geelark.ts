/**
 * GeeLark 相关 API：TT 账号列表、发布视频、任务详情（运行报告）
 */
import { Router, Request, Response } from 'express';
import {
  listAccounts,
  publishVideo,
  getTaskDetail,
  getTaskHistory,
} from '../services/geelark.js';

export const geelarkRouter = Router();

/** GET /api/geelark/accounts - 获取可发布的 TT 账号列表（从账号映射表读取） */
geelarkRouter.get('/accounts', (_req: Request, res: Response) => {
  try {
    const accounts = listAccounts();
    res.json({ accounts });
  } catch (err) {
    console.error('[geelark/accounts]', err);
    const msg = err instanceof Error ? err.message : '获取账号列表失败';
    res.status(500).json({ error: msg });
  }
});

/** POST /api/geelark/publish - 推送视频到指定账号
 * videoUrl: base64 data URL 或 HTTP URL
 * videoPath: 服务器本地路径（如 output/xxx.mp4），可避免 base64 传输，内网 OSS 403 时建议使用
 */
geelarkRouter.post('/publish', async (req: Request, res: Response) => {
  const { videoUrl, videoPath, accountIds, caption, hashtags, markAI, needShareLink } = req.body as {
    videoUrl?: string;
    videoPath?: string;
    accountIds?: string[];
    caption?: string;
    hashtags?: string;
    markAI?: boolean;
    needShareLink?: boolean;
  };

  const videoInput = typeof videoPath === 'string' ? videoPath : videoUrl;
  if (!videoInput || typeof videoInput !== 'string') {
    res.status(400).json({ error: '请提供 videoUrl 或 videoPath' });
    return;
  }

  const ids = Array.isArray(accountIds) ? accountIds.filter((id) => typeof id === 'string') : [];
  if (ids.length === 0) {
    res.status(400).json({ error: '请选择至少一个目标账号' });
    return;
  }

  try {
    const result = await publishVideo({
      videoUrl: videoInput,
      accountIds: ids,
      caption: typeof caption === 'string' ? caption : undefined,
      hashtags: typeof hashtags === 'string' ? hashtags : undefined,
      markAI: !!markAI,
      needShareLink: !!needShareLink,
    });
    res.json(result);
  } catch (err) {
    console.error('[geelark/publish]', err);
    const msg = err instanceof Error ? err.message : '发布失败';
    res.status(500).json({ error: msg });
  }
});

/** GET /api/geelark/task/:id - 获取任务详情（运行报告） */
geelarkRouter.get('/task/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) {
    res.status(400).json({ error: '请提供任务 ID' });
    return;
  }

  try {
    const detail = await getTaskDetail(id);
    res.json(detail);
  } catch (err) {
    console.error('[geelark/task]', err);
    const msg = err instanceof Error ? err.message : '获取任务详情失败';
    res.status(500).json({ error: msg });
  }
});

/** GET /api/geelark/tasks - 获取最近任务列表 */
geelarkRouter.get('/tasks', async (req: Request, res: Response) => {
  const size = Math.min(parseInt(req.query.size as string, 10) || 20, 100);
  try {
    const items = await getTaskHistory(size);
    res.json({ items });
  } catch (err) {
    console.error('[geelark/tasks]', err);
    const msg = err instanceof Error ? err.message : '获取任务列表失败';
    res.status(500).json({ error: msg });
  }
});

export default geelarkRouter;
