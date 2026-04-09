import { Router } from 'express';
import { routeEditorAgentMessage } from '../services/editorAgentIntent.js';
import { runEditorAgentChat } from '../services/editorAgentChat.js';
import { runEditorAgentApply } from '../services/editorAgentService.js';
import { parseEditorVisionFocusBody } from '../services/video/editorVideoAnalysis.js';
const router = Router();
function videoAssetIdsFromProject(project) {
    const ids = new Set();
    for (const t of project.tracks) {
        if (t.type !== 'video')
            continue;
        for (const c of t.clips) {
            ids.add(c.assetId);
        }
    }
    return [...ids];
}
/** 闲聊：独立大模型对话（与意图路由分离） */
router.post('/agent/chat', async (req, res) => {
    const msg = typeof req.body.userMessage === 'string'
        ? String(req.body.userMessage).trim()
        : '';
    if (!msg) {
        res.status(400).json({ error: '请提供 userMessage' });
        return;
    }
    try {
        const reply = await runEditorAgentChat(msg);
        res.json({ reply });
    }
    catch (e) {
        console.error('[editor/agent/chat]', e);
        res.status(500).json({ error: e instanceof Error ? e.message : '对话失败' });
    }
});
/** 仅做意图分类（chat / edit），闲聊内容请调 /agent/chat */
router.post('/agent/route', async (req, res) => {
    const msg = typeof req.body.userMessage === 'string'
        ? String(req.body.userMessage).trim()
        : '';
    if (!msg) {
        res.status(400).json({ error: '请提供 userMessage' });
        return;
    }
    try {
        const out = await routeEditorAgentMessage(msg);
        res.json(out);
    }
    catch (e) {
        console.error('[editor/agent/route]', e);
        res.status(500).json({ error: e instanceof Error ? e.message : '意图识别失败' });
    }
});
function buildEditorApplyInput(body) {
    const msg = typeof body.userMessage === 'string' ? body.userMessage.trim() : '';
    if (!msg) {
        return { ok: false, error: '请提供 userMessage' };
    }
    if (!body.currentProject || typeof body.currentProject !== 'object') {
        return { ok: false, error: '请提供 currentProject' };
    }
    let selectedAssetIds = Array.isArray(body.selectedAssetIds)
        ? body.selectedAssetIds.filter((x) => typeof x === 'string')
        : [];
    if (selectedAssetIds.length === 0) {
        selectedAssetIds = videoAssetIdsFromProject(body.currentProject);
    }
    const assetsRaw = Array.isArray(body.assets) ? body.assets : [];
    const fromClient = new Map(assetsRaw.map((a) => {
        const id = String(a.id);
        return [
            id,
            {
                id,
                originalName: typeof a.originalName === 'string' ? a.originalName : '未命名',
                durationSec: typeof a.durationSec === 'number' && Number.isFinite(a.durationSec) && a.durationSec > 0
                    ? Math.min(a.durationSec, 36000)
                    : 60,
            },
        ];
    }));
    const assets = selectedAssetIds.map((id) => {
        const hit = fromClient.get(id);
        if (hit)
            return hit;
        return { id, originalName: id, durationSec: 60 };
    });
    if (selectedAssetIds.length === 0) {
        return {
            ok: false,
            error: '请先勾选左侧素材，或先在时间轴上加入至少一段视频',
        };
    }
    const aspectRatio = body.aspectRatio === '9:16' ||
        body.aspectRatio === '16:9' ||
        body.aspectRatio === '1:1' ||
        body.aspectRatio === '4:3'
        ? body.aspectRatio
        : body.currentProject.aspectRatio ?? '9:16';
    const visionFocus = parseEditorVisionFocusBody(body.visionFocus);
    return {
        ok: true,
        input: {
            userMessage: msg,
            aspectRatio,
            selectedAssetIds,
            assets,
            currentProject: body.currentProject,
            visionFocus,
        },
    };
}
router.post('/agent/apply', async (req, res) => {
    const parsed = buildEditorApplyInput(req.body);
    if (!parsed.ok) {
        res.status(400).json({ error: parsed.error });
        return;
    }
    try {
        const { summary, project, llmUsage } = await runEditorAgentApply(parsed.input);
        res.json({ summary, project, llmUsage });
    }
    catch (e) {
        console.error('[editor/agent/apply]', e);
        res.status(500).json({ error: e instanceof Error ? e.message : 'Agent 调用失败' });
    }
});
/** 剪辑任务 SSE：推送进度事件，最后一条 type=done 含 summary/project/llmUsage */
router.post('/agent/apply-stream', async (req, res) => {
    const parsed = buildEditorApplyInput(req.body);
    if (!parsed.ok) {
        res.status(400).json({ error: parsed.error });
        return;
    }
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();
    const send = (data) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };
    try {
        const result = await runEditorAgentApply(parsed.input, {
            onProgress: (p) => send({ type: 'progress', ...p }),
        });
        send({
            type: 'done',
            summary: result.summary,
            project: result.project,
            llmUsage: result.llmUsage,
        });
        res.end();
    }
    catch (e) {
        console.error('[editor/agent/apply-stream]', e);
        send({ type: 'error', error: e instanceof Error ? e.message : 'Agent 调用失败' });
        res.end();
    }
});
export default router;
