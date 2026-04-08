import { NextRequest, NextResponse } from "next/server"
import { requireApiUser } from "@/lib/api-auth"
import { taskCancel, taskDetail } from "@/lib/geelark"
import { notifySeatalkAsync } from "@/lib/seatalk-notify"

export async function POST(req: NextRequest) {
  const u = await requireApiUser(req, "tasks")
  if (u instanceof NextResponse) return u
  try {
    const body = await req.json()
    const ids = body?.ids
    if (!Array.isArray(ids) || ids.length === 0) return NextResponse.json({ error: "ids required" }, { status: 400 })
    if (!u.isSuperAdmin) {
      for (const tid of ids.map(String)) {
        const d = await taskDetail(tid)
        if (d.envId && !u.envIds.includes(d.envId)) {
          return NextResponse.json({ error: `无权取消任务 ${tid}` }, { status: 403 })
        }
      }
    }
    const data = await taskCancel(ids)
    notifySeatalkAsync(
      `【TikTok矩阵】任务取消\n任务数：${ids.length}\n成功/失败：${data.successAmount ?? "—"}/${data.failAmount ?? "—"}\nID：${ids.slice(0, 6).join(", ")}${ids.length > 6 ? " …" : ""}`,
    )
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 })
  }
}
