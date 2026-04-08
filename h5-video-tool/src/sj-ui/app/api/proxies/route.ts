import { NextRequest, NextResponse } from "next/server"
import { requireApiUser } from "@/lib/api-auth"
import { proxyList, proxyAdd, proxyUpdate, proxyDelete } from "@/lib/geelark"

export async function GET(req: NextRequest) {
  const u = await requireApiUser(req, "settings")
  if (u instanceof NextResponse) return u
  try {
    const page = Number(req.nextUrl.searchParams.get("page")) || 1
    const pageSize = Number(req.nextUrl.searchParams.get("pageSize")) || 20
    const idsParam = req.nextUrl.searchParams.get("ids")
    const ids = idsParam ? idsParam.split(",").filter(Boolean) : undefined
    const data = await proxyList({ page, pageSize, ids })
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const u = await requireApiUser(req, "settings")
  if (u instanceof NextResponse) return u
  try {
    const body = await req.json()
    if (body?.list) {
      const data = await proxyAdd(body.list)
      return NextResponse.json(data)
    }
    if (body?.id && body?.scheme && body?.server != null && body?.port != null) {
      await proxyUpdate([{
        id: body.id,
        scheme: body.scheme,
        server: body.server,
        port: Number(body.port),
        username: body.username,
        password: body.password,
      }])
      return NextResponse.json({ ok: true })
    }
    return NextResponse.json({ error: "list or (id, scheme, server, port) required" }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const u = await requireApiUser(req, "settings")
  if (u instanceof NextResponse) return u
  try {
    const idsParam = req.nextUrl.searchParams.get("ids")
    const ids = idsParam ? idsParam.split(",").filter(Boolean) : []
    if (ids.length === 0) return NextResponse.json({ error: "ids required" }, { status: 400 })
    await proxyDelete(ids)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 })
  }
}
