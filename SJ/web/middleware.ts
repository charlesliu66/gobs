import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { jwtVerify } from "jose"
import { getJwtSecretBytesForMiddleware } from "@/lib/auth-session"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith("/login")) return NextResponse.next()
  if (pathname.startsWith("/api/auth")) return NextResponse.next()
  if (pathname.startsWith("/api/cron")) return NextResponse.next()
  if (pathname.startsWith("/api/seatalk/callback")) return NextResponse.next()
  if (pathname === "/api/build-info") return NextResponse.next()

  const secret = getJwtSecretBytesForMiddleware()
  const token = request.cookies.get("sj_auth")?.value

  if (!secret) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "服务器未配置 AUTH_SECRET（至少 32 字符）" }, { status: 500 })
    }
    return NextResponse.redirect(new URL("/login", request.url))
  }

  if (!token) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }
    return NextResponse.redirect(new URL("/login", request.url))
  }

  try {
    const { payload } = await jwtVerify(token, secret)
    if (pathname.startsWith("/admin")) {
      const isSuper = Boolean((payload as { isSuperAdmin?: boolean }).isSuperAdmin)
      if (!isSuper) {
        return NextResponse.redirect(new URL("/", request.url))
      }
    }
    return NextResponse.next()
  } catch {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "登录已失效" }, { status: 401 })
    }
    return NextResponse.redirect(new URL("/login", request.url))
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}
