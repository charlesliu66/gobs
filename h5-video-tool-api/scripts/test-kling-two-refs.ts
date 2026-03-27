/**
 * 双参考图本地试跑：浪人 + 怪物 → kling-v3-omni 5s → 写入 output/
 */
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { generateKlingVideo } from '../src/services/klingVideo.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const OUT_DIR =
  process.env.KLING_TEST_OUTPUT_DIR ||
  path.resolve(__dirname, '..', 'output');

const IMG1 = String.raw`C:\Users\wei.liu\Desktop\cursor_try\Ai test\1\浪人.png`;
const IMG2 = String.raw`C:\Users\wei.liu\Desktop\cursor_try\Ai test\1\怪物.jpg`;

async function main() {
  for (const p of [IMG1, IMG2]) {
    if (!fs.existsSync(p)) {
      console.error('图片不存在:', p);
      process.exit(1);
    }
  }

  const b1 = fs.readFileSync(IMG1).toString('base64');
  const b2 = fs.readFileSync(IMG2).toString('base64');

  const prompt =
    '浪人<<<image_1>>>打怪物<<<image_2>>>，动作激烈，古风场景，电影感 cinematic';

  console.log('Base URL:', process.env.KLING_API_BASE_URL || '(default)');
  console.log('Model: kling-v3-omni, duration: 5s');
  console.log('Prompt:', prompt);
  console.log('Refs: 浪人.png, 怪物.jpg');
  console.log('输出目录:', OUT_DIR);
  console.log('生成中（可能需要数分钟）…');

  const { taskId, videoUrl } = await generateKlingVideo({
    prompt,
    model: 'kling-v3-omni',
    duration: 5,
    aspectRatio: '16:9',
    imageList: [
      { imageBase64: b1, imageMimeType: 'image/png' },
      { imageBase64: b2, imageMimeType: 'image/jpeg' },
    ],
  });

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outFile = path.join(OUT_DIR, `kling-浪人打怪物_${Date.now()}.mp4`);
  const raw = videoUrl.replace(/^data:video\/\w+;base64,/, '');
  fs.writeFileSync(outFile, Buffer.from(raw, 'base64'));

  console.log('完成 taskId:', taskId);
  console.log('已保存:', outFile);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
