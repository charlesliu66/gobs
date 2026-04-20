import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import {
  generateLyriaInstrumentalWavs,
  LYRIA_CLIP_DURATION_SEC,
} from '../services/compassLyriaMusic.js';
import { polishLyriaMusicPrompt } from '../services/editorMusicPromptPolish.js';
import { getUploadsPath } from '../config/apiDataDir.js';
import {
  generateSunoMusic,
  isSunoConfigured,
  isSunoFallbackError,
  SunoSensitiveWordError,
} from '../services/sunoMusic.js';

const router = Router();

/** POST 将模糊需求润色为英文 prompt / negativePrompt（复用 Lyria 润色服务） */
router.post('/music/polish-prompt', async (req, res) => {
  const raw =
    typeof (req.body as { raw?: string }).raw === 'string'
      ? (req.body as { raw: string }).raw
      : '';
  try {
    const out = await polishLyriaMusicPrompt(raw);
    res.json(out);
  } catch (e) {
    const msg = e instanceof Error ? e.message : '润色失败';
    const code = msg.includes('请提供') || msg.includes('未生成') ? 400 : 500;
    res.status(code).json({ error: msg });
  }
});

// -------- 音频文件存储 --------

const MUSIC_DIR = getUploadsPath('editor', 'music');
fs.mkdirSync(MUSIC_DIR, { recursive: true });

function saveMusicBuffer(
  buffer: Buffer,
  ext: 'wav' | 'mp3',
  _prompt: string,
  _mime: string,
): { id: string; url: string } {
  const id = randomUUID();
  const filename = `${id}.${ext}`;
  const abs = path.join(MUSIC_DIR, filename);
  fs.writeFileSync(abs, buffer);
  return { id, url: `/api/editor/music/files/${id}` };
}

const MUSIC_MIME: Record<string, string> = {
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
};

function resolveAudioFileOnDisk(id: string): { abs: string; mime: string } | null {
  for (const ext of ['.mp3', '.wav']) {
    const abs = path.join(MUSIC_DIR, `${id}${ext}`);
    if (fs.existsSync(abs)) return { abs, mime: MUSIC_MIME[ext] || 'application/octet-stream' };
  }
  return null;
}

// -------- POST /music/generate --------

/**
 * 文生器乐：优先使用 Suno API，失败时自动 fallback 到 Compass Lyria。
 *
 * Request body：
 *   - prompt: string        英文音乐描述
 *   - negativePrompt?: string
 *   - sampleCount?: number  Lyria fallback 时的片段数（Suno 固定返回 2 首）
 *   - style?: string        Suno customMode 风格（可选）
 *   - title?: string        Suno customMode 标题（可选）
 *
 * Response 新增字段：
 *   - provider: 'suno' | 'lyria'
 */
router.post('/music/generate', async (req, res) => {
  const body = req.body as {
    prompt?: string;
    negativePrompt?: string;
    sampleCount?: number;
    style?: string;
    title?: string;
    /**
     * 显式指定生成引擎：
     *   'auto'  = 自动（有 Suno 配置走 Suno，失败 fallback Lyria）
     *   'suno'  = 强制 Suno（未配置则 400）
     *   'lyria' = 强制 Lyria（跳过 Suno）
     * 前端用于"生成失败后切换引擎重试"。
     */
    provider?: 'auto' | 'suno' | 'lyria';
  };

  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  if (!prompt) {
    res.status(400).json({ error: '请提供英文 prompt（prompt）' });
    return;
  }

  const sampleCount =
    typeof body.sampleCount === 'number' && Number.isFinite(body.sampleCount)
      ? body.sampleCount
      : 1;

  const forcedProvider: 'auto' | 'suno' | 'lyria' = body.provider ?? 'auto';
  if (forcedProvider === 'suno' && !isSunoConfigured()) {
    res.status(400).json({ error: 'Suno 未配置（缺少 SUNO_API_KEY），请改用 lyria' });
    return;
  }

  const shouldTrySuno = forcedProvider === 'suno' || (forcedProvider === 'auto' && isSunoConfigured());

  // -------- 尝试 Suno --------
  if (shouldTrySuno) {
    try {
      const tracks = await generateSunoMusic({
        prompt,
        style: typeof body.style === 'string' ? body.style : undefined,
        title: typeof body.title === 'string' ? body.title : undefined,
        instrumental: true,
        negativeTags:
          typeof body.negativePrompt === 'string' && body.negativePrompt.trim()
            ? body.negativePrompt.trim()
            : undefined,
      });

      const items = tracks.map((t) => {
        const { id, url } = saveMusicBuffer(t.buffer, 'mp3', prompt, 'audio/mpeg');
        return { id, url, durationSec: t.duration, mime: 'audio/mpeg' };
      });

      res.json({
        provider: 'suno',
        model: `suno-${process.env.SUNO_MODEL || 'V4_5ALL'}`,
        clipDurationSec: items[0]?.durationSec ?? 0,
        instrumentalOnly: true,
        items,
      });
      return;
    } catch (err) {
      // 敏感词错误直接返回，不 fallback
      if (err instanceof SunoSensitiveWordError) {
        res.status(400).json({ error: err.message });
        return;
      }

      // 显式强制 Suno 时直接报错，不 fallback
      if (forcedProvider === 'suno') {
        res.status(502).json({ error: err instanceof Error ? err.message : 'Suno 生成失败' });
        return;
      }

      if (isSunoFallbackError(err)) {
        const reason = err instanceof Error ? err.message : String(err);
        console.warn(`[editorMusic] Suno 失败，fallback 到 Lyria：${reason}`);
      } else {
        console.error('[editorMusic] Suno 未知错误：', err);
      }
    }
  } else if (forcedProvider === 'lyria') {
    console.log('[editorMusic] 显式选择 Lyria 引擎');
  } else {
    console.log('[editorMusic] SUNO_API_KEY 未配置，直接使用 Lyria');
  }

  // -------- Fallback：Lyria --------
  try {
    const buffers = await generateLyriaInstrumentalWavs({
      prompt,
      negativePrompt:
        typeof body.negativePrompt === 'string' ? body.negativePrompt : undefined,
      sampleCount,
    });

    const items = buffers.map((buf) => {
      const { id, url } = saveMusicBuffer(buf, 'wav', prompt, 'audio/wav');
      return { id, url, durationSec: LYRIA_CLIP_DURATION_SEC, mime: 'audio/wav' };
    });

    res.json({
      provider: 'lyria',
      model: 'lyria-002',
      clipDurationSec: LYRIA_CLIP_DURATION_SEC,
      instrumentalOnly: true,
      items,
    });
  } catch (e) {
    console.error('[editor/music/generate]', e);
    res.status(500).json({ error: e instanceof Error ? e.message : '生成失败' });
  }
});

// -------- GET /music/files/:id --------

router.get('/music/files/:id', (req, res) => {
  const id = req.params.id.replace(/[^a-zA-Z0-9_-]/g, '');
  const found = resolveAudioFileOnDisk(id);
  if (!found) {
    res.status(404).json({ error: '音频不存在或已过期' });
    return;
  }
  res.setHeader('Content-Type', found.mime);
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.sendFile(found.abs, (err) => {
    if (err && !res.headersSent) {
      res.status(500).json({ error: '读取失败' });
    }
  });
});

export default router;
