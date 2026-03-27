/**
 * 使用「已存在于 output/kling-ref-cache/{uuid}.mp4」的参考视频，拼公司与 H5 同源的公网 URL，调用可灵 Omni（不再下载 TikTok）。
 *
 * 前置：
 *   - .env：KLING_API_KEY、KLING_API_BASE_URL
 *   - .env：API_PUBLIC_BASE_URL（或 H5_PUBLIC_API_BASE_URL）= 公司部署的本 API 根（与 H5 的 VITE_API_BASE_URL 一致，无尾斜杠）
 *   - **重要**：ingarena 会 GET `{API_PUBLIC_BASE_URL}/api/video/kling/ref-cache/{uuid}`。
 *     若 API 跑在远端，请把本机 `output/kling-ref-cache/{uuid}.mp4` **同步到服务器相同路径**，否则平台拉不到文件。
 *
 * 用法：
 *   npx tsx scripts/test-kling-omni-ref-cache-only.ts <cacheId-uuid> <img1> <img2> <img3> "<prompt>"
 *
 * 环境变量：KLING_TEST_DURATION=15、KLING_TEST_OUTPUT_DIR
 */
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { generateKlingVideo } from '../src/services/klingVideo.js';
import { getPublicApiBaseUrlForKlingRef } from '../src/config/publicApiBase.js';
import { KLING_REF_CACHE_DIR } from '../src/services/tiktokResolveVideoUrl.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const OUT_DIR =
  process.env.KLING_TEST_OUTPUT_DIR || path.resolve(__dirname, '..', 'output');

function mimeFromPath(p: string): string {
  const ext = path.extname(p).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  return 'image/png';
}

async function main() {
  const cacheId =
    process.argv[2]?.trim() || process.env.KLING_REF_CACHE_ID?.trim() || '';
  const img1 = process.argv[3]?.trim() || process.env.KLING_TEST_IMG1?.trim() || '';
  const img2 = process.argv[4]?.trim() || process.env.KLING_TEST_IMG2?.trim() || '';
  const img3 = process.argv[5]?.trim() || process.env.KLING_TEST_IMG3?.trim() || '';
  const prompt =
    process.argv.slice(6).join(' ').trim() || process.env.KLING_TEST_PROMPT?.trim() || '';

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cacheId)) {
    console.error('请提供合法 cacheId（UUID），例如：9aad07e8-ca4f-4bbe-bf5e-1e4d69122e45');
    process.exit(1);
  }
  if (!img1 || !img2 || !img3 || !prompt) {
    console.error(
      '用法: npx tsx scripts/test-kling-omni-ref-cache-only.ts <cacheId> <img1> <img2> <img3> "<prompt>"',
    );
    process.exit(1);
  }

  const base = getPublicApiBaseUrlForKlingRef();
  if (!base) {
    console.error(
      '请在 .env 设置 API_PUBLIC_BASE_URL 或 H5_PUBLIC_API_BASE_URL（与公司部署、H5 的 VITE_API_BASE_URL 同源）。',
    );
    process.exit(1);
  }

  const localMp4 = path.join(KLING_REF_CACHE_DIR, `${cacheId}.mp4`);
  let exists: string | null = fs.existsSync(localMp4) ? localMp4 : null;
  if (!exists && fs.existsSync(KLING_REF_CACHE_DIR)) {
    const alt = fs.readdirSync(KLING_REF_CACHE_DIR).find((f) => f.startsWith(`${cacheId}.`));
    if (alt) exists = path.join(KLING_REF_CACHE_DIR, alt);
  }
  if (!exists) {
    console.warn('警告：本地未找到 kling-ref-cache 下该 uuid 文件；ingarena 若走公司 API，请把同名 mp4 放到服务器 output/kling-ref-cache/。');
  } else {
    console.log('本地参考视频:', exists);
  }

  const videoUrl = `${base}/api/video/kling/ref-cache/${cacheId}`;
  console.log('video_url（供 ingarena 拉取）:', videoUrl);

  for (const p of [img1, img2, img3]) {
    if (!fs.existsSync(p)) {
      console.error('图片不存在:', p);
      process.exit(1);
    }
  }

  const b1 = fs.readFileSync(img1).toString('base64');
  const b2 = fs.readFileSync(img2).toString('base64');
  const b3 = fs.readFileSync(img3).toString('base64');

  const model = process.env.KLING_TEST_MODEL?.trim() || 'kling-v3-omni';
  const durationRaw = parseInt(process.env.KLING_TEST_DURATION || '15', 10) || 15;
  const duration = durationRaw <= 5 ? 5 : durationRaw <= 10 ? 10 : 15;

  console.log('调用可灵 Omni（model=%s, duration=%ds）…', model, duration);

  const { taskId, videoUrl: resultDataUrl } = await generateKlingVideo({
    prompt,
    model,
    duration,
    aspectRatio: '16:9',
    imageList: [
      { imageBase64: b1, imageMimeType: mimeFromPath(img1) },
      { imageBase64: b2, imageMimeType: mimeFromPath(img2) },
      { imageBase64: b3, imageMimeType: mimeFromPath(img3) },
    ],
    videoList: [{ videoUrl, referType: 'feature', keepOriginalSound: 'no' }],
  });

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outFile = path.join(OUT_DIR, `kling-omni-refcache_${Date.now()}.mp4`);
  const raw = resultDataUrl.replace(/^data:video\/\w+;base64,/, '');
  fs.writeFileSync(outFile, Buffer.from(raw, 'base64'));

  console.log('完成 taskId:', taskId);
  console.log('已保存:', outFile);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
