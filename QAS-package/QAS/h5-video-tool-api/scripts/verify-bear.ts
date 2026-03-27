/**
 * 验证脚本：森林里的小熊
 * 流程：1) 分镜图生成（Imagen） 2) 视频生成（Veo 图生视频）
 * 用法：先启动 API (npm run dev)，再运行 npx tsx scripts/verify-bear.ts
 */
import fs from 'fs/promises';
import path from 'path';

const API_BASE = process.env.API_BASE || 'http://localhost:3001';

async function main() {
  const prompt = '森林里的小熊';
  console.log(`[1/2] 生成分镜图：${prompt}`);
  const imgRes = await fetch(`${API_BASE}/api/storyboard/images`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fallbackPrompt: prompt,
      storyboardText: prompt,
      aspectRatio: '16:9',
    }),
  });
  if (!imgRes.ok) {
    const err = await imgRes.text();
    throw new Error(`分镜图失败: ${imgRes.status} ${err}`);
  }
  const { shots } = (await imgRes.json()) as { shots: { index: number; imageDataUrl: string; prompt: string }[] };
  if (!shots?.length) throw new Error('无分镜图返回');
  const shot = shots[0];
  const base64 = shot.imageDataUrl?.replace(/^data:image\/\w+;base64,/, '') || '';
  if (!base64) throw new Error('分镜图无 base64');
  console.log(`[1/2] 分镜图已生成 (${(base64.length / 1024).toFixed(1)} KB)`);

  console.log('[2/2] 生成视频（Veo 图生视频）...');
  const videoRes = await fetch(`${API_BASE}/api/video/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      storyboardText: `${prompt}，3D渲染风格，温暖治愈，阳光透过森林，适合全年龄段观看`,
      aspectRatio: '16:9',
      duration: 5,
      imageBase64: base64,
      imageMimeType: 'image/png',
    }),
  });
  if (!videoRes.ok) {
    const err = await videoRes.text();
    throw new Error(`视频生成失败: ${videoRes.status} ${err}`);
  }
  const { videoUrl, taskId } = (await videoRes.json()) as { videoUrl: string; taskId?: string };
  if (!videoUrl) throw new Error('无视频返回');

  const outDir = process.env.VIDEO_OUTPUT_DIR || 'output';
  await fs.mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, `森林里的小熊_${Date.now()}.mp4`);
  const buf = Buffer.from(videoUrl.replace(/^data:video\/\w+;base64,/, ''), 'base64');
  await fs.writeFile(outPath, buf);
  console.log(`[2/2] 视频已保存: ${outPath} (${(buf.length / 1024).toFixed(0)} KB)`);
  console.log('验证完成！');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
