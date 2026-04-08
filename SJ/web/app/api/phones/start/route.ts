import { NextRequest, NextResponse } from "next/server"
import { assertEnvAccess, requireApiUser } from "@/lib/api-auth"
import { phoneStart } from "@/lib/geelark"
import { partitionIdsForPhoneStart } from "@/lib/quiet-hours-phone"
import { notifySeatalkAsync } from "@/lib/seatalk-notify"

export async function POST(req: NextRequest) {
  const u = await requireApiUser(req, "devices")
  if (u instanceof NextResponse) return u
  try {
    const body = await req.json()
    const ids = body?.ids
    if (!Array.isArray(ids) || ids.length === 0) return NextResponse.json({ error: "ids required" }, { status: 400 })
    const idStrs = ids.map(String)
    const denied = assertEnvAccess(u, idStrs)
    if (denied) return denied

    const { allowed, blocked } = await partitionIdsForPhoneStart(idStrs)
    if (allowed.length === 0 && blocked.length > 0) {
      return NextResponse.json(
        {
          error: "夜间静默时段（21:00–09:00）禁止开机",
          blockedIds: blocked,
          successAmount: 0,
          failAmount: blocked.length,
          totalAmount: ids.length,
        },
        { status: 400 },
      )
    }

    let data = { totalAmount: 0, successAmount: 0, failAmount: 0 }
    if (allowed.length > 0) {
      data = await phoneStart(allowed)
    }

    if (allowed.length > 0) {
      notifySeatalkAsync(
        `【TikTok矩阵】云手机启动\n数量：${allowed.length}\n成功/总数：${data.successAmount ?? "—"}/${data.totalAmount ?? allowed.length}\n设备：${allowed.slice(0, 8).join(", ")}${allowed.length > 8 ? " …" : ""}`,
      )
    }

    return NextResponse.json({
      ...data,
      ...(blocked.length
        ? {
            quietHoursBlocked: blocked,
            quietHoursNotice: `以下设备处于夜间静默未启动：${blocked.join("、")}`,
          }
        : {}),
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 })
  }
}
