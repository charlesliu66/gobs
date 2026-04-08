import { NextRequest, NextResponse } from "next/server"
import { requireApiUser } from "@/lib/api-auth"
import { taskDetail } from "@/lib/geelark"

export async function POST(req: NextRequest) {
  const u = await requireApiUser(req, "tasks")
  if (u instanceof NextResponse) return u
  try {
    const body = await req.json()
    const id = body?.id
    const searchAfter = body?.searchAfter
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
    const data = await taskDetail(id, Array.isArray(searchAfter) ? searchAfter : undefined)
    if (!u.isSuperAdmin && data.envId && !u.envIds.includes(data.envId)) {
      return NextResponse.json({ error: "无权查看该任务" }, { status: 403 })
    }
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 })
  }
}
