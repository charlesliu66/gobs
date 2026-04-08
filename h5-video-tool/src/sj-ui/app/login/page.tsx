"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const LOGIN_INTRO_STORAGE_KEY = "sj_login_intro_seen"

export default function LoginPage() {
  const router = useRouter()
  const [needsBootstrap, setNeedsBootstrap] = React.useState<boolean | null>(null)
  const [introOpen, setIntroOpen] = React.useState(false)
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [err, setErr] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    void fetch("/api/auth/bootstrap")
      .then((r) => r.json())
      .then((d: { needsBootstrap?: boolean }) => setNeedsBootstrap(Boolean(d.needsBootstrap)))
      .catch(() => setNeedsBootstrap(false))
  }, [])

  React.useEffect(() => {
    try {
      if (typeof window !== "undefined" && !localStorage.getItem(LOGIN_INTRO_STORAGE_KEY)) {
        setIntroOpen(true)
      }
    } catch {
      setIntroOpen(true)
    }
  }, [])

  const dismissIntro = () => {
    try {
      localStorage.setItem(LOGIN_INTRO_STORAGE_KEY, "1")
    } catch {
      /* ignore */
    }
    setIntroOpen(false)
  }

  const submit = async (bootstrap: boolean) => {
    setErr(null)
    setLoading(true)
    try {
      if (bootstrap) {
        const res = await fetch("/api/auth/bootstrap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "创建失败")
      }
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "登录失败")
      router.replace("/")
      router.refresh()
    } catch (e) {
      setErr(e instanceof Error ? e.message : "失败")
    } finally {
      setLoading(false)
    }
  }

  if (needsBootstrap === null) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-sm text-muted-foreground">加载中…</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Dialog open={introOpen} onOpenChange={(o) => (o ? setIntroOpen(true) : dismissIntro())}>
        <DialogContent showCloseButton={false} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>登录说明</DialogTitle>
            <DialogDescription className="text-left space-y-2">
              <span className="block">
                欢迎使用控制台。请使用由管理员分配的邮箱与密码登录；若忘记密码，请联系主账号管理员重置。
              </span>
              <span className="block text-xs text-muted-foreground">
                为降低账号风险，请勿在公共电脑保存密码，并在使用完毕后退出登录。
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button className="w-full sm:w-auto" onClick={dismissIntro}>
              我知道了
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="w-full max-w-md border-border">
        <CardHeader>
          <CardTitle>{needsBootstrap ? "创建主账号" : "登录"}</CardTitle>
          <CardDescription>
            {needsBootstrap
              ? "系统尚无账号，请创建首个主账号（拥有全部权限与账号管理）。"
              : "使用邮箱与密码登录控制台。"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {err && (
            <Alert variant="destructive">
              <AlertDescription>{err}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">邮箱</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">密码（至少 8 位）</Label>
            <Input
              id="password"
              type="password"
              autoComplete={needsBootstrap ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button
            className="w-full"
            disabled={loading}
            onClick={() => void submit(needsBootstrap)}
          >
            {loading ? "处理中…" : needsBootstrap ? "创建并登录" : "登录"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
