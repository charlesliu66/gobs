/** 将 "9:5"、"18:10"、"18:10:00" 规范为 24 小时制 HH:mm，供 input[type=time] 与展示使用 */
export function normalizeTime24(s: string): string {
  const m = (s || "").trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/)
  if (!m) return "14:30"
  let h = parseInt(m[1], 10)
  let min = parseInt(m[2], 10)
  if (Number.isNaN(h) || Number.isNaN(min)) return "14:30"
  h = Math.min(23, Math.max(0, h))
  min = Math.min(59, Math.max(0, min))
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`
}
