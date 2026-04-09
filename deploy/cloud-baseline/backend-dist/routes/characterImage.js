/**
 * 角色图像标准化接口
 * POST /api/character/standardize-image
 *
 * 接收用户上传的参考图，以该图为多模态参考，
 * 用 Compass Imagen 生成白底正面全身站立的标准角色图。
 *
 * Body: { imageDataUrl: string, characterName: string, styleRef?: string }
 * Response: { imageDataUrl: string }
 */
import { Router } from 'express';
import { generateImageWithPython } from '../services/imagenPython.js';
const router = Router();
/** 从 data URL 或纯 base64 取出 raw base64 */
function dataUrlToRawBase64(dataUrlOrB64) {
    const s = dataUrlOrB64.trim();
    const m = /^data:image\/[^;]+;base64,(.+)$/i.exec(s);
    return m ? m[1] : s;
}
/**
 * POST /api/character/standardize-image
 */
router.post('/standardize-image', async (req, res) => {
    const { imageDataUrl, characterName, styleRef } = req.body;
    const rawImage = typeof imageDataUrl === 'string' ? imageDataUrl.trim() : '';
    const name = typeof characterName === 'string' ? characterName.trim() : '';
    if (!rawImage) {
        res.status(400).json({ success: false, error: '请提供 imageDataUrl' });
        return;
    }
    if (!name) {
        res.status(400).json({ success: false, error: '请提供 characterName' });
        return;
    }
    const referenceBase64 = dataUrlToRawBase64(rawImage);
    // 构建标准化 prompt：白底全身正面，保持参考图外貌特征
    const stylePrefix = typeof styleRef === 'string' && styleRef.trim()
        ? `${styleRef.trim()}\n`
        : '';
    const prompt = `${stylePrefix}白色简洁背景，正面全身站立，中性表情，标准站姿，高清，无文字，无水印。` +
        `角色：${name}，保持与参考图完全一致的面部特征、发型、服装风格。` +
        `电影感，无场景背景，角色居中，全身可见（头顶到脚底）。`;
    try {
        const result = await generateImageWithPython({
            prompt,
            aspectRatio: '9:16',
            // 将上传图作为风格/参考图传入，激活 imagen 的参考生图能力
            styleReferenceBase64: referenceBase64,
        });
        const imageDataUrlResult = result.imageBase64.startsWith('data:')
            ? result.imageBase64
            : `data:image/png;base64,${result.imageBase64}`;
        res.json({ success: true, imageDataUrl: imageDataUrlResult });
    }
    catch (err) {
        console.error('[character/standardize-image]', err);
        res.status(500).json({
            success: false,
            error: err instanceof Error ? err.message : '图像生成失败',
        });
    }
});
export default router;
