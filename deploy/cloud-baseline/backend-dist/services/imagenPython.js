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
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PY_SCRIPT = path.resolve(__dirname, '../../scripts/imagen_generate.py');
function getPythonCandidates() {
    const env = process.env.PYTHON_EXE?.trim();
    if (env)
        return [env];
    if (process.platform === 'win32')
        return ['python', 'py', 'python3'];
    return ['python3', 'python'];
}
function runImagenScript(pythonExe, env, timeoutMs) {
    return new Promise((resolve, reject) => {
        const proc = spawn(pythonExe, [PY_SCRIPT], {
            env,
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        let stdout = '';
        let stderr = '';
        let settled = false;
        const timer = setTimeout(() => {
            if (settled)
                return;
            settled = true;
            try {
                proc.kill('SIGKILL');
            }
            catch {
                // ignore
            }
            reject(new Error(`Imagen 调用超时（>${Math.round(timeoutMs / 1000)}s）`));
        }, timeoutMs);
        proc.stdout?.on('data', (d) => (stdout += d.toString()));
        proc.stderr?.on('data', (d) => (stderr += d.toString()));
        proc.on('close', (code) => {
            if (settled)
                return;
            settled = true;
            clearTimeout(timer);
            resolve({ stdout, stderr, code });
        });
        proc.on('error', (e) => {
            if (settled)
                return;
            settled = true;
            clearTimeout(timer);
            reject(e);
        });
    });
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function isTransientImagenError(msg) {
    return /RemoteProtocolError|502 Bad Gateway|Connect Upstream Failed|Server disconnected without sending a response|ReadTimeout|timed out|ECONNRESET|EAI_AGAIN/i.test(msg);
}
function isRateLimitOrQuotaError(msg) {
    return /RESOURCE_EXHAUSTED|quota|rate.?limit|429|Too Many Requests/i.test(msg);
}
export async function generateImageWithPython(options) {
    const prompt = options.prompt.trim();
    const aspectRatio = options.aspectRatio ?? '16:9';
    const env = { ...process.env };
    const keyCandidates = options.apiKeyOverride?.trim()
        ? [options.apiKeyOverride.trim()]
        : resolveCompassApiKeyCandidatesPreferKey2();
    // 避免继承 shell/其它任务遗留的 IMAGEN_MODEL，导致与 .env 中 COMPASS_IMAGEN_MODEL 不一致
    if (options.model) {
        env.IMAGEN_MODEL = options.model;
    }
    else {
        delete env.IMAGEN_MODEL;
    }
    // 首尾帧/纯文生图必须不带参考图；若环境里残留 COMPASS_REF_IMAGE_B64，Python 会走 edit_image，画面会被垫图绑架
    // 大 base64 通过临时文件传递，避免 E2BIG 错误
    const tempFiles = [];
    if (options.referenceImageBase64) {
        const tmpRef = path.join(os.tmpdir(), `compass_ref_${Date.now()}.b64`);
        await fs.writeFile(tmpRef, options.referenceImageBase64, 'utf-8');
        env.COMPASS_REF_IMAGE_B64_FILE = tmpRef;
        tempFiles.push(tmpRef);
        delete env.COMPASS_REF_IMAGE_B64;
    }
    else {
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
    }
    else {
        delete env.COMPASS_STYLE_REF_B64;
        delete env.COMPASS_STYLE_REF_B64_FILE;
    }
    // Windows 下通过 argv 传中文长 prompt 可能导致 Python 侧乱码或与输入框不一致，改用 UTF-8 环境变量传递
    env.COMPASS_IMAGEN_PROMPT = prompt;
    env.COMPASS_IMAGEN_ASPECT = aspectRatio;
    const cands = getPythonCandidates();
    let lastError = null;
    let lastStderr = '';
    let lastCode = null;
    const timeoutMs = Math.max(10_000, Math.min(180_000, Number.isFinite(options.timeoutMs)
        ? Number(options.timeoutMs)
        : Number.parseInt(process.env.IMAGEN_REQUEST_TIMEOUT_MS || '70000', 10) || 70_000));
    const maxAttempts = Math.max(1, Math.min(4, Number.isFinite(options.maxAttempts)
        ? Number(options.maxAttempts)
        : Number.parseInt(process.env.IMAGEN_RETRY_ATTEMPTS || '2', 10) || 2));
    try {
        for (let keyIndex = 0; keyIndex < keyCandidates.length; keyIndex++) {
            const resolvedKey = keyCandidates[keyIndex];
            env.COMPASS_API_KEY = resolvedKey;
            env.COMPASS_API_KEY2 = resolvedKey;
            lastError = null;
            lastStderr = '';
            lastCode = null;
            for (const exe of cands) {
                try {
                    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                        const { stdout, stderr, code } = await runImagenScript(exe, env, timeoutMs);
                        lastStderr = stderr;
                        lastCode = code;
                        if (code === 0) {
                            const out = JSON.parse(stdout.trim());
                            if (!out?.ok || !out.imageBase64) {
                                throw new Error(out?.error || '无图像输出');
                            }
                            return {
                                imageBase64: out.imageBase64,
                                model: typeof out.model === 'string' ? out.model : undefined,
                            };
                        }
                        // 短暂网络抖动：同一解释器重试（带退避）
                        if (isTransientImagenError(stderr) && attempt < maxAttempts) {
                            await sleep(700 * attempt);
                            continue;
                        }
                        break;
                    }
                }
                catch (e) {
                    const msg = e instanceof Error ? e.message : String(e);
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
        throw new Error(`无法启动 Python 解释器（已尝试: ${cands.join(', ')}）。` +
            (lastError ? `最后错误: ${String(lastError)}。` : '') +
            '请在服务端安装 python3，或在后端 .env 中设置 PYTHON_EXE=/usr/bin/python3 后重启 gobs-api。');
    }
    finally {
        // 清理临时文件
        for (const f of tempFiles) {
            fs.unlink(f).catch(() => { });
        }
    }
}
