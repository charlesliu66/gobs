import { Router } from 'express';
import { getTaskDetail, getTaskHistory, listAccounts, publishVideo } from '../services/geelark.js';
export const geelarkRouter = Router();
/**
 * 兼容前端 /api/geelark/accounts。
 * 账号来源：config/geelark-accounts.json
 */
geelarkRouter.get('/accounts', async (_req, res) => {
    try {
        res.json({ accounts: listAccounts() });
    }
    catch (err) {
        console.error('[geelark/accounts]', err);
        res.status(500).json({ error: err instanceof Error ? err.message : '获取账号列表失败' });
    }
});
/**
 * 先恢复路由存在，避免前端直接 404。
 * 该接口若需完整发布链路，可后续接入 GeeLark task/add。
 */
geelarkRouter.post('/publish', async (req, res) => {
    const { videoUrl, videoPath, accountIds, caption, hashtags, markAI, needShareLink } = req.body;
    const input = typeof videoPath === 'string' ? videoPath : videoUrl;
    if (!input || typeof input !== 'string') {
        res.status(400).json({ error: '请提供 videoUrl 或 videoPath' });
        return;
    }
    const ids = Array.isArray(accountIds) ? accountIds.filter((x) => typeof x === 'string' && x.trim()) : [];
    if (ids.length === 0) {
        res.status(400).json({ error: '请选择至少一个目标账号' });
        return;
    }
    try {
        const result = await publishVideo({
            videoUrl: input,
            accountIds: ids,
            caption: typeof caption === 'string' ? caption : undefined,
            hashtags: typeof hashtags === 'string' ? hashtags : undefined,
            markAI: !!markAI,
            needShareLink: !!needShareLink,
        });
        res.json(result);
    }
    catch (err) {
        console.error('[geelark/publish]', err);
        res.status(500).json({ error: err instanceof Error ? err.message : '发布失败' });
    }
});
geelarkRouter.get('/task/:id', async (req, res) => {
    const id = String(req.params.id || '').trim();
    if (!id) {
        res.status(400).json({ error: '请提供任务 ID' });
        return;
    }
    try {
        res.json(await getTaskDetail(id));
    }
    catch (err) {
        console.error('[geelark/task]', err);
        res.status(500).json({ error: err instanceof Error ? err.message : '获取任务详情失败' });
    }
});
geelarkRouter.get('/tasks', async (req, res) => {
    const size = Math.min(Number.parseInt(String(req.query.size ?? '20'), 10) || 20, 100);
    try {
        res.json({ items: await getTaskHistory(size) });
    }
    catch (err) {
        console.error('[geelark/tasks]', err);
        res.status(500).json({ error: err instanceof Error ? err.message : '获取任务列表失败' });
    }
});
