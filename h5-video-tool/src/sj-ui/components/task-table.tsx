"use client"

import * as React from "react"
import {
  Copy,
  Trash2,
  Sparkles,
  RefreshCw,
  ChevronDown,
  Calendar as CalendarIcon,
  Clock,
  Globe,
} from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { normalizeTime24 } from "@/lib/time"

export interface Task {
  id: string
  selected: boolean
  deviceName: string
  deviceId: string
  videoLink: string
  comment: string
  scheduleDate: Date | undefined
  scheduleTime: string
  timezone: string
  /** 规则库批量/单条生成失败时的提示 */
  generateError?: string
}

export interface DeviceOption {
  id: string
  serialName?: string
  serialNo?: string
}

const TIMEZONES = [
  { value: "UTC+8", label: "UTC+8" },
  { value: "UTC+9", label: "UTC+9" },
  { value: "UTC+7", label: "UTC+7" },
  { value: "UTC+0", label: "UTC+0" },
  { value: "UTC-5", label: "UTC-5" },
  { value: "UTC-8", label: "UTC-8" },
  { value: "UTC+1", label: "UTC+1" },
  { value: "UTC-6", label: "UTC-6" },
]

interface TaskTableProps {
  tasks: Task[]
  devices: DeviceOption[]
  onTasksChange: (tasks: Task[]) => void
  onAiGenerateRow: (taskId: string) => void
  /** 按当前规则库+提示词重生成该条 */
  onRegenerateRow?: (taskId: string) => void
  regeneratingId?: string | null
  /** 影响链接列标题与占位符 */
  platform?: "tiktok" | "facebook"
}

export function TaskTable({
  tasks,
  devices,
  onTasksChange,
  onAiGenerateRow,
  onRegenerateRow,
  regeneratingId,
  platform = "tiktok",
}: TaskTableProps) {
  const [pendingDeleteId, setPendingDeleteId] = React.useState<string | null>(null)

  const updateTask = (id: string, updates: Partial<Task>) => {
    onTasksChange(
      tasks.map((task) => (task.id === id ? { ...task, ...updates } : task))
    )
  }

  const duplicateTask = (task: Task) => {
    const newTask: Task = {
      ...task,
      id: `task-${Date.now()}`,
      selected: false,
      generateError: undefined,
    }
    onTasksChange([...tasks, newTask])
  }

  const confirmDeleteTask = () => {
    if (!pendingDeleteId) return
    onTasksChange(tasks.filter((task) => task.id !== pendingDeleteId))
    setPendingDeleteId(null)
  }

  const toggleAll = (checked: boolean) => {
    onTasksChange(tasks.map((task) => ({ ...task, selected: checked })))
  }

  const allSelected = tasks.length > 0 && tasks.every((task) => task.selected)
  const getDeviceLabel = (id: string) => {
    const d = devices.find((x) => x.id === id)
    return d ? (d.serialName || d.serialNo || id) : id
  }

  return (
    <TooltipProvider>
      <div className="rounded-lg border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/50 hover:bg-secondary/50">
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(checked) => toggleAll(checked as boolean)}
                  aria-label="Select all"
                  className="border-muted-foreground"
                />
              </TableHead>
              <TableHead className="w-36">云手机</TableHead>
              <TableHead className="min-w-[200px]">
                {platform === "facebook" ? "Facebook 帖子链接" : "TikTok 视频链接"}
              </TableHead>
              <TableHead className="min-w-[180px]">评论内容</TableHead>
              <TableHead className="min-w-[300px] whitespace-nowrap">发布时间（24 小时）</TableHead>
              <TableHead className="w-24 text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => (
              <TableRow
                key={task.id}
                className={cn(
                  "group transition-colors",
                  task.selected && "bg-primary/5"
                )}
              >
                <TableCell>
                  <Checkbox
                    checked={task.selected}
                    onCheckedChange={(checked) =>
                      updateTask(task.id, { selected: checked as boolean })
                    }
                    aria-label={`Select task ${task.id}`}
                    className="border-muted-foreground"
                  />
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <Select
                      value={task.deviceId}
                      onValueChange={(value) => {
                        const d = devices.find((x) => x.id === value)
                        updateTask(task.id, {
                          deviceId: value,
                          deviceName: d?.serialName || d?.serialNo || "",
                        })
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs bg-input border-border min-w-[120px]">
                        <SelectValue placeholder="选择设备" />
                      </SelectTrigger>
                      <SelectContent>
                        {devices.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.serialName || d.serialNo || d.id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {task.deviceId && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 h-4 font-mono"
                      >
                        {task.deviceId.slice(-8)}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Input
                    type="url"
                    placeholder={
                      platform === "facebook"
                        ? "https://www.facebook.com/..."
                        : "https://www.tiktok.com/@user/video/..."
                    }
                    value={task.videoLink}
                    onChange={(e) =>
                      updateTask(task.id, { videoLink: e.target.value })
                    }
                    className="h-8 text-xs bg-input border-border font-mono"
                  />
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <div className="flex gap-1">
                      <Textarea
                        placeholder="输入评论或点击 AI 生成..."
                        value={task.comment}
                        onChange={(e) =>
                          updateTask(task.id, {
                            comment: e.target.value,
                            generateError: undefined,
                          })
                        }
                        className="min-h-[60px] text-xs bg-input border-border resize-y flex-1"
                      />
                      <div className="flex flex-col gap-0.5 shrink-0">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-primary"
                              onClick={() => onAiGenerateRow(task.id)}
                            >
                              <Sparkles className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>AI 生成评论备选</TooltipContent>
                        </Tooltip>
                        {onRegenerateRow && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-primary"
                                disabled={regeneratingId === task.id}
                                onClick={() => onRegenerateRow(task.id)}
                              >
                                <RefreshCw
                                  className={cn(
                                    "h-4 w-4",
                                    regeneratingId === task.id && "animate-spin",
                                  )}
                                />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>按规则库与提示词重新生成本条</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                    {task.generateError && (
                      <p className="text-[11px] text-destructive leading-tight">{task.generateError}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell className="align-top min-w-[300px]">
                  <div className="flex flex-col gap-2 min-w-[280px]">
                    <div className="flex flex-wrap items-center gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                              "h-8 min-w-[118px] justify-start text-left text-xs bg-input border-border font-mono tabular-nums",
                              !task.scheduleDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-1 h-3 w-3 shrink-0" />
                            {task.scheduleDate
                              ? format(task.scheduleDate, "yyyy-MM-dd")
                              : "选日期"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={task.scheduleDate}
                            onSelect={(date) =>
                              updateTask(task.id, { scheduleDate: date })
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <div className="relative min-w-[7.5rem] flex-1">
                        <Clock className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none z-10" />
                        <Input
                          type="time"
                          step={60}
                          value={normalizeTime24(task.scheduleTime)}
                          onChange={(e) =>
                            updateTask(task.id, {
                              scheduleTime: normalizeTime24(e.target.value),
                            })
                          }
                          className="h-8 min-w-[7.5rem] pl-7 pr-2 text-xs bg-input border-border font-mono tabular-nums"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Globe className="h-3 w-3 text-muted-foreground shrink-0" />
                      <Select
                        value={task.timezone}
                        onValueChange={(value) =>
                          updateTask(task.id, { timezone: value })
                        }
                      >
                        <SelectTrigger className="h-8 min-w-[5.5rem] text-xs bg-input border-border font-mono">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIMEZONES.map((tz) => (
                            <SelectItem key={tz.value} value={tz.value}>
                              {tz.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => duplicateTask(task)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>复制本行</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setPendingDeleteId(task.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>删除本行</TooltipContent>
                    </Tooltip>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {tasks.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-32 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-sm">暂无任务</p>
                    <p className="text-xs">点击「添加一行」创建任务</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={pendingDeleteId != null} onOpenChange={(o) => !o && setPendingDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除本行任务？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作将移除表格中的该行，未保存的编辑会丢失。确定要继续吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDeleteTask}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  )
}
