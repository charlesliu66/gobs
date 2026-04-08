import { NextRequest, NextResponse } from "next/server"
import { requireApiUser } from "@/lib/api-auth"
import { getSeatalkConfigSnapshot } from "@/lib/seatalk-notify"

/**
 * GET /api/seatalk/status
 * 自检 SeaTalk 是否配置完整（不泄露密钥，不发起发消息请求）
 */
export async function GET(req: NextRequest) {
  const u = await requireApiUser(req, "settings")
  if (u instanceof NextResponse) return u
  const snap = getSeatalkConfigSnapshot()
  return NextResponse.json(snap)
}
