import * as React from "react"
import { cn } from "@/lib/utils"

/** 各功能区块标题：主题绿，便于区分模块 */
export function SectionHeading({
  children,
  className,
  as: Tag = "h2",
}: {
  children: React.ReactNode
  className?: string
  as?: "h1" | "h2" | "h3"
}) {
  return (
    <Tag className={cn("font-semibold text-primary tracking-tight", className)}>
      {children}
    </Tag>
  )
}
