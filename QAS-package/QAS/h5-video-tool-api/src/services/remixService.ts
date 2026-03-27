/**
 * Remix 服务：FFmpeg 视频拼接 + 字幕烧录
 * 支持：片头 + 正片 + 片尾 拼接，以及 SRT 字幕烧录
 */
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import axios from 'axios';

const OUTPUT_DIR = process.env.VIDEO_OUTPUT_DIR || path.resolve(process.cwd(), 'output');
const REMIX_OUTPUT_DIR = path.join(OUTPUT_DIR, 'remix');

export interface SubtitleCue {
  text: string;
  startMs: number;
  endMs: number;
}

export interface RemixOptions {
  /** 主视频：本地路径或 URL */
  videoUrl: string;
  /** 片头视频：本地路径或 URL，可选 */
  introUrl?: string;
  /** 片尾视频：本地路径或 URL，可选 */
  outroUrl?: string;
  /** 字幕：SRT 字符串，或 JSON 格式 cue 数组 */
  subtitles?: string | SubtitleCue[];
  /** 裁剪正片：起始秒数 */
  trimStart?: number;
  /** 裁剪正片：结束秒数（相对于原片） */
  trimEnd?: number;
}

/** 将 ms 转为 SRT 时间格式 */
function msToSrtTime(ms: number): string {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const msPart = ms % 1000;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(msPart).padStart(3, '0')}`;
}

/** 将 cue 数组转为 SRT 字符串 */
function cuesToSrt(cues: SubtitleCue[]): string {
  return cues
    .map(
      (c, i) =>
        `${i + 1}\n${msToSrtTime(c.startMs)} --> ${msToSrtTime(c.endMs)}\n${c.text.trim()}\n`
    )
    .join('\n');
}

/** 判断是否为 URL */
function isUrl(s: string): boolean {
  return /^https?:\/\//i.test(s.trim());
}

/** 下载视频到临时文件，返回本地路径 */
async function downloadToTemp(url: string, prefix: string): Promise<string> {
  const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 120000 });
  const tmpPath = path.join(os.tmpdir(), `${prefix}_${Date.now()}.mp4`);
  await fs.writeFile(tmpPath, Buffer.from(res.data));
  return tmpPath;
}

/** 解析本地路径或 data URL，返回可用路径 */
async function resolveVideoInput(input: string, prefix: string): Promise<string> {
  if (isUrl(input)) {
    return downloadToTemp(input, prefix);
  }
  if (input.startsWith('data:')) {
    const base64 = input.replace(/^data:video\/\w+;base64,/, '');
    const tmpPath = path.join(os.tmpdir(), `${prefix}_${Date.now()}.mp4`);
    await fs.writeFile(tmpPath, Buffer.from(base64, 'base64'));
    return tmpPath;
  }
  const localPath = path.resolve(input);
  try {
    await fs.access(localPath);
    return localPath;
  } catch {
    throw new Error(`视频文件不存在: ${input}`);
  }
}

/** 执行 FFmpeg 命令 */
function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    proc.stderr?.on('data', (d) => (stderr += d.toString()));
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg 执行失败: ${stderr.slice(-500)}`));
    });
    proc.on('error', (err) => reject(err));
  });
}

/** FFmpeg 拼接视频（concat demuxer） */
async function concatVideos(inputPaths: string[], outputPath: string): Promise<void> {
  const listPath = path.join(os.tmpdir(), `remix_concat_${Date.now()}.txt`);
  const listContent = inputPaths
    .map((p) => `file '${p.replace(/'/g, "'\\''")}'`)
    .join('\n');
  await fs.writeFile(listPath, listContent, 'utf-8');
  try {
    await runFfmpeg(['-y', '-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', outputPath]);
  } finally {
    await fs.unlink(listPath).catch(() => {});
  }
}

/** FFmpeg 烧录字幕 */
async function burnSubtitles(inputPath: string, srtPath: string, outputPath: string): Promise<void> {
  // 跨平台路径：使用正斜杠，Windows 下 FFmpeg 也支持
  const normalized = path.resolve(srtPath).replace(/\\/g, '/');
  const filter = `subtitles='${normalized.replace(/'/g, "'\\''")}'`;
  await runFfmpeg([
    '-y',
    '-i',
    inputPath,
    '-vf',
    filter,
    '-c:a',
    'copy',
    outputPath,
  ]);
}

/** 裁剪视频（trim） */
async function trimVideo(inputPath: string, outputPath: string, startSec: number, endSec?: number): Promise<void> {
  const args = ['-y', '-i', inputPath, '-ss', String(startSec)];
  if (endSec != null && endSec > startSec) {
    args.push('-to', String(endSec));
  }
  args.push('-c', 'copy', outputPath);
  await runFfmpeg(args);
}

/**
 * 执行 Remix：拼接 + 字幕烧录
 * @returns 输出视频的本地路径（相对于 output 或绝对路径）
 */
export async function runRemix(options: RemixOptions): Promise<string> {
  const { videoUrl, introUrl, outroUrl, subtitles, trimStart, trimEnd } = options;

  await fs.mkdir(REMIX_OUTPUT_DIR, { recursive: true });
  const tmpDir = path.join(os.tmpdir(), `remix_${Date.now()}`);
  await fs.mkdir(tmpDir, { recursive: true });

  const toClean: string[] = [];

  try {
    // 1. 解析主视频
    let mainPath = await resolveVideoInput(videoUrl, 'main');
    toClean.push(mainPath);

    // 2. 可选裁剪主视频
    if (trimStart != null && trimStart > 0) {
      const trimmedPath = path.join(tmpDir, 'main_trimmed.mp4');
      await trimVideo(mainPath, trimmedPath, trimStart, trimEnd);
      toClean.push(trimmedPath);
      mainPath = trimmedPath;
    }

    // 3. 解析片头/片尾
    let introPath: string | null = null;
    let outroPath: string | null = null;
    if (introUrl?.trim()) {
      introPath = await resolveVideoInput(introUrl.trim(), 'intro');
      toClean.push(introPath);
    }
    if (outroUrl?.trim()) {
      outroPath = await resolveVideoInput(outroUrl.trim(), 'outro');
      toClean.push(outroPath);
    }

    // 4. 拼接
    const parts: string[] = [];
    if (introPath) parts.push(introPath);
    parts.push(mainPath);
    if (outroPath) parts.push(outroPath);

    const concatPath = path.join(tmpDir, 'concat.mp4');
    if (parts.length === 1) {
      await fs.copyFile(parts[0], concatPath);
    } else {
      await concatVideos(parts, concatPath);
    }
    toClean.push(concatPath);

    // 5. 字幕烧录
    let finalPath = concatPath;
    if (subtitles && (typeof subtitles === 'string' ? subtitles.trim() : subtitles.length > 0)) {
      const srtContent =
        typeof subtitles === 'string'
          ? subtitles.trim()
          : cuesToSrt(subtitles as SubtitleCue[]);
      const srtPath = path.join(tmpDir, 'subs.srt');
      await fs.writeFile(srtPath, srtContent, 'utf-8');
      toClean.push(srtPath);

      const outPath = path.join(REMIX_OUTPUT_DIR, `remix_${Date.now()}.mp4`);
      await burnSubtitles(concatPath, srtPath, outPath);
      finalPath = outPath;
    } else {
      finalPath = path.join(REMIX_OUTPUT_DIR, `remix_${Date.now()}.mp4`);
      await fs.copyFile(concatPath, finalPath);
    }

    return finalPath;
  } finally {
    for (const p of toClean) {
      try {
        await fs.unlink(p);
      } catch {
        /* ignore */
      }
    }
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}
