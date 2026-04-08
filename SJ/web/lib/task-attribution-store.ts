/**
 * 记录「任务 ID → 本站创建者用户 ID」，用于任务日志按账号筛选。
 * 持久化：Redis（与 auth 相同环境变量）或 web/.data/task-attribution.json
 */

import { mkdir, readFile, writeFile } from "fs/promises"
import { join } from "path"

const REDIS_KEY = "sj_task_attribution_v1"

type Blob = { version: 1; byTaskId: Record<string, { userId: string; createdAt: number }> }

function emptyBlob(): Blob {
  return { version: 1, byTaskId: {} }
}

function getRedisRestConfig(): { url: string; token: string } | null {
  const url = (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL)?.replace(/\/$/, "")
  const token = (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || "").trim()
  if (!url || !token) return null
  return { url, token }
}

function getLocalPath(): string {
  return join(process.cwd(), ".data", "task-attribution.json")
}

let memoryBlob: Blob = emptyBlob()

async function readRedis(): Promise<Blob | null> {
  const h = getRedisRestConfig()
  if (!h) return null
  try {
    const res = await fetch(h.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${h.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(["GET", REDIS_KEY]),
    })
    const data = (await res.json().catch(() => ({}))) as { result?: string | null }
    if (data.result == null || data.result === "") return emptyBlob()
    const parsed = JSON.parse(data.result) as Blob
    return { version: 1, byTaskId: parsed.byTaskId ?? {} }
  } catch {
    return null
  }
}

async function writeRedis(blob: Blob): Promise<void> {
  const h = getRedisRestConfig()
  if (!h) throw new Error("Redis REST 未配置")
  const payload = JSON.stringify(blob)
  const res = await fetch(h.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${h.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(["SET", REDIS_KEY, payload]),
  })
  if (!res.ok) throw new Error("Redis SET 失败")
}

async function readFileBlob(): Promise<Blob> {
  try {
    const raw = await readFile(getLocalPath(), "utf8")
    const parsed = JSON.parse(raw) as Blob
    return { version: 1, byTaskId: parsed.byTaskId ?? {} }
  } catch {
    return emptyBlob()
  }
}

async function writeFileBlob(blob: Blob): Promise<void> {
  await mkdir(join(process.cwd(), ".data"), { recursive: true })
  await writeFile(getLocalPath(), JSON.stringify(blob, null, 2), "utf8")
}

export async function loadAttributionBlob(): Promise<Blob> {
  const fromRedis = await readRedis()
  if (fromRedis) {
    memoryBlob = fromRedis
    return fromRedis
  }
  const fromFile = await readFileBlob()
  memoryBlob = fromFile
  return fromFile
}

export async function saveAttributionBlob(blob: Blob): Promise<void> {
  memoryBlob = blob
  const h = getRedisRestConfig()
  if (h) {
    await writeRedis(blob)
    return
  }
  await writeFileBlob(blob)
}

/** 写入或覆盖任务创建者（同一 taskId 后写覆盖） */
export async function recordTaskAttribution(taskId: string, userId: string): Promise<void> {
  if (!taskId?.trim() || !userId?.trim()) return
  const b = await loadAttributionBlob()
  b.byTaskId[taskId] = { userId: userId.trim(), createdAt: Date.now() }
  await saveAttributionBlob(b)
}

export async function recordTaskAttributions(entries: { taskId: string; userId: string }[]): Promise<void> {
  if (!entries.length) return
  const b = await loadAttributionBlob()
  const now = Date.now()
  for (const { taskId, userId } of entries) {
    if (!taskId?.trim() || !userId?.trim()) continue
    b.byTaskId[taskId] = { userId: userId.trim(), createdAt: now }
  }
  await saveAttributionBlob(b)
}

/** 批量读取创建者 userId，未记录则 undefined */
export async function getCreatorsForTaskIds(taskIds: string[]): Promise<Map<string, string>> {
  const b = await loadAttributionBlob()
  const m = new Map<string, string>()
  for (const id of taskIds) {
    const row = b.byTaskId[id]
    if (row?.userId) m.set(id, row.userId)
  }
  return m
}

export function getCreatorFromMemoryBlob(blob: Blob, taskId: string): string | undefined {
  return blob.byTaskId[taskId]?.userId
}
