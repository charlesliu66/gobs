#!/usr/bin/env node
/**
 * 初始化本地环境：若无 .env.local 则从 .env.local.example 复制，并写入 CRON_SECRET（若尚未存在）。
 * 用法：在 web 目录执行  npm run setup:env
 */

import crypto from "crypto"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const webRoot = path.join(__dirname, "..")
const envPath = path.join(webRoot, ".env.local")
const examplePath = path.join(webRoot, ".env.local.example")

if (!fs.existsSync(examplePath)) {
  console.error("未找到 .env.local.example")
  process.exit(1)
}

if (!fs.existsSync(envPath)) {
  fs.copyFileSync(examplePath, envPath)
  console.log("✓ 已创建 web/.env.local（从 .env.local.example 复制）")
} else {
  console.log("• web/.env.local 已存在，保留原文件")
}

let content = fs.readFileSync(envPath, "utf8")
const secret = crypto.randomBytes(24).toString("hex")

if (/^CRON_SECRET=/m.test(content)) {
  console.log("• CRON_SECRET 已存在，未覆盖")
} else {
  const block = `
# --- 由 npm run setup:env 自动生成（请勿提交到 Git）---
CRON_SECRET=${secret}
`
  fs.appendFileSync(envPath, block)
  console.log("✓ 已追加 CRON_SECRET（用于 Cron 与手动触发 /api/cron/task-seatalk-sync）")
}

console.log("\n下一步请编辑 web/.env.local，填写：")
console.log("  GEELARK_BEARER_TOKEN、SEATALK_APP_ID、SEATALK_APP_SECRET、SEATALK_EMPLOYEE_CODE（推荐）或 SEATALK_GROUP_ID")
console.log("  以及 Vercel KV 或 Upstash：KV_REST_API_URL + KV_REST_API_TOKEN（或 UPSTASH_*）")
console.log("\n详细步骤见：docs/全部配置清单.md")
