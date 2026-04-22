import { Router, Request, Response } from 'express';
import {
  polishPrompt,
  generateCaptionForPost,
  translateCaptionForPost,
  expandShortDramaFromIdea,
} from '../services/promptPolish.js';
import {
  replyLocaleToCaptionLanguage,
  resolveReplyLocale,
} from '../services/replyLocale.js';
import { getTemplates, getShortDramaPresets } from '../config/prompt-templates/index.js';

export const promptRouter = Router();

/**
 * GET /api/prompt/templates
 * Response: { templates: [...] } — 含 cat-harem（供短剧子模板使用），前端 TemplatePicker 可过滤
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
 * GET /api/prompt/short-drama-presets
 * Response: { presets: [{ id, nameZh, description, templateId, defaultPrompt }] }
 */
promptRouter.get('/short-drama-presets', (_req: Request, res: Response) => {
  res.json({ presets: getShortDramaPresets() });
});

/**
 * POST /api/prompt/polish
 * Body: { prompt: string, templateId?: string, style?: string, multishot?: boolean, duration?: number, aspectRatio?: string }
 * Response: { polishedPrompt, searchKeywords, folderHints?, template?, shots? }
 *
 * templateId 优先于 style。传入 templateId 时按模板优化。
 * 自定义模式 + multishot：仅用导演知识生成多镜分镜。
 */
/**
 * POST /api/prompt/expand-short-drama
 * Body: { idea: string }
 * Response: { summary: { protagonist, storyGenre, synopsis, background, setting, oneLineStory }, scriptContent }
 *
 * 将用户模糊创意扩展为剧本摘要 + 剧本正文（竖屏短剧策划）。
 */
promptRouter.post('/expand-short-drama', async (req: Request, res: Response) => {
  const { idea } = req.body as { idea?: string };
  const raw = typeof idea === 'string' ? idea.trim() : '';
  if (!raw) {
    res.status(400).json({ error: '请提供 idea（短剧创意）' });
    return;
  }
  try {
    const result = await expandShortDramaFromIdea(raw);
    res.json(result);
  } catch (err) {
    console.error('[prompt/expand-short-drama]', err);
    const msg = err instanceof Error ? err.message : '生成失败';
    res.status(500).json({ error: msg });
  }
});

promptRouter.post('/polish', async (req: Request, res: Response) => {
  const { prompt, templateId, style, multishot, duration, aspectRatio } = req.body as {
    prompt?: string;
    templateId?: string;
    style?: string;
    multishot?: boolean;
    duration?: number;
    aspectRatio?: string;
  };
  const raw = typeof prompt === 'string' ? prompt : '';
  if (!raw.trim()) {
    res.status(400).json({ error: '请提供 prompt' });
    return;
  }
  let opts: { templateId?: string; styleId?: string; multishot?: boolean; duration?: number; aspectRatio?: string } | undefined;
  if (typeof templateId === 'string' && templateId) {
    opts = { templateId };
  } else if (typeof style === 'string' && style) {
    opts = { styleId: style };
  }
  if (multishot === true) {
    opts = { ...(opts ?? {}), multishot: true, duration: typeof duration === 'number' ? duration : 30, aspectRatio: typeof aspectRatio === 'string' ? aspectRatio : '16:9' };
  }
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
    language,
    videoPath,
    videoUrl,
    accountContext,
  } = req.body as {
    prompt?: string;
    platforms?: string[];
    existingCaption?: string;
    existingHashtags?: string;
    language?: 'EN' | 'CN' | 'TH' | 'ID';
    videoPath?: string;
    videoUrl?: string;
    accountContext?: Array<{
      id?: string;
      username?: string;
      platform?: string;
      region?: string;
      remark?: string;
    }>;
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
  const lang = ['EN', 'CN', 'TH', 'ID'].includes(language as string) ? (language as 'EN' | 'CN' | 'TH' | 'ID') : undefined;
  try {
    const resolvedLanguage =
      lang ??
      replyLocaleToCaptionLanguage(
        resolveReplyLocale({
          contentLocale: req.get('X-Content-Locale'),
          samples: [raw, existingCap, existingTag],
        }),
      );
    const result = await generateCaptionForPost(raw, platformList, {
      existingCaption: existingCap || undefined,
      existingHashtags: existingTag || undefined,
      language: resolvedLanguage,
      videoPath: typeof videoPath === 'string' ? videoPath.trim() || undefined : undefined,
      videoUrl: typeof videoUrl === 'string' ? videoUrl.trim() || undefined : undefined,
      accountContext: Array.isArray(accountContext) ? accountContext : undefined,
      requestUsername: req.user?.username ?? undefined,
    });
    res.json(result);
  } catch (err) {
    console.error('[prompt/generate-caption]', err);
    const msg = err instanceof Error ? err.message : '生成失败';
    res.status(500).json({ error: msg });
  }
});

/**
 * POST /api/prompt/translate-caption
 * Body: { caption?: string, hashtags?: string, targetLanguage: 'EN'|'CN'|'TH'|'ID' }
 * Response: { caption, hashtags }
 *
 * 将现有文案与标签翻译为目标语言。
 */
promptRouter.post('/translate-caption', async (req: Request, res: Response) => {
  const { caption, hashtags, targetLanguage } = req.body as {
    caption?: string;
    hashtags?: string;
    targetLanguage?: 'EN' | 'CN' | 'TH' | 'ID';
  };
  const cap = typeof caption === 'string' ? caption.trim() : '';
  const tag = typeof hashtags === 'string' ? hashtags.trim() : '';
  if (!cap && !tag) {
    res.status(400).json({ error: '请提供待翻译的文案或标签' });
    return;
  }
  const lang = ['EN', 'CN', 'TH', 'ID'].includes(targetLanguage as string) ? (targetLanguage as 'EN' | 'CN' | 'TH' | 'ID') : 'EN';
  try {
    const result = await translateCaptionForPost(cap, tag, lang);
    res.json(result);
  } catch (err) {
    console.error('[prompt/translate-caption]', err);
    const msg = err instanceof Error ? err.message : '翻译失败';
    res.status(500).json({ error: msg });
  }
});

export default promptRouter;
