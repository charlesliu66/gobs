import { formatInTimeZone, toDate } from "date-fns-tz"

/** HH:mm 解析为当天从 00:00 起的分钟数 */
export function parseHmToMinutes(hm: string): number | null {
  const m = hm.trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return null
  const h = Math.min(23, Math.max(0, parseInt(m[1], 10)))
  const mi = Math.min(59, Math.max(0, parseInt(m[2], 10)))
  return h * 60 + mi
}

/** 将某日 HH:mm（按 IANA 时区 wall clock）转为 Unix 秒 */
export function wallTimeToUnixSeconds(ymd: string, hm: string, timeZone: string): number {
  const parts = hm.trim().split(":")
  const hh = String(Math.min(23, Math.max(0, parseInt(parts[0] ?? "0", 10) || 0))).padStart(2, "0")
  const mm = String(Math.min(59, Math.max(0, parseInt(parts[1] ?? "0", 10) || 0))).padStart(2, "0")
  const iso = `${ymd}T${hh}:${mm}:00`
  const d = toDate(iso, { timeZone })
  return Math.floor(d.getTime() / 1000)
}

export function todayYmdInTimeZone(timeZone: string, now: Date = new Date()): string {
  return formatInTimeZone(now, timeZone, "yyyy-MM-dd")
}

export function randomIntInclusive(min: number, max: number): number {
  if (max < min) return min
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/** 在 [winStartSec, winEndSec] 内随机 Unix 秒（含端点） */
export function randomUnixInWindow(winStartSec: number, winEndSec: number, nowSec: number): number {
  const lo = Math.max(winStartSec, nowSec + 30)
  const hi = winEndSec
  if (hi < lo) return Math.min(hi, nowSec + 60)
  return randomIntInclusive(lo, hi)
}
