#!/usr/bin/env node
/**
 * 批量精简视频文件名以符合 GeeLark 上传要求：
 * - 无单引号
 * - 小于 60 字符（含后缀）
 *
 * 用法：node rename-videos-for-upload.js "C:\path\to\Ai Videos"
 */
const fs = require('fs');
const path = require('path');

const MAX_LEN = 59; // 60 字符包含后缀，预留 1
const VIDEO_EXT = /\.(mp4|mov|avi|mkv|webm)$/i;

/** 生成短文件名：GNG_V010_EN_冰晶圣杯.mp4 */
function shortName(filePath, baseName, used) {
  const dir = path.dirname(filePath);
  const ext = path.extname(baseName);
  const baseNoExt = path.basename(baseName, ext);

  // 提取 V序号 和 语言
  const vMatch = baseNoExt.match(/GNG_COMM_V_(\d+)/i) || baseNoExt.match(/V_(\d+)/i);
  const langMatch = baseNoExt.match(/_([A-Z]{2})_OB/i) || baseNoExt.match(/_OB/i);
  const vNum = vMatch ? vMatch[1] : '000';
  const lang = langMatch && langMatch[1] ? langMatch[1] : 'OB';

  // 从目录名提取系列名（如 冰晶圣杯、守护者）
  const dirName = path.basename(dir);
  const seriesMatch = dirName.match(/[-–—]\s*(.+?)(?:_|$)/) || dirName.match(/(.+)$/);
  const series = (seriesMatch ? seriesMatch[1].trim() : dirName).replace(/[''`]/g, '').slice(0, 8);

  let short = `GNG_V${vNum}_${lang}_${series}`.replace(/[''`]/g, '');
  if ((short + ext).length > MAX_LEN) {
    short = short.slice(0, MAX_LEN - ext.length);
  }
  let final = short + ext;
  let suffix = 0;
  while (used.has(final.toLowerCase())) {
    suffix++;
    const withSuffix = `${short}_${suffix}${ext}`;
    if (withSuffix.length > MAX_LEN) {
      short = short.slice(0, MAX_LEN - ext.length - String(suffix).length - 2);
    }
    final = (short + (suffix ? `_${suffix}` : '')) + ext;
  }
  used.add(final.toLowerCase());
  return final;
}

function renameDir(dir, used = new Set(), dryRun = true) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const renames = [];

  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      renames.push(...renameDir(full, used, dryRun));
      continue;
    }
    if (!VIDEO_EXT.test(e.name)) continue;

    const newName = shortName(full, e.name, used);
    const newPath = path.join(dir, newName);
    if (e.name === newName) continue;

    renames.push({ old: full, new: newPath, oldName: e.name, newName });
  }
  return renames;
}

function main() {
  const root = process.argv[2] || 'C:\\Users\\wei.liu\\Desktop\\cursor_try\\Ai Videos';
  const dryRun = process.argv.includes('--execute') ? false : true;

  if (!fs.existsSync(root)) {
    console.error('目录不存在：', root);
    process.exit(1);
  }

  const renames = renameDir(root);
  if (renames.length === 0) {
    console.log('无需重命名的文件');
    return;
  }

  console.log(dryRun ? '[预览] 将重命名以下文件（加 --execute 执行）：\n' : '执行重命名：\n');
  for (const r of renames) {
    const len = r.newName.length;
    const ok = len <= 60 && !r.newName.includes("'");
    console.log(`${ok ? '✓' : '✗'} ${r.oldName} (${r.oldName.length}字)`);
    console.log(`  → ${r.newName} (${len}字)\n`);
  }

  if (dryRun) {
    console.log('运行 node rename-videos-for-upload.js "' + root + '" --execute 执行重命名');
    return;
  }

  for (const r of renames) {
    try {
      fs.renameSync(r.old, r.new);
      console.log('已重命名：', r.newName);
    } catch (e) {
      console.error('失败：', r.oldName, e.message);
    }
  }
}

main();
