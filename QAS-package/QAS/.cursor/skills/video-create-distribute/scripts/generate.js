#!/usr/bin/env node
/**
 * 封装 video-pipeline 调用
 * 用法：node generate.js --prompt "..." [--materials "path1,path2"] [--duration 10] [--aspect 16:9]
 */

const { spawn } = require('child_process');
const path = require('path');

const VIDEO_PIPELINE = process.env.VIDEO_PIPELINE_DIR || path.join(process.env.USERPROFILE || '', 'Desktop', 'cursor_try', 'video-pipeline');
const RUN_JS = path.join(VIDEO_PIPELINE, 'run.js');

const args = process.argv.slice(2);
const buildArgs = () => {
  const out = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      out.push(args[i]);
      if (args[i + 1] && !args[i + 1].startsWith('--')) out.push(args[++i]);
    }
  }
  return out;
};

const runArgs = [path.join(VIDEO_PIPELINE, 'run.js'), ...buildArgs()];
const hasOutput = runArgs.some((a, i) => runArgs[i - 1] === '--output');
if (!hasOutput) {
  runArgs.push('--output');
  runArgs.push('C:\\Users\\wei.liu\\Desktop\\cursor_try\\Ai Videos');
}

console.log('[generate] 调用 video-pipeline:', runArgs[0]);
console.log('[generate] 参数:', runArgs.slice(1).join(' '));

const child = spawn('node', runArgs, {
  cwd: VIDEO_PIPELINE,
  stdio: 'inherit',
  shell: true,
});

child.on('exit', (code) => process.exit(code || 0));
