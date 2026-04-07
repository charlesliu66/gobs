/**
 * 可灵 Omni 试跑：参考视频（动作 URL）+ 双参考图（外形）
 *
 * 参考视频须为可灵能拉取的 **http(s) URL**（不支持 base64）。
 *
 * 环境（.env）：
 *   KLING_API_KEY / KLING_API_BASE_URL
 *   **API_PUBLIC_BASE_URL** = 本 API 对外根地址（无尾斜杠，如 https://xxx.ngrok-free.app），
 *   脚本会把本地 MP4 拷到 output/kling-ref-cache/<uuid>.mp4，并提交
 *   `API_PUBLIC_BASE_URL/api/video/kling/ref-cache/<uuid>` 给可灵。
 *
 * 运行前请 **先启动** h5-video-tool-api，且公网/ngrok 地址与 API_PUBLIC_BASE_URL 一致。
 *
 * 运行：cd h5-video-tool-api && npx tsx scripts/test-kling-motion-ref-two-images.ts
 *
 * 参考视频默认用同目录 *_10s.mp4（ingarena 要求参考片时长 ≤10s）。完整长片请自行裁切后再设 KLING_TEST_REF_VIDEO。
 */
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { generateKlingVideo } from '../src/services/klingVideo.js';
import { KLING_REF_CACHE_DIR } from '../src/services/tiktokResolveVideoUrl.js';
import { getPublicApiBaseUrlForKlingRef } from '../src/config/publicApiBase.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const OUT_DIR =
  process.env.KLING_TEST_OUTPUT_DIR || path.resolve(__dirname, '..', 'output');

const REF_VIDEO =
  process.env.KLING_TEST_REF_VIDEO?.trim() ||
  String.raw`C:\Users\wei.liu\Desktop\cursor_try\QAS\tiktok_downloads\l_xmm54_7592872568093347079_10s.mp4`;
const IMG_PRIEST =
  process.env.KLING_TEST_IMG1?.trim() ||
  String.raw`C:\Users\wei.liu\Desktop\cursor_try\GNG Assets Library\Gold And Glory_Characters\祭司.png`;
const IMG_RONIN =
  process.env.KLING_TEST_IMG2?.trim() ||
  String.raw`C:\Users\wei.liu\Desktop\cursor_try\GNG Assets Library\Gold And Glory_Characters\浪人.png`;

/** 本地 MP4 → ref-cache → 返回 https?://.../api/video/kling/ref-cache/:id */
async function prepareLocalRefVideoAsUrl(absVideoPath: string): Promise<string> {
  if (!fs.existsSync(absVideoPath)) {
    throw new Error(`参考视频不存在: ${absVideoPath}`);
  }
  const base = getPublicApiBaseUrlForKlingRef();
  if (!base) {
    throw new Error(
      '参考视频仅支持 URL。请在 .env 设置 API_PUBLIC_BASE_URL（或 H5_PUBLIC_API_BASE_URL / KLING_REF_VIDEO_PUBLIC_BASE）为 **可灵能访问的** 本 API 根地址（无尾斜杠），并确保本服务已启动。',
    );
  }

  await fs.promises.mkdir(KLING_REF_CACHE_DIR, { recursive: true });
  const id = randomUUID();
  const dest = path.join(KLING_REF_CACHE_DIR, `${id}.mp4`);
  await fs.promises.copyFile(absVideoPath, dest);
  const url = `${base}/api/video/kling/ref-cache/${id}`;
  console.log('参考视频已注册 ref-cache，可灵将拉取:', url);
  return url;
}

async function main() {
  for (const p of [REF_VIDEO, IMG_PRIEST, IMG_RONIN]) {
    if (!fs.existsSync(p)) {
      console.error('文件不存在:', p);
      process.exit(1);
    }
  }

  const bPriest = fs.readFileSync(IMG_PRIEST).toString('base64');
  const bRonin = fs.readFileSync(IMG_RONIN).toString('base64');

  const prompt =
    '参考使用【@视频】中两个人物的动作。【图片1】祭司角色<<<image_1>>>参考视频中画面右侧人物的动作；【图片2】浪人角色<<<image_2>>>参考视频中画面左侧人物的动作。' +
    '注意只参考视频动作，外形和面部特征均保持与对应参考图一致，不要采用视频中人物的长相。竖屏 9:16，电影感光影。';

  const videoUrlForKling = await prepareLocalRefVideoAsUrl(REF_VIDEO);

  console.log('Base URL:', process.env.KLING_API_BASE_URL || '(default)');
  console.log('Model: kling-v3-omni, aspect: 9:16, duration: 10s');
  console.log('Prompt: @视频双人动作；图1祭司→画面右侧动作；图2浪人→画面左侧；外形仅跟参考图');
  console.log('输出目录:', OUT_DIR);
  console.log('生成中（可能数分钟）…');

  const { taskId, videoUrl } = await generateKlingVideo({
    prompt,
    model: 'kling-v3-omni',
    duration: 10,
    aspectRatio: '9:16',
    imageList: [
      { imageBase64: bPriest, imageMimeType: 'image/png' },
      { imageBase64: bRonin, imageMimeType: 'image/png' },
    ],
    videoList: [
      {
        videoUrl: videoUrlForKling,
        referType: 'feature',
        keepOriginalSound: 'no',
      },
    ],
  });

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outFile = path.join(OUT_DIR, `kling-motion-ref-9x16-10s_${Date.now()}.mp4`);
  const raw = videoUrl.replace(/^data:video\/\w+;base64,/, '');
  fs.writeFileSync(outFile, Buffer.from(raw, 'base64'));

  console.log('完成 taskId:', taskId);
  console.log('已保存:', outFile);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
