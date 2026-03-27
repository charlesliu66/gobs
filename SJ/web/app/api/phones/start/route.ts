import { NextRequest, NextResponse } from "next/server"
import { phoneStart } from "@/lib/geelark"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const ids = body?.ids
    if (!Array.isArray(ids) || ids.length === 0) return NextResponse.json({ error: "ids required" }, { status: 400 })
    const data = await phoneStart(ids)
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 })
  }
}
