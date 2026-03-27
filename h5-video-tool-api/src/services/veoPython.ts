/**
 * 通过 Python SDK 生成 Veo 视频（与 Compass 文档完全一致）
 * 依赖: pip install google-genai
 * 环境变量: COMPASS_API_KEY / COMPASS_API_KEY2（VEO3）, COMPASS_API_URL
 */
import path from 'path';
import { spawn } from 'child_process';
import axios from 'axios';
import { fileURLToPath } from 'url';
import { resolveCompassApiKeyForVeoModel } from './compassApiKey.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PY_SCRIPT = path.resolve(__dirname, '../../scripts/veo_generate.py');

/** 解析 Veo API 错误，返回用户可读的提示 */
function parseVeoError(stderr: string, modelHint?: string): string | null {
  if (!stderr) return null;
  if (stderr.includes('disallowed Gen AI model') || stderr.includes('FAILED_PRECONDITION') || stderr.includes('vertexai.allowedModels')) {
    const who = modelHint?.trim() ? `（请求模型：${modelHint.trim()}）` : '';
    return `当前模型在组织/项目策略中未开放 Vertex 使用权限${who}。请在 H5 下拉里切换到「veo-2.0-generate-001」；若需使用 VEO3 等模型，请在 GCP/Compass 侧为当前项目开通 allowedModels，并在服务端 .env 的 VEO_MODELS 中仅列出已开通的模型。`;
  }
  if (stderr.includes('403') || stderr.includes('PERMISSION_DENIED')) {
    return '无权限访问 Veo API，请检查 COMPASS_API_KEY / COMPASS_API_KEY2（VEO3）或联系管理员。';
  }
  if (stderr.includes('401') || stderr.includes('UNAUTHENTICATED')) {
    return 'API 认证失败，请检查 COMPASS_API_KEY 或 COMPASS_API_KEY2 是否有效。';
  }
  return null;
}

export interface VeoPythonOptions {
  prompt: string;
  aspectRatio?: string;
  /** 时长（秒），4–8 */
  duration?: number;
  /** 分辨率，720p/1080p/4k */
  resolution?: string;
  /** Veo 模型，如 veo-2.0-generate-001 */
  model?: string;
  /** 参考图 base64（不含 data:image/xxx;base64, 前缀） */
  imageBase64?: string;
  imageMimeType?: string;
}

export interface VeoPythonResult {
  taskId: string;
  videoUrl: string; // base64 data URL
}

export async function generateVideoWithPython(options: VeoPythonOptions): Promise<VeoPythonResult> {
  const prompt = options.prompt.trim();
  const aspectRatio = options.aspectRatio ?? '16:9';

  const env: NodeJS.ProcessEnv = { ...process.env };
  const effectiveModel = options.model?.trim() || process.env.COMPASS_VIDEO_MODEL?.trim();
  env.COMPASS_API_KEY = resolveCompassApiKeyForVeoModel(effectiveModel);
  if (options.model) env.VEO_MODEL = options.model;
  if (options.duration != null) env.VEO_DURATION = String(options.duration);
  if (options.resolution) env.VEO_RESOLUTION = options.resolution;
  if (options.imageBase64) {
    env.COMPASS_REF_IMAGE_B64 = options.imageBase64;
    env.COMPASS_REF_IMAGE_MIME = options.imageMimeType ?? 'image/png';
  }

  return new Promise((resolve, reject) => {
    const proc = spawn('python', [PY_SCRIPT, prompt, aspectRatio], {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    proc.stdout?.on('data', (d) => (stdout += d.toString()));
    proc.stderr?.on('data', (d) => (stderr += d.toString()));

    proc.on('close', async (code) => {
      if (code !== 0) {
        const errMsg =
          parseVeoError(stderr, options.model ?? process.env.COMPASS_VIDEO_MODEL) ||
          stderr ||
          `Python 脚本退出码 ${code}`;
        reject(new Error(errMsg));
        return;
      }
      try {
        const out = JSON.parse(stdout.trim());
        if (!out?.ok || !out.uri) {
          reject(new Error(out?.error || '无视频 URI'));
          return;
        }
        const uri = out.uri;
        const res = await axios.get(uri, { responseType: 'arraybuffer', timeout: 60000 });
        const buf = Buffer.from(res.data);
        const videoUrl = `data:video/mp4;base64,${buf.toString('base64')}`;
        resolve({
          taskId: `veo-${Date.now()}`,
          videoUrl,
        });
      } catch (e) {
        reject(e);
      }
    });

    proc.on('error', (e) => reject(e));
  });
}
