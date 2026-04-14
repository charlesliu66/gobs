import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

/** 必须在其它模块之前 import，否则依赖 process.env 的顶层常量会在 dotenv 之前求值。（.env 变更后请重启 dev）
 *
 * 单一 .env 策略：只读 h5-video-tool-api/.env 和 h5-video-tool-api/.env.local。
 * 后者优先（override: true），用于本地覆盖（git-ignored）。
 * 旧版曾从 repoRoot 加载 6 个文件（override 级联），导致同名变量来源不明，已废弃。
 *
 * 路径解析：
 *   - 编译后（dist/loadEnv.js）：__dirname = api/dist/ → apiRoot = api/
 *   - 直接部署（api/loadEnv.js）：__dirname = api/ → apiRoot = api/（basename ≠ 'dist'，不往上走）
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.basename(__dirname) === 'dist'
  ? path.resolve(__dirname, '..')
  : __dirname;

for (const p of [path.join(apiRoot, '.env'), path.join(apiRoot, '.env.local')]) {
  dotenv.config({ path: p, override: true });
}

