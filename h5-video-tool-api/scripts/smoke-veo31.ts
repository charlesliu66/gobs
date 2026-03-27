/**
 * 鉴权通过后：用 veo-3.1-generate-001 跑一次完整文生视频并写入 output/
 * 用法: npx tsx scripts/smoke-veo31.ts
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { generateVideoWithPython } from '../src/services/veoPython.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

async function main() {
  const outDir = path.resolve(__dirname, '..', 'output');
  await fs.promises.mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, `veo31_smoke_${Date.now()}.mp4`);

  console.log('模型: veo-3.1-generate-001（KEY2）\n开始生成，请等待轮询…\n');

  const { taskId, videoUrl } = await generateVideoWithPython({
    prompt:
      'A cinematic close-up of a red apple on a wooden table, soft morning window light, slow gentle push-in, shallow depth of field, subtle film grain, 8K.',
    aspectRatio: '16:9',
    duration: 8,
    resolution: '720p',
    model: 'veo-3.1-generate-001',
  });

  const b64 = videoUrl.replace(/^data:video\/\w+;base64,/, '');
  await fs.promises.writeFile(outPath, Buffer.from(b64, 'base64'));

  console.log('taskId:', taskId);
  console.log('已保存:', outPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
