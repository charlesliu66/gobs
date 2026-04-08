/**
 * 持久化「任务 ID → 上次已知 status」，用于检测状态变化并推 SeaTalk。
 *
 * - 本地：写入 web/.data/seatalk-task-state.json（需可写目录）
 * - 云端：任选其一
 *   - Upstash：UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
 *   - Vercel KV：KV_REST_API_URL + KV_REST_API_TOKEN（与 Upstash REST 协议相同）
 * - 无持久化时：仅用内存（单次实例内有效，不推荐生产）
 */

import { mkdir, readFile, writeFile } from "fs/promises"
import { join } from "path"

export type TaskStateMap = Record<string, number>

const STATE_KEY = "seatalk_geelark_task_status"

/** Upstash 或 Vercel KV（Redis REST） */
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

async function readFromUpstash(): Promise<TaskStateMap | null> {
  const h = getRedisRestConfig()
  if (!h) return null
  try {
    const res = await fetch(h.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${h.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(["GET", STATE_KEY]),
    })
    const data = (await res.json().catch(() => ({}))) as { result?: string | null }
    if (data.result == null || data.result === "") return {}
    try {
      return JSON.parse(data.result) as TaskStateMap
    } catch {
      return {}
    }
  } catch {
    return null
  }
}

async function writeToUpstash(map: TaskStateMap): Promise<void> {
  const h = getRedisRestConfig()
  if (!h) throw new Error("Redis REST（Upstash / Vercel KV）未配置")
  const payload = JSON.stringify(map)
  const res = await fetch(h.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${h.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(["SET", STATE_KEY, payload]),
  })
  if (!res.ok) {
    const t = await res.text().catch(() => "")
    throw new Error(`Upstash SET failed: ${res.status} ${t.slice(0, 200)}`)
  }
}

function getLocalPath(): string {
  const custom = process.env.SEATALK_TASK_STATE_FILE?.trim()
  if (custom) return custom
  return join(process.cwd(), ".data", "seatalk-task-state.json")
}

let memoryFallback: TaskStateMap = {}

export async function loadTaskStatusSnapshot(): Promise<TaskStateMap> {
  const up = await readFromUpstash()
  if (up != null) return up

  try {
    const path = getLocalPath()
    const raw = await readFile(path, "utf-8")
    return JSON.parse(raw) as TaskStateMap
  } catch {
    return { ...memoryFallback }
  }
}

export async function saveTaskStatusSnapshot(map: TaskStateMap): Promise<void> {
  if (getRedisRestConfig()) {
    await writeToUpstash(map)
    return
  }

  try {
    const path = getLocalPath()
    await mkdir(join(path, ".."), { recursive: true })
    await writeFile(path, JSON.stringify(map, null, 0), "utf-8")
  } catch (e) {
    console.warn("[seatalk-task-state] file write failed, using memory only:", e)
    memoryFallback = { ...map }
  }
}
