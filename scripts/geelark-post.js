#!/usr/bin/env node
/**
 * GeeLark 发布视频到 TikTok（1 台或 N 台设备）
 * 支持设备名、description、hashtag；可用户定义或留空（脚本不自动生成，由 AI/Skill 层生成后传入）
 *
 * 用法：
 *   node geelark-post.js --videos "path1.mp4" --env "Test 3"
 *   node geelark-post.js --videos "path1.mp4" --env "Test 1,Test 2,Test 3" --caption "文案" --hashtags "#fyp #viral"
 *   node geelark-post.js --videos "path1.mp4" --env-ids "id1,id2" --caption "xxx"
 *
 * 配置：config/geelark.json
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { loadGeelarkConfig, resolveEnvIds } = require('./geelark-lib');

function findPublishScript() {
  const base = process.env.USERPROFILE || process.env.HOME || '';
  const candidates = [
    path.join(base, '.cursor', 'skills', 'geelark-publish', 'scripts', 'publish.js'),
    path.join(__dirname, '..', 'node_modules', '.cursor', 'skills', 'geelark-publish', 'scripts', 'publish.js'),
  ];
  for (const p of candidates) {
    if (p && fs.existsSync(p)) return p;
  }
  return null;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { videos: '', env: '', envIds: '', caption: '', hashtags: '', platforms: 'tiktok', latest: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--videos' && args[i + 1]) result.videos = args[++i];
    else if (args[i] === '--env' && args[i + 1]) result.env = args[++i];
    else if (args[i] === '--env-ids' && args[i + 1]) result.envIds = args[++i];
    else if (args[i] === '--caption' && args[i + 1]) result.caption = args[++i];
    else if (args[i] === '--hashtags' && args[i + 1]) result.hashtags = args[++i];
    else if (args[i] === '--platforms' && args[i + 1]) result.platforms = args[++i];
    else if (args[i] === '--latest') result.latest = true;
  }
  return result;
}

function main() {
  const cfg = loadGeelarkConfig();
  if (!cfg || !(cfg.apiKey || process.env.GEELARK_API_KEY)) {
    console.error('请配置 config/geelark.json 中的 apiKey');
    process.exit(1);
  }
  if (cfg.appId) process.env.GEELARK_APP_ID = cfg.appId;
  if (cfg.apiKey) process.env.GEELARK_API_KEY = cfg.apiKey;
  if (cfg.latestJsonPath) process.env.GEELARK_LATEST_JSON = cfg.latestJsonPath;

  const { videos, env, envIds, caption, hashtags, platforms, latest } = parseArgs();
  const envArg = envIds || env;
  let resolvedIds = resolveEnvIds(envArg, cfg);
  if (!resolvedIds.length) {
    resolvedIds = (cfg.defaultEnvIds || []).slice();
  }
  if (!resolvedIds.length) {
    console.error('请指定设备：--env "Test 3" 或 --env "Test 1,Test 2" 或 --env-ids "id1,id2"');
    process.exit(1);
  }

  const videosArg = videos;
  if (!videosArg && !latest) {
    console.error('请指定视频：--videos "path.mp4" 或 --latest');
    process.exit(1);
  }

  const publishPath = findPublishScript();
  if (!publishPath) {
    console.error('未找到 geelark-publish 的 publish.js');
    console.error('请确保已安装 geelark-publish skill：~/.cursor/skills/geelark-publish/');
    console.error('或使用 geelark-publish skill 内的脚本直接发布。');
    process.exit(1);
  }

  const cmdArgs = [
    publishPath,
    '--env-ids', resolvedIds.join(','),
    '--platforms', platforms,
  ];
  if (videosArg) cmdArgs.push('--videos', videosArg);
  if (latest) cmdArgs.push('--latest');
  if (caption) cmdArgs.push('--caption', caption);
  if (hashtags) cmdArgs.push('--hashtags', hashtags);

  console.log('设备:', resolvedIds.map((id) => {
    const d = (cfg.devices || []).find((x) => x.id === id);
    return d ? `${d.name}(${id})` : id;
  }).join(', '));
  console.log('执行:', 'node', cmdArgs.join(' '));
  console.log('');

  const child = spawn('node', cmdArgs, {
    stdio: 'inherit',
    cwd: path.dirname(publishPath),
  });
  child.on('close', (code) => {
    process.exit(code || 0);
  });
  child.on('error', (err) => {
    console.error(err);
    process.exit(1);
  });
}

main();
