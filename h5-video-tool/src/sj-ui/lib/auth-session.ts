import { SignJWT, jwtVerify } from "jose"
import type { AuthUserRecord } from "@/lib/auth-types"
import { normalizeStoredFeatures, userToSession, type SessionUser } from "@/lib/auth-types"

const COOKIE_NAME = "sj_auth"

export { COOKIE_NAME }

/**
 * 会话 Cookie 写入选项。
 * 开发环境下矩阵常被 GOBS（localhost:5173 等）以 iframe 嵌入，与矩阵（:3000）为跨站上下文，
 * SameSite=Lax 时浏览器不会在 iframe 请求中带 Cookie，导致「永远未登录」。
 * 开发环境使用 SameSite=None + Secure（Chromium 对 http://localhost 仍允许 Secure Cookie）。
 */
export function getSjAuthCookieWriteOptions(maxAgeSeconds: number) {
  const prod = process.env.NODE_ENV === "production"
  if (prod) {
    return {
      httpOnly: true as const,
      path: "/",
      maxAge: maxAgeSeconds,
      sameSite: "lax" as const,
      secure: true,
    }
  }
  return {
    httpOnly: true as const,
    path: "/",
    maxAge: maxAgeSeconds,
    sameSite: "none" as const,
    secure: true,
  }
}

/** 清除会话时需与写入时 SameSite/Secure 一致，否则浏览器可能删不掉 */
export function getSjAuthCookieDeleteOptions() {
  const prod = process.env.NODE_ENV === "production"
  if (prod) {
    return {
      httpOnly: true as const,
      path: "/",
      maxAge: 0,
      sameSite: "lax" as const,
      secure: true,
    }
  }
  return {
    httpOnly: true as const,
    path: "/",
    maxAge: 0,
    sameSite: "none" as const,
    secure: true,
  }
}

export type JwtSessionPayload = { sub: string; cv: number }

function getJwtSecretBytes(): Uint8Array | null {
  const s = process.env.AUTH_SECRET?.trim()
  if (s && s.length >= 32) return new TextEncoder().encode(s)
  if (process.env.NODE_ENV === "development") {
    return new TextEncoder().encode("dev-secret-change-me-in-production-min-32-chars!!")
  }
  return null
}

export async function signSessionToken(record: AuthUserRecord): Promise<string> {
  const key = getJwtSecretBytes()
  if (!key) throw new Error("请配置 AUTH_SECRET（至少 32 字符）")
  const s = userToSession(record)
  return await new SignJWT({
    sub: s.id,
    email: s.email,
    isSuperAdmin: s.isSuperAdmin,
    features: s.features,
    envIds: s.envIds,
    cv: record.credentialVersion ?? 1,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key)
}

/** 校验签名并取出 sub + credentialVersion（须与库中记录比对） */
export async function verifySessionTokenPayload(token: string): Promise<JwtSessionPayload | null> {
  const key = getJwtSecretBytes()
  if (!key) return null
  try {
    const { payload } = await jwtVerify(token, key)
    const p = payload as Record<string, unknown>
    const sub = String(p.sub ?? "")
    if (!sub) return null
    const cv = typeof p.cv === "number" && Number.isFinite(p.cv) ? p.cv : 1
    return { sub, cv }
  } catch {
    return null
  }
}

/** 仅 Trust JWT 内字段，不校验改密版本；新代码请用 verifySessionTokenPayload + 读库 */
export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  const key = getJwtSecretBytes()
  if (!key) return null
  try {
    const { payload } = await jwtVerify(token, key)
    const p = payload as Record<string, unknown>
    return {
      id: String(p.sub ?? ""),
      email: String(p.email ?? ""),
      isSuperAdmin: Boolean(p.isSuperAdmin),
      features: normalizeStoredFeatures(p.features),
      envIds: Array.isArray(p.envIds) ? (p.envIds as string[]) : [],
    }
  } catch {
    return null
  }
}

/** 供 middleware 使用：与上方同一套密钥逻辑 */
export function getJwtSecretBytesForMiddleware(): Uint8Array | null {
  return getJwtSecretBytes()
}
