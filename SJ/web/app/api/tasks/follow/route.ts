import { NextRequest, NextResponse } from "next/server"
import { tiktokFollow } from "@/lib/geelark"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { scheduleAt, id, followProbability, name, remark } = body ?? {}
    if (scheduleAt == null || !id || followProbability == null)
      return NextResponse.json({ error: "scheduleAt, id, followProbability required" }, { status: 400 })
    const data = await tiktokFollow({
      scheduleAt: Number(scheduleAt),
      id: String(id),
      followProbability: Number(followProbability),
      name: name ?? "TikTok关注",
      remark: remark ?? "",
    })
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 })
  }
}
