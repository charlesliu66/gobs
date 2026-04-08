import { NextRequest, NextResponse } from "next/server"
import { ALL_FEATURES, normalizeStoredFeatures, type AuthUserRecord, type FeatureCode } from "@/lib/auth-types"
import { hashPassword } from "@/lib/auth-password"
import {
  deleteUserById,
  findUserByEmail,
  findUserById,
  listUsers,
  newUserId,
  upsertUser,
  countSuperAdmins,
} from "@/lib/auth-store"
import { requireApiUser } from "@/lib/api-auth"
import { fetchAllCloudPhones } from "@/lib/geelark"

export const dynamic = "force-dynamic"

function sanitizeFeatures(f: unknown): FeatureCode[] {
  return normalizeStoredFeatures(f)
}

function sanitizeEnvIds(v: unknown): string[] {
  if (typeof v === "string") {
    return v
      .split(/[\s,，;；\n]+/)
      .map((s) => s.trim())
      .filter(Boolean)
  }
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean)
  return []
}

/** GET：用户列表（脱敏） */
export async function GET(req: NextRequest) {
  const u = await requireApiUser(req, "admin")
  if (u instanceof NextResponse) return u
  const rows = await listUsers()
  return NextResponse.json({
    users: rows.map((r) => ({
      id: r.id,
      email: r.email,
      isSuperAdmin: r.isSuperAdmin,
      features: r.isSuperAdmin ? ALL_FEATURES : r.features,
      envIds: r.envIds,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })),
  })
}

/** POST：新建子账号 */
export async function POST(req: NextRequest) {
  const actor = await requireApiUser(req, "admin")
  if (actor instanceof NextResponse) return actor
  try {
    const body = (await req.json()) as {
      email?: string
      password?: string
      isSuperAdmin?: boolean
      features?: FeatureCode[]
      envIds?: string | string[]
    }
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
    const isSuperAdmin = Boolean(body.isSuperAdmin)
    const features = isSuperAdmin ? [...ALL_FEATURES] : sanitizeFeatures(body.features)
    if (!isSuperAdmin && features.length === 0) {
      return NextResponse.json({ error: "请至少勾选一个功能权限" }, { status: 400 })
    }
    let envIds = sanitizeEnvIds(body.envIds)
    if (!isSuperAdmin && envIds.length > 0) {
      try {
        const phones = await fetchAllCloudPhones()
        const valid = new Set(phones.map((p) => p.id))
        envIds = envIds.filter((id) => valid.has(id))
      } catch {
        return NextResponse.json({ error: "无法校验设备列表（GeeLark 不可用）" }, { status: 502 })
      }
    }
    const user: AuthUserRecord = {
      id: newUserId(),
      email,
      passwordHash: await hashPassword(password),
      isSuperAdmin,
      features: isSuperAdmin ? [...ALL_FEATURES] : features,
      envIds: isSuperAdmin ? [] : envIds,
      credentialVersion: 1,
      createdAt: now,
      updatedAt: now,
    }
    await upsertUser(user)
    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        isSuperAdmin: user.isSuperAdmin,
        features: user.features,
        envIds: user.envIds,
      },
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 500 })
  }
}
