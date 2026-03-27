import { NextRequest, NextResponse } from "next/server"
import { phoneDetailUpdate } from "@/lib/geelark"

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, name, remark, proxyId } = body ?? {}
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
    await phoneDetailUpdate({ id, name, remark, proxyId })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 })
  }
}
