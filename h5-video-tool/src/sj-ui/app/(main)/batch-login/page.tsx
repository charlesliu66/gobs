"use client"

import * as React from "react"
import { Plus, LogIn, RefreshCw, ClipboardPaste } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useRefresh } from "@/contexts/refresh-context"
import { resolveDeviceFromList } from "@/lib/resolve-device-client"
import { SectionHeading } from "@/components/section-heading"

const BATCH_KEY = "geelark_batch_tasks"

type Row = { id: string; deviceIdOrName: string; account: string; password: string }

function parseBatchLoginPaste(text: string): Row[] {
  const lines = (text || "").trim().split(/\r?\n/).filter((l) => l.trim())
  const out: Row[] = []
  for (let i = 0; i < lines.length; i++) {
    const parts = lines[i].split(/\t/).map((s) => s.trim())
    const device = parts[0] ?? ""
    const account = parts[1] ?? ""
    const password = parts[2] ?? ""
    if (device || account || password) {
      out.push({ id: `row-${i}-${Date.now()}`, deviceIdOrName: device, account, password })
    }
  }
  return out
}

export default function BatchLoginPage() {
  const [rows, setRows] = React.useState<Row[]>([
    { id: "1", deviceIdOrName: "", account: "", password: "" },
  ])
  const [pasteText, setPasteText] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [phones, setPhones] = React.useState<{ id: string; serialName?: string; serialNo?: string }[]>([])
  const [result, setResult] = React.useState<{ ok: number; fail: number; detail?: string; results?: { index: number; taskId?: string; error?: string }[] } | null>(null)
  const [parseErrorOpen, setParseErrorOpen] = React.useState(false)
  const [parseErrorText, setParseErrorText] = React.useState("")
  const refresh = useRefresh()

  const loadPhones = React.useCallback(() => {
    fetch("/api/phones")
      .then((r) => r.json())
      .then((data: unknown) => {
        if (Array.isArray(data)) setPhones(data)
        else setPhones([])
      })
      .catch(() => setPhones([]))
  }, [])

  React.useEffect(() => loadPhones(), [loadPhones])
  React.useEffect(() => {
    refresh?.registerRefresh("batch-login", loadPhones)
  }, [refresh, loadPhones])

  const addRow = () => {
    setRows((r) => [...r, { id: String(Date.now()), deviceIdOrName: "", account: "", password: "" }])
  }

  const updateRow = (id: string, field: keyof Row, value: string) => {
    setRows((r) => r.map((x) => (x.id === id ? { ...x, [field]: value } : x)))
  }

  const removeRow = (id: string) => {
    if (rows.length <= 1) return
    setRows((r) => r.filter((x) => x.id !== id))
  }

  const handleBatchPaste = () => {
    const parsed = parseBatchLoginPaste(pasteText)
    if (parsed.length === 0) return
    const errors: string[] = []
    for (let i = 0; i < parsed.length; i++) {
      const row = parsed[i]
      const dev = (row.deviceIdOrName || "").trim()
      if (!dev) {
        errors.push(`第 ${i + 1} 行：请填写设备 ID 或名称。`)
        continue
      }
      const res = resolveDeviceFromList(phones, dev)
      if (!res.ok) errors.push(`第 ${i + 1} 行：${res.message}`)
    }
    if (errors.length > 0) {
      setParseErrorText(errors.join("\n\n"))
      setParseErrorOpen(true)
      return
    }
    setRows(parsed)
  }

  const handleClearPaste = () => {
    setPasteText("")
    setRows([{ id: String(Date.now()), deviceIdOrName: "", account: "", password: "" }])
  }

  const submit = async () => {
    const items = rows
      .map((r) => ({
        deviceIdOrName: (r.deviceIdOrName || "").trim(),
        account: (r.account || "").trim(),
        password: (r.password || "").trim(),
      }))
      .filter((i) => i.deviceIdOrName || i.account || i.password)
    if (items.length === 0) {
      setResult({ ok: 0, fail: 0, detail: "请至少填写一行：设备(ID/名称)、账号、密码" })
      return
    }
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch("/api/tasks/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      const results = data.results ?? []
      const ok = results.filter((r: { taskId?: string }) => r.taskId).length
      const fail = results.filter((r: { error?: string }) => r.error).length
      const batchItems = results.map((r: { taskId?: string; error?: string; index?: number }) => ({
        taskId: r.taskId,
        error: r.error,
      }))
      const taskIds = batchItems.map((i) => i.taskId).filter(Boolean) as string[]
      try {
        const prev: { batchId: string; taskIds: string[]; items?: { taskId?: string; error?: string }[]; createdAt: number; planName?: string }[] = JSON.parse(
          localStorage.getItem(BATCH_KEY) || "[]"
        )
        prev.unshift({
          batchId: `batch-${Date.now()}`,
          taskIds,
          items: batchItems,
          createdAt: Date.now(),
          planName: "批量登录",
        })
        localStorage.setItem(BATCH_KEY, JSON.stringify(prev.slice(0, 200)))
      } catch (_) {}
      const lines = results
        .filter((r: { error?: string }) => r.error)
        .map((r: { index?: number; error?: string }) => `第${(r.index ?? 0) + 1}条: ${r.error}`)
      setResult({ ok, fail, detail: lines.length ? lines.join("；") : undefined, results })
    } catch (e) {
      setResult({ ok: 0, fail: 1, detail: e instanceof Error ? e.message : "提交失败" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionHeading className="text-lg">批量登录账号</SectionHeading>
        <Button variant="outline" size="sm" onClick={() => refresh?.refreshAll() ?? loadPhones()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          刷新
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        填写设备 ID 或设备名称、TikTok 账号、密码，支持批量粘贴（Tab 分隔）。提交后将在对应云手机上创建登录任务（立即执行），并记录到任务日志。
      </p>

      <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
        <div className="flex items-center gap-2">
          <ClipboardPaste className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-primary">批量粘贴</span>
        </div>
        <p className="text-xs text-muted-foreground">
          每行 Tab 分隔三列：设备 ID/名称、账号名称、密码。解析后填入下方表格，确认后点击「提交批量登录」。
        </p>
        <Textarea
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          placeholder="设备ID或名称	账号	密码"
          className="min-h-[80px] font-mono text-xs bg-background border-border"
        />
        <div className="flex gap-2">
          <Button type="button" size="sm" className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleBatchPaste}>
            <ClipboardPaste className="h-4 w-4" />
            解析并填入下方表格
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={handleClearPaste}>
            清空
          </Button>
        </div>
      </div>

      {result != null && (
        <Alert variant={result.fail > 0 ? "destructive" : "default"}>
          <AlertDescription>
            <div className="font-medium">提交结果：成功 {result.ok} 条，失败 {result.fail} 条。</div>
            {result.detail && <div className="mt-2 text-sm">失败原因：{result.detail}</div>}
            {result.results && result.results.length > 0 && (
              <ul className="mt-3 space-y-1 text-sm max-h-40 overflow-y-auto">
                {result.results.map((r, i) => (
                  <li key={i} className={r.error ? "text-destructive" : "text-green-600"}>
                    第 {i + 1} 条：{r.taskId ? `已提交，任务 ID ${r.taskId.slice(-8)}` : `失败 — ${r.error}`}
                  </li>
                ))}
              </ul>
            )}
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => setResult(null)}>关闭</Button>
          </AlertDescription>
        </Alert>
      )}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[220px]">设备 ID / 设备名称</TableHead>
              <TableHead className="w-[200px]">账号名称</TableHead>
              <TableHead>密码</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <Input
                    value={r.deviceIdOrName}
                    onChange={(e) => updateRow(r.id, "deviceIdOrName", e.target.value)}
                    placeholder="设备 ID 或名称"
                    className="h-9"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={r.account}
                    onChange={(e) => updateRow(r.id, "account", e.target.value)}
                    placeholder="账号（邮箱/手机等）"
                    className="h-9"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="password"
                    value={r.password}
                    onChange={(e) => updateRow(r.id, "password", e.target.value)}
                    placeholder="密码"
                    className="h-9"
                  />
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => removeRow(r.id)} disabled={rows.length <= 1}>
                    删除
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={addRow} className="gap-2">
          <Plus className="h-4 w-4" />
          添加一行
        </Button>
        <Button onClick={submit} disabled={loading} className="gap-2">
          <LogIn className="h-4 w-4" />
          {loading ? "提交中…" : "提交批量登录"}
        </Button>
      </div>
      {phones.length > 0 && (
        <div className="text-xs text-muted-foreground">
          当前共 {phones.length} 台设备，可在「设备 ID/名称」列填写上表中的设备 ID 或名称。
        </div>
      )}

      <AlertDialog open={parseErrorOpen} onOpenChange={setParseErrorOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>批量粘贴解析失败</AlertDialogTitle>
            <AlertDialogDescription className="whitespace-pre-wrap text-left text-foreground">
              {parseErrorText}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setParseErrorOpen(false)}>我知道了</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
