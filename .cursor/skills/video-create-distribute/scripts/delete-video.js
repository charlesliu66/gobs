#!/usr/bin/env node
/**
 * 按路径删除视频（带安全校验：仅限 Ai Videos 目录内）
 * 用法：node delete-video.js --path "C:\...\video.mp4"
 */

const fs = require('fs');
const path = require('path');

function loadConfig() {
  const base = process.env.USERPROFILE || process.env.HOME || '';
  const candidates = [
    process.env.GEELARK_CONFIG,
    path.join(process.cwd(), 'config', 'geelark.json'),
    path.join(base, 'Desktop', 'cursor_try', 'QAS', 'config', 'geelark.json'),
  ].filter(Boolean);
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      try {
        return JSON.parse(fs.readFileSync(p, 'utf-8'));
      } catch (_) {}
    }
  }
  return {};
}

const EXT = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv', '.wmv', '.mpeg', '.mpg', '.3gp'];

let target = '';
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--path' && args[i + 1]) target = args[++i].trim();
}

if (!target) {
  console.error('用法：node delete-video.js --path "视频路径"');
  process.exit(1);
}

const cfg = loadConfig();
const aiVideos = path.resolve(cfg.aiVideosPath || 'C:\\Users\\wei.liu\\Desktop\\cursor_try\\Ai Videos');
const absTarget = path.resolve(target);

if (!absTarget.startsWith(aiVideos)) {
  console.error('错误：仅允许删除 Ai Videos 目录内的文件。');
  console.error('  Ai Videos:', aiVideos);
  console.error('  目标路径:', absTarget);
  process.exit(1);
}

if (!EXT.includes(path.extname(absTarget).toLowerCase())) {
  console.error('错误：仅支持删除视频文件：', EXT.join(', '));
  process.exit(1);
}

if (!fs.existsSync(absTarget)) {
  console.error('错误：文件不存在', absTarget);
  process.exit(1);
}

try {
  fs.unlinkSync(absTarget);
  console.log('已删除:', absTarget);
} catch (e) {
  console.error('删除失败:', e.message);
  process.exit(1);
}
