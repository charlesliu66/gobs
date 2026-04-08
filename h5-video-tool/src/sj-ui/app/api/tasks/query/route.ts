import { NextRequest, NextResponse } from "next/server"
import { requireApiUser } from "@/lib/api-auth"
import { taskDetail, taskQuery } from "@/lib/geelark"

export async function POST(req: NextRequest) {
  const u = await requireApiUser(req, "tasks")
  if (u instanceof NextResponse) return u
  try {
    const body = await req.json()
    const ids = body?.ids
    if (!Array.isArray(ids)) return NextResponse.json({ error: "ids array required" }, { status: 400 })
    if (!u.isSuperAdmin) {
      for (const tid of ids.map(String)) {
        try {
          const d = await taskDetail(tid)
          if (d.envId && !u.envIds.includes(d.envId)) {
            return NextResponse.json({ error: `无权查询任务 ${tid}` }, { status: 403 })
          }
        } catch {
          return NextResponse.json({ error: `无权查询任务 ${tid}` }, { status: 403 })
        }
      }
    }
    const data = await taskQuery(ids)
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 })
  }
}
