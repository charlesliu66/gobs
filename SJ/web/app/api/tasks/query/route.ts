import { NextRequest, NextResponse } from "next/server"
import { taskQuery } from "@/lib/geelark"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const ids = body?.ids
    if (!Array.isArray(ids)) return NextResponse.json({ error: "ids array required" }, { status: 400 })
    const data = await taskQuery(ids)
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 })
  }
}
