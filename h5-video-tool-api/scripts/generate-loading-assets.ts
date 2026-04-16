/**
 * H5 地牢主题 Loading 体验 — 资产批量生成脚本
 *
 * 调用 Compass/Imagen 生成场景背景图 + SUNO 生成环境音效
 * 用法: npx tsx scripts/generate-loading-assets.ts [--images-only] [--audio-only]
 */
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

// tsx 直跑脚本时 loadEnv 的 apiRoot 解析不到 h5-video-tool-api/，手动指定
const __scriptDir = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(__scriptDir, '..');
dotenv.config({ path: path.join(apiRoot, '.env'), override: true });
dotenv.config({ path: path.join(apiRoot, '.env.local'), override: true });
import { generateImageWithPython } from '../src/services/imagenPython.js';
import { generateSunoMusic, isSunoConfigured } from '../src/services/sunoMusic.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.resolve(__dirname, '../../output/loading-assets');
const REF_DIR = path.join(OUTPUT_DIR, 'references');

// ─── 场景定义 ─────────────────────────────────────────────

interface SceneConfig {
  id: string;
  name: string;
  speaker: string;
  imagePrompt: string;
  /** 用作画风锁定的参考图文件名（在 references/ 目录下） */
  styleRefFile: string;
  audioPrompt: string;
  audioStyle: string;
  audioTitle: string;
}

const SCENES: SceneConfig[] = [
  {
    id: 'dungeon-entrance',
    name: '地牢入口（登录/启动）',
    speaker: 'gatekeeper',
    styleRefFile: '场景1.jpg',
    imagePrompt: [
      'A massive fortified dungeon gate entrance in a dark underground cavern.',
      'Huge iron-reinforced stone doors with glowing rune engravings.',
      'Torches mounted on carved stone pillars cast warm orange firelight.',
      'Ancient stone architecture with intricate carvings and weathered textures.',
      'Atmospheric volumetric fog and dust particles in torchlight beams.',
      'AAA game concept art, cinematic wide shot, highly detailed environment,',
      'dramatic chiaroscuro lighting, dark fantasy RPG aesthetic.',
      'Widescreen 16:9 landscape composition with strong depth.',
    ].join(' '),
    audioPrompt: [
      'Deep underground stone dungeon ambiance.',
      'Slow echoing water drops on stone, distant metallic chain rattles,',
      'low rumbling bass drone, occasional creak of ancient wood.',
      'Mysterious and foreboding but not terrifying.',
      'Medieval dark fantasy atmosphere.',
    ].join(' '),
    audioStyle: 'Dark Ambient, Medieval Fantasy, Atmospheric',
    audioTitle: 'Dungeon Gate Ambience',
  },
  {
    id: 'tavern',
    name: '酒馆（匹配/组队）',
    speaker: 'bartender',
    styleRefFile: '洛萨王国_中庭.jpg',
    imagePrompt: [
      'A grand medieval fantasy tavern hall interior with high vaulted ceilings.',
      'Warm golden light from chandeliers and a massive stone fireplace.',
      'Long wooden tables, barrels of mead, hanging banners and shields on walls.',
      'Rich architectural details: stone arches, carved wooden beams, iron fixtures.',
      'Atmospheric haze from firelight, warm inviting ambiance.',
      'AAA game concept art, cinematic wide establishing shot,',
      'highly detailed environment, warm color palette of gold and amber,',
      'dark fantasy RPG tavern aesthetic.',
      'Widescreen 16:9 landscape composition.',
    ].join(' '),
    audioPrompt: [
      'Medieval tavern background ambiance.',
      'Soft lute melody with gentle fiddle accompaniment,',
      'distant murmur of conversations, occasional wooden mug clink,',
      'crackling fireplace, warm and welcoming atmosphere.',
      'Not too fast, comfortable and slightly playful.',
    ].join(' '),
    audioStyle: 'Medieval Folk, Tavern Music, Acoustic',
    audioTitle: 'Tavern Hearth',
  },
  {
    id: 'blacksmith',
    name: '铁匠铺（资源加载/装备）',
    speaker: 'blacksmith',
    styleRefFile: '场景7.jpg',
    imagePrompt: [
      'A grand medieval blacksmith forge workshop inside a stone-walled chamber.',
      'Massive forge furnace with roaring flames casting intense orange-red light.',
      'Anvils, weapon racks with swords and shields, chains hanging from ceiling.',
      'Sparks flying from molten metal, embers drifting upward.',
      'Rich architectural detail: stone pillars, iron gratings, carved relief.',
      'AAA game concept art, cinematic wide shot, highly detailed environment,',
      'dramatic fire-lit contrast, dark fantasy RPG forge aesthetic.',
      'Widescreen 16:9 landscape composition.',
    ].join(' '),
    audioPrompt: [
      'Medieval blacksmith workshop ambient soundscape.',
      'Rhythmic hammer strikes on metal anvil with resonant ring,',
      'crackling forge fire, bellows breathing in and out,',
      'occasional sizzle of hot metal in water.',
      'Steady working rhythm, powerful but not aggressive.',
    ].join(' '),
    audioStyle: 'Industrial Ambient, Medieval, Percussive',
    audioTitle: 'Forge Rhythms',
  },
  {
    id: 'settlement',
    name: '结算台（局后结算）',
    speaker: 'clerk',
    styleRefFile: '场景5.jpg',
    imagePrompt: [
      'A medieval royal treasury and counting room with grand architecture.',
      'Heavy stone desk piled with gold coins, treasure chests, and parchment scrolls.',
      'Ornate candelabras with flickering candlelight illuminate stacks of loot.',
      'Shelves of ledgers, hanging tapestries, scales for weighing gold.',
      'Rich warm lighting on gold and jewels contrasting with cool stone walls.',
      'AAA game concept art, cinematic wide shot, highly detailed environment,',
      'treasure hoard aesthetic, dark fantasy RPG settlement screen.',
      'Widescreen 16:9 landscape composition.',
    ].join(' '),
    audioPrompt: [
      'Medieval accounting room atmosphere.',
      'Gentle quill pen scratching on parchment, coins clinking and sliding,',
      'soft turning of book pages, quiet but official ambiance.',
      'Slightly humorous undertone, bureaucratic medieval feeling.',
      'Calm and methodical pace.',
    ].join(' '),
    audioStyle: 'Orchestral Ambient, Medieval, Whimsical',
    audioTitle: 'The Clerk Counts',
  },
  {
    id: 'reconnect',
    name: '断线重连（重连/异常）',
    speaker: 'narrator',
    styleRefFile: '场景9.jpg',
    imagePrompt: [
      'A dark underground dungeon corridor stretching into deep shadow.',
      'A single dying torch barely illuminating damp stone walls.',
      'Ancient architecture crumbling, roots and moss creeping through cracks.',
      'Faint eerie glow from luminescent crystals or runes in the distance.',
      'Strong atmospheric perspective, sense of isolation and danger.',
      'AAA game concept art, cinematic wide shot, highly detailed environment,',
      'minimal dramatic lighting with deep shadows, dark fantasy RPG dungeon.',
      'Widescreen 16:9 landscape composition.',
    ].join(' '),
    audioPrompt: [
      'Tense dungeon reconnection atmosphere.',
      'Low sustained bass drone with subtle heartbeat-like pulse,',
      'distant wind through stone passages, single torch flickering,',
      'occasional drip echo, building subtle anxiety.',
      'Suspenseful but not overwhelming, leaving room for hope.',
    ].join(' '),
    audioStyle: 'Dark Ambient, Suspense, Cinematic',
    audioTitle: 'Lost Signal',
  },
];

// ─── 工具函数 ─────────────────────────────────────────────

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

function elapsed(start: number): string {
  return `${((Date.now() - start) / 1000).toFixed(1)}s`;
}

// ─── 加载参考图为 base64 ──────────────────────────────────

async function loadStyleRefBase64(filename: string): Promise<string | undefined> {
  const refPath = path.join(REF_DIR, filename);
  try {
    const buf = await fs.readFile(refPath);
    console.log(`       📎 画风参考: ${filename} (${(buf.length / 1024).toFixed(0)}KB)`);
    return buf.toString('base64');
  } catch {
    console.warn(`       ⚠️  参考图未找到: ${refPath}，将不使用画风锁定`);
    return undefined;
  }
}

// ─── 图像生成 ─────────────────────────────────────────────

async function generateImages() {
  const imageDir = path.join(OUTPUT_DIR, 'images');
  await ensureDir(imageDir);

  console.log('\n🎨 ═══ 开始生成场景背景图（Compass/Imagen + 画风参考）═══\n');

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
      const styleRef = await loadStyleRefBase64(scene.styleRefFile);

      const result = await generateImageWithPython({
        prompt: scene.imagePrompt,
        aspectRatio: '16:9',
        styleReferenceBase64: styleRef,
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

  console.log('\n🎵 ═══ 开始生成场景环境音效（SUNO）═══\n');

  for (let i = 0; i < SCENES.length; i++) {
    const scene = SCENES[i];
    const outPath1 = path.join(audioDir, `${scene.id}-1.mp3`);
    const outPath2 = path.join(audioDir, `${scene.id}-2.mp3`);

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
    version: '1.0.0',
    theme: 'medieval-dungeon',
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
  console.log('║   H5 地牢主题 Loading 资产生成器                  ║');
  console.log('║   Theme: Medieval Dungeon Explorer               ║');
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
