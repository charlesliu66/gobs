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
import { Router, Request, Response } from 'express';
import { generateImageWithPython } from '../services/imagenPython.js';

const router = Router();

/** 从 data URL 或纯 base64 取出 raw base64 */
function dataUrlToRawBase64(dataUrlOrB64: string): string {
  const s = dataUrlOrB64.trim();
  const m = /^data:image\/[^;]+;base64,(.+)$/i.exec(s);
  return m ? m[1] : s;
}

/**
 * POST /api/character/standardize-image
 */
router.post('/standardize-image', async (req: Request, res: Response) => {
  const { imageDataUrl, characterName, styleRef } = req.body as {
    imageDataUrl?: string;
    characterName?: string;
    styleRef?: string;
  };

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
  const prompt =
    `${stylePrefix}白色简洁背景，正面全身站立，中性表情，标准站姿，高清，无文字，无水印。` +
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
  } catch (err) {
    const msg = err instanceof Error ? err.message : '图像生成失败';
    console.error('[character/standardize-image]', msg);

    let userMessage = msg;
    if (/RESOURCE_EXHAUSTED|429|quota/i.test(msg)) {
      userMessage = '生图配额已耗尽，请稍后重试或联系管理员更换 API Key';
    } else if (/404|not found|does not have access/i.test(msg)) {
      userMessage = '当前生图模型不可用，请在 .env 中更换 COMPASS_IMAGEN_MODEL 后重启 API';
    } else if (/ENOENT|python/i.test(msg)) {
      userMessage = '服务器 Python 环境异常，请检查 python3 和 google-genai 包是否安装';
    } else if (/超时|timeout/i.test(msg)) {
      userMessage = '生图请求超时，请重试';
    }

    res.status(500).json({ success: false, error: userMessage });
  }
});

export default router;
