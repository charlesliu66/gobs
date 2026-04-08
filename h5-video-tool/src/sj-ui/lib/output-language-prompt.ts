/**
 * 将 UI 中的输出语言（BCP-47）转为对 LLM 的硬约束说明（英文为主，便于模型遵循）。
 */
function kindLabel(platform?: "tiktok" | "facebook"): "TikTok" | "Facebook" {
  return platform === "facebook" ? "Facebook" : "TikTok"
}

const LOCALE_DIRECTIVES: Record<string, { en: string; zh: string }> = {
  "zh-CN": {
    en: "Write the ENTIRE TikTok comment in Simplified Chinese (简体中文) ONLY. Do not use English, Japanese, Korean, or other languages for the main wording. Proper nouns or brand names are allowed when natural.",
    zh: "全文必须使用简体中文书写，不得用英文、日文等其它语言作为正文主体。",
  },
  en: {
    en: "Write the ENTIRE TikTok comment in English ONLY. Do not use Chinese, Japanese, or other languages for the main sentence. Proper nouns from other languages are acceptable if standard.",
    zh: "全文必须使用英文书写，不得以中文或其它语言作为正文主体。",
  },
  ja: {
    en: "Write the ENTIRE TikTok comment in Japanese (日本語) ONLY. Do not use Chinese, English, or Korean for the main wording unless the user rules explicitly require otherwise.",
    zh: "全文必须使用日文书写。",
  },
  ko: {
    en: "Write the ENTIRE TikTok comment in Korean (한국어) ONLY. Do not use Chinese, English, or Japanese for the main wording unless the user rules explicitly require otherwise.",
    zh: "全文必须使用韩文书写。",
  },
  th: {
    en: "Write the ENTIRE TikTok comment in Thai ONLY. Do not use English or Chinese as the main language.",
    zh: "全文必须使用泰文书写。",
  },
  id: {
    en: "Write the ENTIRE TikTok comment in Indonesian (Bahasa Indonesia) ONLY. Do not use English or Chinese as the main language.",
    zh: "全文必须使用印尼语书写。",
  },
}

export function getOutputLanguageBlock(localeRaw: string, platform?: "tiktok" | "facebook"): string {
  const locale = (localeRaw || "zh-CN").trim() || "zh-CN"
  const k = kindLabel(platform)
  const row = LOCALE_DIRECTIVES[locale]
  if (row) {
    return [
      `【输出语言代码】${locale}`,
      "",
      "【Language requirement — MUST follow】",
      row.en.replace(/TikTok/g, k),
      "",
      "【语言要求（必须遵守）】",
      row.zh.replace(/TikTok/g, k),
    ].join("\n")
  }
  return [
    `【输出语言代码】${locale}`,
    "",
    "【Language requirement — MUST follow】",
    `Write the ENTIRE ${k} comment in the natural language that matches BCP-47 locale "${locale}". Do not use a different language for the main wording unless the user rules explicitly require it.`,
    "",
    "【语言要求（必须遵守）】",
    `请使用与语言代码「${locale}」一致的自然语言书写整条评论正文。`,
  ].join("\n")
}

/** 拼在提示词最末尾，利用近因效应强化语言约束 */
export function getOutputLanguageClosingLine(localeRaw: string, platform?: "tiktok" | "facebook"): string {
  const locale = (localeRaw || "zh-CN").trim() || "zh-CN"
  const k = kindLabel(platform)
  return [
    `FINAL CHECK (do not ignore): Your reply must be EXACTLY ONE ${k} comment, and its entire wording must match the output language requirement for this request (see locale above).`,
    `最后检查：回复必须仅为一条 ${k} 评论正文，且整句用语必须与本次选择的输出语言（${locale}）一致，不得混用其它自然语言作为主体。`,
  ].join("\n")
}
