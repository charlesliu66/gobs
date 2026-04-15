/**
 * 多镜头（Multishot）任务路由 & 执行引擎
 *
 * 路由：
 *   POST /api/video/generate-multishot  — 提交多镜头任务
 *   GET  /api/video/multishot-job/:jobId — 查询任务状态
 *
 * 任务落盘目录：<MULTISHOT_JOBS_ROOT>/<username>/<jobId>/
 */
import { Router, type Request, type Response } from 'express';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import { getApiDataDir } from '../config/apiDataDir.js';
import { sanitizeUsername } from '../utils/safeUsername.js';
import { generateVideoWithPython } from '../services/veoPython.js';
import {
  generateDreaminaVideo,
  isDreaminaModel,
} from '../services/dreaminaVideo.js';
import {
  generateKlingVideo,
  isKlingModel,
} from '../services/klingVideo.js';
import { fetchDriveImageAsBase64 } from '../services/videoReferenceUtils.js';
import { resolvePath } from '../infra/storage/resolver.js';

export const multishotRouter = Router();

/** 多镜头任务存储根目录（供 video.ts 中 /file 路由做路径白名单校验） */
export const MULTISHOT_JOBS_ROOT = resolvePath('multishot-jobs');

// ── 类型定义 ──────────────────────────────────────────────────────────────────

type MultishotJobStatus = 'pending' | 'running' | 'done' | 'error';
type MultishotShotStatus = 'pending' | 'running' | 'done' | 'error';

interface MultishotJobShot {
  index: number;
  status: MultishotShotStatus;
  promptSnippet: string;
  durationSeconds: number;
  videoPath?: string;
  error?: string;
}

interface MultishotJobRecord {
  jobId: string;
  username: string;
  status: MultishotJobStatus;
  aspectRatio: string;
  model?: string;
  shots: MultishotJobShot[];
  finalVideoPath?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

// ── 辅助函数 ──────────────────────────────────────────────────────────────────

function getMultishotJobDir(username: string, jobId: string): string {
  return path.join(MULTISHOT_JOBS_ROOT, sanitizeUsername(username), jobId);
}

function getMultishotJobFile(username: string, jobId: string): string {
  return path.join(getMultishotJobDir(username, jobId), 'job.json');
}

export function toApiRelativePath(absPath: string): string {
  return path.relative(getApiDataDir(), absPath).replace(/\\/g, '/');
}

async function writeMultishotJob(job: MultishotJobRecord): Promise<void> {
  const file = getMultishotJobFile(job.username, job.jobId);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(
    file,
    JSON.stringify({ ...job, updatedAt: new Date().toISOString() }, null, 2),
    'utf-8',
  );
}

async function readMultishotJob(username: string, jobId: string): Promise<MultishotJobRecord | null> {
  const file = getMultishotJobFile(username, jobId);
  try {
    const raw = await fs.readFile(file, 'utf-8');
    return JSON.parse(raw) as MultishotJobRecord;
  } catch {
    return null;
  }
}

async function patchMultishotJob(
  username: string,
  jobId: string,
  patch: (job: MultishotJobRecord) => MultishotJobRecord,
): Promise<MultishotJobRecord | null> {
  const current = await readMultishotJob(username, jobId);
  if (!current) return null;
  const next = patch(current);
  await writeMultishotJob(next);
  return next;
}

// ── ffmpeg 拼接 ───────────────────────────────────────────────────────────────

async function concatVideos(videoPaths: string[], outputPath: string): Promise<void> {
  const listPath = path.join(os.tmpdir(), `concat_${Date.now()}.txt`);
  const listContent = videoPaths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join('\n');
  await fs.writeFile(listPath, listContent, 'utf-8');
  return new Promise((resolve, reject) => {
    const proc = spawn(process.env.FFMPEG_PATH || 'ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', outputPath], {
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

// ── 任务执行引擎 ──────────────────────────────────────────────────────────────

async function runMultishotJob(args: {
  username: string;
  jobId: string;
  shots: { index: number; durationSeconds: number; prompt: string; imageBase64?: string }[];
  aspectRatio: string;
  materials?: { id: string; name: string; mimeType?: string }[];
  driveToken?: string;
  model?: string;
}) {
  const { username, jobId, shots, aspectRatio, materials, driveToken } = args;
  const multishotModel = args.model?.trim() || '';
  const jobDir = getMultishotJobDir(username, jobId);
  try {
    await patchMultishotJob(username, jobId, (job) => ({ ...job, status: 'running', error: undefined }));
    await fs.mkdir(jobDir, { recursive: true });

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

    const doneAbsPaths: string[] = [];
    for (let i = 0; i < shots.length; i++) {
      const shot = shots[i];
      await patchMultishotJob(username, jobId, (job) => ({
        ...job,
        shots: job.shots.map((s) => (s.index === i ? { ...s, status: 'running', error: undefined } : s)),
      }));
      try {
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
        const absPath = path.join(jobDir, `shot_${i}.mp4`);
        await fs.writeFile(absPath, buf);
        doneAbsPaths.push(absPath);
        const relPath = toApiRelativePath(absPath);
        await patchMultishotJob(username, jobId, (job) => ({
          ...job,
          shots: job.shots.map((s) =>
            s.index === i ? { ...s, status: 'done', videoPath: relPath, error: undefined } : s,
          ),
        }));
      } catch (e) {
        const msg = e instanceof Error ? e.message : '该镜头生成失败';
        await patchMultishotJob(username, jobId, (job) => ({
          ...job,
          shots: job.shots.map((s) => (s.index === i ? { ...s, status: 'error', error: msg } : s)),
        }));
      }
    }

    if (!doneAbsPaths.length) {
      await patchMultishotJob(username, jobId, (job) => ({
        ...job,
        status: 'error',
        error: '所有镜头均生成失败',
      }));
      return;
    }

    const finalAbsPath = path.join(jobDir, `final_${Date.now()}.mp4`);
    await concatVideos(doneAbsPaths, finalAbsPath);
    const finalRelPath = toApiRelativePath(finalAbsPath);
    await patchMultishotJob(username, jobId, (job) => ({
      ...job,
      status: 'done',
      finalVideoPath: finalRelPath,
      error: undefined,
    }));
  } catch (err) {
    const msg = err instanceof Error ? err.message : '多镜头任务执行失败';
    console.error('[video/multishot-job-runner]', err);
    await patchMultishotJob(username, jobId, (job) => ({
      ...job,
      status: 'error',
      error: msg,
    }));
  }
}

// ── 路由处理 ──────────────────────────────────────────────────────────────────

multishotRouter.post('/generate-multishot', async (req: Request, res: Response) => {
  const { shots, aspectRatio = '16:9', materials, driveToken, model: bodyModel } = req.body as {
    shots?: { index: number; durationSeconds: number; prompt: string; imageBase64?: string }[];
    aspectRatio?: string;
    materials?: { id: string; name: string; mimeType?: string }[];
    driveToken?: string;
    model?: string;
  };
  if (!shots?.length || !Array.isArray(shots)) {
    res.status(400).json({ error: '请提供 shots 数组（每项含 durationSeconds、prompt）' });
    return;
  }
  const username = sanitizeUsername(req.user?.username);
  const jobId = `ms_${Date.now()}_${randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();
  const initial: MultishotJobRecord = {
    jobId,
    username,
    status: 'pending',
    aspectRatio: aspectRatio ?? '16:9',
    model: typeof bodyModel === 'string' ? bodyModel.trim() : undefined,
    shots: shots.map((s, i) => ({
      index: i,
      status: 'pending',
      durationSeconds: Math.max(4, Math.min(8, s.durationSeconds || 5)),
      promptSnippet: s.prompt.trim().slice(0, 120),
    })),
    createdAt: now,
    updatedAt: now,
  };

  try {
    await writeMultishotJob(initial);
    res.json({ jobId, status: 'pending' as const });
    setImmediate(() => {
      void runMultishotJob({
        username,
        jobId,
        shots,
        aspectRatio: aspectRatio ?? '16:9',
        materials,
        driveToken,
        model: typeof bodyModel === 'string' ? bodyModel : undefined,
      });
    });
  } catch (err) {
    console.error('[video/generate-multishot]', err);
    const msg = err instanceof Error ? err.message : '多镜头任务创建失败';
    res.status(500).json({ error: msg });
  }
});

multishotRouter.get('/multishot-job/:jobId', async (req: Request, res: Response) => {
  const username = sanitizeUsername(req.user?.username);
  const jobId = String(req.params.jobId || '').trim();
  if (!jobId) {
    res.status(400).json({ error: '缺少 jobId' });
    return;
  }
  const job = await readMultishotJob(username, jobId);
  if (!job) {
    res.status(404).json({ error: '任务不存在' });
    return;
  }
  const done = job.shots.filter((s) => s.status === 'done').length;
  const failed = job.shots.filter((s) => s.status === 'error').length;
  const running = job.shots.filter((s) => s.status === 'running').length;
  res.json({
    jobId: job.jobId,
    status: job.status,
    shots: job.shots,
    finalVideoPath: job.finalVideoPath,
    error: job.error,
    progress: {
      total: job.shots.length,
      done,
      failed,
      running,
      pending: Math.max(0, job.shots.length - done - failed - running),
    },
    updatedAt: job.updatedAt,
  });
});
