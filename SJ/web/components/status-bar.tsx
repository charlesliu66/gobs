"use client"

import { Sparkles, Smartphone, CheckSquare, ListTodo } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface StatusBarProps {
  totalTasks: number
  selectedTasks: number
  devicesOnline: number
  onBatchAiGenerate: () => void
  showBatchAi: boolean
}

export function StatusBar({
  totalTasks,
  selectedTasks,
  devicesOnline,
  onBatchAiGenerate,
  showBatchAi,
}: StatusBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-6">
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
        {showBatchAi && (
          <Button
            onClick={onBatchAiGenerate}
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Sparkles className="h-4 w-4" />
            批量 AI 生成评论 ({selectedTasks})
          </Button>
        )}
      </div>
    </div>
  )
}
