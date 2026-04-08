import { NextRequest, NextResponse } from "next/server"
import { ALL_FEATURES } from "@/lib/auth-types"
import { hashPassword } from "@/lib/auth-password"
import { findUserByEmail, loadAuthBlob, newUserId, upsertUser } from "@/lib/auth-store"
import type { AuthUserRecord } from "@/lib/auth-types"

export const dynamic = "force-dynamic"

/** GET：是否仍需创建首个主账号 */
export async function GET() {
  try {
    const blob = await loadAuthBlob()
    const needsBootstrap = blob.users.length === 0
    return NextResponse.json({ needsBootstrap })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 500 })
  }
}

/** POST：仅在无任何账号时创建主账号 */
export async function POST(req: NextRequest) {
  try {
    const blob = await loadAuthBlob()
    if (blob.users.length > 0) {
      return NextResponse.json({ error: "已初始化，请使用登录" }, { status: 400 })
    }
    const body = (await req.json()) as { email?: string; password?: string }
    const email = String(body.email ?? "")
      .trim()
      .toLowerCase()
    const password = String(body.password ?? "")
    if (!email || !password || password.length < 8) {
      return NextResponse.json({ error: "邮箱与密码必填，密码至少 8 位" }, { status: 400 })
    }
    if (await findUserByEmail(email)) {
      return NextResponse.json({ error: "邮箱已存在" }, { status: 400 })
    }
    const now = Date.now()
    const user: AuthUserRecord = {
      id: newUserId(),
      email,
      passwordHash: await hashPassword(password),
      isSuperAdmin: true,
      features: [...ALL_FEATURES],
      envIds: [],
      credentialVersion: 1,
      createdAt: now,
      updatedAt: now,
    }
    await upsertUser(user)
    return NextResponse.json({ ok: true, email: user.email })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 500 })
  }
}
