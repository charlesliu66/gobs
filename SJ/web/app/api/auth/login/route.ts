import { NextRequest, NextResponse } from "next/server"
import { verifyPassword } from "@/lib/auth-password"
import { findUserByEmail } from "@/lib/auth-store"
import { COOKIE_NAME, getSjAuthCookieWriteOptions, signSessionToken } from "@/lib/auth-session"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { email?: string; password?: string }
    const email = String(body.email ?? "")
      .trim()
      .toLowerCase()
    const password = String(body.password ?? "")
    if (!email || !password) {
      return NextResponse.json({ error: "请输入邮箱与密码" }, { status: 400 })
    }
    const record = await findUserByEmail(email)
    if (!record) {
      return NextResponse.json({ error: "账号或密码错误" }, { status: 401 })
    }
    const ok = await verifyPassword(password, record.passwordHash)
    if (!ok) {
      return NextResponse.json({ error: "账号或密码错误" }, { status: 401 })
    }
    const token = await signSessionToken(record)
    const res = NextResponse.json({ ok: true, email: record.email, isSuperAdmin: record.isSuperAdmin })
    res.cookies.set(COOKIE_NAME, token, getSjAuthCookieWriteOptions(60 * 60 * 24 * 7))
    return res
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 500 })
  }
}
