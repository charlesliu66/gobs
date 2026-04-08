import { NextRequest, NextResponse } from "next/server"
import { assertEnvAccess, requireApiUser } from "@/lib/api-auth"
import { tiktokFollow } from "@/lib/geelark"
import { recordTaskAttribution } from "@/lib/task-attribution-store"
import { notifySeatalkAsync } from "@/lib/seatalk-notify"

export async function POST(req: NextRequest) {
  const u = await requireApiUser(req, "tasks")
  if (u instanceof NextResponse) return u
  try {
    const body = await req.json()
    const { scheduleAt, id, followProbability, name, remark } = body ?? {}
    if (scheduleAt == null || !id || followProbability == null)
      return NextResponse.json({ error: "scheduleAt, id, followProbability required" }, { status: 400 })
    const denied = assertEnvAccess(u, [String(id)])
    if (denied) return denied
    const data = await tiktokFollow({
      scheduleAt: Number(scheduleAt),
      id: String(id),
      followProbability: Number(followProbability),
      name: name ?? "TikTok关注",
      remark: remark ?? "",
    })
    if (data.taskId) await recordTaskAttribution(data.taskId, u.id)
    notifySeatalkAsync(
      `【TikTok矩阵】关注任务已创建\n任务ID：${data.taskId ?? "—"}\n关注概率：${followProbability}%`,
    )
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 })
  }
}
