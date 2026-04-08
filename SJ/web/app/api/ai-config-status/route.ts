import { NextRequest, NextResponse } from "next/server"
import { requireApiUser } from "@/lib/api-auth"

export const dynamic = "force-dynamic"

/**
 * 检查服务端是否读到 AI Key（不返回密钥内容，仅布尔与长度供排查）
 * 浏览器打开：GET /api/ai-config-status
 */
export async function GET(req: NextRequest) {
  const u = await requireApiUser(req, "settings")
  if (u instanceof NextResponse) return u
  const gemini = (process.env.GEMINI_API_KEY || "").trim()
  const google = (process.env.GOOGLE_API_KEY || "").trim()
  const gemeniTypo = (process.env.GEMENI_API_KEY || "").trim()
  const openai = (process.env.OPENAI_API_KEY || "").trim()

  const primary = gemini || google || gemeniTypo
  const ready = !!(primary || openai)

  return NextResponse.json({
    ready,
    /** 是否读到 GEMINI_API_KEY */
    hasGeminiKey: gemini.length > 0,
    /** 是否读到 GOOGLE_API_KEY */
    hasGoogleKey: google.length > 0,
    /** 是否误用变量名 GEMENI_API_KEY（拼写错误） */
    hasGemeniTypoKey: gemeniTypo.length > 0,
    hasOpenAIKey: openai.length > 0,
    /** 当前将使用的 Key 的大致长度（AIzaSy… 一般约 39 字符），用于确认不是空串 */
    effectiveKeyCharLength: primary ? primary.length : openai ? openai.length : 0,
    hint: ready
      ? "服务端已检测到 Key，若仍报错请刷新页面或重启 dev。"
      : "未检测到 Key。请确认 web/.env.local 中为 GEMINI_API_KEY=你的密钥（等号两侧勿加引号），保存后务必重启 npm run dev。",
  })
}
