import { NextResponse } from "next/server"
import { getCloudPhones } from "@/lib/geelark"

export async function GET() {
  const token = process.env.GEELARK_BEARER_TOKEN
  if (!token || token.length < 10) {
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
