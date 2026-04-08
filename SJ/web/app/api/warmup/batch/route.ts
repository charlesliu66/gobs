import { NextRequest, NextResponse } from "next/server"
import { assertEnvAccess, requireApiUser } from "@/lib/api-auth"
import { loadWarmupState } from "@/lib/warmup-state"
import { runWarmupForEnv } from "@/lib/warmup-run"

export async function POST(req: NextRequest) {
  const u = await requireApiUser(req, "warmup")
  if (u instanceof NextResponse) return u
  try {
    const body = (await req.json()) as {
      envIds?: string[]
      durationMin?: number
      durationMax?: number
      action?: string
      keywords?: string[]
    }
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

    const blob = await loadWarmupState()
    const results = []
    for (const envId of envIds) {
      const r = await runWarmupForEnv({
        envId,
        action: body.action,
        durationMin,
        durationMax,
        keywords: Array.isArray(body.keywords) ? body.keywords : [],
        blob,
        registerShutdown: true,
        creatorUserId: u.id,
      })
      results.push(r)
    }

    return NextResponse.json({ results })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 })
  }
}
