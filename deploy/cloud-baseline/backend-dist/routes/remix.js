/**
 * POST /api/remix - 提交剪辑任务（拼接 + 字幕烧录）
 * GET /api/remix/:taskId - 查询任务状态与结果
 */
import { Router } from 'express';
import path from 'path';
import { runRemix, runMergeRemix } from '../services/remixService.js';
import { getDefaultVideoOutputDir } from '../config/apiDataDir.js';
export const remixRouter = Router();
const OUTPUT_DIR = getDefaultVideoOutputDir();
const taskStore = new Map();
/** 生成短 taskId */
function genTaskId() {
    return `remix_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
/** POST /api/remix - 提交剪辑任务（单段 remix 或 多段 clipUrls 合并） */
remixRouter.post('/', async (req, res) => {
    const { videoUrl, clipUrls, introUrl, outroUrl, subtitles, trimStart, trimEnd, } = req.body;
    const useMerge = Array.isArray(clipUrls) &&
        clipUrls.length > 0 &&
        clipUrls.every((u) => typeof u === 'string' && u.trim().length > 0);
    if (!useMerge && (!videoUrl || typeof videoUrl !== 'string' || !videoUrl.trim())) {
        res
            .status(400)
            .json({ error: '请提供 videoUrl（单段）或 clipUrls（多段 URL/路径数组，至少 1 段）' });
        return;
    }
    const taskId = genTaskId();
    const task = {
        id: taskId,
        status: 'pending',
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };
    taskStore.set(taskId, task);
    res.status(202).json({ taskId, status: 'pending' });
    // 异步执行
    (async () => {
        task.status = 'rendering';
        task.updatedAt = Date.now();
        try {
            const outputPath = useMerge
                ? await runMergeRemix({
                    clipUrls: clipUrls.map((u) => u.trim()),
                    introUrl: introUrl?.trim() || undefined,
                    outroUrl: outroUrl?.trim() || undefined,
                    subtitles: subtitles ?? undefined,
                })
                : await runRemix({
                    videoUrl: videoUrl.trim(),
                    introUrl: introUrl?.trim() || undefined,
                    outroUrl: outroUrl?.trim() || undefined,
                    subtitles: subtitles ?? undefined,
                    trimStart: typeof trimStart === 'number' ? trimStart : undefined,
                    trimEnd: typeof trimEnd === 'number' ? trimEnd : undefined,
                });
            task.status = 'done';
            task.outputPath = outputPath;
            task.updatedAt = Date.now();
        }
        catch (err) {
            task.status = 'failed';
            task.error = err instanceof Error ? err.message : '剪辑失败';
            task.updatedAt = Date.now();
        }
    })();
});
/** GET /api/remix/:taskId/file - 下载成品视频（需在 /:taskId 之前定义） */
remixRouter.get('/:taskId/file', async (req, res) => {
    const { taskId } = req.params;
    const task = taskStore.get(taskId);
    if (!task || task.status !== 'done' || !task.outputPath) {
        res.status(404).json({ error: '任务未完成或不存在' });
        return;
    }
    const fullPath = path.resolve(task.outputPath);
    const outputDir = path.resolve(OUTPUT_DIR);
    if (!fullPath.startsWith(outputDir + path.sep) && fullPath !== outputDir) {
        res.status(400).json({ error: '输出文件不在 output 目录内' });
        return;
    }
    res.sendFile(fullPath, { headers: { 'Content-Type': 'video/mp4' } });
});
/** GET /api/remix/:taskId - 查询任务状态 */
remixRouter.get('/:taskId', (req, res) => {
    const { taskId } = req.params;
    const task = taskStore.get(taskId);
    if (!task) {
        res.status(404).json({ error: '任务不存在' });
        return;
    }
    const outputDir = path.resolve(OUTPUT_DIR);
    const fullPath = task.outputPath ? path.resolve(task.outputPath) : '';
    const pathInOutput = task.outputPath && fullPath.startsWith(outputDir)
        ? path.relative(outputDir, fullPath).replace(/\\/g, '/')
        : undefined;
    /** 供 GET /api/video/file?path= 使用，形如 output/remix/xxx.mp4 */
    const outputPathForWeb = pathInOutput && !pathInOutput.startsWith('output/')
        ? `output/${pathInOutput}`
        : pathInOutput ?? undefined;
    res.json({
        taskId: task.id,
        status: task.status,
        error: task.error,
        outputPath: outputPathForWeb ?? task.outputPath,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
    });
});
export default remixRouter;
