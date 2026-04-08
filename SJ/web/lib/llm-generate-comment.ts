/**
 * 评论生成：优先 Gemini（GOOGLE_API_KEY / GEMINI_API_KEY），否则 OpenAI
 * Gemini 使用官方 @google/generative-ai，密钥仅来自环境变量，勿写入代码。
 */

import { GoogleGenerativeAI } from "@google/generative-ai"

const SYSTEM_PROMPT_TIKTOK =
  "You write short, natural TikTok comments. Output only the comment text, nothing else—no quotes, no numbering, no preamble. " +
  "If the user message includes Python code, policy text, or safety-filter rules (e.g. forbidden topics, banned terms, tone or length limits), treat those as mandatory constraints and obey them strictly."

const SYSTEM_PROMPT_FACEBOOK =
  "You write short, natural Facebook comments on posts. Output only the comment text, nothing else—no quotes, no numbering, no preamble. " +
  "If the user message includes Python code, policy text, or safety-filter rules (e.g. forbidden topics, banned terms, tone or length limits), treat those as mandatory constraints and obey them strictly."

function systemPromptBase(platform?: "tiktok" | "facebook"): string {
  return platform === "facebook" ? SYSTEM_PROMPT_FACEBOOK : SYSTEM_PROMPT_TIKTOK
}

function buildSystemPrompt(outputLocale?: string, platform?: "tiktok" | "facebook"): string {
  const base = systemPromptBase(platform)
  if (!outputLocale?.trim()) return base
  const tag = outputLocale.trim()
  return (
    base +
    ` The user message specifies a mandatory OUTPUT LOCALE: "${tag}". You MUST write the entire comment in that language only (e.g. zh-CN = Simplified Chinese, en = English, ja = Japanese, ko = Korean, th = Thai, id = Indonesian). ` +
    "If the rules or examples above are written in another language, still produce the final comment in the OUTPUT LOCALE. Do not mix languages in the comment body except proper nouns or brand names when necessary."
  )
}

/** gemini-2.0-flash 在部分免费账号上配额为 0；按序尝试其它仍常有额度的型号 */
const GEMINI_MODEL_FALLBACKS = [
  "gemini-2.5-flash-lite",
  "gemini-1.5-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash-8b",
  "gemini-2.0-flash",
] as const

function isGeminiQuotaError(msg: string): boolean {
  return /429|quota|exceeded|Too Many Requests|RESOURCE_EXHAUSTED|limit:\s*0/i.test(msg)
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function getGeminiKey(): string {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GEMENI_API_KEY /* 常见拼写错误 */ ||
    ""
  ).trim()
}

export async function generateCommentWithLlm(
  userContent: string,
  options?: { outputLocale?: string; platform?: "tiktok" | "facebook" },
): Promise<{ comment: string } | { error: string }> {
  const geminiKey = getGeminiKey()
  const openaiKey = (process.env.OPENAI_API_KEY || "").trim()
  const systemPrompt = buildSystemPrompt(options?.outputLocale, options?.platform)

  if (geminiKey) {
    return generateWithGemini(geminiKey, userContent, systemPrompt)
  }
  if (openaiKey) {
    return generateWithOpenAI(openaiKey, userContent, systemPrompt)
  }
  return {
    error:
      "未检测到可用的 AI Key。请检查：① 文件为 web/.env.local（与 web/package.json 同目录），一行 GEMINI_API_KEY=密钥（勿加引号、勿写成 GEMENI）；② 保存后必须重启 npm run dev；③ 浏览器打开 /api/ai-config-status 看 ready 是否为 true。线上需在 Vercel Environment Variables 配置并重新部署。",
  }
}

async function generateWithGeminiOnce(
  apiKey: string,
  userContent: string,
  modelName: string,
  systemInstruction: string | undefined,
): Promise<{ comment: string } | { error: string }> {
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel(
    systemInstruction != null
      ? { model: modelName, systemInstruction }
      : { model: modelName },
  )
  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: userContent }] }],
    generationConfig: {
      temperature: 0.85,
      maxOutputTokens: 400,
    },
  })
  const text = result.response.text() ?? ""
  const comment = text.replace(/^["「]|["」]$/g, "").trim()
  if (!comment) {
    return { error: "Gemini 未返回有效评论（可能被安全策略拦截）" }
  }
  return { comment }
}

async function generateWithGemini(
  apiKey: string,
  userContent: string,
  systemInstruction: string,
): Promise<{ comment: string } | { error: string }> {
  const preferred = process.env.GEMINI_MODEL?.trim()
  const ordered = preferred
    ? [preferred, ...GEMINI_MODEL_FALLBACKS.filter((m) => m !== preferred)]
    : [...GEMINI_MODEL_FALLBACKS]

  let lastMsg = ""
  for (let i = 0; i < ordered.length; i++) {
    const modelName = ordered[i]
    try {
      const out = await generateWithGeminiOnce(apiKey, userContent, modelName, systemInstruction)
      if ("comment" in out) return out
      lastMsg = out.error
    } catch (e) {
      lastMsg = e instanceof Error ? e.message : String(e)
    }
    if (isGeminiQuotaError(lastMsg) || /not found|not supported|404/i.test(lastMsg)) {
      if (i < ordered.length - 1) await sleep(400)
      continue
    }
    if (i < ordered.length - 1) {
      await sleep(200)
      continue
    }
    return { error: lastMsg || "Gemini 请求失败" }
  }

  return {
    error: `${lastMsg || "Gemini 不可用"}。请检查 Google AI Studio 配额，或在 web/.env.local 设置 GEMINI_MODEL（如 gemini-1.5-flash）。说明：https://ai.google.dev/gemini-api/docs/rate-limits`,
  }
}

async function generateWithOpenAI(
  apiKey: string,
  userContent: string,
  systemInstruction: string,
): Promise<{ comment: string } | { error: string }> {
  const baseUrl = (process.env.OPENAI_API_BASE || "https://api.openai.com/v1").replace(/\/$/, "")
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini"

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: userContent },
      ],
      max_tokens: 400,
      temperature: 0.85,
    }),
  })

  const raw = await res.text()
  let data: {
    choices?: { message?: { content?: string } }[]
    error?: { message?: string }
  } = {}
  try {
    if (raw) data = JSON.parse(raw) as typeof data
  } catch {
    return { error: `模型返回非 JSON: ${raw.slice(0, 200)}` }
  }

  if (!res.ok) {
    const msg = data.error?.message || raw.slice(0, 300)
    return { error: msg || `HTTP ${res.status}` }
  }

  const text = data.choices?.[0]?.message?.content?.trim() || ""
  const comment = text.replace(/^["「]|["」]$/g, "").trim()
  if (!comment) {
    return { error: "模型未返回有效评论" }
  }
  return { comment }
}

/** 批量评论页「Sparkles」5 条备选：优先 Gemini，否则 OpenAI */
export async function generateFiveTiktokSuggestions(
  videoUrl: string,
  opts?: { safetyRulesBlock?: string; platform?: "tiktok" | "facebook" },
): Promise<string[] | null> {
  const safety =
    opts?.safetyRulesBlock?.trim() != null && opts.safetyRulesBlock.trim() !== ""
      ? `【必须先遵守的安全规则】\n${opts.safetyRulesBlock.trim()}\n\n`
      : ""
  const isFb = opts?.platform === "facebook"
  const userContent = isFb
    ? `${safety}Generate 5 short, natural Facebook comment suggestions for a post. One per line, no numbering. Mix English and Chinese when appropriate. Keep each under 100 characters. Obey any safety rules above. Post link: ${videoUrl || "unknown"}`
    : `${safety}Generate 5 short, natural TikTok comment suggestions for a video. One per line, no numbering. Mix English and Chinese. Keep each under 100 characters. Obey any safety rules above. Video link: ${videoUrl || "unknown"}`

  const geminiKey = getGeminiKey()
  const openaiKey = (process.env.OPENAI_API_KEY || "").trim()

  if (geminiKey) {
    const text = await geminiGenerateTextUserOnly(geminiKey, userContent)
    if (text) {
      const lines = text
        .split("\n")
        .map((s) => s.replace(/^\d+[.)]\s*/, "").trim())
        .filter(Boolean)
        .slice(0, 5)
      if (lines.length > 0) return lines
    }
  }

  if (openaiKey) {
    const baseUrl = (process.env.OPENAI_API_BASE || "https://api.openai.com/v1").replace(/\/$/, "")
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini"
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: userContent }],
        max_tokens: 300,
      }),
    })
    if (res.ok) {
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
      const text = data.choices?.[0]?.message?.content?.trim() || ""
      const lines = text
        .split("\n")
        .map((s) => s.replace(/^\d+[.)]\s*/, "").trim())
        .filter(Boolean)
        .slice(0, 5)
      if (lines.length > 0) return lines
    }
  }

  return null
}

async function geminiGenerateTextUserOnly(apiKey: string, userText: string): Promise<string | null> {
  const preferred = process.env.GEMINI_MODEL?.trim()
  const ordered = preferred
    ? [preferred, ...GEMINI_MODEL_FALLBACKS.filter((m) => m !== preferred)]
    : [...GEMINI_MODEL_FALLBACKS]

  for (let i = 0; i < ordered.length; i++) {
    const modelName = ordered[i]
    try {
      const out = await generateWithGeminiOnce(apiKey, userText, modelName, undefined)
      if ("comment" in out) return out.comment
    } catch (e) {
      /* 下一备用模型 */
    }
    if (i < ordered.length - 1) await sleep(400)
  }
  return null
}
