import { NextRequest, NextResponse } from "next/server"
import { taskHistoryRecords } from "@/lib/geelark"

export async function GET(req: NextRequest) {
  try {
    const size = Number(req.nextUrl.searchParams.get("size")) || 100
    const lastId = req.nextUrl.searchParams.get("lastId") ?? undefined
    const data = await taskHistoryRecords({ size, lastId })
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 })
  }
}
