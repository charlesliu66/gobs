"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Smartphone,
  FileText,
  MessageSquare,
  LogIn,
  Settings,
  LogOut,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { FeatureCode } from "@/lib/auth-types"
import { useRefresh } from "@/contexts/refresh-context"

type Session = {
  isSuperAdmin: boolean
  features: FeatureCode[]
} | null

const NAV: { title: string; href: string; icon: typeof MessageSquare; feature: FeatureCode }[] = [
  { title: "批量评论", href: "/", icon: MessageSquare, feature: "home" },
  { title: "设备台", href: "/devices", icon: Smartphone, feature: "devices" },
  { title: "批量登录账号", href: "/batch-login", icon: LogIn, feature: "batch_login" },
  { title: "任务日志", href: "/tasks", icon: FileText, feature: "tasks" },
  { title: "代理设置", href: "/settings", icon: Settings, feature: "settings" },
]

export function MainTopNav() {
  const pathname = usePathname()
  const refresh = useRefresh()
  const [session, setSession] = React.useState<Session>(null)

  React.useEffect(() => {
    void fetch("/api/auth/session")
      .then((r) => r.json())
      .then(
        (d: {
          user?: { isSuperAdmin: boolean; features: FeatureCode[] } | null
          sessionRevoked?: boolean
        }) => {
          if (d.sessionRevoked) {
            void fetch("/api/auth/logout", { method: "POST" }).then(() => {
              window.location.href = "/login"
            })
            return
          }
          if (d.user) setSession({ isSuperAdmin: d.user.isSuperAdmin, features: d.user.features })
          else setSession(null)
        },
      )
      .catch(() => setSession(null))
  }, [])

  const visible = (feature: FeatureCode) => {
    if (!session) return false
    if (session.isSuperAdmin) return true
    return session.features.includes(feature)
  }

  const navActive = (href: string) => {
    if (href === "/") return pathname === "/"
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  const logout = () => {
    void fetch("/api/auth/logout", { method: "POST" }).then(() => {
      window.location.href = "/login"
    })
  }

  return (
    <header className="sticky top-0 z-[100] shrink-0 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/90">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 md:px-4">
        <div className="flex items-center gap-2 shrink-0 mr-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <MessageSquare className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="hidden sm:flex flex-col leading-tight">
            <span className="text-sm font-semibold text-foreground">TikTok 矩阵</span>
            <span className="text-[10px] text-muted-foreground">控制台</span>
          </div>
        </div>

        <nav className="flex flex-1 min-w-0 flex-wrap items-center gap-1">
          {NAV.filter((item) => visible(item.feature)).map((item) => {
            const active = navActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <item.icon className="h-3.5 w-3.5 shrink-0 opacity-90" />
                <span className="whitespace-nowrap">{item.title}</span>
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-1 shrink-0 ml-auto">
          {refresh && (
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2" onClick={refresh.refreshAll}>
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="hidden md:inline">刷新</span>
            </Button>
          )}
          <Button variant="outline" size="sm" className="h-8 gap-1.5 px-2" onClick={logout}>
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">退出</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
