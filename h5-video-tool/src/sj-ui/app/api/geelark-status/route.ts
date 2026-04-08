import { NextRequest, NextResponse } from "next/server"
import { requireApiUser } from "@/lib/api-auth"
import { getCloudPhones, GEELARK_BEARER_TOKEN } from "@/lib/geelark"

export async function GET(req: NextRequest) {
  const u = await requireApiUser(req, "settings")
  if (u instanceof NextResponse) return u
  if (!GEELARK_BEARER_TOKEN || GEELARK_BEARER_TOKEN.length < 10) {
    return NextResponse.json(
      { ok: false, message: "未配置 GEELARK_BEARER_TOKEN，请在 web/.env.local 中配置" },
      { status: 200 }
    )
  }
  try {
    await getCloudPhones()
    return NextResponse.json({ ok: true, message: "GeeLark 已连接" })
  } catch (e) {
    return NextResponse.json(
      { ok: false, message: e instanceof Error ? e.message : "GeeLark 请求失败" },
      { status: 200 }
    )
  }
}
