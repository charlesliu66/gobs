"use client"

import { Smartphone, CheckSquare, ListTodo } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface StatusBarProps {
  totalTasks: number
  selectedTasks: number
  devicesOnline: number
}

export function StatusBar({
  totalTasks,
  selectedTasks,
  devicesOnline,
}: StatusBarProps) {
  return (
    <div className="fixed left-0 right-0 bottom-0 z-50 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_12px_rgba(0,0,0,0.25)]">
      <div className="flex min-h-[48px] items-center gap-2 px-4 py-2 md:px-6">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1 md:gap-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ListTodo className="h-4 w-4" />
            <span>任务总数：</span>
            <Badge variant="secondary" className="font-mono">
              {totalTasks}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckSquare className="h-4 w-4" />
            <span>已选：</span>
            <Badge
              variant={selectedTasks > 0 ? "default" : "secondary"}
              className="font-mono"
            >
              {selectedTasks}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Smartphone className="h-4 w-4" />
            <span>云手机在线：</span>
            <Badge
              variant="secondary"
              className={`font-mono ${
                devicesOnline > 0 ? "bg-success/20 text-success" : ""
              }`}
            >
              {devicesOnline}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  )
}
