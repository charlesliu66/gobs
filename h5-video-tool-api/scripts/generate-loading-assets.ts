/**
 * 百老汇筑梦师 Loading 体验 — 资产批量生成脚本
 *
 * 调用 Compass/Imagen 生成剧院场景背景图 + SUNO 生成环境音效
 * 用法: npx tsx scripts/generate-loading-assets.ts [--images-only] [--audio-only]
 */
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __scriptDir = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(__scriptDir, '..');
dotenv.config({ path: path.join(apiRoot, '.env'), override: true });
dotenv.config({ path: path.join(apiRoot, '.env.local'), override: true });
import { generateImageWithPython } from '../src/services/imagenPython.js';
import { generateSunoMusic, isSunoConfigured } from '../src/services/sunoMusic.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.resolve(__dirname, '../../output/loading-assets');

// ─── 场景定义（百老汇剧院主题）──────────────────────────────

interface SceneConfig {
  id: string;
  name: string;
  speaker: string;
  imagePrompt: string;
  audioPrompt: string;
  audioStyle: string;
  audioTitle: string;
}

const SCENES: SceneConfig[] = [
  {
    id: 'writers-room',
    name: '编剧室（剧本/Prompt 生成）',
    speaker: 'co-writer',
    imagePrompt: [
      'A cozy Broadway theater writer\'s room at night, warm desk lamp illuminating scattered scripts and notebooks.',
      'Vintage typewriter on a mahogany desk, coffee cups, crumpled paper balls, wall covered with pinned story cards and character sketches.',
      'Bookshelves filled with plays and screenplays, warm amber lighting from art deco fixtures.',
      'Cinematic wide shot, 16:9 landscape, warm color palette of gold and amber,',
      'theatrical backstage aesthetic, high detail, volumetric lighting through window.',
    ].join(' '),
    audioPrompt: [
      'Intimate writer\'s room ambiance at night.',
      'Soft typewriter key clicks with rhythmic spacing, gentle page turning,',
      'occasional pen scratching on paper, distant muffled city sounds through window.',
      'Warm contemplative mood, creative atmosphere.',
      'Subtle soft piano notes in background.',
    ].join(' '),
    audioStyle: 'Lo-fi Ambient, Jazz Piano, Atmospheric',
    audioTitle: 'The Writer\'s Midnight',
  },
  {
    id: 'rehearsal',
    name: '排练厅（视频生成/分镜/彩排）',
    speaker: 'cinematographer',
    imagePrompt: [
      'A grand Broadway rehearsal hall with a full stage visible from backstage perspective.',
      'Dramatic spotlights cutting through theatrical haze, warm amber and cool blue light mixing.',
      'Stage marks on wooden floor, prop tables on the sides, rigging and pulleys visible above.',
      'A few silhouetted figures on stage in mid-rehearsal, one spotlight following them.',
      'Cinematic wide shot, 16:9 landscape, high contrast dramatic theater lighting,',
      'backstage professional atmosphere, highly detailed environment.',
    ].join(' '),
    audioPrompt: [
      'Broadway rehearsal hall atmosphere.',
      'Footsteps echoing on wooden stage floor, distant director calling out cues,',
      'occasional piano notes from rehearsal pianist, rope pulleys creaking softly,',
      'muffled applause from imagination. Building creative energy.',
      'Theatrical and dynamic but not overwhelming.',
    ].join(' '),
    audioStyle: 'Cinematic Ambient, Theatrical, Orchestral',
    audioTitle: 'Rehearsal Call',
  },
  {
    id: 'fine-cut',
    name: '精修室（BGM/剪辑/合并）',
    speaker: 'editor',
    imagePrompt: [
      'A professional film editing suite and music studio combined, modern yet with theatrical warmth.',
      'Multiple screens showing video timelines and waveforms, mixing console with glowing faders.',
      'Warm amber desk lamps contrasting with cool monitor glow, acoustic panels on walls.',
      'Vintage film reels on shelf alongside modern equipment, headphones hanging from a hook.',
      'Cinematic wide shot, 16:9 landscape, moody tech-meets-theater aesthetic,',
      'highly detailed, warm amber and cool blue color contrast.',
    ].join(' '),
    audioPrompt: [
      'Film editing room atmosphere with creative energy.',
      'Soft equipment hum, gentle mouse clicks on timeline,',
      'occasional playback of orchestral snippet, film reel whirring,',
      'subtle bass undertone of speakers. Technical precision meets artistry.',
      'Focused and meditative working atmosphere.',
    ].join(' '),
    audioStyle: 'Ambient Electronic, Lo-fi, Cinematic',
    audioTitle: 'The Fine Cut',
  },
  {
    id: 'premiere',
    name: '首演台（导出/审片/发布）',
    speaker: 'stage-manager',
    imagePrompt: [
      'A magnificent Broadway theater main stage viewed from the audience, just before curtain rises.',
      'Grand red velvet curtain with gold trim, ornate proscenium arch with gilded decorations.',
      'Crystal chandelier dimming, house lights going down, anticipation in the air.',
      'Rich red and gold color scheme, dramatic upward lighting on the curtain.',
      'Cinematic wide shot, 16:9 landscape, classic Broadway theater grandeur,',
      'highly detailed architecture, warm golden spotlight hitting the center of curtain.',
    ].join(' '),
    audioPrompt: [
      'Broadway premiere night atmosphere before curtain rises.',
      'Audience murmur gradually quieting, orchestra tuning instruments,',
      'then a brief silence followed by dramatic orchestral swell.',
      'Anticipation building, sense of grandeur and excitement.',
      'Classical theater opening night energy.',
    ].join(' '),
    audioStyle: 'Classical Orchestral, Broadway, Dramatic',
    audioTitle: 'Opening Night',
  },
  {
    id: 'on-tour',
    name: '巡演厅（分发/文案/推广）',
    speaker: 'agent',
    imagePrompt: [
      'A theatrical agent\'s office overlooking a city skyline at golden hour.',
      'World tour map on the wall with pins and routes marked, theater posters from different cities.',
      'Desk with contracts, press clippings, phone, and a globe.',
      'Large windows letting in warm sunset light, creating dramatic shadows.',
      'Cinematic wide shot, 16:9 landscape, ambitious global theatrical atmosphere,',
      'warm golden hour lighting, professional yet creative environment.',
    ].join(' '),
    audioPrompt: [
      'Theatrical world tour ambiance, sense of global adventure.',
      'Upbeat background rhythm with world music influences,',
      'phone ringing briefly, paper rustling, distant city sounds,',
      'sense of motion and progress. Optimistic and professional.',
      'Energetic but not overwhelming.',
    ].join(' '),
    audioStyle: 'World Music, Upbeat Ambient, Cinematic',
    audioTitle: 'World Stage',
  },
  {
    id: 'lobby',
    name: '大厅（项目加载/初始化）',
    speaker: 'usher',
    imagePrompt: [
      'A grand Broadway theater lobby with soaring ceiling and ornate chandeliers.',
      'Art deco columns, vintage show posters in gilded frames lining the walls.',
      'Marble floor reflecting warm chandelier light, red carpet leading to the theater doors.',
      'Elegant and inviting atmosphere, sense of entering a world of stories.',
      'Cinematic wide shot, 16:9 landscape, classic Broadway glamour,',
      'warm amber and gold lighting, highly detailed architectural interior.',
    ].join(' '),
    audioPrompt: [
      'Grand theater lobby ambiance, welcoming and elegant.',
      'Soft jazz piano echoing in marble halls, gentle footsteps,',
      'distant murmur of excited theatergoers, chandelier crystal tinkling softly.',
      'Warm, inviting, anticipatory atmosphere.',
      'Classic elegance with a hint of excitement.',
    ].join(' '),
    audioStyle: 'Jazz Piano, Elegant Ambient, Theater',
    audioTitle: 'The Grand Lobby',
  },
  {
    id: 'props-room',
    name: '道具间（素材导入/处理）',
    speaker: 'props-master',
    imagePrompt: [
      'A backstage props workshop filled with theatrical costumes, masks, and set pieces.',
      'Organized chaos: costume racks, paint-splattered worktables, wigs on mannequin heads.',
      'Warm workshop lighting from hanging bulbs, tools and fabric scattered artfully.',
      'Shelves of categorized props with handwritten labels, a sewing machine in the corner.',
      'Cinematic wide shot, 16:9 landscape, creative backstage workshop aesthetic,',
      'warm golden lighting, cozy and industrious atmosphere.',
    ].join(' '),
    audioPrompt: [
      'Backstage props workshop atmosphere.',
      'Sewing machine humming rhythmically, scissors cutting fabric,',
      'paint brush strokes on canvas, tools clinking softly,',
      'someone humming a show tune quietly. Busy but peaceful creative space.',
      'Warm handcraft atmosphere.',
    ].join(' '),
    audioStyle: 'Handcraft Ambient, Cozy, Acoustic',
    audioTitle: 'Props & Costumes',
  },
];

// ─── 工具函数 ─────────────────────────────────────────────

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

function elapsed(start: number): string {
  return `${((Date.now() - start) / 1000).toFixed(1)}s`;
}

// ─── 图像生成 ─────────────────────────────────────────────

async function generateImages() {
  const imageDir = path.join(OUTPUT_DIR, 'images');
  await ensureDir(imageDir);

  console.log('\n🎨 ═══ 开始生成剧院场景背景图（Compass/Imagen）═══\n');

  for (let i = 0; i < SCENES.length; i++) {
    const scene = SCENES[i];
    const outPath = path.join(imageDir, `${scene.id}.png`);

    const existing = await fs.stat(outPath).catch(() => null);
    if (existing) {
      console.log(`  [${i + 1}/${SCENES.length}] ⏭  ${scene.name} — 已存在，跳过`);
      continue;
    }

    console.log(`  [${i + 1}/${SCENES.length}] 🖼  ${scene.name} — 生成中...`);
    const t0 = Date.now();

    try {
      const result = await generateImageWithPython({
        prompt: scene.imagePrompt,
        aspectRatio: '16:9',
        timeoutMs: 120_000,
      });

      const buf = Buffer.from(result.imageBase64, 'base64');
      await fs.writeFile(outPath, buf);
      console.log(`       ✅ 完成 (${elapsed(t0)}, model=${result.model || '?'}, ${(buf.length / 1024).toFixed(0)}KB)`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`       ❌ 失败: ${msg.slice(0, 200)}`);
    }
  }
}

// ─── 音频生成 ─────────────────────────────────────────────

async function generateAudio() {
  const audioDir = path.join(OUTPUT_DIR, 'audio');
  await ensureDir(audioDir);

  if (!isSunoConfigured()) {
    console.log('\n⚠️  SUNO_API_KEY 未配置，跳过音频生成');
    console.log('   如需生成音效，请在 .env 中配置 SUNO_API_KEY 后重新运行\n');
    return;
  }

  console.log('\n🎵 ═══ 开始生成剧院环境音效（SUNO）═══\n');

  for (let i = 0; i < SCENES.length; i++) {
    const scene = SCENES[i];
    const outPath1 = path.join(audioDir, `${scene.id}-1.mp3`);

    const existing = await fs.stat(outPath1).catch(() => null);
    if (existing) {
      console.log(`  [${i + 1}/${SCENES.length}] ⏭  ${scene.name} — 已存在，跳过`);
      continue;
    }

    console.log(`  [${i + 1}/${SCENES.length}] 🎶  ${scene.name} — 生成中（约2-3分钟）...`);
    const t0 = Date.now();

    try {
      const results = await generateSunoMusic({
        prompt: scene.audioPrompt,
        style: scene.audioStyle,
        title: scene.audioTitle,
        instrumental: true,
        negativeTags: 'Vocal, Rap, EDM, Modern, Electronic, Pop',
      });

      for (let j = 0; j < results.length; j++) {
        const outPath = path.join(audioDir, `${scene.id}-${j + 1}.mp3`);
        await fs.writeFile(outPath, results[j].buffer);
      }

      const durations = results.map((r) => `${r.duration.toFixed(0)}s`).join(', ');
      console.log(`       ✅ 完成 (${elapsed(t0)}, ${results.length}首, 时长: ${durations})`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`       ❌ 失败: ${msg.slice(0, 200)}`);
    }
  }
}

// ─── 生成 manifest ────────────────────────────────────────

async function generateManifest() {
  const manifest: Record<string, unknown> = {
    version: '2.0.0',
    theme: 'broadway-dreammaker',
    generatedAt: new Date().toISOString(),
    scenes: [] as unknown[],
  };

  for (const scene of SCENES) {
    const imgExists = await fs.stat(path.join(OUTPUT_DIR, 'images', `${scene.id}.png`)).catch(() => null);
    const audio1Exists = await fs.stat(path.join(OUTPUT_DIR, 'audio', `${scene.id}-1.mp3`)).catch(() => null);
    const audio2Exists = await fs.stat(path.join(OUTPUT_DIR, 'audio', `${scene.id}-2.mp3`)).catch(() => null);

    (manifest.scenes as unknown[]).push({
      id: scene.id,
      name: scene.name,
      speaker: scene.speaker,
      image: imgExists ? `images/${scene.id}.png` : null,
      audio: [
        ...(audio1Exists ? [`audio/${scene.id}-1.mp3`] : []),
        ...(audio2Exists ? [`audio/${scene.id}-2.mp3`] : []),
      ],
    });
  }

  await fs.writeFile(
    path.join(OUTPUT_DIR, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf-8',
  );
  console.log(`\n📋 manifest.json 已生成 → ${path.join(OUTPUT_DIR, 'manifest.json')}`);
}

// ─── 主入口 ───────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const imagesOnly = args.includes('--images-only');
  const audioOnly = args.includes('--audio-only');

  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║   百老汇筑梦师 Loading 资产生成器                   ║');
  console.log('║   Theme: Broadway Dreammaker                     ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`\n输出目录: ${OUTPUT_DIR}`);

  await ensureDir(OUTPUT_DIR);

  const t0 = Date.now();

  if (!audioOnly) await generateImages();
  if (!imagesOnly) await generateAudio();
  await generateManifest();

  console.log(`\n════ 全部完成 (总耗时 ${elapsed(t0)}) ════\n`);
}

main().catch((e) => {
  console.error('脚本异常退出:', e);
  process.exit(1);
});
