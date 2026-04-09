/**
 * SJ（TikTok 矩阵控制台）API 路由
 * 批量评论、云手机、任务日志、代理设置
 */
import { Router } from 'express';
import { getCloudPhones, phoneStart, phoneStop, phoneDelete, phoneDetailUpdate, proxyList, proxyAdd, proxyUpdate, proxyDelete, taskHistoryRecords, taskQuery, taskDetail, taskCancel, scheduleTiktokComment, } from '../services/sjGeelark.js';
const sjRouter = Router();
/** Bearer Token：优先 GEELARK_BEARER_TOKEN，未配置时回退 GEELARK_API_KEY */
const TOKEN = process.env.GEELARK_BEARER_TOKEN || process.env.GEELARK_API_KEY;
const USE_KEY_AUTH = !!(process.env.GEELARK_APP_ID && process.env.GEELARK_API_KEY && process.env.GEELARK_API_KEY.length >= 10);
function parseUtcOffset(tz) {
    const m = tz.trim().match(/^UTC([+-])(\d+)$/i);
    if (!m)
        return 0;
    const sign = m[1] === '+' ? 1 : -1;
    const hours = parseInt(m[2], 10) || 0;
    return sign * hours;
}
function toScheduleAt(p) {
    let ts = null;
    if (p.scheduleAt != null && p.scheduleAt > 0) {
        ts = p.scheduleAt;
    }
    else if (p.scheduleDate && p.scheduleTime && p.timezone) {
        const [h, m] = p.scheduleTime.split(':').map(Number);
        const dateStr = p.scheduleDate;
        const timeStr = `${String(h ?? 0).padStart(2, '0')}:${String(m ?? 0).padStart(2, '0')}:00`;
        try {
            const offsetHours = parseUtcOffset(p.timezone);
            const naiveMs = new Date(`${dateStr}T${timeStr}.000Z`).getTime();
            const scheduleAtMs = naiveMs - offsetHours * 3600 * 1000;
            ts = Math.floor(scheduleAtMs / 1000);
        }
        catch {
            const d = new Date(dateStr + 'T' + timeStr);
            ts = Math.floor(d.getTime() / 1000);
        }
    }
    if (ts == null)
        return null;
    const nowSec = Math.floor(Date.now() / 1000);
    if (ts < nowSec)
        ts = nowSec + 60;
    return ts;
}
/** GET /api/sj/geelark-status */
sjRouter.get('/geelark-status', async (_req, res) => {
    const hasBearer = TOKEN && TOKEN.length >= 10;
    if (!hasBearer && !USE_KEY_AUTH) {
        return res.json({
            ok: false,
            message: '未配置。二选一：① GEELARK_BEARER_TOKEN（或 GEELARK_API_KEY）② GEELARK_APP_ID + GEELARK_API_KEY（Key 验证）',
        });
    }
    try {
        await getCloudPhones();
        res.json({ ok: true, message: 'GeeLark 已连接' });
    }
    catch (e) {
        res.json({ ok: false, message: e instanceof Error ? e.message : 'GeeLark 请求失败' });
    }
});
/** GET /api/sj/phones */
sjRouter.get('/phones', async (_req, res) => {
    try {
        const phones = await getCloudPhones();
        res.json(phones);
    }
    catch (e) {
        res.status(500).json({ error: e instanceof Error ? e.message : '获取云手机失败' });
    }
});
/** POST /api/sj/phones/start */
sjRouter.post('/phones/start', async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: '请提供 ids 数组' });
    }
    try {
        const data = await phoneStart(ids);
        res.json(data);
    }
    catch (e) {
        res.status(500).json({ error: e instanceof Error ? e.message : '启动失败' });
    }
});
/** POST /api/sj/phones/stop */
sjRouter.post('/phones/stop', async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: '请提供 ids 数组' });
    }
    try {
        const data = await phoneStop(ids);
        res.json(data);
    }
    catch (e) {
        res.status(500).json({ error: e instanceof Error ? e.message : '关机失败' });
    }
});
/** POST /api/sj/phones/delete */
sjRouter.post('/phones/delete', async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: '请提供 ids 数组' });
    }
    try {
        const data = await phoneDelete(ids);
        res.json(data);
    }
    catch (e) {
        res.status(500).json({ error: e instanceof Error ? e.message : '删除失败' });
    }
});
/** PATCH /api/sj/phones/update */
sjRouter.patch('/phones/update', async (req, res) => {
    const { id, name, remark, proxyId } = req.body;
    if (!id) {
        return res.status(400).json({ error: '请提供 id' });
    }
    try {
        await phoneDetailUpdate({
            id,
            name: name || undefined,
            remark: remark || undefined,
            proxyId: proxyId && proxyId !== '_' ? proxyId : undefined,
        });
        res.json({ ok: true });
    }
    catch (e) {
        res.status(500).json({ error: e instanceof Error ? e.message : '更新失败' });
    }
});
/** GET /api/sj/proxies */
sjRouter.get('/proxies', async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 20;
    try {
        const data = await proxyList({ page, pageSize });
        res.json(data);
    }
    catch (e) {
        res.status(500).json({ error: e instanceof Error ? e.message : '获取代理列表失败' });
    }
});
/** POST /api/sj/proxies - 新增或更新 */
sjRouter.post('/proxies', async (req, res) => {
    const body = req.body;
    if (body.list && Array.isArray(body.list)) {
        try {
            const data = await proxyAdd(body.list);
            res.json(data);
        }
        catch (e) {
            res.status(500).json({ error: e instanceof Error ? e.message : '添加代理失败' });
        }
    }
    else if (body.id && body.scheme && body.server && body.port) {
        try {
            await proxyUpdate([{ id: body.id, scheme: body.scheme, server: body.server, port: body.port, username: body.username, password: body.password }]);
            res.json({ ok: true });
        }
        catch (e) {
            res.status(500).json({ error: e instanceof Error ? e.message : '更新代理失败' });
        }
    }
    else {
        res.status(400).json({ error: '请提供 list 或 id+scheme+server+port' });
    }
});
/** DELETE /api/sj/proxies */
sjRouter.delete('/proxies', async (req, res) => {
    const ids = req.query.ids?.split(',').filter(Boolean) ?? [];
    if (ids.length === 0) {
        return res.status(400).json({ error: '请提供 ids 参数' });
    }
    try {
        await proxyDelete(ids);
        res.json({ ok: true });
    }
    catch (e) {
        res.status(500).json({ error: e instanceof Error ? e.message : '删除代理失败' });
    }
});
/** POST /api/sj/schedule */
sjRouter.post('/schedule', async (req, res) => {
    const { tasks } = req.body;
    if (!Array.isArray(tasks) || tasks.length === 0) {
        return res.status(400).json({ error: 'tasks array required' });
    }
    const results = [];
    for (let i = 0; i < tasks.length; i++) {
        const t = tasks[i];
        const scheduleAt = toScheduleAt(t);
        if (!t?.phoneId || !t?.videoLink || !t?.comment || scheduleAt == null) {
            results.push({ index: i, error: '缺少云手机、链接、评论或发布时间' });
            continue;
        }
        try {
            const data = await scheduleTiktokComment({
                phoneId: t.phoneId,
                tiktokUrl: t.videoLink,
                comment: t.comment,
                scheduleAt,
                useAsia: t.useAsia,
            });
            results.push({ index: i, taskId: data.taskId });
        }
        catch (e) {
            results.push({ index: i, error: e instanceof Error ? e.message : 'Unknown error' });
        }
    }
    res.json({ results });
});
/** POST /api/sj/generate-comment */
sjRouter.post('/generate-comment', async (req, res) => {
    const FALLBACK = ['Nice! 🔥', 'So good!', 'Love this!', 'Amazing content!', '真不错！', '太棒了！', 'Great share!'];
    const { url } = req.body;
    const apiKey = process.env.OPENAI_API_KEY;
    const baseUrl = process.env.OPENAI_API_BASE || 'https://api.openai.com/v1';
    if (apiKey) {
        try {
            const fetchRes = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
                body: JSON.stringify({
                    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
                    messages: [{ role: 'user', content: `Generate 5 short, natural TikTok comment suggestions for a video. One per line, no numbering. Mix English and Chinese. Keep each under 100 characters. Video link: ${url || 'unknown'}` }],
                    max_tokens: 300,
                }),
            });
            if (fetchRes.ok) {
                const data = (await fetchRes.json());
                const text = data.choices?.[0]?.message?.content?.trim() || '';
                const lines = text.split('\n').map((s) => s.replace(/^\d+[.)]\s*/, '').trim()).filter(Boolean).slice(0, 5);
                if (lines.length > 0)
                    return res.json({ suggestions: lines });
            }
        }
        catch { }
    }
    const shuffled = [...FALLBACK].sort(() => Math.random() - 0.5);
    res.json({ suggestions: shuffled.slice(0, 5) });
});
/** GET /api/sj/tasks/history */
sjRouter.get('/tasks/history', async (req, res) => {
    const size = Math.min(parseInt(req.query.size, 10) || 100, 100);
    try {
        const data = await taskHistoryRecords({ size });
        res.json(data);
    }
    catch (e) {
        res.status(500).json({ error: e instanceof Error ? e.message : '获取任务历史失败' });
    }
});
/** POST /api/sj/tasks/query */
sjRouter.post('/tasks/query', async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
        return res.json({ total: 0, items: [] });
    }
    try {
        const data = await taskQuery(ids);
        res.json(data);
    }
    catch (e) {
        res.status(500).json({ error: e instanceof Error ? e.message : '查询任务失败' });
    }
});
/** POST /api/sj/tasks/detail */
sjRouter.post('/tasks/detail', async (req, res) => {
    const { id, searchAfter } = req.body;
    if (!id) {
        return res.status(400).json({ error: '请提供 id' });
    }
    try {
        const data = await taskDetail(id, searchAfter);
        res.json(data);
    }
    catch (e) {
        res.status(500).json({ error: e instanceof Error ? e.message : '获取任务详情失败' });
    }
});
/** POST /api/sj/tasks/cancel */
sjRouter.post('/tasks/cancel', async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: '请提供 ids 数组' });
    }
    try {
        const data = await taskCancel(ids);
        res.json(data);
    }
    catch (e) {
        res.status(500).json({ error: e instanceof Error ? e.message : '取消失败' });
    }
});
export default sjRouter;
