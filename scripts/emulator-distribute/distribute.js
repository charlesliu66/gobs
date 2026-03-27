#!/usr/bin/env node
/**
 * 模拟器 TikTok 分发入口
 * 用法：node distribute.js [--video "path"] [--latest] [--caption "文案"]
 * 参考：edde746/tiktok-uploader
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const SCRIPT_DIR = __dirname;
const CONFIG_PATH = path.join(SCRIPT_DIR, 'config.json');
const TO_UPLOAD = path.join(SCRIPT_DIR, 'to_upload');

function loadConfig() {
  if (fs.existsSync(CONFIG_PATH)) {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  }
  const qasConfig = path.join(SCRIPT_DIR, '..', '..', 'config', 'geelark.json');
  if (fs.existsSync(qasConfig)) {
    const cfg = JSON.parse(fs.readFileSync(qasConfig, 'utf-8'));
    return {
      device: '127.0.0.1:5554',
      aiVideosPath: cfg.aiVideosPath || 'C:\\Users\\wei.liu\\Desktop\\cursor_try\\Ai Videos',
      latestJsonPath: cfg.latestJsonPath || path.join(cfg.aiVideosPath || '', 'latest.json'),
      deviceStoragePath: 'Pictures/TTUploader',
    };
  }
  return {
    device: '127.0.0.1:5554',
    aiVideosPath: 'C:\\Users\\wei.liu\\Desktop\\cursor_try\\Ai Videos',
    latestJsonPath: 'C:\\Users\\wei.liu\\Desktop\\cursor_try\\Ai Videos\\latest.json',
    deviceStoragePath: 'Pictures/TTUploader',
  };
}

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { video: null, caption: '', useLatest: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--video' && args[i + 1]) result.video = args[++i];
    else if (args[i] === '--caption' && args[i + 1]) result.caption = args[++i];
    else if (args[i] === '--latest') result.useLatest = true;
  }
  return result;
}

function main() {
  const config = loadConfig();
  const { video, caption, useLatest } = parseArgs();

  let videoPath = video;
  if (useLatest) {
    const latestPath = config.latestJsonPath || path.join(config.aiVideosPath, 'latest.json');
    if (!fs.existsSync(latestPath)) {
      console.error('[emulator-distribute] 错误：latest.json 不存在。请先运行 video-pipeline 生成视频。');
      process.exit(1);
    }
    const latest = JSON.parse(fs.readFileSync(latestPath, 'utf-8'));
    videoPath = latest.outputPath;
    console.log('[emulator-distribute] 从 latest.json 读取成片：', videoPath);
  }

  if (!videoPath || !fs.existsSync(videoPath)) {
    console.error('[emulator-distribute] 用法：node distribute.js --video "path/to/video.mp4" [--caption "文案"]');
    console.error('       node distribute.js --latest [--caption "文案"]');
    process.exit(1);
  }

  if (!fs.existsSync(TO_UPLOAD)) fs.mkdirSync(TO_UPLOAD, { recursive: true });
  const ext = path.extname(videoPath);
  const destName = `upload${Date.now()}${ext}`;
  const destPath = path.join(TO_UPLOAD, destName);
  fs.copyFileSync(videoPath, destPath);

  const pyArgs = ['upload_tiktok.py'];
  if (caption) pyArgs.push('--caption', caption);

  console.log('[emulator-distribute] 调用 Python 上传脚本...');
  const child = spawn('python', pyArgs, {
    cwd: SCRIPT_DIR,
    stdio: 'inherit',
    shell: true,
  });

  child.on('exit', (code) => {
    try { fs.unlinkSync(destPath); } catch (_) {}
    process.exit(code || 0);
  });
}

main();
