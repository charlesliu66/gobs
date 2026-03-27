/**
 * 校验 COMPASS_API_KEY2 与 VEO3 选路：不发起完整视频任务，仅验证密钥可被 Compass 接受。
 * 用法: npx tsx scripts/verify-compass-veo3-key.ts
 */
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import axios from 'axios';
import {
  resolveCompassApiKeyForVeoModel,
} from '../src/services/compassApiKey.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const BASE =
  process.env.COMPASS_API_URL?.trim() || 'https://compass.llm.shopee.io/compass-api/v1';

function mask(k: string): string {
  if (k.length <= 12) return '***';
  return `${k.slice(0, 6)}…${k.slice(-4)}`;
}

async function probeKey(label: string, apiKey: string, model: string): Promise<void> {
  const url = `${BASE}/publishers/google/models/${model}:fetchPredictOperation`;
  const { status, data } = await axios.post(
    url,
    { operationName: 'verify-probe-invalid-operation' },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      validateStatus: () => true,
      timeout: 30000,
    }
  );
  console.log(`[${label}] ${model} → HTTP ${status}`);
  if (status === 401 || status === 403) {
    throw new Error(`${label} 认证失败（${status}），请检查 Key`);
  }
  if (status >= 500) {
    console.warn(
      '  网关返回 5xx（探针使用无效 operation，部分环境会报 500）。未出现 401/403 时通常表示 Bearer 已被接受。响应片段:',
      JSON.stringify(data).slice(0, 160)
    );
  } else {
    console.log('  预期为业务错误（无效 operation），说明 Bearer 已被接受。');
  }
}

async function main() {
  const k2 = process.env.COMPASS_API_KEY2?.trim();
  const k1 = process.env.COMPASS_API_KEY?.trim();

  console.log('Compass base:', BASE);
  console.log('COMPASS_API_KEY:', k1 ? mask(k1) : '(未设置)');
  console.log('COMPASS_API_KEY2:', k2 ? mask(k2) : '(未设置)');
  console.log('');

  const veo3 = 'veo-3.1-generate-001';
  const resolved = resolveCompassApiKeyForVeoModel(veo3);
  console.log(`resolveCompassApiKeyForVeoModel("${veo3}") → ${mask(resolved)}`);
  if (k2 && resolved !== k2) {
    throw new Error('VEO3 应选用 COMPASS_API_KEY2，但解析结果不一致');
  }
  console.log('');

  if (k1) {
    await probeKey('VEO2 Key', k1, 'veo-2.0-generate-001');
  }
  if (k2) {
    await probeKey('VEO3 Key (KEY2)', k2, veo3);
  } else {
    console.warn('未配置 COMPASS_API_KEY2，跳过 VEO3 探针');
  }

  console.log('\n✅ 选路与轻量探针完成（未创建真实视频任务）。');
}

main().catch((e) => {
  console.error('❌', e instanceof Error ? e.message : e);
  process.exit(1);
});
