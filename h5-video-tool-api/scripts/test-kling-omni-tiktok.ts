/**
 * 本地试跑：TikTok 分享页 + 双参考图 + prompt → 可灵 Omni → 保存 MP4 到 output/
 *
 * 前置：
 *   - .env：KLING_API_KEY、KLING_API_BASE_URL（如 clipai.ingarena.net）
 *   - **API_PUBLIC_BASE_URL**（或 H5_PUBLIC_API_BASE_URL）：可灵能访问的本 API 根地址，供拉取 /api/video/kling/ref-cache/…（参考视频仅支持 URL）
 *   - 本机已安装 yt-dlp（py -m pip install -U yt-dlp）
 *
 * 用法：
 *   npx tsx scripts/test-kling-omni-tiktok.ts "tiktok-url" "img1" "img2" "prompt..."
 *   第三张图（可选）：若第 5 个参数为存在的图片路径，则视为 img3，其后为 prompt。
 *   KLING_TEST_DURATION=5|10|15
 *
 * 或用环境变量：KLING_TEST_TIKTOK / KLING_TEST_IMG1 / KLING_TEST_IMG2 / KLING_TEST_IMG3 / KLING_TEST_PROMPT
 */
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { generateKlingVideo } from '../src/services/klingVideo.js';
import { getPublicApiBaseUrlForKlingRef } from '../src/config/publicApiBase.js';
import { prepareSocialVideoUrlForKling } from '../src/services/tiktokResolveVideoUrl.js';

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
  const tiktok =
    process.argv[2]?.trim() || process.env.KLING_TEST_TIKTOK?.trim() || '';
  const img1 = process.argv[3]?.trim() || process.env.KLING_TEST_IMG1?.trim() || '';
  const img2 = process.argv[4]?.trim() || process.env.KLING_TEST_IMG2?.trim() || '';
  const maybeImg3 = process.argv[5]?.trim();
  const fromEnv3 = process.env.KLING_TEST_IMG3?.trim();
  let img3: string | undefined = fromEnv3;
  let promptStart = 5;
  if (!img3 && maybeImg3 && /\.(png|jpe?g|webp)$/i.test(maybeImg3) && fs.existsSync(maybeImg3)) {
    img3 = maybeImg3;
    promptStart = 6;
  }
  const prompt =
    process.argv.slice(promptStart).join(' ').trim() || process.env.KLING_TEST_PROMPT?.trim() || '';

  if (!tiktok || !img1 || !img2 || !prompt) {
    console.error(`
缺少参数。示例：
  npx tsx scripts/test-kling-omni-tiktok.ts "https://..." "a.png" "b.jpg" "prompt…"
  npx tsx scripts/test-kling-omni-tiktok.ts "https://..." "a.png" "b.jpg" "c.png" "prompt…（<<<image_1>>>…<<<image_3>>>）"

或设置环境变量 KLING_TEST_TIKTOK / KLING_TEST_IMG1 / KLING_TEST_IMG2 / KLING_TEST_IMG3? / KLING_TEST_PROMPT
`);
    process.exit(1);
  }

  for (const p of [img1, img2, ...(img3 ? [img3] : [])]) {
    if (!fs.existsSync(p)) {
      console.error('图片不存在:', p);
      process.exit(1);
    }
  }

  const base = getPublicApiBaseUrlForKlingRef();
  if (!base) {
    console.error(
      '请在 .env 设置 API_PUBLIC_BASE_URL / H5_PUBLIC_API_BASE_URL（与 H5 的 VITE_API_BASE_URL 同源），' +
        '为可灵可访问的本 API 根地址；参考视频仅支持 http(s) URL。',
    );
    process.exit(1);
  }

  console.log('1/3 下载 TikTok 到本地并生成可灵 video_list 用 video_url…');
  const videoUrl = await prepareSocialVideoUrlForKling(tiktok);
  console.log('   video_url:', videoUrl);

  const b1 = fs.readFileSync(img1).toString('base64');
  const b2 = fs.readFileSync(img2).toString('base64');
  const b3 = img3 ? fs.readFileSync(img3).toString('base64') : null;

  const model = process.env.KLING_TEST_MODEL?.trim() || 'kling-v3-omni';
  const durationRaw = parseInt(process.env.KLING_TEST_DURATION || '5', 10) || 5;
  const duration = durationRaw <= 5 ? 5 : durationRaw <= 10 ? 10 : 15;

  console.log('2/3 调用可灵 Omni（model=%s, duration=%ds）…', model, duration);
  console.log('   Prompt:', prompt.slice(0, 200) + (prompt.length > 200 ? '…' : ''));

  const imageList = [
    { imageBase64: b1, imageMimeType: mimeFromPath(img1) },
    { imageBase64: b2, imageMimeType: mimeFromPath(img2) },
    ...(b3 && img3 ? [{ imageBase64: b3, imageMimeType: mimeFromPath(img3) }] : []),
  ];

  const { taskId, videoUrl: resultDataUrl } = await generateKlingVideo({
    prompt,
    model,
    duration,
    aspectRatio: '16:9',
    imageList,
    videoList: [
      {
        videoUrl,
        referType: 'feature',
        keepOriginalSound: 'no',
      },
    ],
  });

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outFile = path.join(OUT_DIR, `kling-omni-tiktok_${Date.now()}.mp4`);
  const raw = resultDataUrl.replace(/^data:video\/\w+;base64,/, '');
  fs.writeFileSync(outFile, Buffer.from(raw, 'base64'));

  console.log('3/3 完成 taskId:', taskId);
  console.log('已保存:', outFile);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
