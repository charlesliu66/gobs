import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import nextEnv from "@next/env"

const { loadEnvConfig } = nextEnv

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.join(__dirname, "..")
// 先加载仓库根目录 SJ/.env*，再加载 web/.env*，后者覆盖前者（与「密钥写在 web/.env.local」的预期一致）
loadEnvConfig(repoRoot)
loadEnvConfig(__dirname)

/**
 * 部分环境下 @next/env 未把 .env.local 注入到 API 路由可用的 process.env；
 * 启动时再手动解析并写入 process.env（后加载的文件覆盖先加载的）。
 */
function mergeDotEnvFile(absPath) {
  if (!fs.existsSync(absPath)) return
  let raw = fs.readFileSync(absPath, "utf8")
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1)
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith("#")) continue
    const eq = t.indexOf("=")
    if (eq <= 0) continue
    const key = t.slice(0, eq).trim()
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue
    let val = t.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    process.env[key] = val
  }
}

mergeDotEnvFile(path.join(repoRoot, ".env.local"))
mergeDotEnvFile(path.join(__dirname, ".env.local"))

/** 开发模式下允许从局域网 IP 访问（否则手机/另一台电脑打开时 /_next 静态资源会被拦截，页面空白） */
function parseAllowedDevOriginsFromEnv() {
  const raw = process.env.ALLOWED_DEV_ORIGINS?.trim()
  if (!raw) return []
  return raw.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean)
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  /** 仓库根另有 package-lock.json 时，避免 Turbopack 误判 workspace 根导致启动异常 */
  turbopack: {
    root: __dirname,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "[::1]",
    ...parseAllowedDevOriginsFromEnv(),
  ],
  /** 允许被 GOBS（Vite :5173 等）以 iframe 嵌入；生产默认仅同源，可通过环境变量追加 */
  async headers() {
    const dev = process.env.NODE_ENV === "development"
    if (dev) {
      return [
        {
          source: "/:path*",
          headers: [
            {
              key: "Content-Security-Policy",
              value: "frame-ancestors *",
            },
          ],
        },
      ]
    }
    const extra = process.env.MATRIX_FRAME_ANCESTORS?.trim()
    const frame = extra ? `'self' ${extra}` : "'self'"
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `frame-ancestors ${frame}`,
          },
        ],
      },
    ]
  },
}

export default nextConfig
