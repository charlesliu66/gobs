/**
 * 批量养号：定时规则 + 每日派发状态 + 养号任务完成后关机追踪
 * 持久化：Redis（与 comment-rule 相同环境变量）或 web/.data/warmup-state.json
 */

import { mkdir, readFile, writeFile } from "fs/promises"
import { join } from "path"

const REDIS_KEY = "sj_warmup_state"

export type WarmupSchedule = {
  id: string
  enabled: boolean
  name?: string
  envIds: string[]
  /** GeeLark 养号 action，默认随机浏览视频 */
  action: string
  durationMin: number
  durationMax: number
  /** HH:mm */
  windowStart: string
  windowEnd: string
  /** IANA，如 Asia/Shanghai */
  timeZone: string
  keywords: string[]
  createdAt: number
}

export type DispatchEntry = {
  plannedScheduleAt?: number
  dispatched?: boolean
  skipped?: boolean
  skipReason?: string
  taskId?: string
}

export type WarmupStateBlob = {
  schedules: WarmupSchedule[]
  /** key: `${scheduleId}::${envId}::${yyyy-mm-dd}` */
  dispatch: Record<string, DispatchEntry>
  /** GeeLark 任务 ID → 云手机 envId，完成后关机 */
  shutdownTasks: Record<string, string>
  /** 最近派发日志（最多保留 80 条） */
  logs: { at: number; level: "info" | "warn"; message: string }[]
}

function emptyBlob(): WarmupStateBlob {
  return { schedules: [], dispatch: {}, shutdownTasks: {}, logs: [] }
}

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
  return join(process.cwd(), ".data", "warmup-state.json")
}

let memoryBlob: WarmupStateBlob = emptyBlob()

async function readRedis(): Promise<WarmupStateBlob | null> {
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
    const parsed = JSON.parse(data.result) as WarmupStateBlob
    return {
      schedules: parsed.schedules ?? [],
      dispatch: parsed.dispatch ?? {},
      shutdownTasks: parsed.shutdownTasks ?? {},
      logs: parsed.logs ?? [],
    }
  } catch {
    return null
  }
}

async function writeRedis(blob: WarmupStateBlob): Promise<void> {
  const h = getRedisRestConfig()
  if (!h) throw new Error("Redis REST 未配置")
  const payload = JSON.stringify(blob)
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

export async function loadWarmupState(): Promise<WarmupStateBlob> {
  const fromRedis = await readRedis()
  if (fromRedis != null) return fromRedis

  try {
    const path = getLocalPath()
    const raw = await readFile(path, "utf-8")
    const parsed = JSON.parse(raw) as WarmupStateBlob
    return {
      schedules: parsed.schedules ?? [],
      dispatch: parsed.dispatch ?? {},
      shutdownTasks: parsed.shutdownTasks ?? {},
      logs: parsed.logs ?? [],
    }
  } catch {
    return { ...memoryBlob }
  }
}

export async function saveWarmupState(blob: WarmupStateBlob): Promise<void> {
  blob.logs = (blob.logs ?? []).slice(-80)
  if (getRedisRestConfig()) {
    await writeRedis(blob)
    return
  }
  try {
    const path = getLocalPath()
    await mkdir(join(path, ".."), { recursive: true })
    await writeFile(path, JSON.stringify(blob), "utf-8")
  } catch (e) {
    console.warn("[warmup-state] file write failed, using memory:", e)
    memoryBlob = { ...blob }
  }
}

export function pushWarmupLog(blob: WarmupStateBlob, level: "info" | "warn", message: string) {
  blob.logs = blob.logs ?? []
  blob.logs.push({ at: Date.now(), level, message })
  blob.logs = blob.logs.slice(-80)
}

export function newScheduleId(): string {
  return `ws-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}
