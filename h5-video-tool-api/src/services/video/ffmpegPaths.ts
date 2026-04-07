import { createRequire } from 'module';
import ffmpegInstaller from 'ffmpeg-static';
import { spawn } from 'child_process';

const require = createRequire(import.meta.url);
const ffprobeModule = require('ffprobe-static') as { path: string };

/** 优先环境变量（生产可指向系统 ffmpeg） */
export function getFfmpegPath(): string {
  const env = process.env.FFMPEG_PATH?.trim();
  if (env && env.length > 0) return env;
  return typeof ffmpegInstaller === 'string' && ffmpegInstaller ? ffmpegInstaller : 'ffmpeg';
}

export function getFfprobePath(): string {
  const env = process.env.FFPROBE_PATH?.trim();
  if (env && env.length > 0) return env;
  return ffprobeModule.path || 'ffprobe';
}

export function ffprobeDurationSeconds(videoPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const bin = getFfprobePath();
    const proc = spawn(
      bin,
      [
        '-v',
        'error',
        '-show_entries',
        'format=duration',
        '-of',
        'default=noprint_wrappers=1:nokey=1',
        videoPath,
      ],
      { windowsHide: true },
    );
    let out = '';
    let err = '';
    proc.stdout.on('data', (c: Buffer) => {
      out += c.toString();
    });
    proc.stderr.on('data', (c: Buffer) => {
      err += c.toString();
    });
    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`ffprobe 失败: ${err || code}`));
        return;
      }
      const v = parseFloat(out.trim());
      if (!Number.isFinite(v) || v <= 0) {
        reject(new Error('无法解析视频时长'));
        return;
      }
      resolve(v);
    });
    proc.on('error', reject);
  });
}
