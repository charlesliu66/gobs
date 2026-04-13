/**
 * 本地验证 COMPASS_API_KEY2 + VEO3（与 H5 /api/video/generate 同路径：Python SDK）
 *
 * 用法:
 *   npx tsx scripts/test-veo3-compass-local.ts              # 仅：选路 + HTTP 探针 + Python 依赖检查
 *   npx tsx scripts/test-veo3-compass-local.ts --generate # 真实发起一次 VEO3 文生视频（耗时数分钟、计费）
 */
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import dotenv from 'dotenv';
import axios from 'axios';
import { resolveCompassApiKeyForVeoModel } from '../src/services/compassApiKey.js';
import { generateVideoWithPython } from '../src/services/veoPython.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const BASE =
  process.env.COMPASS_API_URL?.trim() || 'http://compass.llm.shopee.io/compass-api/v1';
const VEO3_MODEL = process.env.VEO3_TEST_MODEL?.trim() || 'veo-3.1-generate-001';

function mask(k: string): string {
  if (k.length <= 12) return '***';
  return `${k.slice(0, 6)}…${k.slice(-4)}`;
}

function checkPythonGenai(): Promise<boolean> {
  return new Promise((resolve) => {
    const p = spawn('python', ['-c', 'import google.genai; print("ok")'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let err = '';
    p.stderr?.on('data', (d) => (err += d.toString()));
    p.on('close', (code) => resolve(code === 0));
  });
}

async function probeBearer(apiKey: string, model: string): Promise<void> {
  const url = `${BASE}/publishers/google/models/${model}:fetchPredictOperation`;
  const { status, data } = await axios.post(
    url,
    { operationName: 'local-probe-invalid' },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      validateStatus: () => true,
      timeout: 30000,
    }
  );
  console.log(`  HTTP ${status}（无效 operation 探针，非 401/403 即表示 Bearer 被网关接受）`);
  if (status === 401 || status === 403) {
    throw new Error(`Key 认证失败 HTTP ${status}，请检查 COMPASS_API_KEY2`);
  }
  if (status !== 401 && status !== 403) {
    console.log('  响应片段:', JSON.stringify(data).slice(0, 200));
  }
}

async function main() {
  const doGenerate = process.argv.includes('--generate');

  console.log('=== VEO3 本地验证（与 H5 相同：veoPython → veo_generate.py）===\n');
  console.log('COMPASS_API_URL:', BASE);
  console.log('测试模型:', VEO3_MODEL);

  const k2 = process.env.COMPASS_API_KEY2?.trim();
  const k1 = process.env.COMPASS_API_KEY?.trim();
  console.log('COMPASS_API_KEY:  ', k1 ? mask(k1) : '(未设置)');
  console.log('COMPASS_API_KEY2: ', k2 ? mask(k2) : '(未设置)');
  console.log('');

  const resolved = resolveCompassApiKeyForVeoModel(VEO3_MODEL);
  console.log(`resolveCompassApiKeyForVeoModel("${VEO3_MODEL}") → ${mask(resolved)}`);
  if (!k2) {
    console.warn('\n⚠️ 未配置 COMPASS_API_KEY2，VEO3 会回退到 COMPASS_API_KEY，可能不是你有权限的那把 Key。');
  } else if (resolved !== k2) {
    throw new Error('逻辑错误：VEO3 应解析为 COMPASS_API_KEY2');
  }

  console.log('\n--- 1) Python 依赖 google-genai ---');
  const hasGenai = await checkPythonGenai();
  console.log(hasGenai ? '  OK: pip install google-genai 已就绪' : '  失败: 请执行 pip install google-genai');
  if (!hasGenai) process.exit(1);

  console.log('\n--- 2) Bearer 探针（KEY2 + VEO3 模型路径）---');
  await probeBearer(resolved, VEO3_MODEL);

  if (!doGenerate) {
    console.log('\n✅ 轻量验证完成。若要**真实生成一段视频**（与 H5 完全一致），请执行：');
    console.log('   npx tsx scripts/test-veo3-compass-local.ts --generate\n');
    return;
  }

  console.log('\n--- 3) 真实文生视频（短 prompt，约 8s，请等待轮询）---');
  const { taskId, videoUrl } = await generateVideoWithPython({
    prompt: 'A single red apple on a white table, soft studio light, slow subtle camera push-in, cinematic.',
    aspectRatio: '16:9',
    duration: 8,
    model: VEO3_MODEL,
    resolution: '720p',
  });
  console.log('taskId:', taskId);
  console.log('videoUrl 长度(base64 data URL):', videoUrl.length);
  console.log('\n✅ VEO3 Key 与模型调用成功（与 H5 同一路径）。');
}

main().catch((e) => {
  console.error('\n❌', e instanceof Error ? e.message : e);
  if (e instanceof Error && e.message.includes('策略')) {
    console.error('\n若仍报组织策略：请确认该 Key 在 Compass/GCP 上绑定的项目已允许此模型 id。');
  }
  process.exit(1);
});
