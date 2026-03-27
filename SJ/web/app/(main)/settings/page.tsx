"use client"

import * as React from "react"
import { Plus, Pencil, Trash2, RefreshCw, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"

type ProxyItem = { id: string; serialNo?: number; scheme: string; server: string; port: number; username?: string; password?: string }

const SCHEMES = ["socks5", "http", "https"]

export default function SettingsPage() {
  const [list, setList] = React.useState<ProxyItem[]>([])
  const [total, setTotal] = React.useState(0)
  const [page, setPage] = React.useState(1)
  const [pageSize] = React.useState(20)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [acting, setActing] = React.useState(false)
  const [modal, setModal] = React.useState<"add" | "edit" | null>(null)
  const [editing, setEditing] = React.useState<ProxyItem | null>(null)
  const [form, setForm] = React.useState({ scheme: "socks5", server: "", port: 8000, username: "", password: "" })

  const load = React.useCallback((p = page) => {
    setLoading(true)
    setError(null)
    fetch(`/api/proxies?page=${p}&pageSize=${pageSize}`)
      .then((r) => r.json())
      .then((data: { list?: ProxyItem[]; total?: number } | { error?: string }) => {
        if ((data as { error?: string }).error) {
          setError((data as { error: string }).error)
          setList([])
        } else {
          setList((data as { list: ProxyItem[] }).list ?? [])
          setTotal((data as { total?: number }).total ?? 0)
        }
      })
      .catch((e) => {
        setError(e?.message || "请求失败")
        setList([])
      })
      .finally(() => setLoading(false))
  }, [page, pageSize])

  React.useEffect(() => load(page), [load, page])

  const openAdd = () => {
    setForm({ scheme: "socks5", server: "", port: 8000, username: "", password: "" })
    setEditing(null)
    setModal("add")
  }

  const openEdit = (item: ProxyItem) => {
    setEditing(item)
    setForm({
      scheme: item.scheme,
      server: item.server,
      port: item.port,
      username: item.username ?? "",
      password: item.password ?? "",
    })
    setModal("edit")
  }

  const saveAdd = async () => {
    if (!form.server.trim()) { alert("请填写代理地址"); return }
    setActing(true)
    try {
      const res = await fetch("/api/proxies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          list: [{ scheme: form.scheme, server: form.server.trim(), port: Number(form.port) || 8000, username: form.username.trim() || undefined, password: form.password || undefined }],
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setModal(null)
      load(1)
      setPage(1)
    } catch (e) {
      alert(e instanceof Error ? e.message : "添加失败")
    } finally {
      setActing(false)
    }
  }

  const saveEdit = async () => {
    if (!editing || !form.server.trim()) return
    setActing(true)
    try {
      const res = await fetch("/api/proxies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editing.id,
          scheme: form.scheme,
          server: form.server.trim(),
          port: Number(form.port) || 8000,
          username: form.username.trim() || undefined,
          password: form.password || undefined,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setModal(null)
      setEditing(null)
      load(page)
    } catch (e) {
      alert(e instanceof Error ? e.message : "更新失败")
    } finally {
      setActing(false)
    }
  }

  const doDelete = async (id: string) => {
    if (!confirm("确定删除该代理？")) return
    setActing(true)
    try {
      const res = await fetch(`/api/proxies?ids=${encodeURIComponent(id)}`, { method: "DELETE" })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      load(page)
    } catch (e) {
      alert(e instanceof Error ? e.message : "删除失败")
    } finally {
      setActing(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">代理管理</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => load(page)} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            刷新
          </Button>
          <Button size="sm" onClick={openAdd}>
            <Plus className="h-4 w-4 mr-2" /> 新增代理
          </Button>
        </div>
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <p className="text-sm text-muted-foreground">按 GeeLark 文档参数：scheme（socks5/http/https）、server、port、username、password。</p>
      {loading && list.length === 0 ? (
        <p className="text-muted-foreground">加载中…</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>类型</TableHead>
                <TableHead>地址</TableHead>
                <TableHead>端口</TableHead>
                <TableHead>用户名</TableHead>
                <TableHead>密码</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.scheme}</TableCell>
                  <TableCell>{p.server}</TableCell>
                  <TableCell>{p.port}</TableCell>
                  <TableCell className="max-w-[120px] truncate">{p.username ?? "—"}</TableCell>
                  <TableCell className="max-w-[120px] truncate">{p.password ? "••••••" : "—"}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(p)} disabled={acting}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => doDelete(p.id)} disabled={acting}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {total > pageSize && (
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>共 {total} 条</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>上一页</Button>
            <Button variant="outline" size="sm" disabled={page * pageSize >= total} onClick={() => setPage((p) => p + 1)}>下一页</Button>
          </div>
        </div>
      )}

      <Dialog open={modal !== null} onOpenChange={() => { setModal(null); setEditing(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{modal === "add" ? "新增代理" : "编辑代理"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>类型 (scheme)</Label>
              <Select value={form.scheme} onValueChange={(v) => setForm((f) => ({ ...f, scheme: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SCHEMES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>地址 (server)</Label>
              <Input value={form.server} onChange={(e) => setForm((f) => ({ ...f, server: e.target.value }))} placeholder="192.3.8.1" />
            </div>
            <div className="grid gap-2">
              <Label>端口 (port)</Label>
              <Input type="number" value={form.port} onChange={(e) => setForm((f) => ({ ...f, port: parseInt(e.target.value, 10) || 0 }))} placeholder="8000" />
            </div>
            <div className="grid gap-2">
              <Label>用户名 (username，选填)</Label>
              <Input value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} placeholder="admin" />
            </div>
            <div className="grid gap-2">
              <Label>密码 (password，选填)</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="••••••" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModal(null)}>取消</Button>
            {modal === "add" ? (
              <Button onClick={saveAdd} disabled={acting}>添加</Button>
            ) : (
              <Button onClick={saveEdit} disabled={acting}>保存</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
