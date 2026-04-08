/**
 * 生成「设备+环境+端口+代理组+空闲端口」CSV 到 web/.data/
 * 运行：cd web && npx tsx scripts/export-proxy-inventory-csv.ts
 * 需 web/.env.local 中配置 GEELARK_BEARER_TOKEN（及网络可达 GeeLark）
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs"
import { join } from "path"
import {
  computeProxyUsageFull,
  reportDevicesAndFreePortsCsv,
} from "../lib/proxy-usage-report"

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

async function main() {
  loadEnvLocal()
  if (!(process.env.GEELARK_BEARER_TOKEN || "").trim()) {
    console.error("缺少 GEELARK_BEARER_TOKEN，请在 web/.env.local 配置后重试。")
    process.exit(1)
  }

  const { report, phones } = await computeProxyUsageFull()
  const csv = reportDevicesAndFreePortsCsv(phones, report)
  const outDir = join(process.cwd(), ".data")
  mkdirSync(outDir, { recursive: true })
  const day = report.generatedAt.slice(0, 10).replace(/-/g, "")
  const filename = `proxy-devices-inventory-${day}.csv`
  const outPath = join(outDir, filename)
  writeFileSync(outPath, csv, "utf8")
  console.log(outPath)
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
