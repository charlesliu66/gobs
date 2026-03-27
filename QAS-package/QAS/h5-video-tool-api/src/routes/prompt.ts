import { Router, Request, Response } from 'express';
import { polishPrompt, generateCaptionForPost } from '../services/promptPolish.js';
import { getTemplates } from '../config/prompt-templates/index.js';

export const promptRouter = Router();

/**
 * GET /api/prompt/templates
 * Response: { templates: [{ id, name, nameZh, description, duration, aspectRatio, pipelineMode }] }
 */
promptRouter.get('/templates', (_req: Request, res: Response) => {
  const templates = getTemplates().map((t) => ({
    id: t.id,
    name: t.name,
    nameZh: t.nameZh,
    description: t.description,
    duration: t.duration,
    aspectRatio: t.aspectRatio,
    pipelineMode: t.pipelineMode,
  }));
  res.json({ templates });
});

/**
 * POST /api/prompt/polish
 * Body: { prompt: string, templateId?: string, style?: string }
 * Response: { polishedPrompt, searchKeywords, folderHints?, template? }
 *
 * templateId 优先于 style。传入 templateId 时按模板（VEO single-shot / multi-shot）优化。
 */
promptRouter.post('/polish', async (req: Request, res: Response) => {
  const { prompt, templateId, style } = req.body as { prompt?: string; templateId?: string; style?: string };
  const raw = typeof prompt === 'string' ? prompt : '';
  if (!raw.trim()) {
    res.status(400).json({ error: '请提供 prompt' });
    return;
  }
  const opts =
    typeof templateId === 'string' && templateId
      ? { templateId }
      : typeof style === 'string' && style
        ? { styleId: style }
        : undefined;
  try {
    const result = await polishPrompt(raw, opts);
    res.json(result);
  } catch (err) {
    console.error('[prompt/polish]', err);
    const msg = err instanceof Error ? err.message : '优化失败';
    res.status(500).json({ error: msg });
  }
});

/**
 * POST /api/prompt/generate-caption
 * Body: { prompt: string, platforms?: string[], existingCaption?: string, existingHashtags?: string }
 * Response: { caption, hashtags } 或 { byPlatform: { tiktok: { caption, hashtags }, ... } }
 *
 * 格子为空：基于 prompt 生成文案和标签。
 * 格子有内容：基于平台规则优化用户已有文案和标签。
 */
promptRouter.post('/generate-caption', async (req: Request, res: Response) => {
  const {
    prompt,
    platforms,
    existingCaption,
    existingHashtags,
  } = req.body as {
    prompt?: string;
    platforms?: string[];
    existingCaption?: string;
    existingHashtags?: string;
  };
  const raw = typeof prompt === 'string' ? prompt : '';
  const existingCap = typeof existingCaption === 'string' ? existingCaption.trim() : '';
  const existingTag = typeof existingHashtags === 'string' ? existingHashtags.trim() : '';
  const hasExisting = existingCap.length > 0 || existingTag.length > 0;
  if (!hasExisting && !raw.trim()) {
    res.status(400).json({ error: '请提供 prompt，或在文案/标签中填写待优化内容' });
    return;
  }
  const platformList = Array.isArray(platforms) ? platforms.filter((p) => typeof p === 'string') : undefined;
  try {
    const result = await generateCaptionForPost(raw, platformList, {
      existingCaption: existingCap || undefined,
      existingHashtags: existingTag || undefined,
    });
    res.json(result);
  } catch (err) {
    console.error('[prompt/generate-caption]', err);
    const msg = err instanceof Error ? err.message : '生成失败';
    res.status(500).json({ error: msg });
  }
});

export default promptRouter;
