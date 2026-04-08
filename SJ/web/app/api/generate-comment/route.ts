import { NextRequest, NextResponse } from "next/server"
import { requireApiUser } from "@/lib/api-auth"
import { loadCommanderPyGlobal, commanderBlockForPrompt } from "@/lib/load-commander-rules"
import { generateFiveTiktokSuggestions } from "@/lib/llm-generate-comment"

const FALLBACK_SUGGESTIONS = [
  "Nice! 🔥",
  "So good!",
  "Love this!",
  "Amazing content!",
  "真不错！",
  "太棒了！",
  "Great share!",
];

export async function POST(req: NextRequest) {
  const u = await requireApiUser(req, "home")
  if (u instanceof NextResponse) return u
  try {
    const { url, platform } = (await req.json()) as {
      url?: string
      platform?: "tiktok" | "facebook"
    }
    const commander = loadCommanderPyGlobal()
    const safetyRulesBlock = commander ? commanderBlockForPrompt(commander.content) : undefined
    const lines = await generateFiveTiktokSuggestions(url || "", {
      safetyRulesBlock,
      platform: platform === "facebook" ? "facebook" : "tiktok",
    })
    if (lines && lines.length > 0) {
      return NextResponse.json({ suggestions: lines })
    }
    const shuffled = [...FALLBACK_SUGGESTIONS].sort(() => Math.random() - 0.5)
    return NextResponse.json({ suggestions: shuffled.slice(0, 5) })
  } catch {
    const shuffled = [...FALLBACK_SUGGESTIONS].sort(() => Math.random() - 0.5)
    return NextResponse.json({ suggestions: shuffled.slice(0, 5) })
  }
}
