/**
 * 排查本地访问 clipai.ingarena 时出现 HTTP 403 / 与 H5 行为不一致。
 *
 * 用法（在项目根 h5-video-tool-api 下）：
 *   npx tsx scripts/diagnose-kling-ingarena.ts
 *
 * 说明：
 * - 与业务使用相同的 axios 配置（proxy: false，仅 KLING_HTTP_PROXY 显式时代理）
 * - 不打印 KLING_API_KEY
 */
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import {
  getKlingIngarenaDiagnosticsEnv,
  probeIngarenaKlingVideoList,
} from '../src/services/klingVideo.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

async function main() {
  console.log('--- 可灵 / ingarena 网络诊断 ---\n');
  console.log('Node:', process.version);
  console.log('cwd:', process.cwd());

  const env = getKlingIngarenaDiagnosticsEnv();
  console.log('\n[环境变量·是否设置]');
  console.log('  KLING_API_BASE_URL:', env.baseURL);
  console.log('  KLING_HTTP_PROXY / KLING_HTTPS_PROXY:', env.klingHttpProxySet ? '已设置' : '未设置');
  console.log('  HTTPS_PROXY（全局）:', env.httpsProxyGlobalSet ? '已设置（可灵客户端会忽略，仍直连）' : '未设置');
  console.log('  HTTP_PROXY（全局）:', env.httpProxyGlobalSet ? '已设置' : '未设置');

  console.log('\n[探测] GET /api/kling/video-list?page=1&pageSize=1（与 H5 列表同源）');
  try {
    const { status, bodyPreview } = await probeIngarenaKlingVideoList();
    console.log('  HTTP 状态码:', status);
    console.log('  响应片段:', bodyPreview);
    if (status === 403) {
      console.log(
        '\n  → 403：多为当前进程的出口 IP 未被 ingarena/公司网关放行。请在本机、已连公司 VPN 的终端重试；若在 Cursor Agent 远程执行，出口可能不是你的办公网。',
      );
    } else if (status >= 200 && status < 300) {
      console.log('\n  → 探测成功：本机 Node 与 ingarena 连通，可与 H5 对照排查其它差异（请求体大小、路径等）。');
    }
  } catch (e) {
    console.error('  探测失败:', e instanceof Error ? e.message : e);
  }
}

main();
