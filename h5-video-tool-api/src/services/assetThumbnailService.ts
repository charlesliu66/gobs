/**
 * 素材缩略图服务
 * - 上传时自动生成 300px JPEG 缩略图（图片用 sharp，视频用 ffmpeg 取首帧）
 * - 存放在原素材同目录下的 .thumbs/ 子目录
 * - 提供批量补生成 + 查询接口
 */
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const execFileAsync = promisify(execFile);

const THUMB_SIZE = 300;
const THUMB_QUALITY = 75;
const THUMB_SUBDIR = '.thumbs';

let ffmpegPath: string | null = null;
try {
  const ffmpegStatic = require('ffmpeg-static') as string;
  ffmpegPath = ffmpegStatic;
} catch {
  console.warn('[thumbnail] ffmpeg-static not available, video thumbnails disabled');
}

/**
 * 为图片素材生成缩略图（sharp）
 */
async function generateImageThumb(srcPath: string, thumbPath: string): Promise<boolean> {
  try {
    const sharp = (await import('sharp')).default;
    await sharp(srcPath)
      .resize(THUMB_SIZE, THUMB_SIZE, { fit: 'cover', position: 'centre' })
      .jpeg({ quality: THUMB_QUALITY })
      .toFile(thumbPath);
    return true;
  } catch (err) {
    console.warn(`[thumbnail] sharp failed for ${srcPath}:`, err);
    return false;
  }
}

/**
 * 为视频素材生成缩略图（ffmpeg 取第 1 秒帧）
 */
async function generateVideoThumb(srcPath: string, thumbPath: string): Promise<boolean> {
  if (!ffmpegPath) return false;
  try {
    await execFileAsync(ffmpegPath, [
      '-i', srcPath,
      '-ss', '1',
      '-frames:v', '1',
      '-vf', `scale=${THUMB_SIZE}:${THUMB_SIZE}:force_original_aspect_ratio=increase,crop=${THUMB_SIZE}:${THUMB_SIZE}`,
      '-q:v', '5',
      '-y',
      thumbPath,
    ], { timeout: 15000 });
    return fs.existsSync(thumbPath);
  } catch (err) {
    console.warn(`[thumbnail] ffmpeg failed for ${srcPath}:`, err);
    return false;
  }
}

/**
 * 获取缩略图路径（不确保存在）
 */
export function getThumbPath(filepath: string): string {
  const dir = path.dirname(filepath);
  const base = path.basename(filepath, path.extname(filepath));
  return path.join(dir, THUMB_SUBDIR, `${base}.thumb.jpg`);
}

/**
 * 为单个素材生成缩略图
 * @returns 缩略图路径（成功）或 null（失败/不支持）
 */
export async function ensureThumbnail(
  filepath: string,
  mimetype: string,
): Promise<string | null> {
  if (!filepath || !fs.existsSync(filepath)) return null;

  const thumbPath = getThumbPath(filepath);

  if (fs.existsSync(thumbPath)) return thumbPath;

  const thumbDir = path.dirname(thumbPath);
  fs.mkdirSync(thumbDir, { recursive: true });

  const isVideo = mimetype.startsWith('video/');
  const isImage = mimetype.startsWith('image/');

  if (isImage) {
    const ok = await generateImageThumb(filepath, thumbPath);
    return ok ? thumbPath : null;
  }
  if (isVideo) {
    const ok = await generateVideoThumb(filepath, thumbPath);
    return ok ? thumbPath : null;
  }

  return null;
}

/**
 * 检查缩略图是否已存在
 */
export function hasThumb(filepath: string): boolean {
  return fs.existsSync(getThumbPath(filepath));
}
