import { NextRequest, NextResponse } from "next/server"
import { requireApiUser } from "@/lib/api-auth"
import { getGroupChatInfo } from "@/lib/seatalk-openapi"

/**
 * GET /api/seatalk/group-info?group_id=xxx&page_size=50&cursor=xxx
 * 服务端使用 SEATALK_APP_ID / SEATALK_APP_SECRET 换 token 后调用 SeaTalk Get Group Info。
 *
 * 若未配置 App 凭证，返回 503。
 */
export async function GET(req: NextRequest) {
  const u = await requireApiUser(req, "settings")
  if (u instanceof NextResponse) return u
  try {
    const groupId = req.nextUrl.searchParams.get("group_id")?.trim()
    if (!groupId) {
      return NextResponse.json({ error: "缺少 query 参数 group_id" }, { status: 400 })
    }

    const pageSizeRaw = req.nextUrl.searchParams.get("page_size")
    const cursor = req.nextUrl.searchParams.get("cursor")?.trim()

    const pageSize =
      pageSizeRaw != null && pageSizeRaw !== ""
        ? Math.min(100, Math.max(1, parseInt(pageSizeRaw, 10) || 50))
        : undefined

    const data = await getGroupChatInfo({
      groupId,
      pageSize,
      cursor: cursor || undefined,
    })

    if (data.code !== 0) {
      return NextResponse.json(data, { status: 400 })
    }

    return NextResponse.json(data)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error"
    const missingCreds = /缺少 SEATALK_APP_ID/i.test(msg)
    return NextResponse.json(
      { error: msg, code: missingCreds ? "NO_SEATALK_CREDS" : "SEATALK_ERROR" },
      { status: missingCreds ? 503 : 500 },
    )
  }
}
