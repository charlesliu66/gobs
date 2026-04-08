import { NextRequest, NextResponse } from "next/server"
import { requireApiUser } from "@/lib/api-auth"
import { loadWarmupState, saveWarmupState } from "@/lib/warmup-state"

function scheduleOwned(u: { isSuperAdmin: boolean; envIds: string[] }, envIds: string[]): boolean {
  if (u.isSuperAdmin) return true
  if (u.envIds.length === 0 || envIds.length === 0) return false
  return envIds.every((id) => u.envIds.includes(id))
}

export async function POST(req: NextRequest) {
  const u = await requireApiUser(req, "warmup")
  if (u instanceof NextResponse) return u
  try {
    const body = (await req.json()) as { id?: string; enabled?: boolean }
    const id = body.id?.trim()
    if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 })
    const blob = await loadWarmupState()
    const sch = blob.schedules.find((s) => s.id === id)
    if (!sch) return NextResponse.json({ error: "规则不存在" }, { status: 404 })
    if (!scheduleOwned(u, sch.envIds)) {
      return NextResponse.json({ error: "无权操作该规则" }, { status: 403 })
    }
    sch.enabled = Boolean(body.enabled)
    await saveWarmupState(blob)
    return NextResponse.json({ schedule: sch })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 })
  }
}
