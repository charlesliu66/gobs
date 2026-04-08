import { NextRequest, NextResponse } from "next/server"
import { COOKIE_NAME, verifySessionTokenPayload } from "@/lib/auth-session"
import { findUserById } from "@/lib/auth-store"
import type { FeatureCode } from "@/lib/auth-types"
import { userToSession, type SessionUser } from "@/lib/auth-types"
import type { PhoneItem } from "@/lib/geelark"
import { collectPhoneTagLabels } from "@/lib/phone-tags"

async function resolveSessionFromRequest(req: NextRequest): Promise<SessionUser | NextResponse> {
  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!token) return NextResponse.json({ error: "未登录" }, { status: 401 })
  const payload = await verifySessionTokenPayload(token)
  if (!payload) return NextResponse.json({ error: "登录已失效" }, { status: 401 })
  const record = await findUserById(payload.sub)
  if (!record) return NextResponse.json({ error: "登录已失效" }, { status: 401 })
  const cv = record.credentialVersion ?? 1
  if (payload.cv !== cv) {
    return NextResponse.json({ error: "登录已失效，请重新登录", code: "session_revoked" }, { status: 401 })
  }
  return userToSession(record)
}

export async function requireApiUser(
  req: NextRequest,
  feature: FeatureCode | "admin",
): Promise<SessionUser | NextResponse> {
  const user = await resolveSessionFromRequest(req)
  if (user instanceof NextResponse) return user
  if (feature === "admin") {
    if (!user.isSuperAdmin) return NextResponse.json({ error: "需要主账号权限" }, { status: 403 })
    return user
  }
  if (user.isSuperAdmin) return user
  if (!user.features.includes(feature)) {
    return NextResponse.json({ error: "无权访问该功能" }, { status: 403 })
  }
  return user
}

/** 校验设备 ID 是否在账号权限内（主账号跳过） */
export function assertEnvAccess(user: SessionUser, ids: string[]): NextResponse | null {
  if (user.isSuperAdmin) return null
  const set = new Set(user.envIds)
  for (const id of ids) {
    if (!set.has(id)) return NextResponse.json({ error: `无权操作设备 ${id}` }, { status: 403 })
  }
  return null
}

export function filterPhonesByUser(user: SessionUser, items: PhoneItem[]): PhoneItem[] {
  if (user.isSuperAdmin) return items
  const mg = user.matrixAllowedGroups
  if (mg !== undefined) {
    if (mg.length === 0) return []
    return items.filter((p) => {
      const labels = collectPhoneTagLabels(p)
      return labels.some((t) => mg.includes(t))
    })
  }
  const set = new Set(user.envIds)
  return items.filter((x) => set.has(x.id))
}

export function canAccessEnv(user: SessionUser, envId: string): boolean {
  if (user.isSuperAdmin) return true
  return user.envIds.includes(envId)
}
