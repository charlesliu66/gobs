/**
 * 账号持久化：Redis（与 warmup 相同环境变量）或 web/.data/auth-users.json
 */

import { mkdir, readFile, writeFile } from "fs/promises"
import { join } from "path"
import { randomBytes } from "crypto"
import type { AuthUserRecord } from "@/lib/auth-types"

const REDIS_KEY = "sj_auth_users_v1"

type Blob = { users: AuthUserRecord[]; version: 1 }

function emptyBlob(): Blob {
  return { users: [], version: 1 }
}

function getRedisRestConfig(): { url: string; token: string } | null {
  const url = (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL)?.replace(/\/$/, "")
  const token = (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || "").trim()
  if (!url || !token) return null
  return { url, token }
}

function getLocalPath(): string {
  return join(process.cwd(), ".data", "auth-users.json")
}

let memoryBlob: Blob = emptyBlob()

function fetchWithTimeout(input: Parameters<typeof fetch>[0], init: Parameters<typeof fetch>[1], timeoutMs: number) {
  // Node.js 18+ 支持 AbortSignal.timeout；若不可用则降级为手动 AbortController
  // 目的：当外网被阻断/代理异常时，避免 fetch 永久挂起导致 /login、/api/auth/* 卡死。
  const anyAbortSignal = AbortSignal as unknown as { timeout?: (ms: number) => AbortSignal }
  if (typeof anyAbortSignal.timeout === "function") {
    return fetch(input, { ...init, signal: anyAbortSignal.timeout(timeoutMs) })
  }
  const ac = new AbortController()
  const t = setTimeout(() => ac.abort(), timeoutMs)
  return fetch(input, { ...init, signal: ac.signal }).finally(() => clearTimeout(t))
}

async function readRedis(): Promise<Blob | null> {
  const h = getRedisRestConfig()
  if (!h) return null
  try {
    const res = await fetchWithTimeout(
      h.url,
      {
      method: "POST",
      headers: { Authorization: `Bearer ${h.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(["GET", REDIS_KEY]),
      },
      2500,
    )
    const data = (await res.json().catch(() => ({}))) as { result?: string | null }
    if (data.result == null || data.result === "") return emptyBlob()
    const parsed = JSON.parse(data.result) as Blob
    return { users: parsed.users ?? [], version: 1 }
  } catch {
    return null
  }
}

async function writeRedis(blob: Blob): Promise<void> {
  const h = getRedisRestConfig()
  if (!h) throw new Error("Redis REST 未配置")
  const payload = JSON.stringify(blob)
  const res = await fetchWithTimeout(
    h.url,
    {
    method: "POST",
    headers: { Authorization: `Bearer ${h.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(["SET", REDIS_KEY, payload]),
    },
    4000,
  )
  if (!res.ok) throw new Error("Redis SET 失败")
}

async function readFileBlob(): Promise<Blob> {
  try {
    const raw = await readFile(getLocalPath(), "utf8")
    const parsed = JSON.parse(raw) as Blob
    return { users: parsed.users ?? [], version: 1 }
  } catch {
    return emptyBlob()
  }
}

async function writeFileBlob(blob: Blob): Promise<void> {
  await mkdir(join(process.cwd(), ".data"), { recursive: true })
  await writeFile(getLocalPath(), JSON.stringify(blob, null, 2), "utf8")
}

export async function loadAuthBlob(): Promise<Blob> {
  const fromRedis = await readRedis()
  if (fromRedis) {
    memoryBlob = fromRedis
    return fromRedis
  }
  const fromFile = await readFileBlob()
  memoryBlob = fromFile
  return fromFile
}

export async function saveAuthBlob(blob: Blob): Promise<void> {
  memoryBlob = blob
  const h = getRedisRestConfig()
  if (h) {
    await writeRedis(blob)
    return
  }
  try {
    await writeFileBlob(blob)
  } catch (e) {
    console.warn("[auth-store] file write failed:", e)
    throw e
  }
}

export function newUserId(): string {
  return randomBytes(16).toString("hex")
}

export async function findUserByEmail(email: string): Promise<AuthUserRecord | undefined> {
  const b = await loadAuthBlob()
  const lower = email.trim().toLowerCase()
  return b.users.find((u) => u.email.toLowerCase() === lower)
}

export async function findUserById(id: string): Promise<AuthUserRecord | undefined> {
  const b = await loadAuthBlob()
  return b.users.find((u) => u.id === id)
}

export async function listUsers(): Promise<AuthUserRecord[]> {
  const b = await loadAuthBlob()
  return [...b.users].sort((a, b) => b.createdAt - a.createdAt)
}

export async function upsertUser(user: AuthUserRecord): Promise<void> {
  const b = await loadAuthBlob()
  const i = b.users.findIndex((u) => u.id === user.id)
  if (i >= 0) b.users[i] = user
  else b.users.push(user)
  await saveAuthBlob(b)
}

export async function deleteUserById(id: string): Promise<boolean> {
  const b = await loadAuthBlob()
  const next = b.users.filter((u) => u.id !== id)
  if (next.length === b.users.length) return false
  b.users = next
  await saveAuthBlob(b)
  return true
}

export async function countSuperAdmins(): Promise<number> {
  const b = await loadAuthBlob()
  return b.users.filter((u) => u.isSuperAdmin).length
}
