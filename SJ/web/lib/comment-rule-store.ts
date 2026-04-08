/**
 * 评论生成规则库持久化（单库多条纯文本规则）
 *
 * - 云端：与 seatalk-task-state 相同，使用 Upstash / Vercel KV（REST）
 * - 本地：web/.data/comment-rule-libraries.json
 */

import { mkdir, readFile, writeFile } from "fs/promises"
import { join } from "path"

/** 上传的规则文件（.md / .py），内容 UTF-8 文本 */
export type CommentRuleFile = {
  name: string
  type: "md" | "py"
  content: string
}

export type CommentRuleLibrary = {
  id: string
  name: string
  /** 多条文本规则 */
  rules: string[]
  /** 从文件上传的规则（与 rules 一并参与生成） */
  files?: CommentRuleFile[]
  createdAt: number
}

/** 合并文本规则与上传文件全文，供 LLM 使用（.py/.md 均原样纳入提示词） */
export function flattenRulesForGeneration(lib: CommentRuleLibrary): string[] {
  const out = [...(lib.rules || [])]
  if (lib.files?.length) {
    for (const f of lib.files) {
      if (f.type === "py") {
        out.push(
          [
            `【规则库文件 ${f.name}（Python）】`,
            "以下为该文件完整内容。请将其中注释、字符串常量、文档说明及任何显式列举的限制，视为生成评论时必须遵守的规则（按语义理解，非执行代码）。",
            "",
            "```python",
            f.content,
            "```",
          ].join("\n"),
        )
      } else {
        out.push(
          [
            `【规则库文件 ${f.name}（Markdown）】`,
            "以下为该文件完整内容，须遵守其中对语气、主题、合规等方面的要求。",
            "",
            f.content,
          ].join("\n"),
        )
      }
    }
  }
  return out.filter(Boolean)
}

const REDIS_KEY = "sj_comment_rule_libraries"

function getRedisRestConfig(): { url: string; token: string } | null {
  const url = (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL)?.replace(/\/$/, "")
  const token = (
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN ||
    ""
  ).trim()
  if (!url || !token) return null
  return { url, token }
}

function getLocalPath(): string {
  return join(process.cwd(), ".data", "comment-rule-libraries.json")
}

let memoryFallback: CommentRuleLibrary[] = []

async function readFromRedis(): Promise<CommentRuleLibrary[] | null> {
  const h = getRedisRestConfig()
  if (!h) return null
  try {
    const res = await fetch(h.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${h.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(["GET", REDIS_KEY]),
    })
    const data = (await res.json().catch(() => ({}))) as { result?: string | null }
    if (data.result == null || data.result === "") return []
    try {
      const parsed = JSON.parse(data.result) as unknown
      return Array.isArray(parsed) ? (parsed as CommentRuleLibrary[]) : []
    } catch {
      return []
    }
  } catch {
    return null
  }
}

async function writeToRedis(libs: CommentRuleLibrary[]): Promise<void> {
  const h = getRedisRestConfig()
  if (!h) throw new Error("Redis REST（Upstash / Vercel KV）未配置")
  const payload = JSON.stringify(libs)
  const res = await fetch(h.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${h.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(["SET", REDIS_KEY, payload]),
  })
  if (!res.ok) {
    const t = await res.text().catch(() => "")
    throw new Error(`Redis SET failed: ${res.status} ${t.slice(0, 200)}`)
  }
}

export async function loadCommentRuleLibraries(): Promise<CommentRuleLibrary[]> {
  const fromRedis = await readFromRedis()
  if (fromRedis != null) return fromRedis

  try {
    const path = getLocalPath()
    const raw = await readFile(path, "utf-8")
    const parsed = JSON.parse(raw) as unknown
    if (Array.isArray(parsed)) return parsed as CommentRuleLibrary[]
  } catch {
    /* missing file */
  }
  return [...memoryFallback]
}

export async function saveCommentRuleLibraries(libs: CommentRuleLibrary[]): Promise<void> {
  if (getRedisRestConfig()) {
    await writeToRedis(libs)
    return
  }

  try {
    const path = getLocalPath()
    await mkdir(join(path, ".."), { recursive: true })
    await writeFile(path, JSON.stringify(libs, null, 0), "utf-8")
  } catch (e) {
    console.warn("[comment-rule-store] file write failed, using memory only:", e)
    memoryFallback = [...libs]
  }
}

/** 将用户输入的整段文本拆成多条规则：优先 --- 分隔，否则双换行，否则整段一条 */
export function splitRulesFromInput(text: string): string[] {
  const raw = (text || "").trim()
  if (!raw) return []
  let parts: string[]
  if (raw.includes("\n---\n")) {
    parts = raw.split(/\n---\n/g)
  } else if (raw.includes("\n\n")) {
    parts = raw.split(/\n\s*\n/g)
  } else {
    parts = [raw]
  }
  return parts.map((p) => p.trim()).filter(Boolean)
}

export function newRuleLibraryId(): string {
  return `lib-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}
