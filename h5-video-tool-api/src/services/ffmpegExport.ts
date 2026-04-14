/**
 * FFmpeg 真实视频合成服务
 *
 * 功能：
 * - 按时间轴顺序拼接视频片段（支持 speed/volume/crossfade）
 * - 混入 BGM 轨
 * - 烧录字幕（SubtitleCue）
 * - 烧录文字版式（TextClip → drawtext）
 * - 输出 MP4/MOV，支持 720p/1080p/4K，支持 fast/balanced/high 质量
 */

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { getFfmpegPath } from './video/ffmpegPaths.js';
import type {
  TimelineProject,
  VideoClip,
  AudioClip,
  TextClip,
  AspectRatioPreset,
} from '../editor/timelineSchema.js';

// ─── 分辨率映射 ───────────────────────────────────────────────────────────────

const RESOLUTION_MAP: Record<string, { w: number; h: number }> = {
  '720p':  { w: 720,  h: 1280  }, // 9:16 竖屏基准，16:9 时互换
  '1080p': { w: 1080, h: 1920  },
  '4K':    { w: 2160, h: 3840  },
};

const ASPECT_SWAP: Set<AspectRatioPreset> = new Set(['16:9', '4:3']);

function resolveSize(
  resolution: string,
  aspectRatio: AspectRatioPreset,
): { w: number; h: number } {
  const base = RESOLUTION_MAP[resolution] ?? RESOLUTION_MAP['1080p']!;
  if (ASPECT_SWAP.has(aspectRatio)) return { w: base.h, h: base.w };
  return base;
}

// ─── 质量预设（CRF + preset） ─────────────────────────────────────────────────

const QUALITY_MAP: Record<string, { crf: number; preset: string }> = {
  fast:     { crf: 28, preset: 'ultrafast' },
  balanced: { crf: 23, preset: 'medium'    },
  high:     { crf: 18, preset: 'slow'      },
};

// ─── 文字版式 → drawtext 参数 ─────────────────────────────────────────────────

interface DrawTextOpts {
  text: string;
  startSec: number;
  endSec: number;
  w: number;
  h: number;
  presetId: string;
}

function escapeDrawtext(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/:/g, '\\:');
}

function textClipToDrawtext(opts: DrawTextOpts): string {
  const { text, startSec, endSec, w, h, presetId } = opts;
  const escaped = escapeDrawtext(text);
  const inDur  = 0.5;
  const outDur = 0.4;

  // alpha 动画：淡入淡出
  const alpha = `if(lt(t-${startSec},${inDur}),(t-${startSec})/${inDur},` +
    `if(lt(t,${endSec - outDur}),1,(${endSec}-t)/${outDur}))`;

  // 基础参数
  const base = `text='${escaped}':fontsize=60:fontcolor=white:alpha='${alpha}'` +
    `:enable='between(t,${startSec},${endSec})'`;

  switch (presetId) {
    case 'intro-minimal':
    case 'outro-brand':
      return `drawtext=${base}:x=(w-text_w)/2:y=(h-text_h)/2:box=1:boxcolor=black@0.8:boxborderw=24`;

    case 'intro-impact':
      return `drawtext=${base}:x=(w-text_w)/2:y=(h-text_h)/2:fontsize=80:fontcolor=#c084fc`;

    case 'outro-follow':
      return `drawtext=${base}:x=(w-text_w)/2:y=h*0.8:box=1:boxcolor=#7c3aed@0.85:boxborderw=20`;

    case 'sub-bottom':
      return `drawtext=${base}:x=(w-text_w)/2:y=h*0.88:box=1:boxcolor=black@0.7:boxborderw=12:fontsize=52`;

    case 'sub-top':
      return `drawtext=${base}:x=20:y=30:fontsize=40:fontcolor=#fbbf24:box=1:boxcolor=black@0.6:boxborderw=10`;

    case 'sub-highlight':
      return `drawtext=${base}:x=(w-text_w)/2:y=h*0.85:fontsize=56`;

    case 'title-card':
      return `drawtext=${base}:x=40:y=(h-text_h)/2:fontsize=64:fontcolor=#38bdf8:box=1:boxcolor=#0f172a@0.9:boxborderw=20`;

    default:
      return `drawtext=${base}:x=(w-text_w)/2:y=(h-text_h)/2`;
  }
}

// ─── 主合成函数 ───────────────────────────────────────────────────────────────

export interface ExportOptions {
  project: TimelineProject;
  assets: Record<string, string>; // assetId → 本地文件路径
  outputPath: string;
  resolution?: string;
  format?: string;
  quality?: string;
  onProgress?: (pct: number, msg: string) => void;
}

export async function runFfmpegExport(opts: ExportOptions): Promise<void> {
  const { project, assets, outputPath, onProgress } = opts;
  const resolution = opts.resolution ?? '1080p';
  const quality = opts.quality ?? 'balanced';
  const { crf, preset } = QUALITY_MAP[quality] ?? QUALITY_MAP['balanced']!;
  const aspectRatio = project.aspectRatio ?? '9:16';
  const { w, h } = resolveSize(resolution, aspectRatio);
  const fps = project.fps ?? 30;

  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'gobs-export-'));
  const log = (pct: number, msg: string) => {
    console.log(`[ffmpeg-export] ${pct}% ${msg}`);
    onProgress?.(pct, msg);
  };

  try {
    // ── Step 1: 截取每个视频片段 ────────────────────────────────────────────
    const vTrack = project.tracks.find((t) => t.type === 'video');
    const videoClips = ((vTrack?.clips ?? []) as VideoClip[]).sort(
      (a, b) => a.timelineStart - b.timelineStart,
    );
    const totalDur = project.durationSec ?? 0;

    const segmentPaths: string[] = [];
    for (let i = 0; i < videoClips.length; i++) {
      const vc = videoClips[i]!;
      const src = assets[vc.assetId];
      if (!src || !fs.existsSync(src)) {
        throw new Error(`素材文件不存在: assetId=${vc.assetId}`);
      }
      const segPath = path.join(tmpDir, `seg_${i}.mp4`);
      const speed = Math.min(4, Math.max(0.25, vc.speed ?? 1));
      const volPct = Math.min(200, Math.max(0, vc.volume ?? 100)) / 100;

      // setpts 调速，atempo 调音速（atempo 限 0.5–2，多段链接）
      const vFilter = `setpts=${(1 / speed).toFixed(4)}*PTS,scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2,fps=${fps}`;
      let aFilter = `volume=${volPct.toFixed(3)}`;
      if (speed !== 1) {
        // atempo 每段限 0.5~2，多段串联
        const atempos = buildAtempoChain(speed);
        aFilter += `,${atempos}`;
      }

      const segArgs = [
        '-y',
        '-ss', String(vc.sourceStart),
        '-to', String(vc.sourceEnd),
        '-i', src,
        '-vf', vFilter,
        '-af', aFilter,
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-crf', String(crf),
        '-preset', preset,
        '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart',
        segPath,
      ];
      await runFfmpeg(segArgs);
      segmentPaths.push(segPath);
      log(Math.round(10 + (i / videoClips.length) * 40), `处理片段 ${i + 1}/${videoClips.length}`);
    }

    // ── Step 2: 拼接片段（支持 crossfade xfade 转场）
    log(55, '拼接片段…');

    const XFADE_DUR = 0.5;
    const segDurs = videoClips.map((vc) => (vc.sourceEnd - vc.sourceStart) / (vc.speed ?? 1));
    const hasCrossfade = videoClips.some((vc, i) => i < videoClips.length - 1 && vc.transitionAfter === 'crossfade');

    // Build the list of pieces: either original segments or xfaded pairs
    let pieces: string[];
    if (!hasCrossfade || segmentPaths.length < 2) {
      pieces = segmentPaths;
    } else {
      pieces = [];
      let i = 0;
      while (i < segmentPaths.length) {
        const durA = segDurs[i] ?? 0;
        const durB = i + 1 < segDurs.length ? (segDurs[i + 1] ?? 0) : 0;
        const wantXfade = i < segmentPaths.length - 1 && videoClips[i]!.transitionAfter === 'crossfade';
        const canXfade = wantXfade && durA > XFADE_DUR * 2 && durB > XFADE_DUR * 2;

        if (canXfade) {
          const crossPath = path.join(tmpDir, `xfade_${i}.mp4`);
          const offset = (durA - XFADE_DUR).toFixed(3);
          await runFfmpeg([
            '-y',
            '-i', segmentPaths[i]!,
            '-i', segmentPaths[i + 1]!,
            '-filter_complex',
            `[0:v][1:v]xfade=transition=fade:duration=${XFADE_DUR}:offset=${offset}[v];[0:a][1:a]acrossfade=d=${XFADE_DUR}[a]`,
            '-map', '[v]',
            '-map', '[a]',
            '-c:v', 'libx264',
            '-c:a', 'aac',
            '-crf', String(crf),
            '-preset', preset,
            '-pix_fmt', 'yuv420p',
            crossPath,
          ]);
          pieces.push(crossPath);
          i += 2; // both segments consumed
        } else {
          // cut (or crossfade degraded due to insufficient duration)
          pieces.push(segmentPaths[i]!);
          i += 1;
        }
      }
    }

    const concatListPath = path.join(tmpDir, 'concat.txt');
    const concatLines = pieces.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join('\n');
    await fs.promises.writeFile(concatListPath, concatLines, 'utf8');

    const concatPath = path.join(tmpDir, 'concat.mp4');
    await runFfmpeg([
      '-y',
      '-f', 'concat',
      '-safe', '0',
      '-i', concatListPath,
      '-c:v', 'libx264',
      '-c:a', 'aac',
      '-crf', String(crf),
      '-preset', preset,
      '-pix_fmt', 'yuv420p',
      concatPath,
    ]);

    // ── Step 3: 混入 BGM ─────────────────────────────────────────────────────
    log(65, '混入 BGM…');
    const bgmTrack = project.tracks.find((t) => t.type === 'audio' && (t.id === 'a2' || t.id === 'bgm'));
    const bgmClip = bgmTrack
      ? ((bgmTrack.clips ?? []) as AudioClip[])[0]
      : null;
    const bgmSrc = bgmClip ? assets[bgmClip.assetId] : null;

    const sourceVol = (project.mix?.sourceAudio ?? 1);
    const bgmVol    = (project.mix?.bgm ?? 0.4);
    const fadeOut   = project.mix?.bgmFadeOut ?? 2;
    const fadeIn    = project.mix?.bgmFadeIn  ?? 1;

    let mixedPath = concatPath;
    if (bgmSrc && fs.existsSync(bgmSrc)) {
      mixedPath = path.join(tmpDir, 'mixed.mp4');
      const bgmSs = bgmClip?.sourceStart ?? 0;
      // Build BGM audio chain with optional fade-in/out
      let bgmChain = `volume=${bgmVol}`;
      if (fadeIn > 0) bgmChain += `,afade=t=in:st=0:d=${fadeIn}`;
      if (fadeOut > 0 && totalDur > fadeOut) bgmChain += `,afade=t=out:st=${(totalDur - fadeOut).toFixed(3)}:d=${fadeOut}`;
      await runFfmpeg([
        '-y',
        '-i', concatPath,
        '-ss', String(bgmSs),
        '-i', bgmSrc,
        '-filter_complex',
        `[0:a]volume=${sourceVol}[a0];[1:a]${bgmChain}[a1];[a0][a1]amix=inputs=2:duration=first:normalize=0[aout]`,
        '-map', '0:v',
        '-map', '[aout]',
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-shortest',
        mixedPath,
      ]);
    }

    // ── Step 4: 烧录文字/字幕 ────────────────────────────────────────────────
    log(78, '烧录文字版式…');
    const textTrack = project.tracks.find((t) => t.type === 'text');
    const textClips = ((textTrack?.clips ?? []) as TextClip[]);
    const subtitleCues = project.subtitles ?? [];

    const drawtextFilters: string[] = [];

    // 文字版式
    for (const tc of textClips) {
      drawtextFilters.push(textClipToDrawtext({
        text: tc.text,
        startSec: tc.timelineStart,
        endSec: tc.timelineEnd,
        w, h,
        presetId: tc.presetId,
      }));
      if (tc.subtext) {
        drawtextFilters.push(textClipToDrawtext({
          text: tc.subtext,
          startSec: tc.timelineStart,
          endSec: tc.timelineEnd,
          w, h,
          presetId: `${tc.presetId}__sub`,
        }));
      }
    }

    // SubtitleCue（现有字幕系统）
    for (const cue of subtitleCues) {
      drawtextFilters.push(textClipToDrawtext({
        text: cue.text,
        startSec: cue.startSec,
        endSec: cue.endSec,
        w, h,
        presetId: 'sub-bottom',
      }));
    }

    let finalPath = mixedPath;
    if (drawtextFilters.length > 0) {
      finalPath = path.join(tmpDir, 'final.mp4');
      const vf = drawtextFilters.join(',');
      await runFfmpeg([
        '-y',
        '-i', mixedPath,
        '-vf', vf,
        '-c:v', 'libx264',
        '-c:a', 'copy',
        '-crf', String(crf),
        '-preset', preset,
        '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart',
        finalPath,
      ]);
    }

    // ── Step 5: 输出 ─────────────────────────────────────────────────────────
    log(95, '写出最终文件…');
    await fs.promises.copyFile(finalPath, outputPath);
    log(100, '导出完成');

  } finally {
    // 清理临时目录
    fs.rm(tmpDir, { recursive: true, force: true }, () => {});
  }
}

// ─── 辅助：atempo 链（speed 超出 0.5–2 时多段串联）──────────────────────────

function buildAtempoChain(speed: number): string {
  const parts: string[] = [];
  let remaining = speed;
  while (remaining > 2) {
    parts.push('atempo=2.0');
    remaining /= 2;
  }
  while (remaining < 0.5) {
    parts.push('atempo=0.5');
    remaining /= 0.5;
  }
  parts.push(`atempo=${remaining.toFixed(4)}`);
  return parts.join(',');
}

// ─── 辅助：运行 ffmpeg 子进程 ─────────────────────────────────────────────────

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const bin = getFfmpegPath();
    const proc = spawn(bin, args, { windowsHide: true });
    let errOut = '';
    proc.stderr.on('data', (c: Buffer) => { errOut += c.toString(); });
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg 退出码 ${code}: ${errOut.slice(-800)}`));
    });
    proc.on('error', reject);
  });
}
