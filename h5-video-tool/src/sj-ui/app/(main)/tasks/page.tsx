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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { format } from "date-fns"
import { useRefresh } from "@/contexts/refresh-context"
import { SectionHeading } from "@/components/section-heading"
import { GEE_TASK_STATUS as TASK_STATUS } from "@/lib/task-status-labels"

const BATCH_KEY = "geelark_batch_tasks"
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
  const [showFullLog, setShowFullLog] = React.useState(false)
  const [sessionRole, setSessionRole] = React.useState<{ isSuperAdmin: boolean } | null>(null)
  const [adminUsers, setAdminUsers] = React.useState<{ id: string; email: string }[]>([])
  const [creatorFilter, setCreatorFilter] = React.useState<string>("")

  const keyLogPattern = /成功|失败|完成|错误|超时|exception|error|Error|fail|success|结果|截图|开始|结束|timeout|result|执行|publish|upload|login|登录|发布/i
  const keyLogs = React.useMemo(() => reportLogs.filter((line) => keyLogPattern.test(line)), [reportLogs])
  const displayLogs = showFullLog ? reportLogs : keyLogs

  const loadHistory = React.useCallback((): Promise<void> => {
    const q = new URLSearchParams()
    q.set("size", "100")
    if (sessionRole?.isSuperAdmin && creatorFilter) {
      q.set("creatorUserId", creatorFilter)
    }
    return fetch(`/api/tasks/history?${q}`)
      .then((r) => r.json())
      .then((data: { items?: TaskItem[] } | { error?: string }) => {
        if (data?.items) setHistory(data.items)
        else if ((data as { error?: string }).error) setError((data as { error: string }).error)
      })
      .catch((e) => setError(e?.message || "请求失败"))
  }, [sessionRole?.isSuperAdmin, creatorFilter])

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
    void fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d: { user?: { isSuperAdmin?: boolean } | null }) => {
        if (d.user?.isSuperAdmin) {
          setSessionRole({ isSuperAdmin: true })
          void fetch("/api/admin/users")
            .then((r) => r.json())
            .then((adm: { users?: { id: string; email: string }[] }) => {
              setAdminUsers(
                (adm.users ?? []).map((x) => ({
                  id: x.id,
                  email: x.email,
                })),
              )
            })
            .catch(() => setAdminUsers([]))
        } else if (d.user) {
          setSessionRole({ isSuperAdmin: false })
        } else {
          setSessionRole(null)
        }
      })
      .catch(() => setSessionRole(null))
  }, [])

  React.useEffect(() => {
    if (sessionRole === null) return
    setLoading(true)
    setError(null)
    void loadHistory().finally(() => setLoading(false))
  }, [sessionRole, creatorFilter, loadHistory])

  const refreshCtx = useRefresh()
  const refresh = React.useCallback(() => {
    loadBatches()
    setLoading(true)
    setError(null)
    void loadHistory().finally(() => setLoading(false))
  }, [loadHistory, loadBatches])

  React.useEffect(() => { loadBatches() }, [loadBatches])
  React.useEffect(() => { if (pathname === "/tasks") loadBatches() }, [pathname, loadBatches])
  React.useEffect(() => {
    refreshCtx?.registerRefresh("tasks", refresh)
  }, [refreshCtx, refresh])

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
    setShowFullLog(false)
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SectionHeading className="text-lg">任务日志</SectionHeading>
        <div className="flex flex-wrap items-center gap-2">
          {sessionRole?.isSuperAdmin && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">发布账号</span>
              <Select
                value={creatorFilter || "__all__"}
                onValueChange={(v) => setCreatorFilter(v === "__all__" ? "" : v)}
              >
                <SelectTrigger className="w-[min(100%,280px)]">
                  <SelectValue placeholder="全部" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">全部账号</SelectItem>
                  {adminUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={() => refreshCtx?.refreshAll() ?? refresh()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            刷新
          </Button>
        </div>
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
                        const isLoginBatch = b.planName === "批量登录"
                        const taskLabel = isLoginBatch ? "登录任务" : "评论任务"
                        if (item.error) {
                          return (
                            <TableRow key={`err-${idx}-${item.link}`} className="bg-destructive/10">
                              <TableCell />
                              <TableCell>
                                {item.link ? (
                                  <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                                    {taskLabel} <ExternalLink className="h-3 w-3" />
                                  </a>
                                ) : (
                                  <span className="text-muted-foreground">{taskLabel} 第 {idx + 1} 条</span>
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
                                  {taskLabel} <ExternalLink className="h-3 w-3" />
                                </a>
                              ) : (
                                <span className="text-muted-foreground">{taskLabel} {(item.taskId ?? "").slice(-8)}</span>
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
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-medium text-muted-foreground">GeeLark 近期任务</h3>
          <p className="text-xs text-muted-foreground">
            {sessionRole?.isSuperAdmin
              ? "主账号可查看全部任务，并可通过「发布账号」筛选某一子账号通过本站创建的任务。"
              : "仅显示由本账号在控制台创建的任务（评论、登录、养号等）；未记录归属的历史任务不会出现在此列表。"}
          </p>
        </div>
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
        <DialogContent className="w-[min(95vw,1280px)] max-w-[min(95vw,1280px)] sm:max-w-[min(95vw,1280px)] max-h-[90vh] overflow-y-auto overflow-x-hidden p-6 sm:p-8 min-w-0">
          <DialogHeader>
            <DialogTitle>任务报告</DialogTitle>
          </DialogHeader>
          {reportLoading && <p className="text-muted-foreground">加载中…</p>}
          {!reportLoading && reportDetail && (
            <div className="space-y-4 text-sm min-w-0 max-w-full">
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
              {(() => {
                const isCommentTask = reportDetail.planName?.includes("评论") || reportDetail.planName === "TikTok评论" || reportDetail.planName === "批量评论"
                const resultImages = reportDetail.resultImages ?? []
                const imageUrlRe = /https?:\/\/[^\s"'<>]+\.(jpg|jpeg|png|gif|webp|bmp)(\?[^\s"'<>]*)?/gi
                const fromLogs = new Set<string>()
                reportLogs.forEach((line) => {
                  let m
                  const re = new RegExp(imageUrlRe.source, "gi")
                  while ((m = re.exec(line)) !== null) fromLogs.add(m[0])
                })
                const allImages = [...resultImages]
                fromLogs.forEach((u) => { if (!allImages.includes(u)) allImages.push(u) })
                if (allImages.length === 0) return null
                const sectionTitle = isCommentTask ? "评论截图" : "页面截图(结果)"
                return (
                  <div>
                    <div className="font-medium mb-2 flex items-center gap-1"><ImageIcon className="h-4 w-4" /> 日志截图（全部展示）</div>
                    <p className="text-xs text-muted-foreground mb-2">共 {allImages.length} 张，已全部展示，不遗漏</p>
                    <div className="flex flex-wrap gap-3 w-full min-w-0">
                      {allImages.map((url, i) => (
                        <a key={`${i}-${url}`} href={url} target="_blank" rel="noopener noreferrer" className="block max-w-full min-w-0 flex-1 basis-[min(100%,420px)]">
                          <img
                            src={url}
                            alt={`截图 ${i + 1}`}
                            className="w-full max-w-full h-auto rounded border object-contain max-h-96"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )
              })()}
              <div>
                <div className="font-medium mb-2 flex items-center justify-between gap-2">
                  <span>{showFullLog ? "完整任务日志" : "关键日志"}</span>
                  {reportLogs.length > 0 && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowFullLog((v) => !v)}>
                      {showFullLog ? "仅显示关键日志" : "展开完整日志"}
                    </Button>
                  )}
                </div>
                <pre className="rounded-md bg-muted p-3 text-xs max-h-48 overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-words break-all font-mono w-full min-w-0">
                  {displayLogs.length ? displayLogs.join("\n") : reportLogs.length ? "无关键日志，可展开完整日志查看" : "无"}
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
