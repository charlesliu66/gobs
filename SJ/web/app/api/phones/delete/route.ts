import { NextRequest, NextResponse } from "next/server"
import { assertEnvAccess, requireApiUser } from "@/lib/api-auth"
import { phoneDelete } from "@/lib/geelark"
import { notifySeatalkAsync } from "@/lib/seatalk-notify"

export async function POST(req: NextRequest) {
  const u = await requireApiUser(req, "devices")
  if (u instanceof NextResponse) return u
  try {
    const body = await req.json()
    const ids = body?.ids
    if (!Array.isArray(ids) || ids.length === 0) return NextResponse.json({ error: "ids required" }, { status: 400 })
    const denied = assertEnvAccess(u, ids.map(String))
    if (denied) return denied
    const data = await phoneDelete(ids)
    notifySeatalkAsync(
      `【TikTok矩阵】云手机删除\n数量：${ids.length}\n成功/总数：${data.successAmount ?? "—"}/${data.totalAmount ?? ids.length}\n设备：${ids.slice(0, 8).join(", ")}${ids.length > 8 ? " …" : ""}`,
    )
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 })
  }
}
