/**
 * 关闭账号下全部云手机（已关机设备会跳过）
 * 运行：cd web && npx tsx scripts/stop-all-phones.ts
 * 需 web/.env.local 中 GEELARK_BEARER_TOKEN
 */
import { existsSync, readFileSync } from "fs"
import { join } from "path"
import { fetchAllCloudPhones, phoneStop } from "../lib/geelark"

function loadEnvLocal() {
  const p = join(process.cwd(), ".env.local")
  if (!existsSync(p)) return
  const raw = readFileSync(p, "utf8")
  for (const line of raw.split("\n")) {
    const t = line.trim()
    if (!t || t.startsWith("#")) continue
    const eq = t.indexOf("=")
    if (eq <= 0) continue
    const key = t.slice(0, eq).trim()
    let val = t.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (key && process.env[key] === undefined) process.env[key] = val
  }
}

const CHUNK = 30

async function main() {
  loadEnvLocal()
  const phones = await fetchAllCloudPhones()
  const toStop = phones.filter((p) => (p.status ?? 0) !== 2)
  const ids = toStop.map((p) => p.id)
  if (ids.length === 0) {
    console.log("无待关机设备（已全部关机或列表为空）。共", phones.length, "台。")
    return
  }
  console.log(`共 ${phones.length} 台，待关机 ${ids.length} 台（已跳过已关机 ${phones.length - ids.length} 台）`)
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK)
    const data = await phoneStop(chunk)
    console.log(
      `批次 ${Math.floor(i / CHUNK) + 1}: total=${data.totalAmount ?? chunk.length} success=${data.successAmount ?? "—"} fail=${data.failAmount ?? "—"}`,
    )
  }
  console.log("完成。")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
