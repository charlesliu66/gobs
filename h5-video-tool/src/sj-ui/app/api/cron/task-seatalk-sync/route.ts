import { NextRequest, NextResponse } from "next/server"
import { runSeatalkTaskSync } from "@/lib/seatalk-task-poller"

/**
 * 定时同步 GeeLark 任务状态 → SeaTalk（进行中 / 已完成 / 失败）。
 *
 * 部署在 Vercel 时请在 vercel.json 配置 Cron，并设置 CRON_SECRET。
 * 手动调用：GET /api/cron/task-seatalk-sync?secret=与 CRON_SECRET 相同
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim()
  const auth = req.headers.get("authorization")
  const q = req.nextUrl.searchParams.get("secret")

  if (secret) {
    const ok =
      auth === `Bearer ${secret}` ||
      q === secret
    if (!ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  try {
    const out = await runSeatalkTaskSync()
    return NextResponse.json({ ok: true, ...out })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    )
  }
}
