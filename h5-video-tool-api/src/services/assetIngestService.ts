/**
 * TASK-A: 素材导入服务
 * 职责：创建 import job、分批处理文件上传（multipart/form-data）、
 *       sha256 去重、ffprobe 元数据提取、写入 assets 表、触发规则打标、更新 job 进度
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { execFile } from 'child_process';
import { promisify } from 'util';
import db from '../db/assetDb.js';
import { applyRuleTags, aiTagAsset } from './assetTaggingService.js';
import type { AssetRecord, ImportJob } from '../types/assetLibrary.js';
import { resolvePath } from '../infra/storage/resolver.js';

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { nanoid } = require('nanoid') as { nanoid: (size?: number) => string };

const execFileAsync = promisify(execFile);

// ffprobe 路径
let ffprobePath: string | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ffprobeStatic = require('ffprobe-static') as { path: string };
  ffprobePath = ffprobeStatic.path;
} catch {
  console.warn('[assetIngest] ffprobe-static not available, metadata extraction disabled');
}

// 数据目录（通过 resolver 统一管理）
function getDataDir(): string {
  return resolvePath('assets-ingest');
}

function nowIso(): string {
  return new Date().toISOString();
}

// ── sha256 ─────────────────────────────────────────────────────────────────────

function sha256File(filepath: string): string {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filepath));
  return hash.digest('hex');
}

// ── ffprobe 元数据提取 ──────────────────────────────────────────────────────────

interface MediaMeta {
  width: number | null;
  height: number | null;
  duration: number | null;
  fps: number | null;
  orientation: string | null;
  has_audio: boolean;
}

async function extractMetadata(filepath: string): Promise<MediaMeta> {
  if (!ffprobePath) {
    return { width: null, height: null, duration: null, fps: null, orientation: null, has_audio: false };
  }
  try {
    const { stdout } = await execFileAsync(ffprobePath, [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_streams',
      filepath,
    ]);
    const data = JSON.parse(stdout) as { streams?: Array<Record<string, string | number>> };
    const streams = data.streams ?? [];

    let width: number | null = null;
    let height: number | null = null;
    let duration: number | null = null;
    let fps: number | null = null;
    let orientation: string | null = null;
    let has_audio = false;

    for (const s of streams) {
      const codecType = s.codec_type as string;
      if (codecType === 'video') {
        width = s.width as number ?? null;
        height = s.height as number ?? null;
        if (s.duration) duration = parseFloat(s.duration as string);
        // fps: r_frame_rate is like "30/1"
        if (s.r_frame_rate) {
          const parts = (s.r_frame_rate as string).split('/');
          if (parts.length === 2 && parseFloat(parts[1]) !== 0) {
            fps = parseFloat(parts[0]) / parseFloat(parts[1]);
          }
        }
        // rotation tag
        if (s.tags && typeof s.tags === 'object') {
          const tags = s.tags as Record<string, string>;
          const rotate = tags['rotate'];
          if (rotate === '90' || rotate === '270') {
            // swap width/height for portrait video
            [width, height] = [height, width];
          }
        }
      }
      if (codecType === 'audio') {
        has_audio = true;
      }
    }

    if (width && height) {
      orientation = width > height ? 'landscape' : height > width ? 'portrait' : 'square';
    }

    return { width, height, duration, fps, orientation, has_audio };
  } catch (err) {
    console.warn('[assetIngest] ffprobe failed for', filepath, err instanceof Error ? err.message : err);
    return { width: null, height: null, duration: null, fps: null, orientation: null, has_audio: false };
  }
}

// ── Job 管理 ───────────────────────────────────────────────────────────────────

export function createImportJob(username: string, total: number): string {
  const id = nanoid(21);
  const now = nowIso();
  db.prepare(`
    INSERT INTO import_jobs (id, username, total, processed, failed, skipped, status, error, created_at, updated_at)
    VALUES (@id, @username, @total, 0, 0, 0, 'pending', NULL, @now, @now)
  `).run({ id, username, total, now });
  return id;
}

export function getJobStatus(jobId: string, username: string): ImportJob | null {
  const row = db.prepare(`
    SELECT * FROM import_jobs WHERE id = @id AND username = @username
  `).get({ id: jobId, username }) as ImportJob | undefined;
  return row ?? null;
}

export function resetInterruptedJobs(): void {
  const result = db.prepare(`
    UPDATE import_jobs SET status = 'interrupted', updated_at = @now
    WHERE status = 'running'
  `).run({ now: nowIso() });
  if (result.changes > 0) {
    console.log(`[assetIngest] Reset ${result.changes} interrupted job(s) on startup`);
  }
}

// ── 文件处理核心 ───────────────────────────────────────────────────────────────

interface FileInfo {
  originalname: string;
  mimetype: string;
  size: number;
  path: string; // temp path from multer
}

async function processFile(
  file: FileInfo,
  username: string,
  jobId: string,
): Promise<'processed' | 'failed' | 'skipped'> {
  // 拒绝 0 字节文件
  if (file.size === 0) {
    console.warn(`[assetIngest] Skipping zero-byte file: ${file.originalname}`);
    return 'failed';
  }

  try {
    // 1. sha256
    const hash = sha256File(file.path);

    // 2. 去重：同一 username 下查 assets 表
    const existing = db.prepare(`
      SELECT id FROM assets WHERE username = @username AND sha256 = @sha256 AND filesize = @filesize
    `).get({ username, sha256: hash, filesize: file.size });

    if (existing) {
      console.log(`[assetIngest] Duplicate skipped: ${file.originalname} (sha256=${hash.slice(0, 8)})`);
      // 删除 multer 临时文件
      fs.rmSync(file.path, { force: true });
      return 'skipped';
    }

    // 3. 落盘到 {dataDir}/assets/{username}/
    const destDir = resolvePath('assets-ingest', username);
    fs.mkdirSync(destDir, { recursive: true });
    const assetId = nanoid(21);
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const destFilename = `${assetId}-${safeName}`;
    const destPath = path.join(destDir, destFilename);
    fs.renameSync(file.path, destPath);

    // 4. ffprobe 元数据提取
    const meta = await extractMetadata(destPath);

    // 5. INSERT assets
    const now = nowIso();
    const asset: AssetRecord = {
      id: assetId,
      username,
      project_id: 'default',
      filename: file.originalname,
      filepath: destPath,
      mimetype: file.mimetype,
      filesize: file.size,
      sha256: hash,
      width: meta.width,
      height: meta.height,
      duration: meta.duration,
      fps: meta.fps,
      orientation: meta.orientation,
      has_audio: meta.has_audio ? 1 : 0,
      status: 'ready',
      created_at: now,
      updated_at: now,
    };

    db.prepare(`
      INSERT INTO assets (id, username, project_id, filename, filepath, mimetype, filesize, sha256,
        width, height, duration, fps, orientation, has_audio, status, created_at, updated_at)
      VALUES (@id, @username, @project_id, @filename, @filepath, @mimetype, @filesize, @sha256,
        @width, @height, @duration, @fps, @orientation, @has_audio, @status, @created_at, @updated_at)
    `).run(asset);

    // 6. 规则打标
    applyRuleTags(assetId, asset);

    // 7. AI 打标（异步不等待，失败不阻塞导入任务）
    void aiTagAsset(assetId);

    return 'processed';
  } catch (err) {
    console.error(`[assetIngest] Failed processing file ${file.originalname}:`, err);
    // 清理临时文件（如果还存在）
    try { fs.rmSync(file.path, { force: true }); } catch { /* ignore */ }
    return 'failed';
  }
}

// ── 后台批处理 ─────────────────────────────────────────────────────────────────

const BATCH_SIZE = 20;

export function processImportJob(
  jobId: string,
  username: string,
  files: Express.Multer.File[],
): void {
  // 立即返回，后台异步处理
  setImmediate(async () => {
    // 更新 job 状态为 running
    db.prepare(`
      UPDATE import_jobs SET status = 'running', updated_at = @now WHERE id = @id
    `).run({ id: jobId, now: nowIso() });

    let processed = 0;
    let failed = 0;
    let skipped = 0;

    try {
      // 分批处理，每批 BATCH_SIZE 个文件
      for (let i = 0; i < files.length; i += BATCH_SIZE) {
        const batch = files.slice(i, i + BATCH_SIZE);

        for (const file of batch) {
          const result = await processFile(
            {
              originalname: file.originalname,
              mimetype: file.mimetype,
              size: file.size,
              path: file.path,
            },
            username,
            jobId,
          );

          if (result === 'processed') processed++;
          else if (result === 'failed') failed++;
          else if (result === 'skipped') skipped++;

          // 更新进度
          db.prepare(`
            UPDATE import_jobs
            SET processed = @processed, failed = @failed, skipped = @skipped, updated_at = @now
            WHERE id = @id
          `).run({ id: jobId, processed, failed, skipped, now: nowIso() });
        }
      }

      // 完成
      db.prepare(`
        UPDATE import_jobs
        SET status = 'done', processed = @processed, failed = @failed, skipped = @skipped, updated_at = @now
        WHERE id = @id
      `).run({ id: jobId, processed, failed, skipped, now: nowIso() });

      console.log(`[assetIngest] Job ${jobId} done: processed=${processed}, failed=${failed}, skipped=${skipped}`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '未知错误';
      db.prepare(`
        UPDATE import_jobs
        SET status = 'failed', error = @error, processed = @processed, failed = @failed, skipped = @skipped, updated_at = @now
        WHERE id = @id
      `).run({ id: jobId, error: errorMsg, processed, failed, skipped, now: nowIso() });
      console.error(`[assetIngest] Job ${jobId} failed:`, err);
    }
  });
}
