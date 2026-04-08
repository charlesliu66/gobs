import { NextRequest, NextResponse } from "next/server"
import { requireApiUser } from "@/lib/api-auth"
import { taskHistoryRecords } from "@/lib/geelark"
import { getCreatorFromMemoryBlob, loadAttributionBlob } from "@/lib/task-attribution-store"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const u = await requireApiUser(req, "tasks")
  if (u instanceof NextResponse) return u
  try {
    const size = Math.min(200, Math.max(10, Number(req.nextUrl.searchParams.get("size")) || 100))
    const lastId = req.nextUrl.searchParams.get("lastId") ?? undefined
    const creatorUserIdParam = req.nextUrl.searchParams.get("creatorUserId")?.trim()
    /** 设备台专用：按 envIds 拉取云机上的任务，不按「发布者」过滤，便于展示即将执行/执行中 */
    const forDevices = req.nextUrl.searchParams.get("forDevices") === "1"

    const blob = await loadAttributionBlob()

    if (!u.isSuperAdmin) {
      if (u.envIds.length === 0) {
        return NextResponse.json({ total: 0, items: [] })
      }
      const fetchSize = Math.min(500, size * 8)
      const data = await taskHistoryRecords({ size: fetchSize, lastId, ids: u.envIds })
      if (forDevices) {
        const items = data.items ?? []
        return NextResponse.json({
          total: items.length,
          items: items.slice(0, size),
        })
      }
      const items = (data.items ?? []).filter((it) => getCreatorFromMemoryBlob(blob, it.id) === u.id)
      return NextResponse.json({
        total: items.length,
        items: items.slice(0, size),
      })
    }

    const data = await taskHistoryRecords({ size: Math.min(500, size * 4), lastId, ids: undefined })
    let items = data.items ?? []
    if (creatorUserIdParam) {
      items = items.filter((it) => getCreatorFromMemoryBlob(blob, it.id) === creatorUserIdParam)
    }
    return NextResponse.json({
      total: items.length,
      items: items.slice(0, size),
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 })
  }
}
