/**
 * 本地可灵试跑：读本地 PNG → generateKlingVideo → 写入 output/
 * 用法：npx tsx scripts/test-kling-local.ts [图片路径]
 */
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { generateKlingVideo } from '../src/services/klingVideo.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const DEFAULT_IMAGE =
  process.env.KLING_TEST_IMAGE ||
  String.raw`C:\Users\wei.liu\Desktop\cursor_try\Ai test\1\浪人.png`;

async function main() {
  const imgPath = process.argv[2] || DEFAULT_IMAGE;
  if (!fs.existsSync(imgPath)) {
    console.error('图片不存在:', imgPath);
    process.exit(1);
  }
  const buf = fs.readFileSync(imgPath);
  const b64 = buf.toString('base64');
  const mime = 'image/png';

  const prompt =
    '浪人<<<image_1>>>持刀疾行，古风场景，动感，电影感 cinematic';

  console.log('Base URL:', process.env.KLING_API_BASE_URL || '(default)');
  console.log('Model: kling-v3-omni, duration: 5s');
  console.log('Prompt:', prompt);
  console.log('生成中（可能需要数分钟）…');

  const { taskId, videoUrl } = await generateKlingVideo({
    prompt,
    model: 'kling-v3-omni',
    duration: 5,
    aspectRatio: '16:9',
    imageList: [{ imageBase64: b64, imageMimeType: mime }],
  });

  const outDir = path.resolve(__dirname, '..', 'output');
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `kling-test-浪人_${Date.now()}.mp4`);
  const raw = videoUrl.replace(/^data:video\/\w+;base64,/, '');
  fs.writeFileSync(outFile, Buffer.from(raw, 'base64'));

  console.log('完成 taskId:', taskId);
  console.log('已保存:', outFile);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
