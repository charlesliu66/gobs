/**
 * 夜间静默：指定 serialName 的设备在 21:00–09:00（可配置时区）禁止开机；
 * 若此时段内已开机，由定时任务尽快关机（配合每分钟 Cron，一般 1 分钟内）。
 *
 * QUIET_HOURS_PHONE_NAMES=TEST3,ID（逗号分隔，与 GeeLark 云手机名称 serialName 一致）
 * QUIET_HOURS_TIMEZONE=Asia/Shanghai（可选）
 */

import { getCloudPhones, phoneStop, type PhoneItem } from "@/lib/geelark"
import { loadWarmupState, pushWarmupLog, saveWarmupState } from "@/lib/warmup-state"

function getRestrictedPhoneNames(): string[] {
  const raw = process.env.QUIET_HOURS_PHONE_NAMES?.trim()
  if (!raw) return []
  return raw
    .split(/[,，;；\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function getQuietHoursTimeZone(): string {
  const tz = process.env.QUIET_HOURS_TIMEZONE?.trim()
  return tz || "Asia/Shanghai"
}

/** 21:00（含）至次日 09:00（不含） */
export function isQuietHoursNow(now = new Date()): boolean {
  const tz = getQuietHoursTimeZone()
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    hour12: false,
  })
  const parts = dtf.formatToParts(now)
  const h = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10)
  return h >= 21 || h < 9
}

export function hasQuietHoursRestriction(): boolean {
  return getRestrictedPhoneNames().length > 0
}

function phoneMatchesRestrictedName(phone: PhoneItem, names: string[]): boolean {
  const sn = phone.serialName?.trim()
  if (!sn) return false
  const lower = sn.toLowerCase()
  return names.some((n) => n.toLowerCase() === lower)
}

/** 已配置名单且在静默窗口内、且名称匹配 → 禁止开机与养号调度 */
export function isQuietHoursRestrictedPhone(phone: PhoneItem): boolean {
  const names = getRestrictedPhoneNames()
  if (names.length === 0) return false
  if (!isQuietHoursNow()) return false
  return phoneMatchesRestrictedName(phone, names)
}

/** 静默窗口内需强制关机的设备（已开机或启动中） */
export function shouldForceStopInQuietHours(phone: PhoneItem): boolean {
  if (!isQuietHoursRestrictedPhone(phone)) return false
  const st = phone.status ?? 2
  return st !== 2
}

async function fetchAllPhones(): Promise<PhoneItem[]> {
  const all: PhoneItem[] = []
  let page = 1
  const pageSize = 100
  while (true) {
    const batch = await getCloudPhones({ page, pageSize })
    all.push(...batch)
    if (batch.length < pageSize) break
    page++
    if (page > 200) break
  }
  return all
}

/** 开机 API：在静默窗口内拦截名单内设备 */
export async function partitionIdsForPhoneStart(ids: string[]): Promise<{ allowed: string[]; blocked: string[] }> {
  const names = getRestrictedPhoneNames()
  if (names.length === 0 || !isQuietHoursNow() || ids.length === 0) {
    return { allowed: ids, blocked: [] }
  }
  const items = await getCloudPhones({ page: 1, pageSize: Math.min(100, Math.max(ids.length, 10)), ids })
  const byId = new Map(items.map((p) => [p.id, p]))
  const allowed: string[] = []
  const blocked: string[] = []
  for (const id of ids) {
    const p = byId.get(id)
    if (p && isQuietHoursRestrictedPhone(p)) blocked.push(id)
    else allowed.push(id)
  }
  return { allowed, blocked }
}

/** 静默窗口内将名单内已开机设备关机（每批最多 30 台） */
export async function processQuietHoursForceStopTick(): Promise<{ stopped: number }> {
  const names = getRestrictedPhoneNames()
  if (names.length === 0) return { stopped: 0 }
  if (!isQuietHoursNow()) return { stopped: 0 }

  let stopped = 0
  const blob = await loadWarmupState()
  try {
    const phones = await fetchAllPhones()
    const toStop: string[] = []
    for (const p of phones) {
      if (shouldForceStopInQuietHours(p)) toStop.push(p.id)
    }
    if (toStop.length === 0) return { stopped: 0 }

    for (let i = 0; i < toStop.length; i += 30) {
      const chunk = toStop.slice(i, i + 30)
      try {
        await phoneStop(chunk)
        stopped += chunk.length
        pushWarmupLog(blob, "info", `夜间静默强制关机：${chunk.length} 台（QUIET_HOURS_PHONE_NAMES）`)
      } catch (e) {
        pushWarmupLog(blob, "warn", `夜间静默关机失败（${chunk.length} 台）：${e instanceof Error ? e.message : String(e)}`)
      }
    }
    await saveWarmupState(blob)
  } catch (e) {
    pushWarmupLog(blob, "warn", `夜间静默检查失败：${e instanceof Error ? e.message : String(e)}`)
    await saveWarmupState(blob)
  }
  return { stopped }
}
