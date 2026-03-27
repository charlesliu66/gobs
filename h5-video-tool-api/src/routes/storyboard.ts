/**
 * POST /api/storyboard/images
 * 根据分镜文案生成分镜图（Compass Imagen）
 */
import { Router, Request, Response } from 'express';
import { parseOrSingleShot } from '../services/storyboardParser.js';
import { generateImageWithPython } from '../services/imagenPython.js';

export const storyboardRouter = Router();

/** 去掉 @图片N / @ImageN 等多模态占位，避免文生图模型误解析；保留其余分镜描述 */
function sanitizeFramePrompt(raw: string): string {
  return raw
    .replace(/@\s*(?:图片|Image|image)\s*\d+/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 首尾帧必须用「分镜文案」驱动；edit_image+参考图会强保留参考图场景，与文案冲突时易出幻觉 */
function buildFramePrompts(sceneText: string): { first: string; last: string } {
  const scene = sanitizeFramePrompt(sceneText);
  const core = scene.length > 0 ? scene : '场景描述';
  return {
    first: `【必须严格按以下场景生成画面，禁止生成与描述无关的环境、时代或地点】${core}。该镜头起始瞬间的定格画面，构图与光照符合上述场景。`,
    last: `【必须严格按以下场景生成画面，禁止生成与描述无关的环境、时代或地点】${core}。该镜头结束瞬间的定格画面，动作收尾时刻。`,
  };
}

/**
 * POST /api/storyboard/frames
 * 根据单镜描述生成首帧+尾帧图（Compass Imagen），用于预览镜头质感
 * 首尾帧仅根据分镜文案文生图（不传入参考图）。参考图走 edit_image 时会强保留参考图场景，易与分镜文案冲突。
 */
storyboardRouter.post('/frames', async (req: Request, res: Response) => {
  const { prompt, aspectRatio = '16:9' } = req.body as {
    prompt?: string;
    aspectRatio?: string;
  };

  const text = prompt?.trim();
  if (!text) {
    res.status(400).json({ error: '请提供 prompt（镜头描述）' });
    return;
  }

  try {
    const { first: firstPrompt, last: lastPrompt } = buildFramePrompts(text);
    const ar = aspectRatio ?? '16:9';

    const [firstRes, lastRes] = await Promise.all([
      generateImageWithPython({
        prompt: firstPrompt,
        aspectRatio: ar,
      }),
      generateImageWithPython({
        prompt: lastPrompt,
        aspectRatio: ar,
      }),
    ]);

    res.json({
      firstFrame: `data:image/png;base64,${firstRes.imageBase64}`,
      lastFrame: `data:image/png;base64,${lastRes.imageBase64}`,
    });
  } catch (err) {
    console.error('[storyboard/frames]', err);
    const msg = err instanceof Error ? err.message : '首尾帧生成失败';
    res.status(500).json({ error: msg });
  }
});

storyboardRouter.post('/images', async (req: Request, res: Response) => {
  const { storyboardText, aspectRatio = '16:9', fallbackPrompt } = req.body as {
    storyboardText?: string;
    aspectRatio?: string;
    fallbackPrompt?: string;
  };

  const text = storyboardText?.trim() || fallbackPrompt?.trim();
  if (!text) {
    res.status(400).json({ error: '请提供 storyboardText 或 fallbackPrompt' });
    return;
  }

  try {
    const shots = parseOrSingleShot(text, fallbackPrompt || text);

    const results: { index: number; timeRange: string; prompt: string; imageDataUrl: string }[] = [];

    for (const shot of shots) {
      const { imageBase64 } = await generateImageWithPython({
        prompt: shot.prompt,
        aspectRatio: aspectRatio ?? '16:9',
      });
      results.push({
        index: shot.index,
        timeRange: shot.timeRange,
        prompt: shot.prompt,
        imageDataUrl: `data:image/png;base64,${imageBase64}`,
      });
    }

    res.json({ shots: results });
  } catch (err) {
    console.error('[storyboard/images]', err);
    const msg = err instanceof Error ? err.message : '分镜图生成失败';
    res.status(500).json({ error: msg });
  }
});

export default storyboardRouter;
