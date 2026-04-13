import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { getApiDataDir, getDefaultVideoOutputDir } from '../config/apiDataDir.js';
import { sanitizeUsername } from '../utils/safeUsername.js';

const OUTPUT_DIR = getDefaultVideoOutputDir();

/** data: 视频（MIME 含连字符等也需匹配）；https 则拉取字节 */
export function bufferFromDataVideoUrl(raw: string): Buffer | null {
  const m = String(raw).trim().match(/^data:video\/[^;]+;base64,(.*)$/s);
  if (!m?.[1]) return null;
  try {
    const b = Buffer.from(m[1], 'base64');
    return b.length ? b : null;
  } catch {
    return null;
  }
}

export async function bufferFromVideoUrlPayload(videoUrl: string): Promise<Buffer | null> {
  const t = String(videoUrl).trim();
  if (!t) return null;
  const dataBuf = bufferFromDataVideoUrl(t);
  if (dataBuf) return dataBuf;
  if (/^https?:\/\//i.test(t)) {
    try {
      const r = await axios.get(t, {
        responseType: 'arraybuffer',
        timeout: 300_000,
        maxContentLength: 512 * 1024 * 1024,
        validateStatus: (s) => s >= 200 && s < 300,
      });
      const buf = Buffer.from(r.data as ArrayBuffer);
      return buf.length ? buf : null;
    } catch (e) {
      console.warn('[video] 拉取 https 成片失败', e);
      return null;
    }
  }
  return null;
}

/** 供 GET /api/video/file 使用：优先相对 API_DATA_DIR 的 output/... */
export function clientVideoPathFromSavePath(savePath: string): string {
  const abs = path.resolve(savePath);
  const apiRoot = path.resolve(getApiDataDir());
  const outRoot = path.resolve(OUTPUT_DIR);
  if (abs === outRoot || abs.startsWith(outRoot + path.sep)) {
    const rel = path.relative(apiRoot, abs);
    if (rel && !rel.startsWith('..') && !path.isAbsolute(rel)) {
      return rel.replace(/\\/g, '/');
    }
  }
  return abs.replace(/\\/g, '/');
}

/** 将即梦/Veo 返回的 videoUrl 落盘到 OUTPUT_DIR，失败返回 undefined */
export async function persistVideoUrlToOutput(
  videoUrl: string,
  filenameSlug: string,
  username?: string,
): Promise<string | undefined> {
  const buf = await bufferFromVideoUrlPayload(videoUrl);
  if (!buf?.length) {
    console.warn('[video] 成片字节为空或无法解析 videoUrl（需 data:video/*;base64 或可访问的 https）');
    return undefined;
  }
  try {
    const userDir = path.join(OUTPUT_DIR, sanitizeUsername(username));
    await fs.mkdir(userDir, { recursive: true });
    const safe = filenameSlug.replace(/[^\w.\-\u4e00-\u9fff]+/g, '_').slice(0, 120) || 'video';
    const filename = `${safe}_${Date.now()}.mp4`;
    const savePath = path.join(userDir, filename);
    await fs.writeFile(savePath, buf);
    return clientVideoPathFromSavePath(savePath);
  } catch (e) {
    console.warn('[video] 保存到 output/ 失败', e);
    return undefined;
  }
}

