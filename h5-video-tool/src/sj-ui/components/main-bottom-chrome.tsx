"use client"

import { useSidebar } from "@/components/ui/sidebar"
import { ThemeModeToggle } from "@/components/theme-mode-toggle"
import { THEME_DOCK_WIDTH_PX } from "@/lib/main-chrome"

/**
 * 主内容区左下角：明暗主题切换（与侧栏对齐，不遮挡侧栏；桌面端与底部状态栏并排）
 */
export function MainBottomChrome() {
  const { state, isMobile } = useSidebar()

  const sidebarLeft =
    isMobile ? "0px" : state === "collapsed" ? "var(--sidebar-width-icon)" : "var(--sidebar-width)"

  return (
    <div
      className="pointer-events-none fixed bottom-0 z-40 flex h-[52px] items-center border-t border-border bg-card/95 px-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] backdrop-blur supports-[backdrop-filter]:bg-card/85 dark:shadow-[0_-4px_12px_rgba(0,0,0,0.25)] md:h-[48px]"
      style={{
        left: sidebarLeft,
        width: isMobile ? "100%" : `${THEME_DOCK_WIDTH_PX}px`,
        pointerEvents: "auto",
      }}
    >
      <ThemeModeToggle variant="dock" />
    </div>
  )
}
