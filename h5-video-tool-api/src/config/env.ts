/**
 * 启动配置校验 + 目录自检
 * 在 index.ts 顶部调用，确保服务以正确配置启动
 */
import { mkdirSync, existsSync } from 'node:fs';
import { getApiDataDir, getDefaultVideoOutputDir, getUploadsPath } from './apiDataDir.js';

// ── 必填项定义 ──────────────────────────────────────────────────────────────
const REQUIRED_VARS: Array<{ key: string; description: string }> = [
  { key: 'COMPASS_API_URL', description: 'Compass 内网地址（LLM/视频生成）' },
  { key: 'COMPASS_API_KEY', description: 'Compass 主 API Key' },
];

// JWT_SECRET 有默认值但在生产环境必须修改
const WARN_IF_DEFAULT: Array<{ key: string; defaultValue: string; description: string }> = [
  {
    key: 'JWT_SECRET',
    defaultValue: 'gobs-secret-change-in-production',
    description: 'JWT 签名密钥（生产环境必须修改）',
  },
];

// ── 必要目录列表 ────────────────────────────────────────────────────────────
function getRequiredDirs(): Array<{ path: string; label: string }> {
  return [
    { path: getApiDataDir(), label: 'API_DATA_DIR（数据根目录）' },
    { path: getDefaultVideoOutputDir(), label: 'output（视频输出）' },
    { path: getUploadsPath(), label: 'uploads（文件上传）' },
    { path: getUploadsPath('editor'), label: 'uploads/editor' },
  ];
}

// ── 校验入口 ────────────────────────────────────────────────────────────────
export function validateEnvAndDirs(): void {
  let hasFatal = false;

  // 1. 必填项检查
  const missing = REQUIRED_VARS.filter(({ key }) => !process.env[key]?.trim());
  if (missing.length > 0) {
    console.error('\n[env] ❌ 启动失败：缺少必填环境变量');
    for (const { key, description } of missing) {
      console.error(`       缺少: ${key}  ← ${description}`);
    }
    console.error('       请检查 .env 文件（参考 .env.example）\n');
    hasFatal = true;
  }

  // 2. 生产安全警告
  for (const { key, defaultValue, description } of WARN_IF_DEFAULT) {
    const val = process.env[key]?.trim();
    if (!val || val === defaultValue) {
      console.warn(`[env] ⚠️  ${key} 使用默认值，生产环境请修改  ← ${description}`);
    }
  }

  if (hasFatal) {
    process.exit(1);
  }

  // 3. 目录自检：不存在则自动创建
  const dirs = getRequiredDirs();
  for (const { path: dirPath, label } of dirs) {
    if (!existsSync(dirPath)) {
      try {
        mkdirSync(dirPath, { recursive: true });
        console.log(`[env] 📁 已创建目录: ${dirPath}  (${label})`);
      } catch (err) {
        console.error(`[env] ❌ 无法创建目录: ${dirPath}  (${label})`, err);
      }
    }
  }

  console.log(`[env] ✅ 配置校验通过，数据根目录: ${getApiDataDir()}`);
}
