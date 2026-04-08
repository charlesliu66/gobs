"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { LogOut, RefreshCw } from "lucide-react"
import { useRefresh } from "@/contexts/refresh-context"

const SEGMENTS: Record<string, string> = {
  "/": "批量评论",
  "/devices": "设备台",
  "/tasks": "任务日志",
  "/batch-login": "批量登录账号",
  "/settings": "设置",
  "/admin/accounts": "账号与权限",
}

export function DashboardHeader() {
  const pathname = usePathname()
  const refresh = useRefresh()
  const title =
    pathname.startsWith("/admin") ? SEGMENTS["/admin/accounts"] : (SEGMENTS[pathname] ?? "控制台")

  const logout = () => {
    void fetch("/api/auth/logout", { method: "POST" }).then(() => {
      window.location.href = "/login"
    })
  }
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-4 mx-2" />
      <nav className="flex items-center gap-2 text-sm flex-1">
        <Link href="/" className="text-muted-foreground hover:text-foreground">控制台</Link>
        <span className="text-muted-foreground">/</span>
        <span className="font-medium text-foreground">{title}</span>
      </nav>
      <div className="flex items-center gap-2">
        {refresh && (
          <Button variant="ghost" size="sm" onClick={refresh.refreshAll} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            刷新全部
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={logout} className="gap-2">
          <LogOut className="h-4 w-4" />
          退出
        </Button>
      </div>
    </header>
  )
}
