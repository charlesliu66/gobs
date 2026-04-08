import { NextRequest, NextResponse } from "next/server"
import { requireApiUser } from "@/lib/api-auth"
import { loadCommentRuleLibraries, flattenRulesForGeneration } from "@/lib/comment-rule-store"
import { mergeGlobalCommanderIntoRules } from "@/lib/load-commander-rules"
import {
  getOutputLanguageBlock,
  getOutputLanguageClosingLine,
} from "@/lib/output-language-prompt"
import { generateCommentWithLlm } from "@/lib/llm-generate-comment"

export const dynamic = "force-dynamic"

type Body = {
  ruleLibraryId?: string
  /** 直接传规则（例如单条刷新时避免再查库） */
  rules?: string[]
  prompt: string
  language?: string
  taskIndex?: number
  deviceName?: string
  videoLink?: string
  /** 默认 tiktok */
  platform?: "tiktok" | "facebook"
}

/**
 * 按规则库 + 用户提示词生成单条评论（不抓取网页）
 */
export async function POST(req: NextRequest) {
  const u = await requireApiUser(req, "home")
  if (u instanceof NextResponse) return u
  try {
    const body = (await req.json()) as Body
    const prompt = (body.prompt || "").trim()
    if (!prompt) {
      return NextResponse.json({ error: "缺少生成提示词 prompt" }, { status: 400 })
    }

    let rules: string[] = Array.isArray(body.rules) ? body.rules.map((r) => String(r).trim()).filter(Boolean) : []

    if (rules.length === 0 && body.ruleLibraryId) {
      const libs = await loadCommentRuleLibraries()
      const lib = libs.find((l) => l.id === body.ruleLibraryId)
      if (!lib) {
        return NextResponse.json({ error: "未找到规则库" }, { status: 400 })
      }
      rules = flattenRulesForGeneration(lib)
    }

    /** 磁盘上的 commander.py（Safety Filter）与规则库合并，置于最前 */
    rules = mergeGlobalCommanderIntoRules(rules)

    if (rules.length === 0) {
      return NextResponse.json({
        error:
          "缺少规则：请配置规则库，或在项目根目录 / web 目录放置 commander.py，或设置 COMMENT_COMMANDER_PY_PATH",
      }, { status: 400 })
    }

    const platform = body.platform === "facebook" ? "facebook" : "tiktok"
    const language = (body.language || "zh-CN").trim() || "zh-CN"
    const languageBlock = getOutputLanguageBlock(language, platform)
    const languageClosing = getOutputLanguageClosingLine(language, platform)
    const idx = body.taskIndex != null ? Number(body.taskIndex) : undefined
    const ctxParts: string[] = []
    if (idx != null && !Number.isNaN(idx)) ctxParts.push(`任务行序号: ${idx}`)
    if (body.deviceName) ctxParts.push(`设备/账号备注: ${body.deviceName}`)
    if (body.videoLink) {
      ctxParts.push(
        platform === "facebook"
          ? `帖子链接（仅作标注，勿复述链接）: ${body.videoLink}`
          : `视频链接（仅作标注，勿复述链接）: ${body.videoLink}`,
      )
    }

    const rulesBlock = rules.map((r, i) => `(${i + 1}) ${r}`).join("\n\n")
    const oneLineHint =
      platform === "facebook"
        ? "请只输出一条适合 Facebook 帖子下的评论正文，不要引号、不要编号、不要解释。尽量简短自然（建议 200 字以内）。"
        : "请只输出一条适合 TikTok 的评论正文，不要引号、不要编号、不要解释。尽量简短自然（建议 200 字以内）。"
    const userContent = [
      "【必须遵守的规则】",
      "下列编号依次包含：若服务端配置了磁盘 commander.py，则为其内容；以及当前规则库中的「文本规则」与「管理规则库中上传的 .md / .py 文件全文」。请全部遵守；安全与合规要求优先于创作自由。",
      rulesBlock,
      "",
      "【本次创作要求】",
      prompt,
      "",
      languageBlock,
      ctxParts.length ? `\n【上下文】\n${ctxParts.join("\n")}` : "",
      "",
      oneLineHint,
      "",
      languageClosing,
    ].join("\n")

    const out = await generateCommentWithLlm(userContent, { outputLocale: language, platform })
    if ("error" in out) {
      const status = out.error.includes("未配置") ? 503 : 502
      return NextResponse.json({ error: out.error }, { status })
    }

    return NextResponse.json({ comment: out.comment })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "generate failed" },
      { status: 500 },
    )
  }
}
