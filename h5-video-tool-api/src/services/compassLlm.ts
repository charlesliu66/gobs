/**
 * 从 GOBS h5-video-tool-api 抽离的 Compass OpenAI 兼容 chat（仅供风控大师 bundle 使用）。
 * 环境变量：COMPASS_API_KEY、可选 COMPASS_API_KEY2、COMPASS_API_URL、COMPASS_GEMINI_MODEL、GEMINI_PROXY
 */
import axios, { isAxiosError } from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';

function resolveCompassApiKeyForGeminiChat(): string {
  const key1 = process.env.COMPASS_API_KEY?.trim() ?? '';
  const key2 = process.env.COMPASS_API_KEY2?.trim() ?? '';
  if (key1) return key1;
  if (key2) return key2;
  throw new Error('COMPASS_API_KEY 或 COMPASS_API_KEY2 未配置（Gemini 文本需至少一把 Compass Key）');
}

const DEFAULT_COMPASS_API_URL = 'http://compass.llm.shopee.io/compass-api/v1';
const DEFAULT_COMPASS_GEMINI_MODEL = 'gemini-2.5-flash';

function getCompassLlmConfig() {
  const apiKey = resolveCompassApiKeyForGeminiChat();
  const baseURL = (process.env.COMPASS_API_URL?.trim() || DEFAULT_COMPASS_API_URL).replace(/\/$/, '');
  const model = process.env.COMPASS_GEMINI_MODEL?.trim() || DEFAULT_COMPASS_GEMINI_MODEL;
  return { apiKey, baseURL, model };
}

function createCompassHttpClient() {
  const proxyUrl = process.env.GEMINI_PROXY?.trim();
  const config: Parameters<typeof axios.create>[0] = {
    timeout: 120000,
    headers: { 'Content-Type': 'application/json' },
  };
  if (proxyUrl) {
    config.httpsAgent = new HttpsProxyAgent(proxyUrl);
    config.proxy = false;
  }
  return axios.create(config);
}

async function postCompassChatCompletions(
  body: Record<string, unknown>,
  opts?: { timeout?: number; logLabel?: string },
): Promise<{ text: string }> {
  const { apiKey, baseURL } = getCompassLlmConfig();
  const client = createCompassHttpClient();
  try {
    const { data } = await client.post<{
      choices?: Array<{ message?: { content?: string | null } }>;
      error?: { message?: string };
    }>(`${baseURL}/chat/completions`, body, {
      headers: { Authorization: `Bearer ${apiKey}` },
      timeout: opts?.timeout,
    });

    const errMsg = data.error?.message;
    if (errMsg) throw new Error(errMsg);

    const rawText = data.choices?.[0]?.message?.content?.trim() ?? '';
    if (!rawText) throw new Error('Compass Gemini 返回内容为空');
    return { text: rawText };
  } catch (e) {
    if (isAxiosError(e)) {
      const msg =
        (e.response?.data as { error?: { message?: string } })?.error?.message ||
        (typeof e.response?.data === 'string' ? e.response.data : e.message);
      throw new Error(typeof msg === 'string' && msg ? msg : 'Compass Gemini 请求失败');
    }
    throw e;
  }
}

export async function compassChatCompletion(options: {
  systemPrompt: string;
  userText: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  const { model } = getCompassLlmConfig();
  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: 'system', content: options.systemPrompt },
      { role: 'user', content: options.userText },
    ],
    temperature: options.temperature ?? 0.3,
  };
  if (options.maxTokens != null) body.max_tokens = options.maxTokens;
  const r = await postCompassChatCompletions(body, { logLabel: 'riskSentiment' });
  return r.text;
}
