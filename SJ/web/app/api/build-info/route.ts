import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

/**
 * 用于核对「线上跑的是哪一次提交」：Vercel 构建时会注入 VERCEL_GIT_*。
 * 本地 `npm run dev` 时这些变量通常为空。
 */
export async function GET() {
  return NextResponse.json({
    vercelEnv: process.env.VERCEL_ENV ?? null,
    gitCommitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    gitCommitRef: process.env.VERCEL_GIT_COMMIT_REF ?? null,
    deploymentId: process.env.VERCEL_DEPLOYMENT_ID ?? null,
    hint:
      "将 gitCommitSha 与本机 `git rev-parse HEAD` 对比；一致说明线上即当前仓库该提交。本地开发时 gitCommitSha 多为 null。",
  })
}
