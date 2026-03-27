"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"

const SEGMENTS: Record<string, string> = {
  "/": "批量评论",
  "/devices": "设备台",
  "/tasks": "任务日志",
  "/settings": "设置",
  "/apps": "应用",
}

export function DashboardHeader() {
  const pathname = usePathname()
  const title = SEGMENTS[pathname] ?? "控制台"
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-4 mx-2" />
      <nav className="flex items-center gap-2 text-sm">
        <Link href="/" className="text-muted-foreground hover:text-foreground">控制台</Link>
        <span className="text-muted-foreground">/</span>
        <span className="font-medium text-foreground">{title}</span>
      </nav>
    </header>
  )
}
