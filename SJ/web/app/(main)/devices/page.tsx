"use client"

import * as React from "react"
import { Play, Square, Trash2, Pencil, RefreshCw, AlertCircle, ThermometerSun } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useRefresh } from "@/contexts/refresh-context"
import { SectionHeading } from "@/components/section-heading"
import { Checkbox } from "@/components/ui/checkbox"
import { WarmupBatchDialog } from "@/components/warmup-batch-dialog"

const TASK_TYPE_NAMES: Record<number, string> = {
  1: "TikTok 发视频",
  2: "TikTok 养号",
  3: "TikTok 图集",
  4: "TikTok 登录",
  6: "TikTok 编辑资料",
  42: "自定义",
}

type Phone = {
  id: string
  serialName?: string
  serialNo?: string
  /** 云手机开关机：0 待机 1 启动中 2 关机等 */
  status?: number
  /** GeeLark：1 表示 RPA/自动化任务执行中 */
  rpaStatus?: number
  group?: { id: string; name: string }
  remark?: string
  proxy?: {
    type?: string
    server?: string
    port?: number
    username?: string
    password?: string
    group?: { id: string; name: string }
  }
}

type ProxyItem = { id: string; scheme: string; server: string; port: number }

const DEVICE_STATUS_MAP: Record<number, string> = { 0: "待机中", 1: "启动中", 2: "已关机" }

function proxyLabel(p: Phone["proxy"], showGroup = false): string {
  if (!p) return "—"
  const groupPart = showGroup && p.group?.name ? `[${p.group.name}] ` : ""
  const parts = [p.type || "", p.server || "", p.port ? String(p.port) : ""].filter(Boolean)
  const detail = parts.length ? parts.join(":") : ""
  return groupPart + (detail || "—")
}

type TaskInfo = { planName?: string; taskType?: number }

export default function DevicesPage() {
  const [phones, setPhones] = React.useState<Phone[]>([])
  const [proxies, setProxies] = React.useState<ProxyItem[]>([])
  const [runningByEnv, setRunningByEnv] = React.useState<Record<string, TaskInfo>>({})
  const [pendingByEnv, setPendingByEnv] = React.useState<Record<string, TaskInfo>>({})
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [acting, setActing] = React.useState(false)
  const [actionResult, setActionResult] = React.useState<string | null>(null)
  const [editModal, setEditModal] = React.useState<Phone | null>(null)
  const [editName, setEditName] = React.useState("")
  const [editRemark, setEditRemark] = React.useState("")
  const [editProxyId, setEditProxyId] = React.useState<string>("_")
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(() => new Set())
  const [warmupOpen, setWarmupOpen] = React.useState(false)
  const refresh = useRefresh()

  const load = React.useCallback(() => {
    setLoading(true)
    setError(null)
    setActionResult(null)
    Promise.all([
      fetch("/api/phones").then((r) => r.json()),
      fetch("/api/proxies?page=1&pageSize=100").then((r) => r.json()),
      fetch("/api/tasks/history?size=200&forDevices=1").then((r) => r.json()),
    ])
      .then(([phonesData, proxiesData, historyData]) => {
        if (Array.isArray(phonesData)) setPhones(phonesData)
        else { setPhones([]); if (phonesData?.error) setError(phonesData.error) }
        if (proxiesData?.list) setProxies(proxiesData.list)
        else setProxies([])
        const items = historyData?.items ?? []
        const running: Record<string, TaskInfo> = {}
        const pending: Record<string, TaskInfo> = {}
        const terminal = (s: number) => s === 3 || s === 4 || s === 7
        const sorted = [...items].sort((a, b) => (b.scheduleAt ?? 0) - (a.scheduleAt ?? 0))
        for (const t of sorted) {
          const env = t.envId
          if (!env) continue
          const s = Number(t.status)
          if (terminal(s)) continue
          if (s === 2) {
            running[env] = { planName: t.planName, taskType: t.taskType }
          }
        }
        for (const t of sorted) {
          const env = t.envId
          if (!env) continue
          const s = Number(t.status)
          if (terminal(s)) continue
          if (s === 2) continue
          if (running[env]) continue
          if (!pending[env]) pending[env] = { planName: t.planName, taskType: t.taskType }
        }
        setRunningByEnv(running)
        setPendingByEnv(pending)
      })
      .catch((e) => setError(e?.message || "请求失败"))
      .finally(() => setLoading(false))
  }, [])

  React.useEffect(() => { load() }, [load])
  React.useEffect(() => {
    setSelectedIds((prev) => {
      const ids = new Set(phones.map((p) => p.id))
      const next = new Set<string>()
      for (const id of prev) {
        if (ids.has(id)) next.add(id)
      }
      return next
    })
  }, [phones])
  React.useEffect(() => {
    refresh?.registerRefresh("devices", load)
  }, [refresh, load])

  /** 本地 dev 未跑 Vercel Cron 时，轮询养号完成后的关机逻辑（生产环境由 Cron + SeaTalk 同步触发） */
  React.useEffect(() => {
    if (process.env.NODE_ENV !== "development") return
    const tick = () => {
      void fetch("/api/cron/warmup-shutdown").catch(() => {})
    }
    tick()
    const id = setInterval(tick, 45_000)
    return () => clearInterval(id)
  }, [])

  const doAction = async (action: "start" | "stop" | "delete", ids: string[]) => {
    if (ids.length === 0) return
    setActing(true)
    setActionResult(null)
    try {
      const res = await fetch(`/api/phones/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      if (action === "delete") {
        setPhones((p) => p.filter((x) => !ids.includes(x.id)))
        setActionResult("已删除")
      } else {
        const ok = data.successAmount ?? 0
        const fail = data.failAmount ?? 0
        const details = data.failDetails?.map((d: { id?: string; msg?: string; code?: number }) => `${d.msg ?? d.code ?? ""}`).filter(Boolean)
        let msg =
          ok > 0
            ? `成功 ${ok} 台` + (fail > 0 ? `，失败 ${fail} 台${details.length ? "：" + details.join("；") : ""}` : "")
            : fail > 0
              ? `失败：${details.join("；") || "未知"}`
              : "无变化"
        if (action === "start" && typeof data.quietHoursNotice === "string" && data.quietHoursNotice) {
          msg += `。${data.quietHoursNotice}`
        }
        setActionResult(msg)
        load()
      }
    } catch (e) {
      setActionResult(e instanceof Error ? e.message : "操作失败")
      alert(e instanceof Error ? e.message : "操作失败")
    } finally {
      setActing(false)
    }
  }

  const openEdit = (p: Phone) => {
    setEditModal(p)
    setEditName(p.serialName ?? p.serialNo ?? "")
    setEditRemark(p.remark ?? "")
    setEditProxyId("_")
  }

  const saveEdit = async () => {
    if (!editModal) return
    setActing(true)
    try {
      const res = await fetch("/api/phones/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editModal.id,
          name: editName || undefined,
          remark: editRemark || undefined,
          proxyId: editProxyId && editProxyId !== "_" ? editProxyId : undefined,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setPhones((p) =>
        p.map((x) =>
          x.id === editModal.id
            ? { ...x, serialName: editName || x.serialName, remark: editRemark || x.remark }
            : x
        )
      )
      setEditModal(null)
      load()
    } catch (e) {
      alert(e instanceof Error ? e.message : "保存失败")
    } finally {
      setActing(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SectionHeading className="text-lg">云手机列表</SectionHeading>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => setWarmupOpen(true)}
            className="gap-1.5"
          >
            <ThermometerSun className="h-4 w-4" />
            批量养号
          </Button>
          <Button variant="outline" size="sm" onClick={() => refresh?.refreshAll() ?? load()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            刷新
          </Button>
        </div>
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {actionResult && (
        <Alert variant={actionResult.startsWith("成功") ? "default" : "destructive"}>
          <AlertDescription className="flex items-center justify-between gap-2">
            <span>{actionResult}</span>
            <Button variant="ghost" size="sm" onClick={() => setActionResult(null)}>关闭</Button>
          </AlertDescription>
        </Alert>
      )}
      {loading && phones.length === 0 ? (
        <p className="text-muted-foreground">加载中…</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={phones.length > 0 && phones.every((p) => selectedIds.has(p.id))}
                    onCheckedChange={(v) => {
                      if (v === true) setSelectedIds(new Set(phones.map((p) => p.id)))
                      else setSelectedIds(new Set())
                    }}
                    aria-label="全选"
                  />
                </TableHead>
                <TableHead>名称/序列号</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>任务状态</TableHead>
                <TableHead>自动化任务</TableHead>
                <TableHead>分组</TableHead>
                <TableHead className="max-w-[260px]">当前代理（代理组）</TableHead>
                <TableHead className="min-w-[140px] max-w-[280px]">备注</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {phones.map((p) => {
                const running = runningByEnv[p.id]
                const pending = pendingByEnv[p.id]
                const rpaBusy = p.rpaStatus === 1
                const deviceStatusText = DEVICE_STATUS_MAP[p.status ?? 2] ?? "—"
                const taskStatus = running
                  ? "执行中"
                  : rpaBusy
                    ? "执行中"
                    : pending
                      ? "待执行"
                      : "无任务"
                const taskText = running
                  ? `正在执行：${running.planName || TASK_TYPE_NAMES[running.taskType ?? 0] || "任务"}`
                  : rpaBusy && !running
                    ? "正在执行自动化任务（RPA）"
                    : pending
                      ? `即将执行：${pending.planName || TASK_TYPE_NAMES[pending.taskType ?? 0] || "任务"}`
                      : "—"
                const statusClass =
                  (p.status ?? 2) === 2 ? "text-muted-foreground" : (p.status ?? 0) === 1 ? "text-amber-600 font-medium" : "text-green-600 font-medium"
                return (
                <TableRow key={p.id}>
                  <TableCell className="align-middle">
                    <Checkbox
                      checked={selectedIds.has(p.id)}
                      onCheckedChange={(v) => {
                        setSelectedIds((prev) => {
                          const next = new Set(prev)
                          if (v === true) next.add(p.id)
                          else next.delete(p.id)
                          return next
                        })
                      }}
                      aria-label="选择"
                    />
                  </TableCell>
                  <TableCell className="font-medium">{p.serialName ?? p.serialNo ?? p.id}</TableCell>
                  <TableCell><span className={statusClass}>{deviceStatusText}</span></TableCell>
                  <TableCell>
                    <span className={
                      taskStatus === "执行中" ? "text-amber-600 font-medium" :
                      taskStatus === "待执行" ? "text-blue-600" : "text-muted-foreground"
                    }>{taskStatus}</span>
                  </TableCell>
                  <TableCell className={running ? "text-amber-600" : pending ? "text-blue-600" : "text-muted-foreground"}>{taskText}</TableCell>
                  <TableCell>{p.group?.name ?? "—"}</TableCell>
                  <TableCell className="max-w-[260px] truncate text-muted-foreground" title={proxyLabel(p.proxy, true)}>
                    {proxyLabel(p.proxy, true)}
                  </TableCell>
                  <TableCell className="max-w-[280px] min-w-0 max-h-32 overflow-y-auto align-top py-3 break-words whitespace-pre-wrap text-sm">
                    {p.remark ?? "—"}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => doAction("start", [p.id])}
                      disabled={acting}
                      title="启动"
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => doAction("stop", [p.id])}
                      disabled={acting}
                      title="关机"
                    >
                      <Square className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(p)} disabled={acting} title="编辑">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => confirm("确定删除该云手机？") && doAction("delete", [p.id])}
                      disabled={acting}
                      title="删除"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              )})}
            </TableBody>
          </Table>
        </div>
      )}
      <WarmupBatchDialog
        open={warmupOpen}
        onOpenChange={setWarmupOpen}
        phones={phones}
        selectedIds={selectedIds}
        onDone={() => load()}
      />

      <Dialog open={!!editModal} onOpenChange={() => setEditModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑云手机</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>名称</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="云手机名称" />
            </div>
            <div className="grid gap-2">
              <Label>备注</Label>
              <Input value={editRemark} onChange={(e) => setEditRemark(e.target.value)} placeholder="备注" />
            </div>
            <div className="grid gap-2">
              <Label>代理（从设置中已添加的代理选择）</Label>
              <Select value={editProxyId} onValueChange={setEditProxyId}>
                <SelectTrigger><SelectValue placeholder="不修改代理" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_">不修改代理</SelectItem>
                  {proxies.map((px) => (
                    <SelectItem key={px.id} value={px.id}>
                      {px.scheme} {px.server}:{px.port}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModal(null)}>取消</Button>
            <Button onClick={saveEdit} disabled={acting}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
