/**
 * 通过 Python SDK 调用 Compass Imagen 图像生成
 * 依赖: pip install google-genai
 * 环境变量: COMPASS_API_KEY, COMPASS_API_URL
 */
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PY_SCRIPT = path.resolve(__dirname, '../../scripts/imagen_generate.py');

export interface ImagenPythonOptions {
  prompt: string;
  aspectRatio?: string;
  /** Imagen 模型，如 imagen-4.0-generate-preview-06-06 */
  model?: string;
  /** 参考图 base64（浪人/场景），用于保持风格一致 */
  referenceImageBase64?: string;
}

export interface ImagenPythonResult {
  imageBase64: string;
}

export async function generateImageWithPython(options: ImagenPythonOptions): Promise<ImagenPythonResult> {
  const prompt = options.prompt.trim();
  const aspectRatio = options.aspectRatio ?? '16:9';

  const env: NodeJS.ProcessEnv = { ...process.env };
  if (options.model) env.IMAGEN_MODEL = options.model;
  if (options.referenceImageBase64) env.COMPASS_REF_IMAGE_B64 = options.referenceImageBase64;

  return new Promise((resolve, reject) => {
    const proc = spawn('python', [PY_SCRIPT, prompt, aspectRatio], {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    proc.stdout?.on('data', (d) => (stdout += d.toString()));
    proc.stderr?.on('data', (d) => (stderr += d.toString()));

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `Python 脚本退出码 ${code}`));
        return;
      }
      try {
        const out = JSON.parse(stdout.trim());
        if (!out?.ok || !out.imageBase64) {
          reject(new Error(out?.error || '无图像输出'));
          return;
        }
        resolve({ imageBase64: out.imageBase64 });
      } catch (e) {
        reject(e);
      }
    });

    proc.on('error', (e) => reject(e));
  });
}
