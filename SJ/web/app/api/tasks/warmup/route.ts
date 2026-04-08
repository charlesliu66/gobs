import { NextRequest, NextResponse } from "next/server"
import { assertEnvAccess, requireApiUser } from "@/lib/api-auth"
import { getCloudPhones, taskAddWarmup } from "@/lib/geelark"
import { recordTaskAttribution } from "@/lib/task-attribution-store"
import { isQuietHoursRestrictedPhone } from "@/lib/quiet-hours-phone"
import { notifySeatalkAsync } from "@/lib/seatalk-notify"

export async function POST(req: NextRequest) {
  const u = await requireApiUser(req, "warmup")
  if (u instanceof NextResponse) return u
  try {
    const body = await req.json()
    const { scheduleAt, envId, action, duration, keywords } = body ?? {}
    if (scheduleAt == null || !envId || !action || duration == null)
      return NextResponse.json({ error: "scheduleAt, envId, action, duration required" }, { status: 400 })
    const envIdStr = String(envId)
    const denied = assertEnvAccess(u, [envIdStr])
    if (denied) return denied
    const phones = await getCloudPhones({ ids: [envIdStr], pageSize: 10 })
    const phone = phones[0]
    if (phone && isQuietHoursRestrictedPhone(phone)) {
      return NextResponse.json(
        { error: "夜间静默时段（21:00–09:00）禁止创建养号任务，请 9:00 后再试" },
        { status: 400 },
      )
    }
    const data = await taskAddWarmup({
      scheduleAt: Number(scheduleAt),
      envId: envIdStr,
      action: String(action),
      duration: Number(duration),
      keywords: Array.isArray(keywords) ? keywords : [],
    })
    if (data.taskId) await recordTaskAttribution(data.taskId, u.id)
    notifySeatalkAsync(
      `【TikTok矩阵】养号任务已创建\n任务ID：${data.taskId ?? "—"}\n行为：${action}，时长：${duration} 分钟`,
    )
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 })
  }
}
