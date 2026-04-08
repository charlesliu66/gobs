import { NextRequest, NextResponse } from "next/server"
import { assertEnvAccess, requireApiUser } from "@/lib/api-auth"
import { loadWarmupState, newScheduleId, saveWarmupState, type WarmupSchedule } from "@/lib/warmup-state"
import { parseHmToMinutes } from "@/lib/warmup-time"

function scheduleVisible(u: { isSuperAdmin: boolean; envIds: string[] }, sch: WarmupSchedule): boolean {
  if (u.isSuperAdmin) return true
  if (u.envIds.length === 0) return false
  return sch.envIds.length > 0 && sch.envIds.every((id) => u.envIds.includes(id))
}

export async function GET(req: NextRequest) {
  const u = await requireApiUser(req, "warmup")
  if (u instanceof NextResponse) return u
  try {
    const blob = await loadWarmupState()
    const schedules = u.isSuperAdmin ? blob.schedules : blob.schedules.filter((s) => scheduleVisible(u, s))
    return NextResponse.json({
      schedules,
      logs: (blob.logs ?? []).slice(-40),
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const u = await requireApiUser(req, "warmup")
  if (u instanceof NextResponse) return u
  try {
    const body = (await req.json()) as Partial<WarmupSchedule> & { envIds?: string[] }
    const envIds = Array.isArray(body.envIds) ? body.envIds.filter(Boolean) : []
    if (envIds.length === 0) return NextResponse.json({ error: "请至少选择一台云手机" }, { status: 400 })
    const denied = assertEnvAccess(u, envIds.map(String))
    if (denied) return denied
    const durationMin = Number(body.durationMin)
    const durationMax = Number(body.durationMax)
    if (!Number.isFinite(durationMin) || !Number.isFinite(durationMax) || durationMin < 1 || durationMax < 1) {
      return NextResponse.json({ error: "时长区间需为 ≥1 的整数（分钟）" }, { status: 400 })
    }
    if (durationMin > durationMax) {
      return NextResponse.json({ error: "时长下限不能大于上限" }, { status: 400 })
    }
    const ws = String(body.windowStart ?? "").trim()
    const we = String(body.windowEnd ?? "").trim()
    if (!ws || !we) return NextResponse.json({ error: "请填写开始与结束时间（HH:mm）" }, { status: 400 })
    const a = parseHmToMinutes(ws)
    const b = parseHmToMinutes(we)
    if (a == null || b == null) return NextResponse.json({ error: "时间格式须为 HH:mm" }, { status: 400 })
    if (b <= a) return NextResponse.json({ error: "结束时间须晚于开始时间（同一天内）" }, { status: 400 })

    const tz = String(body.timeZone ?? "").trim()
    if (!tz) return NextResponse.json({ error: "缺少 timeZone（浏览器 IANA 时区）" }, { status: 400 })

    const sch: WarmupSchedule = {
      id: newScheduleId(),
      enabled: body.enabled !== false,
      name: body.name?.trim() || `定时养号 ${ws}-${we}`,
      envIds,
      action: (body.action || "browse video").trim(),
      durationMin,
      durationMax,
      windowStart: ws,
      windowEnd: we,
      timeZone: tz,
      keywords: Array.isArray(body.keywords) ? body.keywords.map((k) => String(k).trim()).filter(Boolean) : [],
      createdAt: Date.now(),
    }

    const blob = await loadWarmupState()
    blob.schedules.push(sch)
    await saveWarmupState(blob)
    return NextResponse.json({ schedule: sch })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const u = await requireApiUser(req, "warmup")
  if (u instanceof NextResponse) return u
  try {
    const id = req.nextUrl.searchParams.get("id")?.trim()
    if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 })
    const blob = await loadWarmupState()
    const sch = blob.schedules.find((s) => s.id === id)
    if (!sch) return NextResponse.json({ error: "规则不存在" }, { status: 404 })
    if (!u.isSuperAdmin && !scheduleVisible(u, sch)) {
      return NextResponse.json({ error: "无权删除该规则" }, { status: 403 })
    }
    blob.schedules = blob.schedules.filter((s) => s.id !== id)
    const prefix = `${id}::`
    for (const k of Object.keys(blob.dispatch)) {
      if (k.startsWith(prefix)) delete blob.dispatch[k]
    }
    await saveWarmupState(blob)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 })
  }
}
