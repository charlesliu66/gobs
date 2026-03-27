import { NextRequest, NextResponse } from "next/server"
import { taskDetail } from "@/lib/geelark"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const id = body?.id
    const searchAfter = body?.searchAfter
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
    const data = await taskDetail(id, Array.isArray(searchAfter) ? searchAfter : undefined)
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 })
  }
}
