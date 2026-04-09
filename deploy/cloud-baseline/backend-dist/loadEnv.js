import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
/** 必须在其它模块之前 import，否则依赖 process.env 的顶层常量会在 dotenv 之前求值。（.env 变更后请重启 dev） */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(__dirname, '..', '..');
const paths = [
    path.join(repoRoot, '.env'),
    path.join(repoRoot, '.env.local'),
    path.join(repoRoot, 'SJ', 'web', '.env.local'),
    path.join(repoRoot, 'SJ', '.env.local'),
    path.join(apiRoot, '.env'),
    path.join(apiRoot, '.env.local'),
];
for (const p of paths) {
    dotenv.config({ path: p, override: true });
}
