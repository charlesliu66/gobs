#!/usr/bin/env node
/**
 * 一键生成 + 分发
 * 用法：node run-all.js --prompt "..." [--materials "..."] [--duration 10] [--platforms tiktok] [--caption "..."]
 */

const { spawnSync } = require('child_process');
const path = require('path');

const VIDEO_PIPELINE = process.env.VIDEO_PIPELINE_DIR || path.join(process.env.USERPROFILE || '', 'Desktop', 'cursor_try', 'video-pipeline');
const GEELARK_PUBLISH = process.env.GEELARK_PUBLISH_DIR || path.join(process.env.USERPROFILE || '', '.cursor', 'skills', 'geelark-publish');
const PUBLISH_JS = path.join(GEELARK_PUBLISH, 'scripts', 'publish.js');

const args = process.argv.slice(2);
const getArg = (name) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : null;
};

const prompt = getArg('--prompt');
if (!prompt) {
  console.error('用法：node run-all.js --prompt "..." [--materials "path1,path2"] [--duration 10] [--platforms tiktok] [--caption "..."]');
  process.exit(1);
}

console.log('\n========== Step 1: 生成视频 ==========\n');

const genArgs = ['run.js', '--prompt', prompt, '--output', 'C:\\Users\\wei.liu\\Desktop\\cursor_try\\Ai Videos'];
if (getArg('--materials')) genArgs.push('--materials', getArg('--materials'));
if (getArg('--duration')) genArgs.push('--duration', getArg('--duration'));
if (getArg('--aspect')) genArgs.push('--aspect', getArg('--aspect'));

const gen = spawnSync('node', genArgs, {
  cwd: VIDEO_PIPELINE,
  stdio: 'inherit',
  shell: true,
});

if (gen.status !== 0) {
  console.error('\n生成失败，中止。');
  process.exit(gen.status || 1);
}

console.log('\n========== Step 2: 分发到社媒 ==========\n');

const distArgs = [PUBLISH_JS, '--latest', '--platforms', getArg('--platforms') || 'tiktok'];
if (getArg('--caption')) distArgs.push('--caption', getArg('--caption'));
if (getArg('--env-ids')) distArgs.push('--env-ids', getArg('--env-ids'));

const dist = spawnSync('node', distArgs, {
  cwd: GEELARK_PUBLISH,
  stdio: 'inherit',
  shell: true,
});

if (dist.status !== 0) {
  console.error('\n分发失败。');
  process.exit(dist.status || 1);
}

console.log('\n========== 完成 ==========\n');
