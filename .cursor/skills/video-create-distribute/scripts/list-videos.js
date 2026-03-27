#!/usr/bin/env node
/**
 * 列出 Ai Videos 下所有视频（递归）
 * 用法：node list-videos.js [--dir "路径"] [--json]
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
function isVideo(f) {
  return EXT.includes(path.extname(f).toLowerCase());
}

function listVideos(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const walk = (d) => {
    const ents = fs.readdirSync(d, { withFileTypes: true });
    for (const e of ents) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.isFile() && isVideo(e.name)) {
        const stat = fs.statSync(full);
        out.push({
          path: full,
          name: e.name,
          size: stat.size,
          mtime: stat.mtime.toISOString ? stat.mtime.toISOString() : stat.mtime,
        });
      }
    }
  };
  walk(dir);
  return out.sort((a, b) => new Date(b.mtime) - new Date(a.mtime));
}

const args = process.argv.slice(2);
let dir = process.env.AI_VIDEOS_PATH || 'C:\\Users\\wei.liu\\Desktop\\cursor_try\\Ai Videos';
let json = false;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--dir' && args[i + 1]) dir = args[++i];
  else if (args[i] === '--json') json = true;
}

const cfg = loadConfig();
if (cfg.aiVideosPath) dir = cfg.aiVideosPath;

const list = listVideos(dir);
if (json) {
  console.log(JSON.stringify(list, null, 2));
} else {
  console.log(`\nAi Videos 视频列表 (${list.length} 个)\n`);
  list.forEach((v, i) => {
    const mb = (v.size / 1024 / 1024).toFixed(2);
    console.log(`${i + 1}. ${v.name}  (${mb} MB)  ${v.mtime}`);
    console.log(`   ${v.path}`);
  });
}
