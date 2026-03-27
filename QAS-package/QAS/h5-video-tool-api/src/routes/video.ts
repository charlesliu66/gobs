/**
 * POST /api/video/generate
 * 调用 Compass Veo 视频生成 API（通过 Python SDK，与文档一致）
 * 支持参考照片：传 driveToken + materials（含 mimeType），首张图片作为参考图
 * 支持分镜图流程：直接传 imageBase64（来自 Imagen 分镜图）
 */
import { Router, Request, Response } from 'express';
import axios from 'axios';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { generateVideoWithPython } from '../services/veoPython.js';

export const videoRouter = Router();

const OUTPUT_DIR = process.env.VIDEO_OUTPUT_DIR || path.resolve(process.cwd(), 'output');

/** 默认仅展示 veo-2.0 模型（多数环境无需组织策略审批）
 * 若需使用 veo-3.x，在 .env 中设置 VEO_MODELS=veo-2.0-generate-001,veo-3.1-generate-001 等 */
const DEFAULT_VEO_MODELS = ['veo-2.0-generate-001', 'veo-2.0-generate-exp'];

function getVeoModels(): string[] {
  const envList = process.env.VEO_MODELS?.trim();
  if (envList) {
    return envList.split(',').map((m) => m.trim()).filter(Boolean);
  }
  return DEFAULT_VEO_MODELS;
}

videoRouter.get('/models', (_req: Request, res: Response) => {
  res.json({ models: getVeoModels() });
});

/** GET /api/video/file?path=output/xxx.mp4 - 提供已生成视频文件访问，供历史记录预览 */
videoRouter.get('/file', async (req: Request, res: Response) => {
  const rawPath = req.query.path as string | undefined;
  if (!rawPath || typeof rawPath !== 'string') {
    res.status(400).json({ error: '请提供 path 参数' });
    return;
  }
  const outputDir = path.resolve(process.cwd(), 'output');
  const fullPath = path.resolve(process.cwd(), path.normalize(rawPath));
  if (!fullPath.startsWith(outputDir + path.sep) && fullPath !== outputDir) {
    res.status(400).json({ error: 'path 必须在 output 目录下' });
    return;
  }
  try {
    await fs.access(fullPath);
    res.sendFile(fullPath, { headers: { 'Content-Type': 'video/mp4' } });
  } catch {
    res.status(404).json({ error: '文件不存在' });
  }
});

/** 从 Drive 获取首张图片的 base64（用于 Veo 参考图） */
async function fetchDriveImageAsBase64(
  fileId: string,
  mimeType: string | undefined,
  driveToken: string
): Promise<{ base64: string; mimeType: string } | null> {
  const headers = { Authorization: `Bearer ${driveToken}` };
  const opts = { responseType: 'arraybuffer' as const, timeout: 15000 };
  try {
    const { data, status } = await axios.get<ArrayBuffer>(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`,
      {
        params: { alt: 'media', supportsAllDrives: true },
        ...opts,
        headers,
        validateStatus: (s) => s < 500,
      }
    );
    if (status >= 400) return null;
    const mime = mimeType?.startsWith('image/') ? mimeType : 'image/png';
    const base64 = Buffer.from(data).toString('base64');
    return { base64, mimeType: mime };
  } catch {
    return null;
  }
}

videoRouter.post('/generate', async (req: Request, res: Response) => {
  const { storyboardText, materials, driveToken, duration, aspectRatio, model, resolution, imageBase64: bodyImageBase64, imageMimeType: bodyImageMimeType } = req.body as {
    storyboardText?: string;
    materials?: { id: string; name: string; mimeType?: string }[];
    driveToken?: string;
    duration?: number;
    aspectRatio?: string;
    model?: string;
    resolution?: string;
    /** 分镜图先行流程：直接传入 base64 参考图（不含 data: 前缀） */
    imageBase64?: string;
    imageMimeType?: string;
  };

  if (!storyboardText || typeof storyboardText !== 'string' || !storyboardText.trim()) {
    res.status(400).json({ error: '请提供 storyboardText（分镜文本）' });
    return;
  }

  try {
    let imageBase64: string | undefined = bodyImageBase64;
    let imageMimeType: string | undefined = bodyImageMimeType;

    if (!imageBase64 && driveToken && materials?.length) {
      const firstImage = materials.find((m) => m.mimeType?.startsWith('image/'));
      if (firstImage) {
        const img = await fetchDriveImageAsBase64(firstImage.id, firstImage.mimeType, driveToken);
        if (img) {
          imageBase64 = img.base64;
          imageMimeType = img.mimeType;
        }
      }
    }

    const { taskId, videoUrl } = await generateVideoWithPython({
      prompt: storyboardText.trim(),
      aspectRatio: aspectRatio ?? '16:9',
      duration: duration != null ? duration : undefined,
      resolution: resolution?.trim() || undefined,
      model: model?.trim() || undefined,
      imageBase64,
      imageMimeType,
    });

    /** 保存到 output/ 并返回 videoPath，供 GeeLark 推送时用本地路径避免 base64 传输问题 */
    let videoPath: string | undefined;
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
    } catch (e) {
      console.warn('[video/generate] 保存到 output/ 失败，仍返回 videoUrl', e);
    }

    res.json({
      taskId,
      status: 'completed',
      videoUrl,
      videoPath,
    });
  } catch (err) {
    console.error('[video/generate]', err);
    const msg = err instanceof Error ? err.message : '视频生成失败';
    res.status(500).json({ error: msg });
  }
});

/** ffmpeg 拼接视频片段 */
async function concatVideos(videoPaths: string[], outputPath: string): Promise<void> {
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
      fs.unlink(listPath).catch(() => {});
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg 拼接失败: ${stderr}`));
    });
    proc.on('error', reject);
  });
}

videoRouter.post('/generate-multishot', async (req: Request, res: Response) => {
  const { shots, aspectRatio = '16:9', outputPath: customOutputPath, materials, driveToken } = req.body as {
    shots?: { index: number; durationSeconds: number; prompt: string; imageBase64?: string }[];
    aspectRatio?: string;
    outputPath?: string;
    materials?: { id: string; name: string; mimeType?: string }[];
    driveToken?: string;
  };

  if (!shots?.length || !Array.isArray(shots)) {
    res.status(400).json({ error: '请提供 shots 数组（每项含 durationSeconds、prompt）' });
    return;
  }

  try {
    // 获取用户选中的素材作为参考图：第 1 张 = 主体设定图，用于每个镜头的视频生成
    let materialsRefBase64: string | undefined;
    let materialsRefMime: string | undefined;
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

    const videoPaths: string[] = [];
    for (let i = 0; i < shots.length; i++) {
      const shot = shots[i];
      // 优先用该镜头自带的 imageBase64（来自 生成首尾帧），否则用用户选的第 1 张素材
      const refBase64 = shot.imageBase64?.replace(/^data:image\/\w+;base64,/, '') || materialsRefBase64;
      const { videoUrl } = await generateVideoWithPython({
        prompt: shot.prompt.trim(),
        aspectRatio: aspectRatio ?? '16:9',
        duration: Math.max(4, Math.min(8, shot.durationSeconds || 5)),
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

    for (const p of videoPaths) await fs.unlink(p).catch(() => {});
    await fs.rmdir(tmpDir).catch(() => {});

    const buf = await fs.readFile(finalPath);
    const videoUrl = `data:video/mp4;base64,${buf.toString('base64')}`;
    res.json({
      status: 'completed',
      videoUrl,
      outputPath: finalPath,
    });
  } catch (err) {
    console.error('[video/generate-multishot]', err);
    const msg = err instanceof Error ? err.message : '多镜头视频生成失败';
    res.status(500).json({ error: msg });
  }
});

export default videoRouter;
