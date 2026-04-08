import { NextRequest, NextResponse } from "next/server"
import { processQuietHoursForceStopTick } from "@/lib/quiet-hours-phone"
import { processWarmupShutdownTick } from "@/lib/warmup-run"

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim()
  const auth = req.headers.get("authorization")
  const q = req.nextUrl.searchParams.get("secret")

  if (secret) {
    const ok = auth === `Bearer ${secret}` || q === secret
    if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const out = await processWarmupShutdownTick()
    let quietHoursStopped = 0
    try {
      quietHoursStopped = (await processQuietHoursForceStopTick()).stopped
    } catch {
      /* 不阻断关机主流程 */
    }
    return NextResponse.json({ ok: true, ...out, quietHours: { stopped: quietHoursStopped } })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    )
  }
}
