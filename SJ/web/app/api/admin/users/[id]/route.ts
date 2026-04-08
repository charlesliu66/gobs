import { NextRequest, NextResponse } from "next/server"
import { ALL_FEATURES, normalizeStoredFeatures, type FeatureCode } from "@/lib/auth-types"
import { hashPassword } from "@/lib/auth-password"
import {
  countSuperAdmins,
  deleteUserById,
  findUserById,
  upsertUser,
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

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const actor = await requireApiUser(req, "admin")
  if (actor instanceof NextResponse) return actor
  const { id } = await ctx.params
  const record = await findUserById(id)
  if (!record) return NextResponse.json({ error: "用户不存在" }, { status: 404 })

  try {
    const body = (await req.json()) as {
      password?: string
      isSuperAdmin?: boolean
      features?: FeatureCode[]
      envIds?: string | string[]
    }
    if (body.password != null) {
      const pw = String(body.password)
      if (pw.length < 8) {
        return NextResponse.json({ error: "密码至少 8 位" }, { status: 400 })
      }
      record.passwordHash = await hashPassword(pw)
      record.credentialVersion = (record.credentialVersion ?? 1) + 1
    }
    if (typeof body.isSuperAdmin === "boolean" && body.isSuperAdmin !== record.isSuperAdmin) {
      if (record.isSuperAdmin && !body.isSuperAdmin && (await countSuperAdmins()) <= 1) {
        return NextResponse.json({ error: "不能取消最后一个主账号" }, { status: 400 })
      }
      record.isSuperAdmin = body.isSuperAdmin
      if (record.isSuperAdmin) {
        record.features = [...ALL_FEATURES]
        record.envIds = []
      }
    }
    if (!record.isSuperAdmin) {
      if (body.features != null) {
        const f = sanitizeFeatures(body.features)
        if (f.length === 0) return NextResponse.json({ error: "至少保留一个功能权限" }, { status: 400 })
        record.features = f
      }
      if (body.envIds != null) {
        const raw = sanitizeEnvIds(body.envIds)
        try {
          const phones = await fetchAllCloudPhones()
          const valid = new Set(phones.map((p) => p.id))
          record.envIds = raw.filter((id) => valid.has(id))
        } catch {
          return NextResponse.json({ error: "无法校验设备列表（GeeLark 不可用）" }, { status: 502 })
        }
      }
    }
    record.updatedAt = Date.now()
    await upsertUser(record)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const actor = await requireApiUser(req, "admin")
  if (actor instanceof NextResponse) return actor
  const { id } = await ctx.params
  if (id === actor.id) {
    return NextResponse.json({ error: "不能删除当前登录账号" }, { status: 400 })
  }
  const record = await findUserById(id)
  if (!record) return NextResponse.json({ error: "用户不存在" }, { status: 404 })
  if (record.isSuperAdmin && (await countSuperAdmins()) <= 1) {
    return NextResponse.json({ error: "不能删除最后一个主账号" }, { status: 400 })
  }
  const ok = await deleteUserById(id)
  if (!ok) return NextResponse.json({ error: "删除失败" }, { status: 500 })
  return NextResponse.json({ ok: true })
}
