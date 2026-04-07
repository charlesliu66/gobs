import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import {
  generateLyriaInstrumentalWavs,
  LYRIA_CLIP_DURATION_SEC,
} from '../services/compassLyriaMusic.js';
import { polishLyriaMusicPrompt } from '../services/editorMusicPromptPolish.js';

const router = Router();

/** POST 将模糊需求润色为 Lyria 可用的英文 prompt / negativePrompt */
router.post('/music/polish-prompt', async (req, res) => {
  const raw = typeof (req.body as { raw?: string }).raw === 'string' ? (req.body as { raw: string }).raw : '';
  try {
    const out = await polishLyriaMusicPrompt(raw);
    res.json(out);
  } catch (e) {
    const msg = e instanceof Error ? e.message : '润色失败';
    const code = msg.includes('请提供') || msg.includes('未生成') ? 400 : 500;
    res.status(code).json({ error: msg });
  }
});

const MUSIC_DIR = path.join(process.cwd(), 'uploads', 'editor', 'music');
fs.mkdirSync(MUSIC_DIR, { recursive: true });

type MusicMeta = { filename: string; createdAt: string; prompt: string };
const musicById = new Map<string, MusicMeta>();

/** POST 文生器乐（Compass Lyria），英文 prompt */
router.post('/music/generate', async (req, res) => {
  const body = req.body as {
    prompt?: string;
    negativePrompt?: string;
    sampleCount?: number;
  };
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  if (!prompt) {
    res.status(400).json({ error: '请提供英文 prompt（prompt）' });
    return;
  }

  try {
    const buffers = await generateLyriaInstrumentalWavs({
      prompt,
      negativePrompt: typeof body.negativePrompt === 'string' ? body.negativePrompt : undefined,
      sampleCount:
        typeof body.sampleCount === 'number' && Number.isFinite(body.sampleCount)
          ? body.sampleCount
          : 1,
    });

    const items: Array<{
      id: string;
      url: string;
      durationSec: number;
      mime: string;
    }> = [];

    for (let i = 0; i < buffers.length; i++) {
      const id = randomUUID();
      const filename = `${id}.wav`;
      const abs = path.join(MUSIC_DIR, filename);
      fs.writeFileSync(abs, buffers[i]!);
      musicById.set(id, { filename, createdAt: new Date().toISOString(), prompt });
      items.push({
        id,
        url: `/api/editor/music/files/${id}`,
        durationSec: LYRIA_CLIP_DURATION_SEC,
        mime: 'audio/wav',
      });
    }

    res.json({
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

router.get('/music/files/:id', (req, res) => {
  const meta = musicById.get(req.params.id);
  if (!meta) {
    res.status(404).json({ error: '音频不存在或已过期' });
    return;
  }
  const abs = path.join(MUSIC_DIR, meta.filename);
  if (!fs.existsSync(abs)) {
    res.status(404).json({ error: '文件已丢失' });
    return;
  }
  res.setHeader('Content-Type', 'audio/wav');
  res.sendFile(abs, (err) => {
    if (err && !res.headersSent) {
      res.status(500).json({ error: '读取失败' });
    }
  });
});

export default router;
