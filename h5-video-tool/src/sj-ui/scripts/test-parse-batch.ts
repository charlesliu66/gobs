/**
 * 运行：cd web ; npx tsx scripts/test-parse-batch.ts
 */
import { parseBatchPaste } from "../lib/parse-batch-paste"

const sample = `https://www.tiktok.com/@sumominicookies/video/7614358859926277384?is_from_webapp=1&sender_device=pc	สุดปัง!	2026/3/18		18:10	UTC+7
https://www.tiktok.com/@goosegame404_v2/video/7609929472254561557?is_from_webapp=1&sender_device=pc	ของดีบอกต่อ	2026/3/18		18:11	UTC+7`

const rows = parseBatchPaste(sample)
if (rows.length !== 2) {
  console.error("FAIL: expected 2 rows, got", rows.length)
  process.exit(1)
}
const [a, b] = rows
if (a.scheduleTime !== "18:10" || a.timezone !== "UTC+7") {
  console.error("FAIL row1", a)
  process.exit(1)
}
if (b.scheduleTime !== "18:11" || b.timezone !== "UTC+7") {
  console.error("FAIL row2", b)
  process.exit(1)
}
if (!a.scheduleDate || a.scheduleDate.getFullYear() !== 2026 || a.scheduleDate.getMonth() !== 2 || a.scheduleDate.getDate() !== 18) {
  console.error("FAIL date row1", a.scheduleDate)
  process.exit(1)
}

// 无时间/时区时默认当前时间（用本地时间构造，避免时区差异）
const fixedNow = new Date(2026, 5, 15, 14, 32) // 2026-06-15 14:32 本地
const noTimeSample = "https://www.tiktok.com/@x/video/1\t评论\t2026/6/15"
const defaultRows = parseBatchPaste(noTimeSample, { now: fixedNow, defaultTimezone: "UTC+8" })
if (defaultRows.length !== 1) {
  console.error("FAIL default: expected 1 row, got", defaultRows.length)
  process.exit(1)
}
if (defaultRows[0].scheduleTime !== "14:32" || defaultRows[0].timezone !== "UTC+8") {
  console.error("FAIL default time/tz", defaultRows[0])
  process.exit(1)
}

// 首列为设备名（非链接）时解析出 deviceIdOrName
const withDevice = "我的云手机\thttps://www.tiktok.com/@x/video/2\t评论2\t2026/7/1\t09:00\tUTC+8"
const deviceRows = parseBatchPaste(withDevice)
if (deviceRows.length !== 1 || deviceRows[0].deviceIdOrName !== "我的云手机" || deviceRows[0].videoLink !== "https://www.tiktok.com/@x/video/2") {
  console.error("FAIL device column", deviceRows[0])
  process.exit(1)
}

console.log(
  "OK parseBatchPaste:",
  rows.map((r) => ({
    time: r.scheduleTime,
    tz: r.timezone,
    dateLocal: r.scheduleDate
      ? `${r.scheduleDate.getFullYear()}-${r.scheduleDate.getMonth() + 1}-${r.scheduleDate.getDate()}`
      : "",
  }))
)
console.log("OK defaultToNow, device column")
