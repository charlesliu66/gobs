import { NextRequest, NextResponse } from "next/server"
import { taskAddWarmup } from "@/lib/geelark"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { scheduleAt, envId, action, duration, keywords } = body ?? {}
    if (scheduleAt == null || !envId || !action || duration == null)
      return NextResponse.json({ error: "scheduleAt, envId, action, duration required" }, { status: 400 })
    const data = await taskAddWarmup({
      scheduleAt: Number(scheduleAt),
      envId: String(envId),
      action: String(action),
      duration: Number(duration),
      keywords: Array.isArray(keywords) ? keywords : [],
    })
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 })
  }
}
