/**
 * 批量粘贴解析：Tab 分隔。支持「日期与时间之间多一个空列」（Excel 双 Tab）。
 * 列：链接、评论、日期，之后从剩余单元格中识别「时间」「UTC 时区」（顺序不限，跳过空串）。
 */

import { normalizeTime24 } from "@/lib/time"

const TIME_RE = /^(\d{1,2}):(\d{2})(?::\d{2})?$/
const UTC_RE = /^UTC\s*([+-])\s*(\d{1,2})$/i

/** 解析日期：支持 2026/7/7、2026-7-7、7/7/2026 等 */
export function parseDateStr(dateStr: string): Date | undefined {
  const s = dateStr.trim()
  if (!s) return undefined
  let y: number, mo: number, d: number
  const ymd = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/)
  if (ymd) {
    y = parseInt(ymd[1], 10)
    mo = parseInt(ymd[2], 10) - 1
    d = parseInt(ymd[3], 10)
  } else {
    const mdY = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
    if (mdY) {
      mo = parseInt(mdY[1], 10) - 1
      d = parseInt(mdY[2], 10)
      y = parseInt(mdY[3], 10)
    } else return undefined
  }
  if (isNaN(y) || mo < 0 || mo > 11 || d < 1 || d > 31) return undefined
  const date = new Date(y, mo, d)
  if (isNaN(date.getTime())) return undefined
  return date
}

/** 解析时间：14:30 或 14:30:00 -> 24 小时制 HH:mm */
export function parseTimeStr(timeStr: string): string {
  const s = (timeStr || "").trim() || "14:30"
  const m = s.match(TIME_RE)
  if (m) return normalizeTime24(`${m[1]}:${m[2]}`)
  return normalizeTime24("14:30")
}

/** 解析时区：UTC+8、UTC +8、UTC+08 -> UTC+8 */
export function parseTimezoneStr(tzStr: string): string {
  const s = (tzStr || "").trim() || "UTC+8"
  const compact = s.replace(/\s/g, "")
  const m = compact.match(/^UTC([+-])(\d{1,2})$/i)
  if (m) return `UTC${m[1]}${parseInt(m[2], 10)}`
  return "UTC+8"
}

/** 从剩余单元格中识别时间与 UTC（跳过空列）。未找到时使用 defaults */
export function pickTimeAndTimezone(
  restParts: string[],
  defaults: { time: string; timezone: string } = { time: "14:30", timezone: "UTC+8" }
): { scheduleTime: string; timezone: string } {
  let scheduleTime = defaults.time
  let timezone = defaults.timezone
  let gotTime = false
  let gotTz = false
  for (const raw of restParts) {
    const t = (raw ?? "").trim()
    if (!t) continue
    if (!gotTime && TIME_RE.test(t)) {
      scheduleTime = parseTimeStr(t)
      gotTime = true
      continue
    }
    if (!gotTz && UTC_RE.test(t.replace(/\s/g, ""))) {
      timezone = parseTimezoneStr(t)
      gotTz = true
      continue
    }
    if (!gotTz && /^UTC/i.test(t)) {
      timezone = parseTimezoneStr(t)
      gotTz = true
    }
  }
  return { scheduleTime, timezone }
}

function isLinkColumn(s: string): boolean {
  const t = (s || "").trim()
  return t.startsWith("http") || t.includes("tiktok")
}

/** 格式化为 24 小时 HH:mm（用于“当前时间”默认值） */
export function formatNowTime(now: Date): string {
  const h = now.getHours()
  const m = now.getMinutes()
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

export type ParsedBatchRow = {
  videoLink: string
  comment: string
  scheduleDate?: Date
  scheduleTime: string
  timezone: string
  /** 可选：首列为设备时解析出的设备 ID 或云手机名称 */
  deviceIdOrName?: string
}

export type ParseBatchOptions = {
  /** 未粘贴时间/时区时，用此刻作为发布时间；传入以方便测试 */
  now?: Date
  /** 未粘贴时区时使用的默认时区 */
  defaultTimezone?: string
}

export function parseBatchPaste(text: string, options?: ParseBatchOptions): ParsedBatchRow[] {
  const now = options?.now ?? new Date()
  const defaultTz = options?.defaultTimezone ?? "UTC+8"
  const defaultTime = formatNowTime(now)
  const defaultDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const lines = text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
  const rows: ParsedBatchRow[] = []
  for (const line of lines) {
    if (!line.includes("\t")) continue
    const parts = line.split(/\t/).map((s) => s.trim())
    let deviceIdOrName: string | undefined
    let linkIdx: number
    if (parts.length > 0 && !isLinkColumn(parts[0])) {
      deviceIdOrName = parts[0] || undefined
      linkIdx = 1
    } else {
      linkIdx = 0
    }
    const videoLink = (parts[linkIdx] || "").trim()
    const comment = (parts[linkIdx + 1] ?? "").trim()
    const dateStr = parts[linkIdx + 2] ?? ""
    const rest = parts.slice(linkIdx + 3)
    const { scheduleTime, timezone } = pickTimeAndTimezone(rest, {
      time: defaultTime,
      timezone: defaultTz,
    })
    if (!videoLink || (!videoLink.startsWith("http") && !videoLink.includes("tiktok"))) continue
    const scheduleDate = parseDateStr(dateStr) ?? defaultDate
    rows.push({
      videoLink,
      comment,
      scheduleDate,
      scheduleTime,
      timezone,
      deviceIdOrName: deviceIdOrName || undefined,
    })
  }
  return rows
}
