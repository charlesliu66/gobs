/**
 * POST /api/video/generate
 * 调用 Compass Veo 视频生成 API（通过 Python SDK，与文档一致）
 * 支持参考照片：传 driveToken + materials（含 mimeType），首张图片作为参考图
 * 支持分镜图流程：直接传 imageBase64（来自 Imagen 分镜图）
 */
import { Router } from 'express';
import axios from 'axios';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { generateVideoWithPython } from '../services/veoPython.js';
import { createKlingVideoTaskOnly, fetchIngarenaVideoListPage, generateKlingVideo, isIngarenaKlingBaseUrl, isKlingModel, queryIngarenaKlingTask, } from '../services/klingVideo.js';
import { findRefCacheFile, isResolvableSocialVideoPageUrl, prepareSocialVideoUrlForKling, resolveSocialPageToDirectVideoUrl, } from '../services/tiktokResolveVideoUrl.js';
import { generateDreaminaMultimodalVideo, generateDreaminaVideo, getDreaminaModelIds, isDreaminaEnabled, isDreaminaModel, isDreaminaMultimodalModel, pollDreaminaTask, submitDreaminaMultimodalVideo, submitDreaminaVideo, } from '../services/dreaminaVideo.js';
import { composeDreaminaPrompt } from '../services/dreaminaPromptComposer.js';
import { getApiDataDir, getDefaultVideoOutputDir } from '../config/apiDataDir.js';
export const videoRouter = Router();
const OUTPUT_DIR = getDefaultVideoOutputDir();
/**
 * Omni `video_url` 须为服务端可直接拉取的视频资源。社交「分享页」会导致拉取失败，ingarena 常报 DatabaseError。
 * 设 KLING_ALLOW_SOCIAL_VIDEO_URL=1 可跳过此校验（仅调试用，仍可能失败）。
 */
function assertOmniReferenceVideoUrlIsLikelyDirect(urlStr) {
    if (process.env.KLING_ALLOW_SOCIAL_VIDEO_URL === '1')
        return;
    let host;
    try {
        host = new URL(urlStr).hostname.toLowerCase();
    }
    catch {
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
        throw new Error('参考视频不能填 TikTok/抖音/YouTube 等分享页链接。请使用公网可访问的 MP4 等直链（先下载再传到对象存储/CDN），或清空参考视频仅依赖图片+文案。');
    }
}
/**
 * 从请求体解析单条参考视频（Omni video_list）。
 * TikTok/抖音：yt-dlp 下载到 output/kling-ref-cache，再拼 API_PUBLIC_BASE_URL 供可灵拉取（避免 CDN 直链 DatabaseError）。
 * KLING_ALLOW_SOCIAL_VIDEO_URL=1：仍用 -g 直链（仅调试，可灵侧常失败）。
 */
async function referenceVideoFromBodyAsync(body) {
    const raw = body.referenceVideoUrl?.trim();
    if (!raw)
        return undefined;
    let url = raw;
    if (!/^https?:\/\//i.test(url)) {
        if (/^\/\//.test(url))
            url = `https:${url}`;
        else
            throw new Error('参考视频地址需为 http(s) 开头');
    }
    if (isResolvableSocialVideoPageUrl(url)) {
        if (process.env.KLING_ALLOW_SOCIAL_VIDEO_URL === '1') {
            url = await resolveSocialPageToDirectVideoUrl(url);
        }
        else {
            url = await prepareSocialVideoUrlForKling(url);
        }
    }
    else {
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
function getVeoModels() {
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
function getKlingModelsForList() {
    const envList = process.env.KLING_MODELS?.trim();
    if (envList) {
        return envList.split(',').map((m) => m.trim()).filter(Boolean);
    }
    return DEFAULT_KLING_MODELS;
}
/** 即梦 CLI + Veo +（若已配置 KLING_API_KEY）可灵模型 */
function getVideoModels() {
    const dreamina = isDreaminaEnabled() ? getDreaminaModelIds() : [];
    const veo = getVeoModels();
    if (process.env.KLING_API_KEY?.trim()) {
        return [...dreamina, ...veo, ...getKlingModelsForList()];
    }
    return [...dreamina, ...veo];
}
videoRouter.get('/models', (_req, res) => {
    res.json({
        models: getVideoModels(),
        /** ingarena 网关：可灵单段可走「仅创建任务 + video-list 轮询」，不阻塞 HTTP */
        klingAsync: !!process.env.KLING_API_KEY?.trim() && isIngarenaKlingBaseUrl(),
        /** 即梦：H5 可走 POST /dreamina/submit + GET /dreamina/task/:submitId 轮询，支持排队中并发生成 */
        dreaminaAsync: isDreaminaEnabled(),
    });
});
/** GET /api/video/kling/task/:taskId — 查询 ingarena video-list 中任务状态（供 H5 轮询） */
/** GET /api/video/kling/recent-list — 与 clipai.ingarena.net 视频列表同源（同一 API Key） */
videoRouter.get('/kling/recent-list', async (req, res) => {
    if (!process.env.KLING_API_KEY?.trim() || !isIngarenaKlingBaseUrl()) {
        res.json({ items: [], klingAvailable: false });
        return;
    }
    try {
        const page = Math.min(10, Math.max(1, parseInt(String(req.query.page), 10) || 1));
        const pageSize = Math.min(50, Math.max(1, parseInt(String(req.query.pageSize), 10) || 20));
        const items = await fetchIngarenaVideoListPage({ page, pageSize });
        res.json({ items, klingAvailable: true });
    }
    catch (err) {
        console.error('[video/kling/recent-list]', err);
        const msg = err instanceof Error ? err.message : '拉取可灵列表失败';
        res.status(500).json({ error: msg });
    }
});
videoRouter.get('/kling/task/:taskId', async (req, res) => {
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
    }
    catch (err) {
        console.error('[video/kling/task]', err);
        const msg = err instanceof Error ? err.message : '查询失败';
        res.status(500).json({ error: msg });
    }
});
/**
 * GET /api/video/kling/video-proxy?url=
 * 同域代理 MP4，避免浏览器对 CDN 直链的跨域限制导致 <video> 无法播放。
 */
videoRouter.get('/kling/video-proxy', async (req, res) => {
    const u = req.query.url;
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
        if (ct)
            res.setHeader('Content-Type', ct);
        res.setHeader('Content-Disposition', 'inline');
        r.data.pipe(res);
    }
    catch (err) {
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
videoRouter.get('/kling/ref-cache/:cacheId', async (req, res) => {
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
        const mime = ext === '.webm' ? 'video/webm' : ext === '.mov' ? 'video/quicktime' : ext === '.mkv' ? 'video/x-matroska' : 'video/mp4';
        res.setHeader('Content-Type', mime);
        res.setHeader('Content-Disposition', 'inline');
        res.sendFile(path.resolve(abs));
    }
    catch (err) {
        console.error('[video/kling/ref-cache]', err);
        res.status(500).json({ error: err instanceof Error ? err.message : '读取缓存失败' });
    }
});
/** GET /api/video/file?path=output/xxx.mp4 - 提供已生成视频文件访问，供历史记录预览 */
videoRouter.get('/file', async (req, res) => {
    const rawPath = req.query.path;
    if (!rawPath || typeof rawPath !== 'string') {
        res.status(400).json({ error: '请提供 path 参数' });
        return;
    }
    const outputDir = getDefaultVideoOutputDir();
    const fullPath = path.resolve(getApiDataDir(), path.normalize(rawPath));
    if (!fullPath.startsWith(outputDir + path.sep) && fullPath !== outputDir) {
        res.status(400).json({ error: 'path 必须在 output 目录下' });
        return;
    }
    try {
        await fs.access(fullPath);
        res.sendFile(fullPath, { headers: { 'Content-Type': 'video/mp4' } });
    }
    catch {
        res.status(404).json({ error: '文件不存在' });
    }
});
/**
 * GET /api/video/output-recent — 扫描 data/output 下近期视频（即梦 CLI 等落盘成片），供前端「历史内容」拉取。
 * Query: limit (默认 50), dreaminaOnly=1 时仅路径/文件名含 dreamina 的条目。
 */
videoRouter.get('/output-recent', async (req, res) => {
    const limit = Math.min(120, Math.max(1, parseInt(String(req.query.limit ?? '50'), 10) || 50));
    const onlyDreamina = String(req.query.dreaminaOnly ?? '') === '1' || String(req.query.filter ?? '').toLowerCase() === 'dreamina';
    const apiRoot = getApiDataDir();
    const outputDir = getDefaultVideoOutputDir();
    const items = [];
    async function walk(dir, depth) {
        if (depth > 10)
            return;
        let entries;
        try {
            entries = await fs.readdir(dir, { withFileTypes: true });
        }
        catch {
            return;
        }
        for (const ent of entries) {
            const abs = path.join(dir, ent.name);
            if (ent.isDirectory()) {
                await walk(abs, depth + 1);
                continue;
            }
            const ext = path.extname(ent.name).toLowerCase();
            if (!['.mp4', '.webm', '.mov', '.mkv'].includes(ext))
                continue;
            const rel = path.relative(apiRoot, abs).replace(/\\/g, '/');
            if (!rel.startsWith('output/'))
                continue;
            const lower = rel.toLowerCase();
            if (onlyDreamina && !lower.includes('dreamina'))
                continue;
            try {
                const st = await fs.stat(abs);
                items.push({ path: rel, mtimeMs: st.mtimeMs, size: st.size });
            }
            catch {
                /* ignore missing */
            }
        }
    }
    try {
        await walk(outputDir, 0);
    }
    catch (err) {
        console.error('[video/output-recent]', err);
    }
    items.sort((a, b) => b.mtimeMs - a.mtimeMs);
    res.json({ items: items.slice(0, limit) });
});
/** 与单图参考：body 无图时从 Drive 素材取首张图（与 POST /generate 行为一致） */
async function resolveFirstDriveImageIfMissing(imageBase64, imageMimeType, driveToken, materials) {
    if (imageBase64?.trim())
        return { imageBase64, imageMimeType };
    if (!driveToken || !materials?.length)
        return { imageBase64, imageMimeType };
    const firstImage = materials.find((x) => x.mimeType?.startsWith('image/'));
    if (!firstImage)
        return { imageBase64, imageMimeType };
    const img = await fetchDriveImageAsBase64(firstImage.id, firstImage.mimeType, driveToken);
    if (!img)
        return { imageBase64, imageMimeType };
    return { imageBase64: img.base64, imageMimeType: img.mimeType };
}
/** 从 Drive 获取首张图片的 base64（用于 Veo 参考图） */
async function fetchDriveImageAsBase64(fileId, mimeType, driveToken) {
    const headers = { Authorization: `Bearer ${driveToken}` };
    const opts = { responseType: 'arraybuffer', timeout: 15000 };
    try {
        const { data, status } = await axios.get(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`, {
            params: { alt: 'media', supportsAllDrives: true },
            ...opts,
            headers,
            validateStatus: (s) => s < 500,
        });
        if (status >= 400)
            return null;
        const mime = mimeType?.startsWith('image/') ? mimeType : 'image/png';
        const base64 = Buffer.from(data).toString('base64');
        return { base64, mimeType: mime };
    }
    catch {
        return null;
    }
}
/** POST /api/video/generate-kling-async — 仅创建可灵任务（ingarena），不轮询；H5 用 GET /kling/task/:id 轮询 */
videoRouter.post('/generate-kling-async', async (req, res) => {
    if (!process.env.KLING_API_KEY?.trim() || !isIngarenaKlingBaseUrl()) {
        res.status(400).json({
            error: '仅 ingarena 可灵网关支持异步创建，请设置 KLING_API_BASE_URL（如 https://clipai.ingarena.net）',
        });
        return;
    }
    const { storyboardText, materials, driveToken, duration, aspectRatio, model, imageBase64: bodyImageBase64, imageMimeType: bodyImageMimeType, referenceImages, referenceVideoUrl, referenceVideoReferType, referenceVideoKeepSound, } = req.body;
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
        let videoList;
        try {
            videoList = await referenceVideoFromBodyAsync({
                referenceVideoUrl,
                referenceVideoReferType,
                referenceVideoKeepSound,
            });
        }
        catch (e) {
            res.status(400).json({ error: e instanceof Error ? e.message : '参考视频参数无效' });
            return;
        }
        let imageBase64 = bodyImageBase64;
        let imageMimeType = bodyImageMimeType;
        const maxKlingRef = Math.min(20, Math.max(1, parseInt(process.env.KLING_MAX_REF_IMAGES || '7', 10) || 7));
        let klingImageList;
        if (Array.isArray(referenceImages) && referenceImages.length > 0) {
            klingImageList = referenceImages.slice(0, maxKlingRef).map((r) => ({
                imageBase64: r.base64,
                imageMimeType: r.mimeType,
                type: r.type,
            }));
        }
        else if (bodyImageBase64) {
            klingImageList = [{ imageBase64: bodyImageBase64, imageMimeType: bodyImageMimeType }];
        }
        else if (driveToken && materials?.length) {
            const imgs = materials.filter((x) => x.mimeType?.startsWith('image/'));
            const list = [];
            for (const mat of imgs.slice(0, maxKlingRef)) {
                const img = await fetchDriveImageAsBase64(mat.id, mat.mimeType, driveToken);
                if (img)
                    list.push({ imageBase64: img.base64, imageMimeType: img.mimeType });
            }
            if (list.length)
                klingImageList = list;
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
        res.json({ taskId, status: 'pending' });
    }
    catch (err) {
        console.error('[video/generate-kling-async]', err);
        const msg = err instanceof Error ? err.message : '创建可灵任务失败';
        res.status(500).json({ error: msg });
    }
});
/**
 * POST /api/video/dreamina/submit — 仅提交即梦任务，立即返回 submitId；H5 轮询 GET /dreamina/task/:submitId
 */
videoRouter.post('/dreamina/submit', async (req, res) => {
    if (!isDreaminaEnabled()) {
        res.status(400).json({ error: '即梦未启用或未安装 dreamina-cli-skill' });
        return;
    }
    const { storyboardText, materials, driveToken, duration, aspectRatio, model, imageBase64: bodyImageBase64, imageMimeType: bodyImageMimeType, multimodalImages, multimodalVideos, multimodalAudios, dreaminaModelVersion, autoComposePrompt, dreaminaPromptHints, } = req.body;
    if (!storyboardText || typeof storyboardText !== 'string' || !storyboardText.trim()) {
        res.status(400).json({ error: '请提供 storyboardText（分镜文本）' });
        return;
    }
    const modelTrim = model?.trim();
    if (!isDreaminaModel(modelTrim)) {
        res
            .status(400)
            .json({ error: '仅支持即梦模型（dreamina-multimodal / dreamina-text2video / dreamina-image2video）' });
        return;
    }
    try {
        if (isDreaminaMultimodalModel(modelTrim)) {
            const imgs = Array.isArray(multimodalImages) ? multimodalImages : [];
            const vids = Array.isArray(multimodalVideos) ? multimodalVideos : [];
            const auds = Array.isArray(multimodalAudios) ? multimodalAudios : [];
            const basePrompt = storyboardText.trim();
            const resolvedPrompt = autoComposePrompt === false
                ? basePrompt
                : await composeDreaminaPrompt({
                    rawPrompt: basePrompt,
                    imageCount: imgs.length,
                    videoCount: vids.length,
                    audioCount: auds.length,
                    hints: dreaminaPromptHints,
                });
            const mvAsync = typeof dreaminaModelVersion === 'string' && dreaminaModelVersion.trim()
                ? dreaminaModelVersion.trim()
                : undefined;
            const { submitId, taskId } = await submitDreaminaMultimodalVideo({
                prompt: resolvedPrompt,
                aspectRatio: aspectRatio ?? '16:9',
                duration: duration != null ? duration : undefined,
                images: imgs.filter((x) => x && typeof x.base64 === 'string'),
                videos: vids.filter((x) => x && typeof x.base64 === 'string'),
                audios: auds.filter((x) => x && typeof x.base64 === 'string'),
                modelVersion: mvAsync,
            });
            res.json({ submitId, taskId, status: 'pending', resolvedPrompt });
            return;
        }
        let imageBase64 = bodyImageBase64;
        let imageMimeType = bodyImageMimeType;
        const r = await resolveFirstDriveImageIfMissing(imageBase64, imageMimeType, driveToken, materials);
        imageBase64 = r.imageBase64;
        imageMimeType = r.imageMimeType;
        const mvSubmit = typeof dreaminaModelVersion === 'string' && dreaminaModelVersion.trim()
            ? dreaminaModelVersion.trim()
            : undefined;
        const { submitId, taskId } = await submitDreaminaVideo({
            prompt: storyboardText.trim(),
            aspectRatio: aspectRatio ?? '16:9',
            duration: duration != null ? duration : undefined,
            model: modelTrim,
            imageBase64,
            imageMimeType,
            modelVersion: mvSubmit,
        });
        res.json({ submitId, taskId, status: 'pending' });
    }
    catch (err) {
        console.error('[video/dreamina/submit]', err);
        const msg = err instanceof Error ? err.message : '即梦提交失败';
        res.status(500).json({ error: msg });
    }
});
/** GET /api/video/dreamina/task/:submitId — 排队/成片；成功时返回 videoUrl、videoPath */
videoRouter.get('/dreamina/task/:submitId', async (req, res) => {
    if (!isDreaminaEnabled()) {
        res.status(400).json({ error: '即梦未启用' });
        return;
    }
    const raw = req.params.submitId?.trim();
    if (!raw) {
        res.status(400).json({ error: '缺少 submitId' });
        return;
    }
    try {
        const decoded = decodeURIComponent(raw);
        const polled = await pollDreaminaTask(decoded);
        const taskId = `dreamina-${polled.submitId}`;
        if (polled.phase === 'failed') {
            res.json({
                taskId,
                submitId: polled.submitId,
                status: 'failed',
                phase: polled.phase,
                genStatus: polled.genStatus,
                queueInfo: polled.queueInfo,
                failReason: polled.failReason,
            });
            return;
        }
        if (polled.phase === 'querying') {
            res.json({
                taskId,
                submitId: polled.submitId,
                status: 'pending',
                phase: polled.phase,
                genStatus: polled.genStatus,
                queueInfo: polled.queueInfo,
            });
            return;
        }
        const videoUrl = polled.videoUrl;
        let videoPath;
        if (videoUrl) {
            try {
                await fs.mkdir(OUTPUT_DIR, { recursive: true });
                const slug = `dreamina_${polled.submitId.slice(0, 12)}`;
                const filename = `${slug}_${Date.now()}.mp4`;
                const savePath = path.join(OUTPUT_DIR, filename);
                const buf = Buffer.from(videoUrl.replace(/^data:video\/\w+;base64,/, ''), 'base64');
                await fs.writeFile(savePath, buf);
                const rel = path.relative(process.cwd(), savePath);
                videoPath = rel.startsWith('..') ? savePath : rel.replace(/\\/g, '/');
            }
            catch (e) {
                console.warn('[video/dreamina/task] 保存到 output/ 失败', e);
            }
        }
        res.json({
            taskId,
            submitId: polled.submitId,
            status: 'completed',
            phase: polled.phase,
            genStatus: polled.genStatus,
            videoUrl,
            videoPath,
        });
    }
    catch (err) {
        console.error('[video/dreamina/task]', err);
        const msg = err instanceof Error ? err.message : '查询失败';
        res.status(500).json({ error: msg });
    }
});
videoRouter.post('/generate', async (req, res) => {
    const { storyboardText, materials, driveToken, duration, aspectRatio, model, resolution, imageBase64: bodyImageBase64, imageMimeType: bodyImageMimeType, referenceImages, referenceVideoUrl, referenceVideoReferType, referenceVideoKeepSound, dreaminaModelVersion, autoComposePrompt, dreaminaPromptHints, } = req.body;
    if (!storyboardText || typeof storyboardText !== 'string' || !storyboardText.trim()) {
        res.status(400).json({ error: '请提供 storyboardText（分镜文本）' });
        return;
    }
    const modelTrim = model?.trim();
    if (isDreaminaMultimodalModel(modelTrim)) {
        try {
            const imgs = Array.isArray(req.body.multimodalImages) ? req.body.multimodalImages : [];
            const vids = Array.isArray(req.body.multimodalVideos) ? req.body.multimodalVideos : [];
            const auds = Array.isArray(req.body.multimodalAudios) ? req.body.multimodalAudios : [];
            const basePrompt = storyboardText.trim();
            const resolvedPrompt = autoComposePrompt === false
                ? basePrompt
                : await composeDreaminaPrompt({
                    rawPrompt: basePrompt,
                    imageCount: imgs.length,
                    videoCount: vids.length,
                    audioCount: auds.length,
                    hints: dreaminaPromptHints,
                });
            const mv = typeof dreaminaModelVersion === 'string' && dreaminaModelVersion.trim()
                ? dreaminaModelVersion.trim()
                : undefined;
            const { videoUrl, taskId } = await generateDreaminaMultimodalVideo({
                prompt: resolvedPrompt,
                aspectRatio: aspectRatio ?? '16:9',
                duration: duration != null ? duration : undefined,
                images: imgs.filter((x) => x && typeof x.base64 === 'string'),
                videos: vids.filter((x) => x && typeof x.base64 === 'string'),
                audios: auds.filter((x) => x && typeof x.base64 === 'string'),
                modelVersion: mv,
            });
            let videoPath;
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
            }
            catch (e) {
                console.warn('[video/generate dreamina-multimodal] 保存到 output/ 失败', e);
            }
            res.json({ taskId, status: 'completed', videoUrl, videoPath, resolvedPrompt });
        }
        catch (err) {
            console.error('[video/generate dreamina-multimodal]', err);
            const msg = err instanceof Error ? err.message : '全能参考视频生成失败';
            res.status(500).json({ error: msg });
        }
        return;
    }
    try {
        let klingRefVideos;
        try {
            klingRefVideos = await referenceVideoFromBodyAsync({
                referenceVideoUrl,
                referenceVideoReferType,
                referenceVideoKeepSound,
            });
        }
        catch (e) {
            res.status(400).json({ error: e instanceof Error ? e.message : '参考视频参数无效' });
            return;
        }
        let imageBase64 = bodyImageBase64;
        let imageMimeType = bodyImageMimeType;
        const m = model?.trim();
        const maxKlingRef = Math.min(20, Math.max(1, parseInt(process.env.KLING_MAX_REF_IMAGES || '7', 10) || 7));
        /** 可灵多图：referenceImages > 请求体单图 > 素材顺序多图 > 首张素材 */
        let klingImageList;
        if (isKlingModel(m)) {
            if (Array.isArray(referenceImages) && referenceImages.length > 0) {
                klingImageList = referenceImages.slice(0, maxKlingRef).map((r) => ({
                    imageBase64: r.base64,
                    imageMimeType: r.mimeType,
                    type: r.type,
                }));
            }
            else if (bodyImageBase64) {
                klingImageList = [{ imageBase64: bodyImageBase64, imageMimeType: bodyImageMimeType }];
            }
            else if (driveToken && materials?.length) {
                const imgs = materials.filter((x) => x.mimeType?.startsWith('image/'));
                const list = [];
                for (const mat of imgs.slice(0, maxKlingRef)) {
                    const img = await fetchDriveImageAsBase64(mat.id, mat.mimeType, driveToken);
                    if (img)
                        list.push({ imageBase64: img.base64, imageMimeType: img.mimeType });
                }
                if (list.length)
                    klingImageList = list;
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
        }
        else {
            const r = await resolveFirstDriveImageIfMissing(imageBase64, imageMimeType, driveToken, materials);
            imageBase64 = r.imageBase64;
            imageMimeType = r.imageMimeType;
        }
        const { taskId, videoUrl } = isDreaminaModel(m)
            ? await generateDreaminaVideo({
                prompt: storyboardText.trim(),
                aspectRatio: aspectRatio ?? '16:9',
                duration: duration != null ? duration : undefined,
                model: m,
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
        let videoPath;
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
        }
        catch (e) {
            console.warn('[video/generate] 保存到 output/ 失败，仍返回 videoUrl', e);
        }
        res.json({
            taskId,
            status: 'completed',
            videoUrl,
            videoPath,
        });
    }
    catch (err) {
        console.error('[video/generate]', err);
        const msg = err instanceof Error ? err.message : '视频生成失败';
        res.status(500).json({ error: msg });
    }
});
/** ffmpeg 拼接视频片段 */
async function concatVideos(videoPaths, outputPath) {
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
            fs.unlink(listPath).catch(() => { });
            if (code === 0)
                resolve();
            else
                reject(new Error(`ffmpeg 拼接失败: ${stderr}`));
        });
        proc.on('error', reject);
    });
}
videoRouter.post('/generate-multishot', async (req, res) => {
    const { shots, aspectRatio = '16:9', outputPath: customOutputPath, materials, driveToken, model: bodyModel } = req.body;
    const multishotModel = typeof bodyModel === 'string' ? bodyModel.trim() : '';
    if (!shots?.length || !Array.isArray(shots)) {
        res.status(400).json({ error: '请提供 shots 数组（每项含 durationSeconds、prompt）' });
        return;
    }
    try {
        // 获取用户选中的素材作为参考图：第 1 张 = 主体设定图，用于每个镜头的视频生成
        let materialsRefBase64;
        let materialsRefMime;
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
        const videoPaths = [];
        for (let i = 0; i < shots.length; i++) {
            const shot = shots[i];
            // 优先用该镜头自带的 imageBase64（来自 生成首尾帧），否则用用户选的第 1 张素材
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
            const p = path.join(tmpDir, `shot_${i}.mp4`);
            await fs.writeFile(p, buf);
            videoPaths.push(p);
        }
        const outDir = customOutputPath ? path.resolve(customOutputPath) : OUTPUT_DIR;
        await fs.mkdir(outDir, { recursive: true });
        const finalPath = path.join(outDir, `多镜头_${Date.now()}.mp4`);
        await concatVideos(videoPaths, finalPath);
        for (const p of videoPaths)
            await fs.unlink(p).catch(() => { });
        await fs.rmdir(tmpDir).catch(() => { });
        const buf = await fs.readFile(finalPath);
        const videoUrl = `data:video/mp4;base64,${buf.toString('base64')}`;
        res.json({
            status: 'completed',
            videoUrl,
            outputPath: finalPath,
        });
    }
    catch (err) {
        console.error('[video/generate-multishot]', err);
        const msg = err instanceof Error ? err.message : '多镜头视频生成失败';
        res.status(500).json({ error: msg });
    }
});
export default videoRouter;
