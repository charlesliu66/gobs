/**
 * POST /api/storyboard/images
 * 根据分镜文案生成分镜图（Compass Imagen）
 */
import { Router } from 'express';
import { parseOrSingleShot } from '../services/storyboardParser.js';
import { generateImageWithPython } from '../services/imagenPython.js';
export const storyboardRouter = Router();
/** 从 data URL 或纯 base64 取出 raw base64 */
function dataUrlToRawBase64(dataUrlOrB64) {
    const s = dataUrlOrB64.trim();
    const m = /^data:image\/[^;]+;base64,(.+)$/i.exec(s);
    return m ? m[1] : s;
}
/** 保证返回带前缀的 data URL */
function toPngDataUrl(rawBase64) {
    const b = rawBase64.trim();
    if (b.startsWith('data:'))
        return b;
    return `data:image/png;base64,${b}`;
}
/** 去掉 @图片N / @ImageN 等多模态占位，避免文生图模型误解析；保留其余分镜描述 */
function sanitizeFramePrompt(raw) {
    return raw
        .replace(/@\s*(?:图片|Image|image)\s*\d+/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
}
/**
 * 首镜：首尾帧文生图；用户描述置顶 + 短英文约束。
 * @param globalStyleLock 为 true 时已附带全片基准参考图（多模态），文案强调影调一致。
 */
function buildFramePrompts(sceneText, globalStyleLock) {
    const scene = sanitizeFramePrompt(sceneText);
    const core = scene.length > 0 ? scene : '场景描述';
    const lockZh = globalStyleLock
        ? '【全片画风基准】必须与参考图在影调、对比度、色相、质感、整体美术风格上保持一致；禁止切换为无关画风、时代或媒介（如写实新闻、清新日系、水彩插画等）。\n\n'
        : '';
    const en = 'Generate exactly one image. The image must match the Chinese scene above (location, characters, action). ' +
        (globalStyleLock
            ? 'If a reference image is provided, strictly match its color grading, lighting, palette, and art direction. '
            : '') +
        'Do not show unrelated places, vehicles, generic landscapes, or wrong era. Cinematic key frame.';
    return {
        first: `${lockZh}${core}\n\n[First frame / 首帧] ${en}`,
        last: `${lockZh}${core}\n\n[Last frame / 尾帧] End of the action in the same scene. ${en}`,
    };
}
/**
 * 非首镜：中间帧 / 尾帧；画风由参考图 + 文案共同约束（Python 侧 STYLE_REF）
 * @param useGlobalBaseline true 时参考图为立项「全片画风」而非仅首镜首帧
 */
function buildContinuationPrompts(sceneText, phase, useGlobalBaseline) {
    const scene = sanitizeFramePrompt(sceneText);
    const core = scene.length > 0 ? scene : '场景描述';
    const lockZh = useGlobalBaseline
        ? '【全片画风基准】必须与立项参考图在影调、质感、美术方向上完全一致；各镜仅允许内容/构图变化。\n\n'
        : '';
    const stylePhrase = useGlobalBaseline
        ? 'Visual style must match the global film style reference (color grading, light, texture, art direction). '
        : 'Visual style must match the opening shot reference (color, light, texture). ';
    const en = 'Generate exactly one image for this shot. Match the Chinese scene. ' +
        stylePhrase +
        'No unrelated stock scenery or wrong genre.';
    if (phase === 'middle') {
        return `${lockZh}${core}\n\n[Middle of shot / 镜头中段] Action progressing. ${en}`;
    }
    return `${lockZh}${core}\n\n[Last frame / 尾帧] End of the action in this shot. ${en}`;
}
/**
 * POST /api/storyboard/frames
 * - 首镜 (shotIndex=0)：生成首帧 + 尾帧
 * - 后续镜 (shotIndex>0)：首帧=上一镜尾帧；生成中间帧 + 尾帧；画风锁定首镜首帧
 */
storyboardRouter.post('/frames', async (req, res) => {
    const { prompt, aspectRatio = '16:9', shotIndex = 0, previousLastFrame, styleReferenceFrame, 
    /** 高级制片立项上传的全片画风参考；优先于 styleReferenceFrame 作为 STYLE_REF */
    globalStyleReferenceFrame, } = req.body;
    const text = prompt?.trim();
    if (!text) {
        res.status(400).json({ error: '请提供 prompt（镜头描述）' });
        return;
    }
    const idx = Number(shotIndex) || 0;
    const ar = aspectRatio ?? '16:9';
    const globalStyleRaw = globalStyleReferenceFrame?.trim();
    const globalB64 = globalStyleRaw ? dataUrlToRawBase64(globalStyleRaw) : undefined;
    try {
        if (idx <= 0) {
            const { first: firstPrompt, last: lastPrompt } = buildFramePrompts(text, !!globalB64);
            const styleOpts = globalB64 ? { styleReferenceBase64: globalB64 } : {};
            const [firstRes, lastRes] = await Promise.all([
                generateImageWithPython({
                    prompt: firstPrompt,
                    aspectRatio: ar,
                    ...styleOpts,
                }),
                generateImageWithPython({
                    prompt: lastPrompt,
                    aspectRatio: ar,
                    ...styleOpts,
                }),
            ]);
            res.json({
                mode: 'first_shot',
                firstFrame: `data:image/png;base64,${firstRes.imageBase64}`,
                lastFrame: `data:image/png;base64,${lastRes.imageBase64}`,
                imagenModelFirst: firstRes.model ?? null,
                imagenModelLast: lastRes.model ?? null,
            });
            return;
        }
        const prev = previousLastFrame?.trim();
        const styleRefFallback = styleReferenceFrame?.trim();
        const styleLockSrc = globalStyleRaw || styleRefFallback;
        if (!prev) {
            res.status(400).json({ error: '非首镜需要 previousLastFrame（上一镜尾帧）' });
            return;
        }
        if (!styleLockSrc) {
            res.status(400).json({
                error: '非首镜需要 styleReferenceFrame（首镜首帧）或 globalStyleReferenceFrame（全片画风参考）用于画风锁定',
            });
            return;
        }
        const firstFrame = toPngDataUrl(prev);
        const styleB64 = dataUrlToRawBase64(styleLockSrc);
        const useGlobalBaseline = !!globalStyleRaw;
        const middlePrompt = buildContinuationPrompts(text, 'middle', useGlobalBaseline);
        const lastPrompt = buildContinuationPrompts(text, 'last', useGlobalBaseline);
        const [midRes, lastRes] = await Promise.all([
            generateImageWithPython({
                prompt: middlePrompt,
                aspectRatio: ar,
                styleReferenceBase64: styleB64,
            }),
            generateImageWithPython({
                prompt: lastPrompt,
                aspectRatio: ar,
                styleReferenceBase64: styleB64,
            }),
        ]);
        res.json({
            mode: 'continuation',
            firstFrame,
            middleFrame: `data:image/png;base64,${midRes.imageBase64}`,
            lastFrame: `data:image/png;base64,${lastRes.imageBase64}`,
            imagenModelFirst: null,
            imagenModelMiddle: midRes.model ?? null,
            imagenModelLast: lastRes.model ?? null,
        });
    }
    catch (err) {
        console.error('[storyboard/frames]', err);
        const msg = err instanceof Error ? err.message : '首尾帧生成失败';
        res.status(500).json({ error: msg });
    }
});
/**
 * POST /api/storyboard/portrait
 * 角色肖像单张生成：纯文生图，或带参考图（img2img/edit）
 * body: { prompt, aspectRatio?, referenceImage?, compassApiKey?, globalStyleReferenceFrame? }
 * globalStyleReferenceFrame：立项全片画风参考；仅在与「用户角色参考图」二选一时走多模态（有用户参考则不传，避免冲突与错误回退）。
 */
storyboardRouter.post('/portrait', async (req, res) => {
    const { prompt, aspectRatio = '9:16', referenceImage, compassApiKey, globalStyleReferenceFrame } = req.body;
    const text = prompt?.trim();
    if (!text) {
        res.status(400).json({ error: '请提供 prompt' });
        return;
    }
    const ar = typeof aspectRatio === 'string' && aspectRatio.trim() ? aspectRatio.trim() : '9:16';
    const refRaw = referenceImage?.trim();
    const refB64 = refRaw ? dataUrlToRawBase64(refRaw) : undefined;
    const globalStyleRaw = globalStyleReferenceFrame?.trim();
    const styleB64 = globalStyleRaw ? dataUrlToRawBase64(globalStyleRaw) : undefined;
    const keyOverride = typeof compassApiKey === 'string' && compassApiKey.trim() ? compassApiKey.trim() : undefined;
    /**
     * 用户上传了角色参考图时：不再传立项 globalStyleReferenceFrame 给 Python（避免与角色参考争用多模态槽位；
     * 且 edit_image 失败时旧逻辑会误用立项图进 Gemini，严重偏离用户参考）。
     * 全片影调仅保留在 text 里的 styleRefSummary（前端已并入 prompt）。
     */
    const styleB64ForPython = styleB64 && !refB64 ? styleB64 : undefined;
    /** 与前端 buildCharacterImagePrompt 一致：全身定妆、纯白底（API 直调也会生效） */
    const portraitOutputLock = '【输出规格·角色定妆】全身照：从头到脚完整入镜，正面平视镜头，人物全身居中；背景纯白色 #FFFFFF，无真实场景/道具/渐变；禁止非白底。';
    let finalPrompt = `${portraitOutputLock}\n\n${text}`;
    if (refB64) {
        finalPrompt =
            `${finalPrompt}\n\n` +
                '【参考图优先级】最大限度保留参考图的五官比例、肤色、发型、体型与服装气质；忽略参考图中的背景与环境，输出须为纯白底全身定妆照。' +
                '仅允许调整服装细节与光影。禁止替换人种或面部结构。若与上文全片风格冲突，以参考图人物外观为准。\n\n' +
                '以参考图为造型与气质基准，生成单张高清全身正面定妆照，纯白背景。';
    }
    if (styleB64ForPython) {
        finalPrompt =
            '【全片画风基准】必须与参考图在影调、对比度、色相、质感、整体美术风格上保持一致（仅限人物渲染与光影，背景仍为纯白无底纹）。\n\n' +
                finalPrompt;
    }
    try {
        const out = await generateImageWithPython({
            prompt: finalPrompt,
            aspectRatio: ar,
            ...(refB64 ? { referenceImageBase64: refB64 } : {}),
            ...(styleB64ForPython ? { styleReferenceBase64: styleB64ForPython } : {}),
            ...(keyOverride ? { apiKeyOverride: keyOverride } : {}),
        });
        res.json({
            imageDataUrl: toPngDataUrl(out.imageBase64),
            model: out.model ?? null,
        });
    }
    catch (err) {
        console.error('[storyboard/portrait]', err);
        const msg = err instanceof Error ? err.message : '肖像生成失败';
        res.status(500).json({ error: msg });
    }
});
storyboardRouter.post('/images', async (req, res) => {
    const { storyboardText, aspectRatio = '16:9', fallbackPrompt } = req.body;
    const text = storyboardText?.trim() || fallbackPrompt?.trim();
    if (!text) {
        res.status(400).json({ error: '请提供 storyboardText 或 fallbackPrompt' });
        return;
    }
    try {
        const shots = parseOrSingleShot(text, fallbackPrompt || text);
        const results = [];
        for (const shot of shots) {
            const { imageBase64, model } = await generateImageWithPython({
                prompt: shot.prompt,
                aspectRatio: aspectRatio ?? '16:9',
            });
            results.push({
                index: shot.index,
                timeRange: shot.timeRange,
                prompt: shot.prompt,
                imageDataUrl: `data:image/png;base64,${imageBase64}`,
                imagenModel: model ?? null,
            });
        }
        res.json({ shots: results });
    }
    catch (err) {
        console.error('[storyboard/images]', err);
        const msg = err instanceof Error ? err.message : '分镜图生成失败';
        res.status(500).json({ error: msg });
    }
});
export default storyboardRouter;
