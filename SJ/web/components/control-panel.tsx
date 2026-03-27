"use client"

import * as React from "react"
import { Plus, Send, Search, Globe, Sparkles, ClipboardPaste, AlertCircle } from "lucide-react"
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
import { TaskTable, Task } from "@/components/task-table"
import { StatusBar } from "@/components/status-bar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { format } from "date-fns"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { parseBatchPaste } from "@/lib/parse-batch-paste"

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

function newEmptyTask(defaultTimezone: string): Task {
  return {
    id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    selected: false,
    deviceName: "",
    deviceId: "",
    videoLink: "",
    comment: "",
    scheduleDate: undefined,
    scheduleTime: "14:30",
    timezone: defaultTimezone,
  }
}

export function ControlPanel() {
  const [tasks, setTasks] = React.useState<Task[]>([])
  const [searchQuery, setSearchQuery] = React.useState("")
  const [defaultTimezone, setDefaultTimezone] = React.useState("UTC+8")
  const [devices, setDevices] = React.useState<{ id: string; serialName?: string; serialNo?: string }[]>([])
  const [loading, setLoading] = React.useState(true)
  const [submitting, setSubmitting] = React.useState(false)
  const [geelarkOk, setGeelarkOk] = React.useState<boolean | null>(null)
  const [geelarkMessage, setGeelarkMessage] = React.useState<string>("")
  const [batchPasteText, setBatchPasteText] = React.useState("")
  const [submitResult, setSubmitResult] = React.useState<{ ok: number; fail: number; detail?: string } | null>(null)
  const [aiDialog, setAiDialog] = React.useState<{ taskId: string; suggestions: string[] } | null>(null)
  const [selectedComment, setSelectedComment] = React.useState("")
  const [useAsia, setUseAsia] = React.useState(true)
  const [batchNameDialog, setBatchNameDialog] = React.useState<{
    results: { taskId?: string; error?: string; index?: number }[]
    valid: { deviceId?: string; videoLink?: string }[]
    items: { taskId?: string; error?: string; link?: string }[]
    taskIds: string[]
    links: string[]
  } | null>(null)
  const [batchNameInput, setBatchNameInput] = React.useState("")

  React.useEffect(() => {
    fetch("/api/geelark-status")
      .then((r) => r.json())
      .then((status: { ok?: boolean; message?: string }) => {
        setGeelarkOk(!!status.ok)
        setGeelarkMessage(status.message || "")
        return fetch("/api/phones")
      })
      .then((r) => r.json())
      .then((data: unknown) => {
        if (Array.isArray(data)) setDevices(data)
        else setDevices([])
      })
      .catch((e) => {
        setGeelarkOk(false)
        setGeelarkMessage(e instanceof Error ? e.message : "请求失败")
        setDevices([])
      })
      .finally(() => setLoading(false))
  }, [])

  React.useEffect(() => {
    if (tasks.length === 0 && devices.length > 0) {
      setTasks([
        {
          ...newEmptyTask(defaultTimezone),
          deviceId: devices[0]?.id ?? "",
          deviceName: devices[0]?.serialName ?? devices[0]?.serialNo ?? "",
        },
      ])
    }
  }, [devices.length, defaultTimezone])

  const addNewTask = () => {
    const newTask = newEmptyTask(defaultTimezone)
    if (devices.length > 0 && !newTask.deviceId) {
      newTask.deviceId = devices[0].id
      newTask.deviceName = devices[0].serialName || devices[0].serialNo || ""
    }
    setTasks([...tasks, newTask])
  }

  /** 根据设备 ID 或云手机名称从列表中解析出 deviceId、deviceName */
  const resolveDevice = (deviceIdOrName?: string): { id: string; name: string } => {
    const first = { id: devices[0]?.id ?? "", name: devices[0]?.serialName || devices[0]?.serialNo || "" }
    if (!deviceIdOrName?.trim()) return first
    const key = deviceIdOrName.trim()
    const found = devices.find(
      (d) =>
        d.id === key ||
        (d.serialName && d.serialName === key) ||
        (d.serialNo != null && (String(d.serialNo) === key || d.serialNo === key))
    )
    if (found) return { id: found.id, name: found.serialName || String(found.serialNo ?? found.id) }
    return first
  }

  const handleBatchPaste = () => {
    const rows = parseBatchPaste(batchPasteText, {
      now: new Date(),
      defaultTimezone: defaultTimezone,
    })
    if (rows.length === 0) {
      alert(
        "未解析到有效行。格式：每行 Tab 分隔。可选首列「设备ID或名称」，然后：视频链接、评论、发布日期(2026/7/7)、发布时间(18:10)、时区(UTC+7)。不填时间/时区则按当前时间发布。"
      )
      return
    }
    const newTasks: Task[] = rows.map((r) => {
      const { id: deviceId, name: deviceName } = resolveDevice(r.deviceIdOrName)
      return {
        ...newEmptyTask(r.timezone || defaultTimezone),
        videoLink: r.videoLink,
        comment: r.comment,
        scheduleDate: r.scheduleDate,
        scheduleTime: r.scheduleTime || "14:30",
        timezone: r.timezone || defaultTimezone,
        deviceId,
        deviceName,
      }
    })
    setTasks(newTasks)
    setBatchPasteText("")
  }

  /** 清空粘贴框，并重置下方表格为一行空任务（不依赖 useEffect，否则清空后不会自动补一行） */
  const handleClearBatchPaste = () => {
    setBatchPasteText("")
    setSubmitResult(null)
    if (devices.length > 0) {
      setTasks([
        {
          ...newEmptyTask(defaultTimezone),
          deviceId: devices[0].id,
          deviceName: devices[0].serialName || devices[0].serialNo || "",
        },
      ])
    } else {
      setTasks([])
    }
  }

  const handleAiGenerateRow = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId)
    const url = task?.videoLink || "https://www.tiktok.com/"
    try {
      const res = await fetch("/api/generate-comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      const suggestions = data.suggestions || []
      setSelectedComment(suggestions[0] || "")
      setAiDialog({ taskId, suggestions })
    } catch {
      setAiDialog({ taskId, suggestions: ["Nice! 🔥", "So good!", "Love this!"] })
      setSelectedComment("Nice! 🔥")
    }
  }

  const applyAiComment = () => {
    if (aiDialog && selectedComment) {
      setTasks(
        tasks.map((t) =>
          t.id === aiDialog.taskId ? { ...t, comment: selectedComment } : t
        )
      )
    }
    setAiDialog(null)
  }

  const handleScheduleAll = async () => {
    const valid = tasks.filter(
      (t) =>
        t.deviceId &&
        t.videoLink &&
        t.comment &&
        (t.scheduleDate || t.scheduleTime)
    )
    if (valid.length === 0) {
      alert("请至少填写一行完整信息：云手机、视频链接、评论、发布时间")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tasks: valid.map((t) => ({
            phoneId: t.deviceId,
            videoLink: t.videoLink,
            comment: t.comment,
            scheduleDate: t.scheduleDate ? format(t.scheduleDate, "yyyy-MM-dd") : undefined,
            scheduleTime: t.scheduleTime || "14:30",
            timezone: t.timezone || defaultTimezone,
            useAsia,
          })),
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      const results = data.results || []
      const ok = results.filter((r: { taskId?: string }) => r.taskId).length
      const fail = results.filter((r: { error?: string }) => r.error).length
      const items = results.map((r: { taskId?: string; error?: string; index?: number }, i: number) => ({
        taskId: r.taskId,
        error: r.error,
        link: valid[i]?.videoLink ?? "",
      }))
      const taskIds = items.map((it) => it.taskId).filter(Boolean) as string[]
      const links = items.map((it) => it.link)
      setBatchNameDialog({ results, valid, items, taskIds, links })
      setBatchNameInput("")
      const errLines = results.filter((r: { error?: string }) => r.error).map((r: { error?: string; index?: number }, i: number) => `第${(r.index ?? i) + 1}条: ${r.error}`)
      setSubmitResult({ ok, fail, detail: errLines.length > 0 ? errLines.join("；") : undefined })
      alert(`提交完成：成功 ${ok} 条，失败 ${fail} 条。请为本次任务命名以便在任务日志中区分。`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : "提交失败"
      setSubmitResult({ ok: 0, fail: 1, detail: msg })
      alert(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const confirmBatchName = () => {
    if (!batchNameDialog) return
    const name = (batchNameInput || "批量评论").trim()
    try {
      const key = "geelark_batch_tasks"
      const prev: { batchId: string; taskIds: string[]; links?: string[]; items?: { taskId?: string; error?: string; link?: string }[]; createdAt: number; planName?: string }[] = JSON.parse(localStorage.getItem(key) || "[]")
      prev.unshift({
        batchId: `batch-${Date.now()}`,
        taskIds: batchNameDialog.taskIds,
        links: batchNameDialog.links,
        items: batchNameDialog.items,
        createdAt: Date.now(),
        planName: name,
      })
      localStorage.setItem(key, JSON.stringify(prev.slice(0, 200)))
    } catch (_) {}
    setBatchNameDialog(null)
    setBatchNameInput("")
  }

  const handleBatchAiGenerate = async () => {
    const selected = tasks.filter((t) => t.selected)
    if (selected.length === 0) return
    for (const t of selected) {
      const url = t.videoLink || "https://www.tiktok.com/"
      try {
        const res = await fetch("/api/generate-comment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        })
        const data = await res.json()
        const suggestions = data.suggestions || []
        const comment = suggestions[0] || "Nice!"
        setTasks((prev) =>
          prev.map((x) => (x.id === t.id ? { ...x, comment } : x))
        )
      } catch {
        setTasks((prev) =>
          prev.map((x) => (x.id === t.id ? { ...x, comment: "Nice! 🔥" } : x))
        )
      }
      await new Promise((r) => setTimeout(r, 200))
    }
  }

  const filteredTasks = tasks.filter(
    (task) =>
      task.videoLink.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.comment.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.deviceName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const selectedCount = tasks.filter((t) => t.selected).length

  return (
    <div className="flex flex-col h-full pb-16">
      {geelarkOk === false && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            GeeLark 未连接：{geelarkMessage}。请在 <code className="text-xs bg-muted px-1">web/.env.local</code> 中配置 <code className="text-xs bg-muted px-1">GEELARK_BEARER_TOKEN</code> 后重启 <code className="text-xs bg-muted px-1">npm run dev</code>。
          </AlertDescription>
        </Alert>
      )}
      {submitResult != null && (
        <Alert variant={submitResult.fail > 0 ? "destructive" : "default"} className="mb-4">
          <AlertDescription>
            提交结果：成功 {submitResult.ok} 条，失败 {submitResult.fail} 条。
            {submitResult.detail && <span className="block mt-2 text-sm">失败原因：{submitResult.detail}</span>}
          </AlertDescription>
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => setSubmitResult(null)}>关闭</Button>
        </Alert>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">
          批量评论定时发布
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          多视频链接、多评论，支持批量粘贴（Tab/逗号分隔）；时区为 UTC±N
        </p>
      </div>

      {/* 批量粘贴区：表格式输入 */}
      <div className="mb-4 rounded-lg border border-border bg-muted/30 p-4">
        <div className="flex items-center gap-2 mb-2">
          <ClipboardPaste className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">批量粘贴</span>
        </div>
        <p className="text-xs text-muted-foreground mb-2">
          每行 Tab 分隔。可选首列填<strong>设备ID或云手机名称</strong>，然后：视频链接、评论、发布日期(2026/7/7)、发布时间(18:10)、时区(UTC+7)。不填时间/时区则按<strong>当前时间</strong>发布。日期与时间之间可多空一列。
        </p>
        <Textarea
          placeholder={"设备名或ID\thttps://www.tiktok.com/@xxx/video/123\t评论\t2026/7/7\t18:10\tUTC+8"}
          value={batchPasteText}
          onChange={(e) => setBatchPasteText(e.target.value)}
          className="min-h-[100px] font-mono text-xs bg-background border-border"
          onPaste={() => {}}
        />
        <div className="mt-2 flex gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="gap-2"
            onClick={handleBatchPaste}
          >
            <ClipboardPaste className="h-4 w-4" />
            解析并填入下方表格
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClearBatchPaste}
          >
            清空
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">默认时区：</span>
            <Select value={defaultTimezone} onValueChange={setDefaultTimezone}>
              <SelectTrigger className="w-32 h-9 bg-input border-border">
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
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={useAsia}
              onChange={(e) => setUseAsia(e.target.checked)}
              className="rounded border-input"
            />
            <span className="text-sm text-muted-foreground">使用亚洲版 API (tiktokRandomCommentAsia)</span>
          </label>
          <div className="flex-1" />
          <Button
            onClick={addNewTask}
            variant="outline"
            className="gap-2 border-border hover:bg-secondary"
          >
            <Plus className="h-4 w-4" />
            添加一行
          </Button>
          <Button
            onClick={handleScheduleAll}
            disabled={submitting || geelarkOk === false}
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Send className="h-4 w-4" />
            {submitting ? "提交中…" : "批量提交定时任务"}
          </Button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="按链接、评论或设备搜索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-9 bg-input border-border"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {loading ? (
          <p className="text-sm text-muted-foreground">加载云手机列表中...</p>
        ) : (
          <TaskTable
            tasks={filteredTasks}
            devices={devices}
            onTasksChange={(newTasks) => {
              const updatedIds = new Set(newTasks.map((t) => t.id))
              setTasks((prev) => [
                ...prev.filter((t) => !updatedIds.has(t.id)),
                ...newTasks,
              ])
            }}
            onAiGenerateRow={handleAiGenerateRow}
          />
        )}
      </div>

      <StatusBar
        totalTasks={tasks.length}
        selectedTasks={selectedCount}
        devicesOnline={devices.length}
        onBatchAiGenerate={handleBatchAiGenerate}
        showBatchAi={selectedCount > 0}
      />

      <Dialog open={!!aiDialog} onOpenChange={() => setAiDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>选择或编辑评论</DialogTitle>
          </DialogHeader>
          {aiDialog && (
            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <p className="text-sm text-muted-foreground">点击选择一条，或在下框修改</p>
                <ul className="list-disc pl-4 space-y-1 max-h-32 overflow-y-auto">
                  {aiDialog.suggestions.map((s, i) => (
                    <li
                      key={i}
                      className="cursor-pointer text-sm hover:bg-secondary/50 rounded px-2 py-1"
                      onClick={() => setSelectedComment(s)}
                    >
                      {s}
                    </li>
                  ))}
                </ul>
                <Input
                  value={selectedComment}
                  onChange={(e) => setSelectedComment(e.target.value)}
                  placeholder="评论内容"
                  className="mt-2"
                />
              </div>
              <Button onClick={applyAiComment} className="w-full">
                使用该评论
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!batchNameDialog} onOpenChange={(open) => !open && setBatchNameDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>为本次任务命名</DialogTitle>
          </DialogHeader>
          {batchNameDialog && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">输入任务名称后，将在任务日志中显示，便于回溯。</p>
              <Input
                value={batchNameInput}
                onChange={(e) => setBatchNameInput(e.target.value)}
                placeholder="例如：3月18日亚洲区评论"
                onKeyDown={(e) => e.key === "Enter" && confirmBatchName()}
              />
              <Button onClick={confirmBatchName} className="w-full">
                确认并记录到任务日志
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
