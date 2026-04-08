"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

type ThemeModeToggleProps = {
  /** dock：主界面左下角紧凑条；default：旧版卡片样式 */
  variant?: "default" | "dock"
}

/** 光明 / 黑暗：切换后整页使用对应主题（html 上 .light / .dark） */
export function ThemeModeToggle({ variant = "default" }: ThemeModeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = resolvedTheme === "dark"

  if (!mounted) {
    return (
      <div
        className={cn(
          "flex items-center gap-2",
          variant === "dock" ? "h-7 w-full" : "h-9 w-full justify-between gap-2 rounded-md border border-border/60 px-2 py-1.5",
        )}
      >
        {variant !== "dock" && <span className="text-xs text-muted-foreground">外观</span>}
        <div className="h-[1.15rem] w-8 shrink-0 rounded-full bg-muted" aria-hidden />
      </div>
    )
  }

  const row = (
    <>
      <span
        className={cn(
          "shrink-0 tabular-nums",
          variant === "dock" ? "text-[11px]" : "text-xs",
          !isDark ? "font-medium text-foreground" : "text-muted-foreground",
        )}
      >
        光明
      </span>
      <Switch
        id="theme-mode"
        checked={isDark}
        onCheckedChange={(on) => setTheme(on ? "dark" : "light")}
        aria-label={isDark ? "当前为黑暗模式，切换为光明" : "当前为光明模式，切换为黑暗"}
        className={variant === "dock" ? "scale-90" : undefined}
      />
      <span
        className={cn(
          "shrink-0 tabular-nums",
          variant === "dock" ? "text-[11px]" : "text-xs",
          isDark ? "font-medium text-foreground" : "text-muted-foreground",
        )}
      >
        黑暗
      </span>
    </>
  )

  if (variant === "dock") {
    return (
      <div className="flex w-full min-w-0 items-center justify-between gap-2">
        <Label htmlFor="theme-mode" className="sr-only">
          明暗主题
        </Label>
        <span className="shrink-0 text-[11px] text-muted-foreground">主题</span>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5">{row}</div>
      </div>
    )
  }

  return (
    <div className="flex w-full items-center justify-between gap-3 rounded-md border border-border/60 px-2 py-2">
      <Label htmlFor="theme-mode" className="text-xs font-normal text-muted-foreground">
        外观
      </Label>
      <div className="flex items-center gap-2">{row}</div>
    </div>
  )
}
