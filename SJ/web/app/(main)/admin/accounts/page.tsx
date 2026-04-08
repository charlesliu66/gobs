"use client"

import { SectionHeading } from "@/components/section-heading"

/** 账号与权限已迁移至 GOBS「账号设置」，避免与矩阵内重复维护。 */
export default function AdminAccountsMovedPage() {
  return (
    <div className="max-w-xl space-y-3">
      <SectionHeading className="text-lg">账号与权限</SectionHeading>
      <p className="text-sm text-muted-foreground leading-relaxed">
        矩阵账号、功能权限与设备分配已统一在 <strong className="text-foreground">GOBS</strong> 管理。请打开 GOBS
        左下角「账号设置」创建账号并分配「TikTok 矩阵」等权限；从 GOBS 内嵌打开矩阵时会自动同步登录，无需在此重复配置。
      </p>
    </div>
  )
}
