"use client"

import * as React from "react"
import { Loader2, Trash2, Clock, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { geelarkErrorHint } from "@/lib/geelark-error-hint"
import { Switch } from "@/components/ui/switch"

type Phone = { id: string; serialName?: string; serialNo?: string }

type WarmupScheduleRow = {
  id: string
  enabled: boolean
  name?: string
  envIds: string[]
  action: string
  durationMin: number
  durationMax: number
  windowStart: string
  windowEnd: string
  timeZone: string
  keywords: string[]
  createdAt: number
}

const WARMUP_ACTIONS = [
  { value: "browse video", label: "随机浏览视频" },
  { value: "search video", label: "搜索短视频" },
  { value: "search profile", label: "搜索个人主页" },
]

type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
  phones: Phone[]
  selectedIds: Set<string>
  onDone?: () => void
}

export function WarmupBatchDialog({ open, onOpenChange, phones, selectedIds, onDone }: Props) {
  const [tab, setTab] = React.useState("immediate")
  const [action, setAction] = React.useState("browse video")
  const [durationMin, setDurationMin] = React.useState(8)
  const [durationMax, setDurationMax] = React.useState(18)
  const [keywords, setKeywords] = React.useState("")
  const [windowStart, setWindowStart] = React.useState("09:00")
  const [windowEnd, setWindowEnd] = React.useState("12:00")
  const [scheduleName, setScheduleName] = React.useState("")

  const [submitting, setSubmitting] = React.useState(false)
  const [schedLoading, setSchedLoading] = React.useState(false)
  const [schedules, setSchedules] = React.useState<WarmupScheduleRow[]>([])
  const [logs, setLogs] = React.useState<{ at: number; level: string; message: string }[]>([])
  const [msg, setMsg] = React.useState<string | null>(null)
  const [err, setErr] = React.useState<string | null>(null)

  const timeZone = React.useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", [])

  const loadSchedules = React.useCallback(() => {
    setSchedLoading(true)
    fetch("/api/warmup/schedules")
      .then((r) => r.json())
      .then((d: { schedules?: WarmupScheduleRow[]; logs?: typeof logs }) => {
        setSchedules(d.schedules ?? [])
        setLogs(d.logs ?? [])
      })
      .catch(() => {})
      .finally(() => setSchedLoading(false))
  }, [])

  React.useEffect(() => {
    if (open) {
      loadSchedules()
      setMsg(null)
      setErr(null)
    }
  }, [open, loadSchedules])

  const labelFor = (id: string) => {
    const p = phones.find((x) => x.id === id)
    return p?.serialName ?? p?.serialNo ?? id
  }

  const kwArr = React.useMemo(
    () => keywords.split(/[\s,，]+/).filter(Boolean),
    [keywords],
  )

  const doImmediate = async () => {
    if (selectedIds.size === 0) {
      setErr("请先勾选要养号的云手机")
      return
    }
    setSubmitting(true)
    setErr(null)
    setMsg(null)
    try {
      const res = await fetch("/api/warmup/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          envIds: [...selectedIds],
          durationMin,
          durationMax,
          action,
          keywords: kwArr,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      const lines: string[] = []
      for (const r of data.results as { ok?: boolean; envId?: string; error?: string; logs?: string[] }) {
        if (r.ok) lines.push(`${labelFor(r.envId ?? "")}：${(r.logs ?? []).join("；")}`)
        else lines.push(`${labelFor(r.envId ?? "")}：跳过 — ${geelarkErrorHint(r.error)}`)
      }
      setMsg(lines.join("\n"))
      loadSchedules()
      onDone?.()
    } catch (e) {
      setErr(e instanceof Error ? e.message : "提交失败")
    } finally {
      setSubmitting(false)
    }
  }

  const doAddSchedule = async () => {
    if (selectedIds.size === 0) {
      setErr("请先勾选要养号的云手机")
      return
    }
    setSubmitting(true)
    setErr(null)
    setMsg(null)
    try {
      const res = await fetch("/api/warmup/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: scheduleName.trim() || undefined,
          envIds: [...selectedIds],
          durationMin,
          durationMax,
          action,
          keywords: kwArr,
          windowStart,
          windowEnd,
          timeZone,
          enabled: true,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setMsg("已保存定时规则，可继续新增下一条")
      setScheduleName("")
      loadSchedules()
      onDone?.()
    } catch (e) {
      setErr(e instanceof Error ? e.message : "保存失败")
    } finally {
      setSubmitting(false)
    }
  }

  const doDeleteSchedule = async (id: string) => {
    if (!confirm("确定删除该定时规则？")) return
    const res = await fetch(`/api/warmup/schedules?id=${encodeURIComponent(id)}`, { method: "DELETE" })
    const data = await res.json()
    if (data.error) {
      alert(data.error)
      return
    }
    loadSchedules()
  }

  const doToggleSchedule = async (id: string, enabled: boolean) => {
    const res = await fetch("/api/warmup/schedules/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, enabled }),
    })
    const data = await res.json()
    if (data.error) {
      alert(data.error)
      return
    }
    loadSchedules()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="flex max-h-[min(92vh,900px)] w-[min(96vw,800px)] max-w-[800px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[800px]"
      >
        <div className="flex shrink-0 flex-col gap-1 border-b border-border px-6 pt-6 pb-4">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle>批量养号（TikTok）</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            已选 <strong>{selectedIds.size}</strong> 台 · 浏览器时区{" "}
            <code className="rounded bg-muted px-1">{timeZone}</code>
          </p>
        </div>

        {/* 主区域：原生滚动，避免 TabsContent 与 ScrollArea 叠层 */}
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-6 py-4 [scrollbar-gutter:stable]">
          <div className="space-y-4 pb-2">
            <div className="grid gap-2">
              <Label>行为</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={action}
                onChange={(e) => setAction(e.target.value)}
              >
                {WARMUP_ACTIONS.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="grid gap-2">
                <Label>时长下限（分钟）</Label>
                <Input
                  type="number"
                  min={1}
                  value={durationMin}
                  onChange={(e) => setDurationMin(parseInt(e.target.value, 10) || 1)}
                />
              </div>
              <div className="grid gap-2">
                <Label>时长上限（分钟）</Label>
                <Input
                  type="number"
                  min={1}
                  value={durationMax}
                  onChange={(e) => setDurationMax(parseInt(e.target.value, 10) || 1)}
                />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">每台设备在区间内随机取一个时长。</p>
            <div className="grid gap-2">
              <Label>关键词（选填）</Label>
              <Input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="逗号或空格分隔" />
            </div>

            <Tabs value={tab} onValueChange={setTab} className="w-full gap-3">
              <TabsList className="grid h-10 w-full grid-cols-2 sm:h-11">
                <TabsTrigger value="immediate" className="gap-1.5 px-3 text-xs sm:text-sm">
                  <Zap className="h-3.5 w-3.5 shrink-0" />
                  立即开始养号
                </TabsTrigger>
                <TabsTrigger value="schedule" className="gap-1.5 px-3 text-xs sm:text-sm">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  定时
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* 条件渲染，避免两个 Tab 面板同时参与布局导致重叠 */}
            {tab === "immediate" && (
              <div className="rounded-lg border border-dashed bg-muted/30 px-3 py-3 text-sm text-muted-foreground">
                关机中的设备会先开机再创建养号任务；任务完成后会自动关机。
              </div>
            )}

            {tab === "schedule" && (
              <div className="space-y-4 rounded-lg border border-border bg-muted/10 p-4">
                <p className="text-sm font-medium text-foreground">新增定时规则</p>
                <div className="grid gap-2">
                  <Label>规则名称（选填）</Label>
                  <Input value={scheduleName} onChange={(e) => setScheduleName(e.target.value)} placeholder="如：午间养号" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label>窗口开始</Label>
                    <Input type="time" value={windowStart} onChange={(e) => setWindowStart(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label>窗口结束</Label>
                    <Input type="time" value={windowEnd} onChange={(e) => setWindowEnd(e.target.value)} />
                  </div>
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  每天在时间窗口内随机开始；可多次点击「新增定时规则」添加多条。需部署 Cron（/api/cron/warmup-dispatch）才会自动派发。
                </p>
                <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={() => void doAddSchedule()} disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  新增定时规则
                </Button>

                <div className="pt-2">
                  <Label className="text-sm font-medium">已保存的定时规则</Label>
                  <p className="text-[11px] text-muted-foreground mb-2">列表过长时可在此区域内滚动查看</p>
                  <div className="max-h-[min(40vh,320px)] min-h-[120px] overflow-y-auto overflow-x-hidden rounded-md border border-border bg-background">
                    <div className="sticky top-0 z-[1] border-b border-border bg-muted/50 px-3 py-2 text-xs font-medium backdrop-blur-sm">
                      共 {schedules.length} 条
                    </div>
                    {schedLoading ? (
                      <p className="p-4 text-sm text-muted-foreground">加载中…</p>
                    ) : schedules.length === 0 ? (
                      <p className="p-4 text-sm text-muted-foreground">暂无，请先勾选设备并填写窗口后点击「新增定时规则」</p>
                    ) : (
                      <ul className="divide-y">
                        {schedules.map((s) => (
                          <li key={s.id} className="flex items-start justify-between gap-3 px-3 py-3 text-sm">
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="font-medium leading-snug break-words">{s.name || s.id}</div>
                              <div className="text-xs text-muted-foreground">
                                {s.windowStart}–{s.windowEnd} · {s.envIds.length} 台 · {s.action}
                              </div>
                              <div className="flex items-center gap-2 pt-1">
                                <Switch checked={s.enabled} onCheckedChange={(v) => void doToggleSchedule(s.id, v)} />
                                <span className="text-xs text-muted-foreground">{s.enabled ? "启用" : "停用"}</span>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0 text-destructive"
                              onClick={() => void doDeleteSchedule(s.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            )}

            {logs.length > 0 && (
              <div className="rounded-md border border-dashed p-3">
                <Label className="text-xs text-muted-foreground">最近日志</Label>
                <ul className="mt-2 max-h-32 space-y-0.5 overflow-y-auto text-[11px] font-mono text-muted-foreground">
                  {logs.slice(-12).map((l, i) => (
                    <li key={i} className={l.level === "warn" ? "text-amber-700 dark:text-amber-400" : ""}>
                      {l.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {err && (
              <Alert variant="destructive">
                <AlertDescription>{err}</AlertDescription>
              </Alert>
            )}
            {msg && !err && (
              <Alert>
                <AlertDescription className="whitespace-pre-wrap text-sm">{msg}</AlertDescription>
              </Alert>
            )}
          </div>
        </div>

        <DialogFooter className="shrink-0 flex-col gap-2 border-t border-border px-6 py-4 sm:flex-row sm:justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
          {tab === "immediate" && (
            <Button onClick={() => void doImmediate()} disabled={submitting || selectedIds.size === 0}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              立即开始养号
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
