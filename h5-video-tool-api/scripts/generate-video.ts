/**
 * 本地命令行生成 Compass 视频
 * 用法: npx tsx scripts/generate-video.ts [prompt] [duration] [model]
 * 示例: npx tsx scripts/generate-video.ts "骑士抗剑奔跑" 3
 * 使用 Python SDK（与文档完全一致）: npx tsx scripts/generate-video.ts --python "骑士抗剑奔跑"
 */
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import dotenv from 'dotenv';
import { resolveCompassApiKeyForVeoModel } from '../src/services/compassApiKey.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const usePython = process.argv.includes('--python');
const args = process.argv.filter((a) => a !== '--python');
const prompt = args[2] || '骑士抗剑奔跑';
const duration = parseInt(args[3] || '3', 10) || 3;
const modelOverride = args[4];

async function mainPython() {
  const pyScript = path.resolve(__dirname, 'veo_generate.py');
  return new Promise<void>((resolve, reject) => {
    const env = { ...process.env };
    const effectiveModel = (modelOverride || process.env.COMPASS_VIDEO_MODEL || '').trim();
    env.COMPASS_API_KEY = resolveCompassApiKeyForVeoModel(effectiveModel || undefined);
    if (modelOverride) env.VEO_MODEL = modelOverride;
    const proc = spawn('python', [pyScript, prompt], {
      env,
      stdio: ['ignore', 'pipe', 'inherit'],
    });
    let stdout = '';
    proc.stdout?.on('data', (d) => (stdout += d.toString()));
    proc.on('close', async (code) => {
      if (code !== 0) {
        reject(new Error(`Python 脚本退出码 ${code}`));
        return;
      }
      try {
        const out = JSON.parse(stdout.trim());
        if (!out?.ok || !out.uri) {
          reject(new Error(out?.error || '无视频 URI'));
          return;
        }
        const { default: axios } = await import('axios');
        const res = await axios.get(out.uri, { responseType: 'arraybuffer' });
        const buf = Buffer.from(res.data as ArrayBuffer);
        const outDir = path.resolve(process.cwd(), 'output');
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
        const slug = prompt.slice(0, 20).replace(/[^\w\u4e00-\u9fa5]/g, '_');
        const outPath = path.join(outDir, `${slug}_${Date.now()}.mp4`);
        fs.writeFileSync(outPath, buf);
        console.log(`\n✅ 视频已保存: ${outPath}\n`);
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  });
}

async function main() {
  if (usePython) {
    console.log(`\n🎬 [Python SDK] 正在生成视频: "${prompt}"\n`);
    await mainPython();
    return;
  }
  const { createVideoTask, waitForVideo } = await import('../src/services/compassVideo.js');

  console.log(`\n🎬 正在生成视频: "${prompt}" (${duration}秒)${modelOverride ? ` [model=${modelOverride}]` : ''}\n`);

  const { taskId, model } = await createVideoTask({
    prompt,
    duration,
    aspectRatio: '16:9',
    model: modelOverride as string | undefined,
  });
  console.log(`任务已创建: ${taskId}`);
  console.log('⏳ 轮询等待中（约 2–5 分钟）...\n');

  const result = await waitForVideo(taskId, { model });

  if (result.status !== 'completed' || !result.videoUrl) {
    throw new Error(result.error || '视频生成未完成');
  }

  let videoBuffer: Buffer;
  const match = result.videoUrl.match(/^data:video\/mp4;base64,(.+)$/);
  if (match) {
    videoBuffer = Buffer.from(match[1], 'base64');
  } else if (result.videoUrl.startsWith('http')) {
    const axios = (await import('axios')).default;
    const res = await axios.get(result.videoUrl, { responseType: 'arraybuffer' });
    videoBuffer = Buffer.from(res.data);
  } else {
    throw new Error('无法解析视频数据');
  }

  const outDir = path.resolve(process.cwd(), 'output');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const slug = prompt.slice(0, 20).replace(/[^\w\u4e00-\u9fa5]/g, '_');
  const outPath = path.join(outDir, `${slug}_${Date.now()}.mp4`);
  fs.writeFileSync(outPath, videoBuffer);

  console.log(`✅ 视频已保存: ${outPath}\n`);
}

main().catch((e: { response?: { status: number; data?: unknown }; message?: string }) => {
  if (e?.response) {
    console.error(`❌ API 错误 ${e.response.status}:`, JSON.stringify(e.response.data, null, 2));
  } else {
    console.error('❌', (e as Error).message);
  }
  process.exit(1);
});
