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
import { resolveCompassApiKeyCandidatesPreferKey2 } from './compassApiKey.js';
import { recordKeyUsage } from './keyUsageStats.js';

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
  /** 单次调用最大重试次数（覆盖环境变量 IMAGEN_RETRY_ATTEMPTS） */
  maxAttempts?: number;
  /** 单次 Python 进程超时（毫秒）；超时会强制终止，避免卡住几分钟 */
  timeoutMs?: number;
}

export interface ImagenPythonResult {
  imageBase64: string;
  /** 实际调用成功的模型 id（由 imagen_generate.py 返回） */
  model?: string;
}

// 进程内全局串行：所有 Imagen 请求按队列线性执行，避免并发放大失败率。
let imagenQueueTail: Promise<void> = Promise.resolve();

function getPythonCandidates(): string[] {
  const env = process.env.PYTHON_EXE?.trim();
  if (env) return [env];
  if (process.platform === 'win32') return ['python', 'py', 'python3'];
  return ['python3', 'python'];
}

function runImagenScript(
  pythonExe: string,
  env: NodeJS.ProcessEnv,
  timeoutMs: number,
): Promise<{ stdout: string; stderr: string; code: number | null }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(pythonExe, [PY_SCRIPT], {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try {
        proc.kill('SIGKILL');
      } catch {
        // ignore
      }
      reject(new Error(`Imagen 调用超时（>${Math.round(timeoutMs / 1000)}s）`));
    }, timeoutMs);
    proc.stdout?.on('data', (d) => (stdout += d.toString()));
    proc.stderr?.on('data', (d) => (stderr += d.toString()));
    proc.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ stdout, stderr, code });
    });
    proc.on('error', (e) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(e);
    });
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientImagenError(msg: string): boolean {
  return /RemoteProtocolError|502 Bad Gateway|Connect Upstream Failed|Server disconnected without sending a response|ReadTimeout|timed out|ECONNRESET|EAI_AGAIN/i.test(
    msg,
  );
}

function isRateLimitOrQuotaError(msg: string): boolean {
  return /RESOURCE_EXHAUSTED|quota|rate.?limit|429|Too Many Requests/i.test(msg);
}

function isModelUnavailableError(msg: string): boolean {
  return /404|not found|does not have access|403|permission|no permission/i.test(msg);
}

function getModelCandidates(optionsModel?: string): string[] {
  const forced = optionsModel?.trim();
  if (forced) return [forced];
  const raw =
    process.env.COMPASS_IMAGEN_MODEL_CANDIDATES?.trim() ||
    process.env.COMPASS_IMAGEN_MODEL?.trim() ||
    'gemini-3.1-flash-image-preview,gemini-3-pro-image-preview';
  const out = raw
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
  return out.length ? [...new Set(out)] : ['gemini-3.1-flash-image-preview', 'gemini-3-pro-image-preview'];
}

export async function generateImageWithPython(options: ImagenPythonOptions): Promise<ImagenPythonResult> {
  const previous = imagenQueueTail.catch(() => {});
  let releaseQueue!: () => void;
  imagenQueueTail = new Promise<void>((resolve) => {
    releaseQueue = resolve;
  });
  await previous;

  const prompt = options.prompt.trim();
  const aspectRatio = options.aspectRatio ?? '16:9';

  const env: NodeJS.ProcessEnv = { ...process.env };
  const keyCandidates = options.apiKeyOverride?.trim()
    ? [options.apiKeyOverride.trim()]
    : resolveCompassApiKeyCandidatesPreferKey2();
  const modelCandidates = getModelCandidates(options.model);
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
  const timeoutMs = Math.max(
    10_000,
    Math.min(
      180_000,
      Number.isFinite(options.timeoutMs as number)
        ? Number(options.timeoutMs)
        : Number.parseInt(process.env.IMAGEN_REQUEST_TIMEOUT_MS || '70000', 10) || 70_000,
    ),
  );
  const maxAttempts = Math.max(
    1,
    Math.min(
      4,
      Number.isFinite(options.maxAttempts as number)
        ? Number(options.maxAttempts)
        : Number.parseInt(process.env.IMAGEN_RETRY_ATTEMPTS || '2', 10) || 2,
    ),
  );

  try {
    for (let keyIndex = 0; keyIndex < keyCandidates.length; keyIndex++) {
      const resolvedKey = keyCandidates[keyIndex]!;
      env.COMPASS_API_KEY = resolvedKey;
      env.COMPASS_API_KEY2 = resolvedKey;
      lastError = null;
      lastStderr = '';
      lastCode = null;

      for (const exe of cands) {
        try {
          for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            for (const model of modelCandidates) {
              env.IMAGEN_MODEL = model;
              env.COMPASS_IMAGEN_STRICT_MODEL = '1';
              const { stdout, stderr, code } = await runImagenScript(exe, env, timeoutMs);
              lastStderr = stderr;
              lastCode = code;
              await recordKeyUsage({ success: code === 0 });
              if (code === 0) {
                const out = JSON.parse(stdout.trim());
                if (!out?.ok || !out.imageBase64) {
                  throw new Error(out?.error || '无图像输出');
                }
                return {
                  imageBase64: out.imageBase64,
                  model: typeof out.model === 'string' ? out.model : model,
                };
              }
              const modelErr = stderr || `Python 脚本退出码 ${code}`;
              if (isModelUnavailableError(modelErr) || isRateLimitOrQuotaError(modelErr) || isTransientImagenError(modelErr)) {
                continue;
              }
              // 非可降级错误：直接结束本轮，交给外层逻辑处理
              break;
            }
            // 短暂网络抖动：同一解释器重试（带退避）
            if (isTransientImagenError(lastStderr) && attempt < maxAttempts) {
              await sleep(700 * attempt);
              continue;
            }
            break;
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          await recordKeyUsage({ success: false });
          // ENOENT 继续尝试下一个 python 可执行名
          if (/ENOENT/i.test(msg)) {
            lastError = e;
            continue;
          }
          throw e;
        }
      }

      // 当前 key 失败后：若是配额/限流，自动切换下一把 key 再试
      const keyFailMsg = `${lastStderr || ''} ${lastError instanceof Error ? lastError.message : String(lastError ?? '')}`.trim();
      const hasNextKey = keyIndex < keyCandidates.length - 1;
      if (hasNextKey && isRateLimitOrQuotaError(keyFailMsg)) {
        // 若所有 key 共享同一个 Compass 项目配额，切换 key 不会立即解决 429
        // 短暂等待后再试，避免连续失败叠加延迟
        await sleep(2000);
        continue;
      }
      if (lastStderr || lastCode !== null) {
        throw new Error(lastStderr || `Python 脚本退出码 ${lastCode}`);
      }
      if (lastError) {
        throw new Error(lastError instanceof Error ? lastError.message : String(lastError));
      }
      throw new Error('生图失败：未获得有效输出');
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
    delete env.IMAGEN_MODEL;
    delete env.COMPASS_IMAGEN_STRICT_MODEL;
    // 清理临时文件
    for (const f of tempFiles) {
      fs.unlink(f).catch(() => {});
    }
    releaseQueue();
  }
}
