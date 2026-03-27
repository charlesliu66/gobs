/**
 * TikTok / 抖音分享页 → 可灵 Omni `video_list` 可用 URL。
 *
 * 仅用 `yt-dlp -g` 得到的 TikTok CDN 直链，可灵服务端常无法拉取（签名/地域）→ DatabaseError。
 * 正确做法：用 yt-dlp **下载**到本地，再二选一：
 *   - clipai.ingarena：设 KLING_SOCIAL_REF_VIDEO_USE_BASE64=1，将文件读成纯 base64 写入 video_list（无需公网 URL）
 *   - 其它网关：通过 API_PUBLIC_BASE_URL 暴露公网可访问的稳定 URL
 *
 * 环境变量：
 *   YT_DLP_PATH / YT_DLP_PROXY / YT_DLP_TIMEOUT_MS
 *   KLING_SOCIAL_REF_VIDEO_USE_BASE64=1  且 KLING_API_BASE_URL 为 ingarena 时，参考视频走 base64（本地试跑）
 *   API_PUBLIC_BASE_URL  本服务对外的根地址（无尾斜杠），如 https://abc.ngrok-free.app
 *   KLING_REF_VIDEO_PUBLIC_BASE  与上一项二选一
 *   VIDEO_OUTPUT_DIR  缓存目录父路径，默认项目下 output/
 *   H5_PUBLIC_API_BASE_URL  与 H5 的 VITE_API_BASE_URL 一致时可设，用于拼 ref-cache 完整 URL
 */
import { randomUUID } from 'crypto';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { getPublicApiBaseUrlForKlingRef } from '../config/publicApiBase.js';

const TIMEOUT_MS = Math.max(30000, parseInt(process.env.YT_DLP_TIMEOUT_MS || '120000', 10) || 120000);
const DOWNLOAD_TIMEOUT_MS = Math.max(TIMEOUT_MS, parseInt(process.env.YT_DLP_DOWNLOAD_TIMEOUT_MS || '300000', 10) || 300000);

const OUTPUT_DIR = process.env.VIDEO_OUTPUT_DIR || path.resolve(process.cwd(), 'output');

/** 可灵参考视频缓存目录（供 GET /api/video/kling/ref-cache/:id） */
export const KLING_REF_CACHE_DIR = path.join(OUTPUT_DIR, 'kling-ref-cache');

function ytDlpBinary(): string {
  return (process.env.YT_DLP_PATH || 'yt-dlp').trim();
}

/** 是否适合用 yt-dlp 从「分享页」处理 */
export function isResolvableSocialVideoPageUrl(urlStr: string): boolean {
  try {
    const h = new URL(urlStr).hostname.toLowerCase();
    if (h === 'tiktok.com' || h.endsWith('.tiktok.com')) return true;
    if (h === 'vm.tiktok.com' || h === 'vt.tiktok.com' || h === 'm.tiktok.com') return true;
    if (h.includes('douyin.com') || h.includes('iesdouyin.com')) return true;
    return false;
  } catch {
    return false;
  }
}

const DEFAULT_HEADERS: string[] = [
  '--add-header',
  'Referer:https://www.tiktok.com/',
  '--add-header',
  'User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
];

function spawnYtDlp(args: string[], timeoutMs: number): Promise<{ stdout: string; stderr: string; code: number | null }> {
  const bin = ytDlpBinary();
  return new Promise((resolve, reject) => {
    const proc = spawn(bin, args, { shell: false, windowsHide: true });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      try {
        proc.kill('SIGTERM');
      } catch {
        /* ignore */
      }
      reject(new Error(`yt-dlp 超时（${timeoutMs / 1000}s）`));
    }, timeoutMs);
    proc.stdout?.on('data', (d: Buffer) => {
      stdout += d.toString();
    });
    proc.stderr?.on('data', (d: Buffer) => {
      stderr += d.toString();
    });
    proc.on('error', (err: NodeJS.ErrnoException) => {
      clearTimeout(timer);
      if (err.code === 'ENOENT') {
        reject(
          new Error(
            '未找到 yt-dlp。请安装：`py -m pip install -U yt-dlp`，或设置 YT_DLP_PATH 指向 yt-dlp.exe。',
          ),
        );
        return;
      }
      reject(err);
    });
    proc.on('close', (code: number | null) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, code });
    });
  });
}

/**
 * 使用 yt-dlp 打印可下载直链（仅调试用；提交可灵请用 prepareSocialVideoUrlForKling）。
 */
export async function resolveSocialPageToDirectVideoUrl(pageUrl: string): Promise<string> {
  const args = [
    '-g',
    '--no-playlist',
    '--no-warnings',
    '-f',
    'best[ext=mp4]/bestvideo+bestaudio/best',
    ...DEFAULT_HEADERS,
    pageUrl,
  ];
  const proxy = process.env.YT_DLP_PROXY?.trim();
  if (proxy) args.unshift('--proxy', proxy);

  const { stdout, stderr, code } = await spawnYtDlp(args, TIMEOUT_MS);
  if (code !== 0) {
    throw new Error(
      `无法解析直链（yt-dlp 退出码 ${code}）。${stderr.trim().slice(0, 400)} 请升级：py -m pip install -U yt-dlp`,
    );
  }
  const direct = stdout
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => /^https?:\/\//i.test(l));
  if (!direct) throw new Error('yt-dlp 未返回有效 http(s) 地址');
  return direct;
}

/** 当前可灵网关是否为 clipai.ingarena（与 klingVideo 判定一致） */
function isIngarenaKlingBase(): boolean {
  const b = (process.env.KLING_API_BASE_URL || '').replace(/\/+$/, '');
  return /ingarena\.net/i.test(b);
}

/**
 * 用 yt-dlp 将分享页视频下载到 kling-ref-cache，返回本地路径与 cacheId。
 */
export async function downloadSocialPageVideoToKlingCache(pageUrl: string): Promise<{ absPath: string; cacheId: string }> {
  const cacheId = randomUUID();
  await fs.mkdir(KLING_REF_CACHE_DIR, { recursive: true });
  const outTemplate = path.join(KLING_REF_CACHE_DIR, `${cacheId}.%(ext)s`);

  const args = [
    '--no-playlist',
    '--no-warnings',
    '-f',
    'best[ext=mp4]/bestvideo+bestaudio/best',
    '-o',
    outTemplate,
    ...DEFAULT_HEADERS,
    pageUrl,
  ];
  const proxy = process.env.YT_DLP_PROXY?.trim();
  if (proxy) args.unshift('--proxy', proxy);

  const { stderr, code } = await spawnYtDlp(args, DOWNLOAD_TIMEOUT_MS);
  if (code !== 0) {
    throw new Error(
      `下载参考视频失败（yt-dlp 退出码 ${code}）。${stderr.trim().slice(0, 500)} 可尝试升级 yt-dlp 或检查 YT_DLP_PROXY。`,
    );
  }

  const entries = await fs.readdir(KLING_REF_CACHE_DIR);
  const match = entries.find((f) => f.startsWith(`${cacheId}.`));
  if (!match) {
    throw new Error('yt-dlp 未在缓存目录生成视频文件');
  }
  const absPath = path.join(KLING_REF_CACHE_DIR, match);
  return { absPath, cacheId };
}

/** 约 30 分钟后删除临时文件 */
export function scheduleRefCacheCleanup(absPath: string): void {
  const delay = Math.max(60000, parseInt(process.env.KLING_REF_CACHE_TTL_MS || '1800000', 10) || 1800000);
  setTimeout(() => {
    fs.unlink(absPath).catch(() => {});
  }, delay);
}

/**
 * 将 TikTok/抖音页面视频下载到本地，并返回可灵 Omni `video_list[].video_url` 可用值：
 * - KLING_SOCIAL_REF_VIDEO_USE_BASE64=1 且网关为 ingarena：返回 **纯 base64**（由 ingarena 与参考图同理内嵌）
 * - 否则：返回 **公网 https**（依赖 API_PUBLIC_BASE_URL + GET /api/video/kling/ref-cache/:id）
 */
export async function prepareSocialVideoUrlForKling(pageUrl: string): Promise<string> {
  if (process.env.KLING_SOCIAL_REF_VIDEO_USE_BASE64 === '1') {
    if (!isIngarenaKlingBase()) {
      throw new Error(
        'KLING_SOCIAL_REF_VIDEO_USE_BASE64=1 仅适用于 KLING_API_BASE_URL 为 clipai.ingarena.net；' +
          '其它网关请配置 API_PUBLIC_BASE_URL，或使用快手官方可灵接口文档中的参考视频传参方式。',
      );
    }
    const { absPath } = await downloadSocialPageVideoToKlingCache(pageUrl);
    try {
      const buf = await fs.readFile(absPath);
      return buf.toString('base64');
    } finally {
      scheduleRefCacheCleanup(absPath);
    }
  }

  const base = getPublicApiBaseUrlForKlingRef();
  if (!base) {
    throw new Error(
      '使用 TikTok/抖音链接时请在 .env 二选一：' +
        '1) KLING_SOCIAL_REF_VIDEO_USE_BASE64=1（仅 clipai.ingarena，易 DatabaseError，不推荐）；' +
        '2) 配置 API_PUBLIC_BASE_URL（或 H5_PUBLIC_API_BASE_URL，与 H5 的 VITE_API_BASE_URL 同一部署根地址，无尾斜杠），' +
        '使 ingarena 能 GET /api/video/kling/ref-cache/…（与 H5 预览用的同源 API）。',
    );
  }

  const { absPath, cacheId } = await downloadSocialPageVideoToKlingCache(pageUrl);
  scheduleRefCacheCleanup(absPath);
  return `${base}/api/video/kling/ref-cache/${cacheId}`;
}

/** 根据 cacheId（UUID）查找已下载的扩展名 */
export async function findRefCacheFile(cacheId: string): Promise<string | null> {
  const safe = cacheId.replace(/[^a-f0-9-]/gi, '');
  if (safe.length < 32) return null;
  try {
    const entries = await fs.readdir(KLING_REF_CACHE_DIR);
    const name = entries.find((f) => f.startsWith(`${safe}.`));
    if (!name) return null;
    return path.join(KLING_REF_CACHE_DIR, name);
  } catch {
    return null;
  }
}
