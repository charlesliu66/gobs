/**
 * 本地试跑 Lyria：读 .env 的 COMPASS_API_KEY，生成一段高燃器乐 WAV（单段约 32.8s）。
 * 用法：npx tsx scripts/try-lyria-generate.ts
 */
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateLyriaInstrumentalWavs, LYRIA_CLIP_DURATION_SEC } from '../src/services/compassLyriaMusic.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

async function main() {
  const prompt =
    process.argv.slice(2).join(' ') ||
    'Intense high-energy battle music, pounding drums, aggressive brass and strings, fast tempo, epic cinematic trailer feel, instrumental only, no vocals';

  console.info('Lyria prompt:', prompt.slice(0, 120) + (prompt.length > 120 ? '…' : ''));
  console.info('期望单段时长约', LYRIA_CLIP_DURATION_SEC, 's（官方约 32.8s，接近你要的 30s）');

  const buffers = await generateLyriaInstrumentalWavs({
    prompt,
    negative_prompt: 'calm, slow, ambient, relaxing, vocals, singing',
    sampleCount: 1,
  });

  const dir = path.join(process.cwd(), 'uploads', 'editor', 'music');
  fs.mkdirSync(dir, { recursive: true });
  const out = path.join(dir, `lyria_high_energy_${Date.now()}.wav`);
  fs.writeFileSync(out, buffers[0]!);
  console.info('已保存:', out);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
