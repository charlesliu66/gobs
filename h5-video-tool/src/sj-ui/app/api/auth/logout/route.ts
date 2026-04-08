import { NextResponse } from "next/server"
import { COOKIE_NAME, getSjAuthCookieDeleteOptions } from "@/lib/auth-session"

export const dynamic = "force-dynamic"

export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE_NAME, "", getSjAuthCookieDeleteOptions())
  return res
}
