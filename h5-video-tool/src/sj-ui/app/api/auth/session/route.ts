import { NextRequest, NextResponse } from "next/server"
import { COOKIE_NAME, verifySessionTokenPayload } from "@/lib/auth-session"
import { findUserById } from "@/lib/auth-store"
import { userToSession } from "@/lib/auth-types"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!token) return NextResponse.json({ user: null })
  const payload = await verifySessionTokenPayload(token)
  if (!payload) return NextResponse.json({ user: null })
  const record = await findUserById(payload.sub)
  if (!record) return NextResponse.json({ user: null })
  if ((record.credentialVersion ?? 1) !== payload.cv) {
    return NextResponse.json({
      user: null,
      sessionRevoked: true,
      message: "密码已更改或会话已失效，请重新登录",
    })
  }
  const user = userToSession(record)
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      isSuperAdmin: user.isSuperAdmin,
      features: user.features,
      envIds: user.envIds,
    },
  })
}
