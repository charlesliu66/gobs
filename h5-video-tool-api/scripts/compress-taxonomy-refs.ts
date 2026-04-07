/**
 * 压缩 config/taxonomy-refs 下参考图：长边 max 1600px，JPEG 质量 82。
 * PNG 会转为 .jpg 并删除原 PNG（仍符合 gameTaxonomy 允许的扩展名）。
 */
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

const ROOT = path.join(process.cwd(), 'config', 'taxonomy-refs');
const MAX_EDGE = 1600;
const JPEG_QUALITY = 82;

const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;

async function compressFile(abs: string): Promise<{ before: number; after: number }> {
  const stat = await fs.stat(abs);
  const before = stat.size;
  const ext = path.extname(abs).toLowerCase();
  const dir = path.dirname(abs);
  const base = path.basename(abs, ext);

  const jpegBuf = await sharp(abs)
    .rotate()
    .resize({
      width: MAX_EDGE,
      height: MAX_EDGE,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toBuffer();

  const outPath =
    ext === '.png' || ext === '.webp' ? path.join(dir, `${base}.jpg`) : abs;

  const tmp = path.join(dir, `.${base}.compress-tmp-${Date.now()}.jpg`);
  await fs.writeFile(tmp, jpegBuf);
  if (outPath !== abs) {
    try {
      await fs.unlink(outPath);
    } catch {
      /* 目标 jpg 尚不存在 */
    }
  }
  if (outPath === abs) {
    await fs.unlink(abs);
  }
  await fs.rename(tmp, outPath);
  if (outPath !== abs) {
    try {
      await fs.unlink(abs);
    } catch {
      /* 原 png/webp 已删 */
    }
  }

  const after = jpegBuf.length;
  return { before, after };
}

async function walk(dir: string): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const ent of entries) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      await walk(p);
      continue;
    }
    if (ent.name.startsWith('.')) continue;
    if (ent.name === 'README.md') continue;
    if (!IMAGE_EXT.test(ent.name)) continue;
    try {
      const { before, after } = await compressFile(p);
      const pct = before > 0 ? Math.round((1 - after / before) * 100) : 0;
      console.log(`${path.relative(ROOT, p)}  ${(before / 1024).toFixed(0)}KB -> ${(after / 1024).toFixed(0)}KB (-${pct}%)`);
    } catch (e) {
      console.error('失败:', p, e);
    }
  }
}

async function main() {
  try {
    await fs.access(ROOT);
  } catch {
    console.error('目录不存在:', ROOT);
    process.exit(1);
  }
  console.log('压缩目录:', ROOT);
  await walk(ROOT);
  console.log('完成');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
