"use client"

import * as React from "react"
import { Play, Square, Trash2, Pencil, RefreshCw, AlertCircle } from "lucide-react"
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

type Phone = {
  id: string
  serialName?: string
  serialNo?: string
  status?: number
  group?: { id: string; name: string }
  remark?: string
  proxy?: { type?: string; server?: string; port?: number; username?: string; password?: string }
}

type ProxyItem = { id: string; scheme: string; server: string; port: number }

const STATUS_MAP: Record<number, string> = { 0: "已启动", 1: "启动中", 2: "已关机" }

function proxyLabel(p: Phone["proxy"]): string {
  if (!p) return "—"
  const parts = [p.type || "", p.server || "", p.port ? String(p.port) : ""].filter(Boolean)
  return parts.length ? parts.join(":") : "—"
}

export default function DevicesPage() {
  const [phones, setPhones] = React.useState<Phone[]>([])
  const [proxies, setProxies] = React.useState<ProxyItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [acting, setActing] = React.useState(false)
  const [actionResult, setActionResult] = React.useState<string | null>(null)
  const [editModal, setEditModal] = React.useState<Phone | null>(null)
  const [editName, setEditName] = React.useState("")
  const [editRemark, setEditRemark] = React.useState("")
  const [editProxyId, setEditProxyId] = React.useState<string>("_")

  const load = React.useCallback(() => {
    setLoading(true)
    setError(null)
    setActionResult(null)
    Promise.all([
      fetch("/api/phones").then((r) => r.json()),
      fetch("/api/proxies?page=1&pageSize=100").then((r) => r.json()),
    ])
      .then(([phonesData, proxiesData]) => {
        if (Array.isArray(phonesData)) setPhones(phonesData)
        else { setPhones([]); if (phonesData?.error) setError(phonesData.error) }
        if (proxiesData?.list) setProxies(proxiesData.list)
        else setProxies([])
      })
      .catch((e) => setError(e?.message || "请求失败"))
      .finally(() => setLoading(false))
  }, [])

  React.useEffect(() => { load() }, [load])

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
        setActionResult(ok > 0 ? `成功 ${ok} 台` + (fail > 0 ? `，失败 ${fail} 台${details.length ? "：" + details.join("；") : ""}` : "") : (fail > 0 ? `失败：${details.join("；") || "未知"}` : "无变化"))
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
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">云手机列表</h2>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          刷新
        </Button>
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
                <TableHead>名称/序列号</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>分组</TableHead>
                <TableHead className="max-w-[220px]">当前代理</TableHead>
                <TableHead>备注</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {phones.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.serialName ?? p.serialNo ?? p.id}</TableCell>
                  <TableCell>{STATUS_MAP[p.status ?? 2] ?? "—"}</TableCell>
                  <TableCell>{p.group?.name ?? "—"}</TableCell>
                  <TableCell className="max-w-[220px] truncate text-muted-foreground" title={proxyLabel(p.proxy)}>
                    {proxyLabel(p.proxy)}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">{p.remark ?? "—"}</TableCell>
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
              ))}
            </TableBody>
          </Table>
        </div>
      )}
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
