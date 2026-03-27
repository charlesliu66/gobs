#!/usr/bin/env node
/**
 * 封装 geelark-publish 或 emulator-distribute 调用
 * 用法：node distribute.js [--latest] [--videos "path1,path2"] [--env-ids "id1,id2"] [--platforms tiktok] [--caption "..."]
 *       node distribute.js --emulator [--latest] [--caption "..."]  # 跳过 GeeLark，用本地模拟器
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const args = process.argv.slice(2);
const useEmulator = args.includes('--emulator');

if (useEmulator) {
  const QAS_ROOT = process.env.QAS_ROOT || path.join(process.env.USERPROFILE || '', 'Desktop', 'cursor_try', 'QAS');
  const EMULATOR_DISTRIBUTE = path.join(QAS_ROOT, 'scripts', 'emulator-distribute', 'distribute.js');
  const emulatorArgs = args.filter((a) => a !== '--emulator');

  if (!fs.existsSync(EMULATOR_DISTRIBUTE)) {
    console.error('[distribute] 未找到 emulator-distribute，路径:', EMULATOR_DISTRIBUTE);
    process.exit(1);
  }
  console.log('[distribute] 使用模拟器模式:', EMULATOR_DISTRIBUTE);
  console.log('[distribute] 参数:', emulatorArgs.join(' '));

  const child = spawn('node', [EMULATOR_DISTRIBUTE, ...emulatorArgs], {
    cwd: path.dirname(EMULATOR_DISTRIBUTE),
    stdio: 'inherit',
    shell: true,
  });
  child.on('exit', (code) => process.exit(code || 0));
} else {
  const GEELARK_PUBLISH = process.env.GEELARK_PUBLISH_DIR || path.join(process.env.USERPROFILE || '', '.cursor', 'skills', 'geelark-publish');
  const PUBLISH_JS = path.join(GEELARK_PUBLISH, 'scripts', 'publish.js');
  const hasEnvIds = args.some((a, i) => (args[i] === '--env-ids' || args[i] === '--env-id') && args[i + 1]);
  const runArgs = [PUBLISH_JS, ...args];

  if (!hasEnvIds) {
    const cfgPath = path.join(process.env.USERPROFILE || '', 'Desktop', 'cursor_try', 'QAS', 'config', 'geelark.json');
    try {
      if (fs.existsSync(cfgPath)) {
        const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
        if (cfg.defaultEnvIds?.length) {
          runArgs.push('--env-ids');
          runArgs.push(cfg.defaultEnvIds.join(','));
        }
      }
    } catch (_) {}
  }

  console.log('[distribute] 调用 geelark-publish:', PUBLISH_JS);
  console.log('[distribute] 参数:', runArgs.slice(1).join(' '));

  const child = spawn('node', runArgs, {
    cwd: GEELARK_PUBLISH,
    stdio: 'inherit',
    shell: true,
  });
  child.on('exit', (code) => process.exit(code || 0));
}
