/**
 * Compass Lyria 文生器乐（instrumental，约 32.8s/段，英文 prompt）。
 * 文档：Lyria Prompt Guide；无效 prompt 会报错。
 *
 * 官方示例：`base_url = .../compass-api/v1` 后再拼 `/v1/projects/...`，即路径中含 **两段 v1**。
 */
import axios, { isAxiosError } from 'axios';
import { resolveCompassApiKeyForGeminiChat } from './compassApiKey.js';
const BASE_URL = process.env.COMPASS_API_URL?.trim() || 'https://compass.llm.shopee.io/compass-api/v1';
const DEFAULT_MODEL = process.env.COMPASS_LYRIA_MODEL?.trim() || 'lyria-002';
function predictPath(modelId) {
    return `v1/projects/shopee-llm-gemini/locations/us-central1/publishers/google/models/${modelId}:predict`;
}
function decodePrediction(pred) {
    if (!pred || typeof pred !== 'object')
        return null;
    const o = pred;
    const b64 = o.bytesBase64Encoded;
    if (typeof b64 !== 'string' || !b64)
        return null;
    return Buffer.from(b64, 'base64');
}
function normalizeLyriaErrorMessage(message) {
    const msg = message || '';
    if (/RESOURCE_EXHAUSTED|quota|rate.?limit|too many requests|429/i.test(msg)) {
        return 'Lyria 模型限流或配额不足（429/RESOURCE_EXHAUSTED），请稍后重试或检查账号配额。';
    }
    return msg;
}
/**
 * 调用 Lyria，返回每段 WAV 二进制（每段约 32.8 秒）。
 */
export async function generateLyriaInstrumentalWavs(options) {
    const apiKey = resolveCompassApiKeyForGeminiChat();
    const model = options.model ?? DEFAULT_MODEL;
    const url = `${BASE_URL.replace(/\/$/, '')}/${predictPath(model)}`;
    // 等价于 .../compass-api/v1/v1/projects/...（与 Compass 文档示例一致）
    const body = {
        instances: [
            {
                prompt: options.prompt.trim(),
                ...(options.negativePrompt?.trim()
                    ? { negative_prompt: options.negativePrompt.trim() }
                    : {}),
            },
        ],
        parameters: {
            sample_count: Math.min(4, Math.max(1, options.sampleCount ?? 1)),
        },
    };
    const doRequest = async () => axios.post(url, body, {
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        timeout: 300_000,
        validateStatus: () => true,
    });
    try {
        let resp;
        try {
            resp = await doRequest();
        }
        catch (firstErr) {
            const msg = firstErr instanceof Error ? firstErr.message : String(firstErr);
            if (!/ECONNRESET|ETIMEDOUT|socket hang up|EAI_AGAIN/i.test(msg))
                throw firstErr;
            // 网络抖动重试一次
            resp = await doRequest();
        }
        const { status, data } = resp;
        if (status < 200 || status >= 300) {
            const errMsg = data?.error?.message ||
                (typeof data === 'object' && data && 'message' in data
                    ? String(data.message)
                    : '') ||
                `HTTP ${status}`;
            throw new Error(normalizeLyriaErrorMessage(errMsg || 'Lyria 请求失败'));
        }
        const errMsg = data.error?.message;
        if (errMsg)
            throw new Error(normalizeLyriaErrorMessage(errMsg));
        const preds = data.predictions;
        if (!Array.isArray(preds) || preds.length === 0) {
            throw new Error('Lyria 未返回 predictions');
        }
        const out = [];
        for (const pred of preds) {
            const buf = decodePrediction(pred);
            if (buf && buf.length > 0)
                out.push(buf);
        }
        if (out.length === 0)
            throw new Error('Lyria 返回的音频为空');
        return out;
    }
    catch (e) {
        if (isAxiosError(e)) {
            const msg = e.response?.data?.error?.message ||
                e.response?.data?.message ||
                (typeof e.response?.data === 'string' ? e.response.data : e.message);
            throw new Error(normalizeLyriaErrorMessage(typeof msg === 'string' && msg ? msg : 'Lyria 请求失败'));
        }
        throw e;
    }
}
/** 官方说明单段约 32.8 秒，供前端时间轴参考 */
export const LYRIA_CLIP_DURATION_SEC = 32.8;
