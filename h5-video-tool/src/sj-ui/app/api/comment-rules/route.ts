import { NextRequest, NextResponse } from "next/server"
import { requireApiUser } from "@/lib/api-auth"
import {
  loadCommentRuleLibraries,
  saveCommentRuleLibraries,
  splitRulesFromInput,
  newRuleLibraryId,
  type CommentRuleLibrary,
  type CommentRuleFile,
} from "@/lib/comment-rule-store"

export const dynamic = "force-dynamic"

function normalizeFiles(raw: unknown): CommentRuleFile[] {
  if (!Array.isArray(raw)) return []
  const out: CommentRuleFile[] = []
  for (const item of raw) {
    if (!item || typeof item !== "object") continue
    const o = item as { name?: string; type?: string; content?: string }
    const name = String(o.name || "").trim()
    const content = String(o.content || "")
    if (!name || !content) continue
    const t =
      o.type === "py" || /\.py$/i.test(name)
        ? "py"
        : o.type === "md" || /\.md$/i.test(name)
          ? "md"
          : /\.py$/i.test(name)
            ? "py"
            : "md"
    out.push({ name, type: t, content })
  }
  return out
}

/**
 * GET — 列出全部规则库
 * POST — 新建 { name, rules?: string[], rulesText?: string, files?: CommentRuleFile[] }
 * PATCH — 更新 { id, name?, rules?, files? }
 * DELETE — ?id=xxx 删除整个库
 */
export async function GET(req: NextRequest) {
  const u = await requireApiUser(req, "home")
  if (u instanceof NextResponse) return u
  try {
    const libraries = await loadCommentRuleLibraries()
    return NextResponse.json({ libraries })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "load failed" },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  const u = await requireApiUser(req, "home")
  if (u instanceof NextResponse) return u
  try {
    const body = (await req.json()) as {
      name?: string
      rules?: string[]
      rulesText?: string
      files?: unknown
    }
    const name = (body.name || "").trim() || "未命名规则库"
    let rules: string[] = Array.isArray(body.rules) ? body.rules.map((r) => String(r).trim()).filter(Boolean) : []
    if (rules.length === 0 && typeof body.rulesText === "string") {
      rules = splitRulesFromInput(body.rulesText)
    }
    const files = normalizeFiles(body.files)

    if (rules.length === 0 && files.length === 0) {
      return NextResponse.json(
        { error: "请至少填写文本规则，或上传 .md / .py 文件" },
        { status: 400 },
      )
    }

    const libraries = await loadCommentRuleLibraries()
    const created: CommentRuleLibrary = {
      id: newRuleLibraryId(),
      name,
      rules,
      ...(files.length > 0 ? { files } : {}),
      createdAt: Date.now(),
    }
    libraries.push(created)
    await saveCommentRuleLibraries(libraries)
    return NextResponse.json({ library: created })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "save failed" },
      { status: 500 },
    )
  }
}

export async function PATCH(req: NextRequest) {
  const u = await requireApiUser(req, "home")
  if (u instanceof NextResponse) return u
  try {
    const body = (await req.json()) as {
      id?: string
      name?: string
      rules?: string[]
      files?: unknown
    }
    const id = (body.id || "").trim()
    if (!id) {
      return NextResponse.json({ error: "missing id" }, { status: 400 })
    }

    const libraries = await loadCommentRuleLibraries()
    const idx = libraries.findIndex((l) => l.id === id)
    if (idx < 0) {
      return NextResponse.json({ error: "not found" }, { status: 404 })
    }

    const prev = libraries[idx]
    let next: CommentRuleLibrary = { ...prev }

    if (body.name !== undefined) {
      const n = String(body.name).trim()
      if (n) next = { ...next, name: n }
    }
    if (body.rules !== undefined) {
      next = {
        ...next,
        rules: Array.isArray(body.rules) ? body.rules.map((r) => String(r).trim()).filter(Boolean) : [],
      }
    }
    if (body.files !== undefined) {
      const files = normalizeFiles(body.files)
      next = { ...next, files: files.length > 0 ? files : undefined }
    }

    const hasRules = (next.rules?.length ?? 0) > 0
    const hasFiles = (next.files?.length ?? 0) > 0
    if (!hasRules && !hasFiles) {
      return NextResponse.json({ error: "文本规则与附件不能同时为空" }, { status: 400 })
    }

    libraries[idx] = next
    await saveCommentRuleLibraries(libraries)
    return NextResponse.json({ library: next })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "update failed" },
      { status: 500 },
    )
  }
}

export async function DELETE(req: NextRequest) {
  const u = await requireApiUser(req, "home")
  if (u instanceof NextResponse) return u
  try {
    const id = req.nextUrl.searchParams.get("id")?.trim()
    if (!id) {
      return NextResponse.json({ error: "missing id" }, { status: 400 })
    }
    const libraries = await loadCommentRuleLibraries()
    const next = libraries.filter((l) => l.id !== id)
    if (next.length === libraries.length) {
      return NextResponse.json({ error: "not found" }, { status: 404 })
    }
    await saveCommentRuleLibraries(next)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "delete failed" },
      { status: 500 },
    )
  }
}
