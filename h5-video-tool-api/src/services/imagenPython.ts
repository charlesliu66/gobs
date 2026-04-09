/**
 * 通过 Python SDK 调用 Compass 图像生成（默认 Gemini 3 Pro Image → 3.1 Flash Image，重画质优先）
 * 依赖: pip install google-genai
 * 环境变量: COMPASS_API_KEY2（优先）/ COMPASS_API_KEY, COMPASS_API_URL
 */
import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { resolveCompassApiKeyPreferKey2 } from './compassApiKey.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PY_SCRIPT = path.resolve(__dirname, '../../scripts/imagen_generate.py');

export interface ImagenPythonOptions {
  prompt: string;
  aspectRatio?: string;
  /** 覆盖默认模型，如 gemini-3.1-flash-image-preview、gemini-3-pro-image-preview */
  model?: string;
  /** 参考图 base64（浪人/场景），用于 edit_image；与画风参考二选一场景不同 */
  referenceImageBase64?: string;
  /** 首镜首帧 base64（不含 data URL 前缀）：后续镜头生图时锁定影调/质感（Gemini 多模态） */
  styleReferenceBase64?: string;
  /** 单次请求覆盖 Compass Key（如前端传入用户自有 Key） */
  apiKeyOverride?: string;
}

export interface ImagenPythonResult {
  imageBase64: string;
  /** 实际调用成功的模型 id（由 imagen_generate.py 返回） */
  model?: string;
}

function getPythonCandidates(): string[] {
  const env = process.env.PYTHON_EXE?.trim();
  if (env) return [env];
  if (process.platform === 'win32') return ['python', 'py', 'python3'];
  return ['python3', 'python'];
}

function runImagenScript(
  pythonExe: string,
  env: NodeJS.ProcessEnv,
): Promise<{ stdout: string; stderr: string; code: number | null }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(pythonExe, [PY_SCRIPT], {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    proc.stdout?.on('data', (d) => (stdout += d.toString()));
    proc.stderr?.on('data', (d) => (stderr += d.toString()));
    proc.on('close', (code) => resolve({ stdout, stderr, code }));
    proc.on('error', (e) => reject(e));
  });
}

export async function generateImageWithPython(options: ImagenPythonOptions): Promise<ImagenPythonResult> {
  const prompt = options.prompt.trim();
  const aspectRatio = options.aspectRatio ?? '16:9';

  const env: NodeJS.ProcessEnv = { ...process.env };
  const resolvedKey = options.apiKeyOverride?.trim()
    ? options.apiKeyOverride.trim()
    : resolveCompassApiKeyPreferKey2();
  env.COMPASS_API_KEY = resolvedKey;
  env.COMPASS_API_KEY2 = resolvedKey;
  // 避免继承 shell/其它任务遗留的 IMAGEN_MODEL，导致与 .env 中 COMPASS_IMAGEN_MODEL 不一致
  if (options.model) {
    env.IMAGEN_MODEL = options.model;
  } else {
    delete env.IMAGEN_MODEL;
  }
  // 首尾帧/纯文生图必须不带参考图；若环境里残留 COMPASS_REF_IMAGE_B64，Python 会走 edit_image，画面会被垫图绑架
  // 大 base64 通过临时文件传递，避免 E2BIG 错误
  const tempFiles: string[] = [];

  if (options.referenceImageBase64) {
    const tmpRef = path.join(os.tmpdir(), `compass_ref_${Date.now()}.b64`);
    await fs.writeFile(tmpRef, options.referenceImageBase64, 'utf-8');
    env.COMPASS_REF_IMAGE_B64_FILE = tmpRef;
    tempFiles.push(tmpRef);
    delete env.COMPASS_REF_IMAGE_B64;
  } else {
    delete env.COMPASS_REF_IMAGE_B64;
    delete env.COMPASS_REF_IMAGE_B64_FILE;
    delete env.COMPASS_REF_IMAGE_MIME;
  }
  if (options.styleReferenceBase64) {
    const tmpStyle = path.join(os.tmpdir(), `compass_style_${Date.now()}.b64`);
    await fs.writeFile(tmpStyle, options.styleReferenceBase64, 'utf-8');
    env.COMPASS_STYLE_REF_B64_FILE = tmpStyle;
    tempFiles.push(tmpStyle);
    delete env.COMPASS_STYLE_REF_B64;
  } else {
    delete env.COMPASS_STYLE_REF_B64;
    delete env.COMPASS_STYLE_REF_B64_FILE;
  }

  // Windows 下通过 argv 传中文长 prompt 可能导致 Python 侧乱码或与输入框不一致，改用 UTF-8 环境变量传递
  env.COMPASS_IMAGEN_PROMPT = prompt;
  env.COMPASS_IMAGEN_ASPECT = aspectRatio;
  const cands = getPythonCandidates();
  let lastError: unknown = null;
  let lastStderr = '';
  let lastCode: number | null = null;

  try {
    for (const exe of cands) {
      try {
        const { stdout, stderr, code } = await runImagenScript(exe, env);
        lastStderr = stderr;
        lastCode = code;
        if (code !== 0) {
          continue;
        }
        const out = JSON.parse(stdout.trim());
        if (!out?.ok || !out.imageBase64) {
          throw new Error(out?.error || '无图像输出');
        }
        return {
          imageBase64: out.imageBase64,
          model: typeof out.model === 'string' ? out.model : undefined,
        };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        // ENOENT 继续尝试下一个 python 可执行名
        if (/ENOENT/i.test(msg)) {
          lastError = e;
          continue;
        }
        throw e;
      }
    }

    if (lastStderr || lastCode !== null) {
      throw new Error(lastStderr || `Python 脚本退出码 ${lastCode}`);
    }
    throw new Error(
      `无法启动 Python 解释器（已尝试: ${cands.join(', ')}）。` +
        (lastError ? `最后错误: ${String(lastError)}。` : '') +
        '请在服务端安装 python3，或在后端 .env 中设置 PYTHON_EXE=/usr/bin/python3 后重启 gobs-api。',
    );
  } finally {
    // 清理临时文件
    for (const f of tempFiles) {
      fs.unlink(f).catch(() => {});
    }
  }
}
