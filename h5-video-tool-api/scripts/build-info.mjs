/**
 * 构建时生成 build-info.json，注入 git 信息
 * 调用时机：npm run build 之后（在 package.json build 脚本末尾追加）
 * 输出：dist/build-info.json
 */
import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '..', 'dist');

function git(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf-8' }).trim();
  } catch {
    return 'unknown';
  }
}

const info = {
  commitSha: git('git rev-parse HEAD'),
  commitShort: git('git rev-parse --short HEAD'),
  branch: git('git rev-parse --abbrev-ref HEAD'),
  buildTime: new Date().toISOString(),
};

mkdirSync(distDir, { recursive: true });
const outPath = path.join(distDir, 'build-info.json');
writeFileSync(outPath, JSON.stringify(info, null, 2));
console.log(`[build-info] written to ${outPath}`);
console.log(`[build-info] commit=${info.commitShort} branch=${info.branch} time=${info.buildTime}`);
