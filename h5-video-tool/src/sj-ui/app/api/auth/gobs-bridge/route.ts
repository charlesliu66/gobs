import { NextRequest, NextResponse } from "next/server"
import { jwtVerify } from "jose"
import { randomBytes } from "crypto"
import { hashPassword } from "@/lib/auth-password"
import { findUserByEmail, newUserId, upsertUser } from "@/lib/auth-store"
import { COOKIE_NAME, getSjAuthCookieWriteOptions, signSessionToken } from "@/lib/auth-session"
import { ALL_FEATURES, normalizeStoredFeatures, type AuthUserRecord, type FeatureCode } from "@/lib/auth-types"

export const dynamic = "force-dynamic"

function getBridgeSecretBytes(): Uint8Array | null {
  const s = process.env.GOBS_MATRIX_BRIDGE_SECRET?.trim() || process.env.GOBS_AUTH_SECRET?.trim()
  if (s && s.length >= 32) return new TextEncoder().encode(s)
  if (process.env.NODE_ENV !== "production") {
    return new TextEncoder().encode("gobs-dev-secret-change-me-min-32-chars!!")
  }
  return null
}

/**
 * GOBS 登录后由前端在 iframe 中打开本接口（或跟随 302），用短期 JWT 换取矩阵站点 sj_auth Cookie，
 * 从而无需在矩阵内再次输入账号密码。
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")
  if (!token) {
    return NextResponse.json({ error: "缺少 token" }, { status: 400 })
  }
  const secret = getBridgeSecretBytes()
  if (!secret) {
    return NextResponse.json({ error: "未配置 GOBS_MATRIX_BRIDGE_SECRET（或 GOBS_AUTH_SECRET）" }, { status: 500 })
  }
  try {
    const { payload } = await jwtVerify(token, secret)
    const p = payload as Record<string, unknown>
    if (p.typ !== "matrix_bridge") {
      return NextResponse.json({ error: "令牌类型无效" }, { status: 400 })
    }
    const email = String(p.email ?? "")
      .trim()
      .toLowerCase()
    if (!email) {
      return NextResponse.json({ error: "邮箱无效" }, { status: 400 })
    }
    const isSuper = Boolean(p.isa)
    const mfRaw = Array.isArray(p.mf) ? p.mf : []
    const features: FeatureCode[] = isSuper ? [...ALL_FEATURES] : normalizeStoredFeatures(mfRaw)
    const cv = typeof p.cv === "number" && Number.isFinite(p.cv) ? p.cv : 1
    const mgRaw = p.mg
    const matrixAllowedGroups: string[] | undefined = Array.isArray(mgRaw)
      ? mgRaw.filter((x): x is string => typeof x === "string").map((s) => s.trim()).filter(Boolean)
      : undefined

    let record = await findUserByEmail(email)
    const now = Date.now()
    if (!record) {
      const junkPw = randomBytes(24).toString("hex")
      const created: AuthUserRecord = {
        id: newUserId(),
        email,
        passwordHash: await hashPassword(junkPw),
        isSuperAdmin: isSuper,
        features,
        envIds: [],
        ...(matrixAllowedGroups !== undefined ? { matrixAllowedGroups } : {}),
        credentialVersion: cv,
        createdAt: now,
        updatedAt: now,
      }
      await upsertUser(created)
      record = created
    } else {
      const next: AuthUserRecord = {
        ...record,
        isSuperAdmin: isSuper,
        features,
        credentialVersion: Math.max(record.credentialVersion ?? 1, cv),
        updatedAt: now,
      }
      if (matrixAllowedGroups !== undefined) {
        next.matrixAllowedGroups = matrixAllowedGroups
      } else {
        delete (next as { matrixAllowedGroups?: string[] }).matrixAllowedGroups
      }
      await upsertUser(next)
      record = next
    }

    const sessionToken = await signSessionToken(record)
    const res = NextResponse.redirect(new URL("/", req.url))
    res.cookies.set(COOKIE_NAME, sessionToken, getSjAuthCookieWriteOptions(60 * 60 * 24 * 7))
    return res
  } catch {
    return NextResponse.json({ error: "令牌无效或已过期" }, { status: 401 })
  }
}
