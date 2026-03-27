"use client"

import * as React from "react"
import Link from "next/link"
import { MessageSquare, UserPlus, ThermometerSun, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

const TIMEZONES = ["UTC+8", "UTC+9", "UTC+7", "UTC+0", "UTC-5", "UTC-8"]
const WARMUP_ACTIONS = [
  { value: "browse video", label: "随机浏览视频 (browse video)" },
  { value: "search video", label: "搜索短视频 (search video)" },
  { value: "search profile", label: "搜索个人主页 (search profile)" },
]

function toScheduleAt(dateStr: string, timeStr: string, timezone: string): number | null {
  if (!dateStr || !timeStr) return null
  const m = timezone.trim().match(/^UTC([+-])(\d+)$/i)
  const offsetHours = m ? (m[1] === "+" ? 1 : -1) * (parseInt(m[2], 10) || 0) : 0
  const [h, min] = timeStr.split(":").map(Number)
  const time = `${String(h ?? 0).padStart(2, "0")}:${String(min ?? 0).padStart(2, "0")}:00`
  const naiveMs = new Date(`${dateStr}T${time}.000Z`).getTime()
  if (Number.isNaN(naiveMs)) return null
  return Math.floor((naiveMs - offsetHours * 3600 * 1000) / 1000)
}

export default function AppsPage() {
  const [phones, setPhones] = React.useState<{ id: string; serialName?: string; serialNo?: string }[]>([])
  const [warmupSubmitting, setWarmupSubmitting] = React.useState(false)
  const [followSubmitting, setFollowSubmitting] = React.useState(false)
  const [warmupMsg, setWarmupMsg] = React.useState<string | null>(null)
  const [followMsg, setFollowMsg] = React.useState<string | null>(null)

  const [warmupForm, setWarmupForm] = React.useState({
    envId: "_",
    action: "browse video",
    duration: 10,
    keywords: "",
    scheduleDate: "",
    scheduleTime: "14:30",
    timezone: "UTC+8",
  })
  const [followForm, setFollowForm] = React.useState({
    id: "_",
    followProbability: 50,
    scheduleDate: "",
    scheduleTime: "14:30",
    timezone: "UTC+8",
  })

  React.useEffect(() => {
    fetch("/api/phones")
      .then((r) => r.json())
      .then((data: unknown) => setPhones(Array.isArray(data) ? data : []))
      .catch(() => setPhones([]))
  }, [])

  const handleWarmup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!warmupForm.envId || warmupForm.envId === "_") { setWarmupMsg("请选择云手机"); return }
    const scheduleAt = toScheduleAt(warmupForm.scheduleDate, warmupForm.scheduleTime, warmupForm.timezone)
    if (scheduleAt == null || scheduleAt < Math.floor(Date.now() / 1000)) { setWarmupMsg("请选择未来的计划时间"); return }
    setWarmupSubmitting(true)
    setWarmupMsg(null)
    try {
      const res = await fetch("/api/tasks/warmup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduleAt,
          envId: warmupForm.envId,
          action: warmupForm.action,
          duration: warmupForm.duration,
          keywords: warmupForm.keywords ? warmupForm.keywords.split(/[\s,，]+/).filter(Boolean) : [],
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setWarmupMsg(`养号任务已创建，任务 ID: ${data.taskId ?? "—"}`)
    } catch (e) {
      setWarmupMsg(e instanceof Error ? e.message : "提交失败")
    } finally {
      setWarmupSubmitting(false)
    }
  }

  const handleFollow = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!followForm.id || followForm.id === "_") { setFollowMsg("请选择云手机"); return }
    const scheduleAt = toScheduleAt(followForm.scheduleDate, followForm.scheduleTime, followForm.timezone)
    if (scheduleAt == null || scheduleAt < Math.floor(Date.now() / 1000)) { setFollowMsg("请选择未来的计划时间"); return }
    setFollowSubmitting(true)
    setFollowMsg(null)
    try {
      const res = await fetch("/api/tasks/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduleAt,
          id: followForm.id,
          followProbability: followForm.followProbability,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setFollowMsg(`关注任务已创建，任务 ID: ${data.taskId ?? "—"}`)
    } catch (e) {
      setFollowMsg(e instanceof Error ? e.message : "提交失败")
    } finally {
      setFollowSubmitting(false)
    }
  }

  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">GeeLark 自动化应用</h2>
      <p className="text-sm text-muted-foreground">优先支持：TikTok 养号、评论、关注。在本站创建并提交任务。</p>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ThermometerSun className="h-5 w-5" />
              TikTok 养号
            </CardTitle>
            <CardDescription>创建养号任务：浏览视频、搜索视频或搜索个人主页</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleWarmup} className="space-y-4">
              <div className="grid gap-2">
                <Label>云手机</Label>
                <Select value={warmupForm.envId} onValueChange={(v) => setWarmupForm((f) => ({ ...f, envId: v }))}>
                  <SelectTrigger><SelectValue placeholder="选择云手机" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_">请选择云手机</SelectItem>
                    {phones.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.serialName ?? p.serialNo ?? p.id}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>行为 (action)</Label>
                <Select value={warmupForm.action} onValueChange={(v) => setWarmupForm((f) => ({ ...f, action: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {WARMUP_ACTIONS.map((a) => (
                      <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>时长 (分钟)</Label>
                <Input type="number" min={1} value={warmupForm.duration} onChange={(e) => setWarmupForm((f) => ({ ...f, duration: parseInt(e.target.value, 10) || 10 }))} />
              </div>
              <div className="grid gap-2">
                <Label>关键词 (keywords，选填，search 时可用)</Label>
                <Input value={warmupForm.keywords} onChange={(e) => setWarmupForm((f) => ({ ...f, keywords: e.target.value }))} placeholder="多个用逗号或空格分隔" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-2">
                  <Label>计划日期</Label>
                  <Input type="date" value={warmupForm.scheduleDate} min={today} onChange={(e) => setWarmupForm((f) => ({ ...f, scheduleDate: e.target.value }))} required />
                </div>
                <div className="grid gap-2">
                  <Label>计划时间</Label>
                  <Input type="time" value={warmupForm.scheduleTime} onChange={(e) => setWarmupForm((f) => ({ ...f, scheduleTime: e.target.value }))} required />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>时区</Label>
                <Select value={warmupForm.timezone} onValueChange={(v) => setWarmupForm((f) => ({ ...f, timezone: v }))}>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                  ))}
                </Select>
              </div>
              {warmupMsg && <Alert variant={warmupMsg.startsWith("养号") ? "default" : "destructive"}><AlertDescription>{warmupMsg}</AlertDescription></Alert>}
              <Button type="submit" disabled={warmupSubmitting}>{warmupSubmitting ? "提交中…" : "创建养号任务"}</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              TikTok 评论
            </CardTitle>
            <CardDescription>批量在指定视频下发布评论，支持定时与 AI 生成</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">在控制台批量评论页可粘贴多行（链接、评论、日期、时间、时区），一键提交。</p>
            <Button asChild>
              <Link href="/">
                前往批量评论 <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              TikTok 关注
            </CardTitle>
            <CardDescription>随机关注任务，按设定概率在推荐流中执行关注</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleFollow} className="space-y-4 max-w-md">
              <div className="grid gap-2">
                <Label>云手机</Label>
                <Select value={followForm.id} onValueChange={(v) => setFollowForm((f) => ({ ...f, id: v }))}>
                  <SelectTrigger><SelectValue placeholder="选择云手机" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_">请选择云手机</SelectItem>
                    {phones.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.serialName ?? p.serialNo ?? p.id}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>关注概率 (0-100)</Label>
                <Input type="number" min={0} max={100} value={followForm.followProbability} onChange={(e) => setFollowForm((f) => ({ ...f, followProbability: parseInt(e.target.value, 10) || 0 }))} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-2">
                  <Label>计划日期</Label>
                  <Input type="date" value={followForm.scheduleDate} min={today} onChange={(e) => setFollowForm((f) => ({ ...f, scheduleDate: e.target.value }))} required />
                </div>
                <div className="grid gap-2">
                  <Label>计划时间</Label>
                  <Input type="time" value={followForm.scheduleTime} onChange={(e) => setFollowForm((f) => ({ ...f, scheduleTime: e.target.value }))} required />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>时区</Label>
                <Select value={followForm.timezone} onValueChange={(v) => setFollowForm((f) => ({ ...f, timezone: v }))}>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                  ))}
                </Select>
              </div>
              {followMsg && <Alert variant={followMsg.startsWith("关注") ? "default" : "destructive"}><AlertDescription>{followMsg}</AlertDescription></Alert>}
              <Button type="submit" disabled={followSubmitting}>{followSubmitting ? "提交中…" : "创建关注任务"}</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
