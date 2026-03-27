"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { ChevronDown, ChevronRight, ExternalLink, StopCircle, RefreshCw, FileText, ImageIcon } from "lucide-react"
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
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { format } from "date-fns"

const BATCH_KEY = "geelark_batch_tasks"
const TASK_STATUS: Record<number, string> = { 1: "等待", 2: "进行中", 3: "已完成", 4: "失败", 7: "已取消" }
const TASK_TYPE_NAMES: Record<number, string> = {
  1: "TikTok 发视频",
  2: "TikTok 养号",
  3: "TikTok 图集",
  4: "TikTok 登录",
  6: "TikTok 编辑资料",
  42: "自定义",
}

type BatchItem = { taskId?: string; error?: string; link?: string }
type BatchRecord = { batchId: string; taskIds: string[]; links?: string[]; items?: BatchItem[]; createdAt: number; planName?: string }
type TaskItem = { id: string; planName?: string; taskType?: number; serialName?: string; envId?: string; scheduleAt?: number; status?: number; failCode?: number; failDesc?: string; cost?: number }

type TaskDetailReport = {
  id: string
  planName?: string
  taskType?: number
  serialName?: string
  envId?: string
  scheduleAt?: number
  status?: number
  failCode?: number
  failDesc?: string
  cost?: number
  resultImages?: string[]
  logs?: string[]
  searchAfter?: number[]
  logContinue?: boolean
}

export default function TasksPage() {
  const pathname = usePathname()
  const [history, setHistory] = React.useState<TaskItem[]>([])
  const [batches, setBatches] = React.useState<BatchRecord[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [expandedBatch, setExpandedBatch] = React.useState<string | null>(null)
  const [subTasks, setSubTasks] = React.useState<Record<string, TaskItem[]>>({})
  const [acting, setActing] = React.useState(false)
  const [reportTaskId, setReportTaskId] = React.useState<string | null>(null)
  const [reportDetail, setReportDetail] = React.useState<TaskDetailReport | null>(null)
  const [reportLoading, setReportLoading] = React.useState(false)
  const [reportLogs, setReportLogs] = React.useState<string[]>([])
  const [reportLogsLoading, setReportLogsLoading] = React.useState(false)

  const loadHistory = React.useCallback(() => {
    fetch("/api/tasks/history")
      .then((r) => r.json())
      .then((data: { items?: TaskItem[] } | { error?: string }) => {
        if (data?.items) setHistory(data.items)
        else if ((data as { error?: string }).error) setError((data as { error: string }).error)
      })
      .catch((e) => setError(e?.message || "请求失败"))
  }, [])

  const loadBatches = React.useCallback(() => {
    try {
      const raw = localStorage.getItem(BATCH_KEY)
      const list = raw ? JSON.parse(raw) : []
      setBatches(Array.isArray(list) ? list : [])
    } catch {
      setBatches([])
    }
  }, [])

  React.useEffect(() => {
    setLoading(true)
    setError(null)
    Promise.all([fetch("/api/tasks/history").then((r) => r.json()), Promise.resolve(null)])
      .then(([data]) => {
        if (data?.items) setHistory(data.items)
        if ((data as { error?: string })?.error) setError((data as { error: string }).error)
      })
      .catch((e) => setError(e?.message || "请求失败"))
      .finally(() => setLoading(false))
  }, [])

  React.useEffect(() => { loadBatches() }, [loadBatches])
  React.useEffect(() => { if (pathname === "/tasks") loadBatches() }, [pathname, loadBatches])

  const refresh = () => {
    setLoading(true)
    loadHistory()
    loadBatches()
    setLoading(false)
  }

  const toggleBatch = (batchId: string) => {
    if (expandedBatch === batchId) {
      setExpandedBatch(null)
      return
    }
    setExpandedBatch(batchId)
    const batch = batches.find((b) => b.batchId === batchId)
    const idsToQuery = (batch?.items?.map((i) => i.taskId).filter(Boolean) as string[]) ?? batch?.taskIds ?? []
    if (idsToQuery.length === 0 && !(batch?.items?.some((i) => i.error))) return
    if (idsToQuery.length > 0 && !subTasks[batchId]) {
      fetch("/api/tasks/query", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: idsToQuery }) })
        .then((r) => r.json())
        .then((data: { items?: TaskItem[] }) => {
          setSubTasks((prev) => ({ ...prev, [batchId]: data?.items ?? [] }))
        })
    }
  }

  const cancelTasks = async (ids: string[], batchId?: string) => {
    if (ids.length === 0) return
    setActing(true)
    try {
      const res = await fetch("/api/tasks/cancel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      loadHistory()
      if (batchId) {
        const batch = batches.find((b) => b.batchId === batchId)
        const idsToQuery = (batch?.items?.map((i) => i.taskId).filter(Boolean) as string[]) ?? batch?.taskIds ?? []
        if (idsToQuery.length > 0) {
          const q = await fetch("/api/tasks/query", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: idsToQuery }) })
          const qData = await q.json()
          setSubTasks((prev) => ({ ...prev, [batchId]: qData?.items ?? [] }))
        }
      } else {
        Object.keys(subTasks).forEach((k) => setSubTasks((prev) => ({ ...prev, [k]: [] })))
        setExpandedBatch(null)
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "取消失败")
    } finally {
      setActing(false)
    }
  }

  const openReport = (taskId: string) => {
    setReportTaskId(taskId)
    setReportDetail(null)
    setReportLogs([])
    setReportLoading(true)
    fetch("/api/tasks/detail", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: taskId }) })
      .then((r) => r.json())
      .then((data: TaskDetailReport & { error?: string }) => {
        if (data.error) throw new Error(data.error)
        setReportDetail(data)
        setReportLogs(data.logs ?? [])
      })
      .catch(() => setReportDetail(null))
      .finally(() => setReportLoading(false))
  }

  const loadMoreReportLogs = () => {
    if (!reportTaskId || !reportDetail?.logContinue || !reportDetail?.searchAfter?.length) return
    setReportLogsLoading(true)
    fetch("/api/tasks/detail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: reportTaskId, searchAfter: reportDetail.searchAfter }),
    })
      .then((r) => r.json())
      .then((data: TaskDetailReport & { error?: string }) => {
        if (data.error) throw new Error(data.error)
        setReportDetail((prev) => (prev ? { ...prev, logContinue: data.logContinue, searchAfter: data.searchAfter } : null))
        setReportLogs((prev) => [...prev, ...(data.logs ?? [])])
      })
      .finally(() => setReportLogsLoading(false))
  }

  const closeReport = () => {
    setReportTaskId(null)
    setReportDetail(null)
    setReportLogs([])
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">任务日志</h2>
        <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          刷新
        </Button>
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {batches.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">本站发起的批量任务</h3>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>任务名称</TableHead>
                  <TableHead>子任务数</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                  <TableHead className="text-right w-24">单条操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map((b) => (
                  <React.Fragment key={b.batchId}>
                    <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => toggleBatch(b.batchId)}>
                      <TableCell>{expandedBatch === b.batchId ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</TableCell>
                      <TableCell className="font-medium">{b.planName ?? "批量评论"}</TableCell>
                      <TableCell>{b.items?.length ?? b.taskIds?.length ?? 0}</TableCell>
                      <TableCell>{format(new Date(b.createdAt), "yyyy-MM-dd HH:mm")}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" disabled={acting} onClick={() => cancelTasks(b.taskIds)}>
                          <StopCircle className="h-4 w-4 mr-1" /> 终止整批
                        </Button>
                      </TableCell>
                      <TableCell />
                    </TableRow>
                    {expandedBatch === b.batchId && (() => {
                      const taskList = subTasks[b.batchId] ?? []
                      const items = b.items ?? b.taskIds?.map((id, idx) => ({ taskId: id, link: b.links?.[idx] })) ?? []
                      return items.map((item, idx) => {
                        if (item.error) {
                          return (
                            <TableRow key={`err-${idx}-${item.link}`} className="bg-destructive/10">
                              <TableCell />
                              <TableCell>
                                {item.link ? (
                                  <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                                    评论任务 <ExternalLink className="h-3 w-3" />
                                  </a>
                                ) : (
                                  <span className="text-muted-foreground">第 {idx + 1} 条</span>
                                )}
                              </TableCell>
                              <TableCell>—</TableCell>
                              <TableCell>—</TableCell>
                              <TableCell>
                                <span className="text-destructive">发布失败：{item.error}</span>
                              </TableCell>
                              <TableCell className="text-right" onClick={(e) => e.stopPropagation()} />
                            </TableRow>
                          )
                        }
                        const t = taskList.find((x) => x.id === item.taskId)
                        const link = item.link ?? b.links?.[idx]
                        const canCancel = t && (t.status === 1 || t.status === 2)
                        return (
                          <TableRow key={item.taskId ?? idx} className="bg-muted/30">
                            <TableCell />
                            <TableCell>
                              {link ? (
                                <a href={link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                                  评论任务 <ExternalLink className="h-3 w-3" />
                                </a>
                              ) : (
                                <span className="text-muted-foreground">评论任务 {(item.taskId ?? "").slice(-8)}</span>
                              )}
                            </TableCell>
                            <TableCell>{t?.serialName ?? "—"}</TableCell>
                            <TableCell>{t?.scheduleAt ? format(new Date(t.scheduleAt * 1000), "yyyy-MM-dd HH:mm") : "—"}</TableCell>
                            <TableCell>
                              <span className={t?.status === 2 ? "text-amber-600" : t?.status === 3 ? "text-green-600" : t?.status === 4 ? "text-destructive" : ""}>
                                {t ? (TASK_STATUS[t.status ?? 0] ?? "—") : "—"} {t?.failDesc ? `(${t.failDesc})` : ""}
                              </span>
                            </TableCell>
                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1">
                                {item.taskId && (
                                  <Button variant="ghost" size="sm" onClick={() => openReport(item.taskId!)} title="任务报告">
                                    <FileText className="h-4 w-4" />
                                  </Button>
                                )}
                                {canCancel && (
                                  <Button variant="ghost" size="sm" disabled={acting} onClick={() => cancelTasks([item.taskId!], b.batchId)} title="终止">
                                    <StopCircle className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    })()}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">GeeLark 近期任务（近 7 天）</h3>
        {loading && history.length === 0 ? (
          <p className="text-muted-foreground">加载中…</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>任务 ID</TableHead>
                  <TableHead>计划名</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>云手机</TableHead>
                  <TableHead>计划时间</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-xs">{t.id}</TableCell>
                    <TableCell>{t.planName ?? "—"}</TableCell>
                    <TableCell>{t.taskType ?? "—"}</TableCell>
                    <TableCell>{t.serialName ?? "—"}</TableCell>
                    <TableCell>{t.scheduleAt ? format(new Date(t.scheduleAt * 1000), "yyyy-MM-dd HH:mm") : "—"}</TableCell>
                    <TableCell>
                      <span className={t.status === 2 ? "text-amber-600" : t.status === 3 ? "text-green-600" : t.status === 4 ? "text-destructive" : ""}>
                        {TASK_STATUS[t.status ?? 0] ?? "—"} {t.failDesc ? ` ${t.failDesc}` : ""}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openReport(t.id)} title="任务报告">
                          <FileText className="h-4 w-4" />
                        </Button>
                        {(t.status === 1 || t.status === 2) && (
                          <Button variant="ghost" size="sm" disabled={acting} onClick={() => cancelTasks([t.id])} title="终止">
                            <StopCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={!!reportTaskId} onOpenChange={(open) => !open && closeReport()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>任务报告</DialogTitle>
          </DialogHeader>
          {reportLoading && <p className="text-muted-foreground">加载中…</p>}
          {!reportLoading && reportDetail && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <div><span className="text-muted-foreground">任务 ID：</span>{reportDetail.id}</div>
                <div><span className="text-muted-foreground">计划名称：</span>{reportDetail.planName ?? "—"}</div>
                <div><span className="text-muted-foreground">任务类型：</span>{reportDetail.taskType != null ? (TASK_TYPE_NAMES[reportDetail.taskType] ?? reportDetail.taskType) : "—"}</div>
                <div><span className="text-muted-foreground">云手机名称：</span>{reportDetail.serialName ?? "—"}</div>
                <div><span className="text-muted-foreground">云手机 ID：</span>{reportDetail.envId ?? "—"}</div>
                <div><span className="text-muted-foreground">计划时间：</span>{reportDetail.scheduleAt ? format(new Date(reportDetail.scheduleAt * 1000), "yyyy-MM-dd HH:mm:ss") : "—"}</div>
                <div><span className="text-muted-foreground">运行耗时：</span>{reportDetail.cost != null ? `${reportDetail.cost} 秒` : "—"}</div>
                <div><span className="text-muted-foreground">状态：</span>{reportDetail.status != null ? (TASK_STATUS[reportDetail.status] ?? reportDetail.status) : "—"}</div>
              </div>
              {reportDetail.status === 4 && (reportDetail.failCode != null || reportDetail.failDesc) && (
                <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
                  <div className="font-medium text-destructive mb-1">失败信息</div>
                  {reportDetail.failCode != null && <div>失败代码：{reportDetail.failCode}</div>}
                  {reportDetail.failDesc && <div>失败原因：{reportDetail.failDesc}</div>}
                </div>
              )}
              {reportDetail.resultImages && reportDetail.resultImages.length > 0 && (
                <div>
                  <div className="font-medium mb-2 flex items-center gap-1"><ImageIcon className="h-4 w-4" /> 任务截图</div>
                  <div className="flex flex-wrap gap-2">
                    {reportDetail.resultImages.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block">
                        <img src={url} alt={`截图 ${i + 1}`} className="max-w-full h-auto max-h-64 rounded border object-contain" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <div className="font-medium mb-2">任务日志</div>
                <pre className="rounded-md bg-muted p-3 text-xs overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap font-mono">
                  {reportLogs.length ? reportLogs.join("\n") : "无"}
                </pre>
                {reportDetail.logContinue && (
                  <Button variant="outline" size="sm" className="mt-2" disabled={reportLogsLoading} onClick={loadMoreReportLogs}>
                    {reportLogsLoading ? "加载中…" : "加载更多日志"}
                  </Button>
                )}
              </div>
            </div>
          )}
          {!reportLoading && !reportDetail && reportTaskId && <p className="text-muted-foreground">无法加载任务详情</p>}
        </DialogContent>
      </Dialog>
    </div>
  )
}
