"use client"

import * as React from "react"
import {
  Plus,
  Send,
  Search,
  Globe,
  ClipboardPaste,
  AlertCircle,
  BookOpen,
  Trash2,
  FileUp,
  FolderCog,
} from "lucide-react"
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Progress } from "@/components/ui/progress"
import { format } from "date-fns"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { parseBatchPaste } from "@/lib/parse-batch-paste"
import { resolveDeviceFromList } from "@/lib/resolve-device-client"
import { useRefresh } from "@/contexts/refresh-context"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { SectionHeading } from "@/components/section-heading"
import { Badge } from "@/components/ui/badge"

const GEN_LANGUAGES = [
  { value: "zh-CN", label: "简体中文" },
  { value: "en", label: "English" },
  { value: "ja", label: "日本語" },
  { value: "ko", label: "한국어" },
  { value: "th", label: "ไทย" },
  { value: "id", label: "Bahasa Indonesia" },
]

type RuleFile = { name: string; type: "md" | "py"; content: string }
type RuleLib = { id: string; name: string; rules: string[]; files?: RuleFile[]; createdAt: number }

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

function normalizeRulesForSave(rows: string[]): string[] {
  return rows.map((r) => String(r).trim()).filter(Boolean)
}

function rulesDraftMatchesServer(draft: string[], server: string[]): boolean {
  return (
    JSON.stringify(normalizeRulesForSave(draft)) === JSON.stringify(normalizeRulesForSave(server))
  )
}

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
    generateError: undefined,
  }
}

export function ControlPanel() {
  const [tasks, setTasks] = React.useState<Task[]>([])
  const [searchQuery, setSearchQuery] = React.useState("")
  const [defaultTimezone, setDefaultTimezone] = React.useState("UTC+8")
  const [devices, setDevices] = React.useState<
    { id: string; serialName?: string; serialNo?: string; status?: number }[]
  >([])
  const [loading, setLoading] = React.useState(true)
  const [submitting, setSubmitting] = React.useState(false)
  const [geelarkOk, setGeelarkOk] = React.useState<boolean | null>(null)
  const [geelarkMessage, setGeelarkMessage] = React.useState<string>("")
  const [batchPasteText, setBatchPasteText] = React.useState("")
  const [submitResult, setSubmitResult] = React.useState<{ ok: number; fail: number; detail?: string } | null>(null)
  const [aiDialog, setAiDialog] = React.useState<{ taskId: string; suggestions: string[] } | null>(null)
  const [selectedComment, setSelectedComment] = React.useState("")
  const [useAsia, setUseAsia] = React.useState(true)
  /** 批量评论目标平台：TikTok 与 Facebook 使用 GeeLark 不同 RPA 接口 */
  const [commentPlatform, setCommentPlatform] = React.useState<"tiktok" | "facebook">("tiktok")
  const [batchNameDialog, setBatchNameDialog] = React.useState<{
    results: { taskId?: string; error?: string; index?: number }[]
    valid: { deviceId?: string; videoLink?: string }[]
    items: { taskId?: string; error?: string; link?: string }[]
    taskIds: string[]
    links: string[]
  } | null>(null)
  const [batchNameInput, setBatchNameInput] = React.useState("")
  const [ruleLibraries, setRuleLibraries] = React.useState<RuleLib[]>([])
  const [selectedLibraryId, setSelectedLibraryId] = React.useState("")
  const [genPrompt, setGenPrompt] = React.useState("")
  const [genLanguage, setGenLanguage] = React.useState("zh-CN")
  const [ruleDialogOpen, setRuleDialogOpen] = React.useState(false)
  const [manageLibDialogOpen, setManageLibDialogOpen] = React.useState(false)
  const [newRuleName, setNewRuleName] = React.useState("")
  const [newRuleText, setNewRuleText] = React.useState("")
  const [newRuleFiles, setNewRuleFiles] = React.useState<RuleFile[]>([])
  const ruleFileInputRef = React.useRef<HTMLInputElement>(null)
  const [ruleSaving, setRuleSaving] = React.useState(false)
  /** 管理规则库对话框内：规则库名称编辑草稿 */
  const [libNameDrafts, setLibNameDrafts] = React.useState<Record<string, string>>({})
  /** 管理规则库对话框内：各库文本规则编辑草稿（与 rules 数组对齐） */
  const [ruleDrafts, setRuleDrafts] = React.useState<Record<string, string[]>>({})
  const [batchGenerating, setBatchGenerating] = React.useState(false)
  /** 解析粘贴 / 批量生成评论进度 */
  const [batchPasteProgress, setBatchPasteProgress] = React.useState<
    | { phase: "parse"; current: number; total: number }
    | {
        phase: "generate"
        current: number
        total: number
        startedAt: number
        etaSeconds: number | null
      }
    | null
  >(null)
  const [deleteLibraryId, setDeleteLibraryId] = React.useState<string | null>(null)
  const [deleteFileTarget, setDeleteFileTarget] = React.useState<{
    libId: string
    index: number
    fileName: string
  } | null>(null)
  const [clearPasteOpen, setClearPasteOpen] = React.useState(false)
  const [removeNewFileIndex, setRemoveNewFileIndex] = React.useState<number | null>(null)
  const [regeneratingId, setRegeneratingId] = React.useState<string | null>(null)
  const [generationWarnings, setGenerationWarnings] = React.useState<string[]>([])
  const [deviceParseErrorOpen, setDeviceParseErrorOpen] = React.useState(false)
  const [deviceParseErrorText, setDeviceParseErrorText] = React.useState("")
  const refresh = useRefresh()

  const loadRuleLibraries = React.useCallback(() => {
    fetch("/api/comment-rules")
      .then((r) => r.json())
      .then((d: { libraries?: RuleLib[] }) => {
        const list = d.libraries || []
        setRuleLibraries(list)
        setSelectedLibraryId((cur) => {
          if (cur && list.some((x) => x.id === cur)) return cur
          return list[0]?.id ?? ""
        })
      })
      .catch(() => setRuleLibraries([]))
  }, [])

  React.useEffect(() => {
    loadRuleLibraries()
  }, [loadRuleLibraries])

  React.useEffect(() => {
    refresh?.registerRefresh("comment-rules", loadRuleLibraries)
  }, [refresh, loadRuleLibraries])

  /** 打开管理对话框或列表变化时，同步名称草稿（保留未保存的编辑） */
  React.useEffect(() => {
    if (!manageLibDialogOpen) return
    setLibNameDrafts((prev) => {
      const next: Record<string, string> = {}
      for (const lib of ruleLibraries) {
        const p = prev[lib.id]
        if (p !== undefined && p !== lib.name) next[lib.id] = p
        else next[lib.id] = lib.name
      }
      return next
    })
  }, [manageLibDialogOpen, ruleLibraries])

  React.useEffect(() => {
    if (!manageLibDialogOpen) return
    setRuleDrafts((prev) => {
      const next: Record<string, string[]> = {}
      for (const lib of ruleLibraries) {
        const p = prev[lib.id]
        const serverRules = [...lib.rules]
        if (
          p &&
          p.length === serverRules.length &&
          !rulesDraftMatchesServer(p, serverRules)
        ) {
          next[lib.id] = p
        } else {
          next[lib.id] = serverRules
        }
      }
      return next
    })
  }, [manageLibDialogOpen, ruleLibraries])

  const load = React.useCallback(() => {
    setLoading(true)
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

  React.useEffect(() => { load() }, [load])
  React.useEffect(() => {
    refresh?.registerRefresh("control-panel", load)
  }, [refresh, load])

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

  const runBatchGenerate = React.useCallback(
    async (
      taskList: Task[],
      libraryId: string,
      prompt: string,
      language: string,
      platform: "tiktok" | "facebook",
      onProgress?: (done: number, total: number, startedAt: number) => void,
    ): Promise<Task[]> => {
      const warnings: string[] = []
      const out = taskList.map((t) => ({ ...t, generateError: undefined as string | undefined }))
      const total = out.length
      const startedAt = Date.now()
      onProgress?.(0, total, startedAt)
      for (let i = 0; i < out.length; i++) {
        try {
          const res = await fetch("/api/comment-rules/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ruleLibraryId: libraryId,
              prompt,
              language,
              taskIndex: i + 1,
              videoLink: out[i].videoLink,
              deviceName: out[i].deviceName,
              platform,
            }),
          })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error || "生成失败")
          out[i] = {
            ...out[i],
            comment: (data.comment as string) || "",
            generateError: undefined,
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e)
          warnings.push(`第 ${i + 1} 条：${msg}`)
          out[i] = { ...out[i], generateError: `生成失败：${msg}` }
        }
        onProgress?.(i + 1, total, startedAt)
      }
      setGenerationWarnings(warnings)
      return out
    },
    [],
  )

  const handleBatchPaste = async () => {
    setBatchPasteProgress({ phase: "parse", current: 0, total: 1 })
    await new Promise<void>((r) => requestAnimationFrame(() => r()))

    const rows = parseBatchPaste(batchPasteText, {
      now: new Date(),
      defaultTimezone: defaultTimezone,
    })
    if (rows.length === 0) {
      setBatchPasteProgress(null)
      alert(
        `未解析到有效行。格式：每行 Tab 分隔。可选首列「设备ID或名称」，然后：${
          commentPlatform === "facebook" ? "帖子" : "视频"
        }链接、评论、发布日期(2026/7/7)、发布时间(18:10)、时区(UTC+7)。不填时间/时区则按当前时间发布。`,
      )
      return
    }

    setBatchPasteProgress({ phase: "parse", current: 1, total: 1 })
    await new Promise<void>((r) => setTimeout(r, 120))

    const parseErrors: string[] = []
    const newTasks: Task[] = []
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]
      const res = resolveDeviceFromList(devices, r.deviceIdOrName)
      if (!res.ok) {
        parseErrors.push(`第 ${i + 1} 行：${res.message}`)
        continue
      }
      newTasks.push({
        ...newEmptyTask(r.timezone || defaultTimezone),
        videoLink: r.videoLink,
        comment: r.comment,
        scheduleDate: r.scheduleDate,
        scheduleTime: r.scheduleTime || "14:30",
        timezone: r.timezone || defaultTimezone,
        deviceId: res.id,
        deviceName: res.displayName,
      })
    }
    if (parseErrors.length > 0) {
      setBatchPasteProgress(null)
      setDeviceParseErrorText(parseErrors.join("\n\n"))
      setDeviceParseErrorOpen(true)
      return
    }

    setBatchPasteText("")

    const shouldGen = selectedLibraryId && genPrompt.trim()
    if (shouldGen) {
      setBatchGenerating(true)
      try {
        const filled = await runBatchGenerate(
          newTasks,
          selectedLibraryId,
          genPrompt.trim(),
          genLanguage,
          commentPlatform,
          (done, total, startedAt) => {
            let etaSeconds: number | null = null
            if (done > 0 && done < total) {
              const elapsedSec = (Date.now() - startedAt) / 1000
              etaSeconds = Math.max(1, Math.ceil(((total - done) * elapsedSec) / done))
            }
            setBatchPasteProgress({
              phase: "generate",
              current: done,
              total,
              startedAt,
              etaSeconds,
            })
          },
        )
        setTasks(filled)
      } finally {
        setBatchGenerating(false)
        setBatchPasteProgress(null)
      }
      return
    }

    setBatchPasteProgress(null)
    setTasks(newTasks)
    setGenerationWarnings([])
  }

  /** 清空粘贴框，并重置下方表格为一行空任务（不依赖 useEffect，否则清空后不会自动补一行） */
  const handleClearBatchPaste = () => {
    setBatchPasteText("")
    setSubmitResult(null)
    setGenerationWarnings([])
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
    setClearPasteOpen(false)
  }

  const handleAiGenerateRow = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId)
    const url =
      task?.videoLink ||
      (commentPlatform === "facebook" ? "https://www.facebook.com/" : "https://www.tiktok.com/")
    try {
      const res = await fetch("/api/generate-comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, platform: commentPlatform }),
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
          t.id === aiDialog.taskId
            ? { ...t, comment: selectedComment, generateError: undefined }
            : t
        )
      )
    }
    setAiDialog(null)
  }

  const handleRuleFilesPicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files
    if (!list?.length) return
    const add: RuleFile[] = []
    for (let i = 0; i < list.length; i++) {
      const f = list[i]
      const lower = f.name.toLowerCase()
      if (!lower.endsWith(".md") && !lower.endsWith(".py")) continue
      const type: "md" | "py" = lower.endsWith(".py") ? "py" : "md"
      const content = await f.text()
      add.push({ name: f.name, type, content })
    }
    if (add.length) setNewRuleFiles((prev) => [...prev, ...add])
    e.target.value = ""
  }

  const handleSaveNewRule = async () => {
    const name = newRuleName.trim() || "未命名规则库"
    const rulesText = newRuleText.trim()
    if (!rulesText && newRuleFiles.length === 0) {
      alert("请填写规则文本，和/或上传 .md / .py 文件。")
      return
    }
    setRuleSaving(true)
    try {
      const res = await fetch("/api/comment-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          rulesText: rulesText || undefined,
          files: newRuleFiles.length > 0 ? newRuleFiles : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "保存失败")
      setRuleDialogOpen(false)
      setNewRuleName("")
      setNewRuleText("")
      setNewRuleFiles([])
      loadRuleLibraries()
      if (data.library?.id) setSelectedLibraryId(data.library.id)
    } catch (e) {
      alert(e instanceof Error ? e.message : "保存失败")
    } finally {
      setRuleSaving(false)
    }
  }

  const patchRuleLibrary = async (
    id: string,
    patch: { rules?: string[]; files?: RuleFile[]; name?: string },
  ) => {
    const res = await fetch("/api/comment-rules", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error((data as { error?: string }).error || "更新失败")
    loadRuleLibraries()
  }

  const saveLibraryName = async (libId: string) => {
    const name = (libNameDrafts[libId] ?? "").trim()
    if (!name) {
      alert("名称不能为空")
      return
    }
    const lib = ruleLibraries.find((l) => l.id === libId)
    if (!lib || lib.name === name) return
    try {
      await patchRuleLibrary(libId, { name })
    } catch (e) {
      alert(e instanceof Error ? e.message : "重命名失败")
    }
  }

  const executeDeleteLibrary = async (id: string) => {
    const res = await fetch(`/api/comment-rules?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      alert((data as { error?: string }).error || "删除失败")
      setDeleteLibraryId(null)
      return
    }
    loadRuleLibraries()
    setDeleteLibraryId(null)
  }

  const saveLibraryRulesText = async (libId: string) => {
    const lib = ruleLibraries.find((l) => l.id === libId)
    if (!lib) return
    const drafts = ruleDrafts[libId] ?? [...lib.rules]
    const next = normalizeRulesForSave(drafts)
    const hasFiles = (lib.files?.length ?? 0) > 0
    if (next.length === 0 && !hasFiles) {
      alert("文本规则与附件不能同时为空，请至少保留一条非空规则或保留上传文件。")
      return
    }
    try {
      await patchRuleLibrary(libId, { rules: next })
    } catch (e) {
      alert(e instanceof Error ? e.message : "保存失败")
    }
  }

  const executeDeleteFileRow = async (target: {
    libId: string
    index: number
  }) => {
    const { libId, index } = target
    const lib = ruleLibraries.find((l) => l.id === libId)
    if (!lib?.files) {
      setDeleteFileTarget(null)
      return
    }
    const next = lib.files.filter((_, j) => j !== index)
    try {
      await patchRuleLibrary(libId, { files: next })
    } catch (e) {
      alert(e instanceof Error ? e.message : "删除失败")
    } finally {
      setDeleteFileTarget(null)
    }
  }

  const handleRegenerateRow = async (taskId: string) => {
    if (!selectedLibraryId || !genPrompt.trim()) {
      alert("请先选择规则库并填写生成提示词")
      return
    }
    const idx = tasks.findIndex((t) => t.id === taskId)
    if (idx < 0) return
    setRegeneratingId(taskId)
    try {
      const t = tasks[idx]
      const res = await fetch("/api/comment-rules/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ruleLibraryId: selectedLibraryId,
          prompt: genPrompt.trim(),
          language: genLanguage,
          taskIndex: idx + 1,
          videoLink: t.videoLink,
          deviceName: t.deviceName,
          platform: commentPlatform,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "生成失败")
      setTasks((prev) =>
        prev.map((x) =>
          x.id === taskId
            ? {
                ...x,
                comment: (data.comment as string) || "",
                generateError: undefined,
              }
            : x,
        ),
      )
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setTasks((prev) =>
        prev.map((x) =>
          x.id === taskId ? { ...x, generateError: `生成失败：${msg}` } : x,
        ),
      )
    } finally {
      setRegeneratingId(null)
    }
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
      const linkLabel = commentPlatform === "facebook" ? "帖子链接" : "视频链接"
      alert(`请至少填写一行完整信息：云手机、${linkLabel}、评论、发布时间`)
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
            useAsia: commentPlatform === "tiktok" ? useAsia : false,
            platform: commentPlatform,
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
      const taskIds = items.map((it: { taskId?: string; link?: string }) => it.taskId).filter(Boolean) as string[]
      const links = items.map((it: { taskId?: string; link?: string }) => it.link)
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

  const filteredTasks = tasks.filter(
    (task) =>
      task.videoLink.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.comment.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.deviceName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const selectedCount = tasks.filter((t) => t.selected).length

  /** 与 /api/phones 返回列表一致（已按账号 envIds 过滤）；用于底部栏仅统计有权设备 */
  const deviceIdsInScope = React.useMemo(
    () => new Set(devices.map((d) => d.id)),
    [devices],
  )
  const statusBarTotalTasks = React.useMemo(
    () =>
      tasks.filter((t) => t.deviceId && deviceIdsInScope.has(t.deviceId)).length,
    [tasks, deviceIdsInScope],
  )
  /** GeeLark：status 2 为已关机；未返回时按待机 0 处理 */
  const statusBarDevicesOnline = React.useMemo(
    () => devices.filter((d) => (d.status ?? 0) !== 2).length,
    [devices],
  )

  return (
    <div className="flex flex-col h-full min-h-0">
      {geelarkOk === false && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium">GeeLark 未连接：{geelarkMessage}</div>
            <div className="mt-2 text-sm">
              请在本项目 <code className="text-xs bg-muted px-1">web/.env.local</code> 中配置 <code className="text-xs bg-muted px-1">GEELARK_BEARER_TOKEN</code>（与主项目一致的 Bearer Token），保存后重启 <code className="text-xs bg-muted px-1">npm run dev</code>。
              {/signature|verification|验证/i.test(geelarkMessage) && (
                <span className="block mt-1 text-amber-600 dark:text-amber-400">若已配置仍报错，请检查 Token 是否过期或被撤销，需在 GeeLark 开放平台重新获取。</span>
              )}
            </div>
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
      {generationWarnings.length > 0 && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>
            <span className="font-medium">部分评论未生成成功（已跳过该条，可手动填写或点刷新重试）：</span>
            <ul className="mt-2 list-disc pl-4 text-sm space-y-0.5">
              {generationWarnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </AlertDescription>
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => setGenerationWarnings([])}>
            关闭提示
          </Button>
        </Alert>
      )}

      <div className="mb-4 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading as="h1" className="text-2xl">
            批量评论定时发布
          </SectionHeading>
          <div className="space-y-1.5 sm:min-w-[200px]">
            <Label className="text-xs">评论平台</Label>
            <Select
              value={commentPlatform}
              onValueChange={(v) => setCommentPlatform(v as "tiktok" | "facebook")}
            >
              <SelectTrigger className="h-9 bg-input border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tiktok">TikTok</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {commentPlatform === "facebook"
            ? "多帖子链接、多评论，在云手机已登录 Facebook 的前提下由 GeeLark 执行评论 RPA。"
            : "多视频链接、多评论，支持批量粘贴（Tab 分隔）；时区为 UTC±N。"}
        </p>
      </div>

      <Card className="mb-4 border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex flex-wrap items-center gap-2 text-primary">
            <BookOpen className="h-4 w-4 text-primary" />
            评论生成规则库
          </CardTitle>
          <CardDescription>
            规则库在服务端持久化；请在「管理规则库」中新建、重命名与维护（纯文本规则或上传 .md / .py）。在此选用规则库并填写提示词后，解析粘贴可为每行自动生成评论。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-muted-foreground">
              {ruleLibraries.length === 0
                ? "暂无规则库。请点击「管理规则库」新建与维护。"
                : `已保存 ${ruleLibraries.length} 个规则库，名称与内容仅在「管理规则库」中展示与编辑。`}
            </p>
            <Button
              type="button"
              size="sm"
              className="gap-1 shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => setManageLibDialogOpen(true)}
            >
              <FolderCog className="h-4 w-4" />
              管理规则库
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-2">选用规则库</Label>
              <Select
                value={selectedLibraryId || undefined}
                onValueChange={setSelectedLibraryId}
                disabled={ruleLibraries.length === 0}
              >
                <SelectTrigger className="h-9 bg-input border-border">
                  <SelectValue placeholder="选择规则库" />
                </SelectTrigger>
                <SelectContent>
                  {ruleLibraries.map((lib) => (
                    <SelectItem key={lib.id} value={lib.id}>
                      {lib.name}（{lib.rules.length} 条
                      {lib.files?.length ? ` + ${lib.files.length} 文件` : ""}）
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
              <Label className="text-xs flex items-center gap-2">输出语言</Label>
              <Select value={genLanguage} onValueChange={setGenLanguage}>
                <SelectTrigger className="h-9 bg-input border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GEN_LANGUAGES.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-2">生成提示词（评论风向标）</Label>
            <Textarea
              placeholder='例如：生成新英雄 Chris 的积极评论，突出形象炫酷且强度在线'
              value={genPrompt}
              onChange={(e) => setGenPrompt(e.target.value)}
              className="min-h-[72px] text-sm bg-background border-border"
            />
            <p className="text-[11px] text-muted-foreground">
              填写提示词并选择规则库后，点击「解析并填入」将自动为每一行生成评论；单行可点评论旁的刷新图标重试。
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 批量粘贴区：表格式输入 */}
      <div className="mb-4 rounded-lg border border-border bg-muted/30 p-4">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <ClipboardPaste className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-primary">批量粘贴与解析</span>
        </div>
        <p className="text-xs text-muted-foreground mb-2">
          每行 Tab 分隔。可选首列填<strong>设备ID或云手机名称</strong>，然后：
          {commentPlatform === "facebook" ? "帖子链接" : "视频链接"}
          、评论、发布日期(2026/7/7)、发布时间(18:10)、时区(UTC+7)。不填时间/时区则按<strong>当前时间</strong>发布。日期与时间之间可多空一列。
        </p>
        <Textarea
          placeholder={
            commentPlatform === "facebook"
              ? "设备名或ID\thttps://www.facebook.com/xxx/posts/...\t评论\t2026/7/7\t18:10\tUTC+8"
              : "设备名或ID\thttps://www.tiktok.com/@xxx/video/123\t评论\t2026/7/7\t18:10\tUTC+8"
          }
          value={batchPasteText}
          onChange={(e) => setBatchPasteText(e.target.value)}
          className="min-h-[100px] font-mono text-xs bg-background border-border"
          onPaste={() => {}}
        />
        <div className="mt-2 flex gap-2">
          <Button
            type="button"
            size="sm"
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={batchGenerating || batchPasteProgress != null}
            onClick={() => void handleBatchPaste()}
          >
            <ClipboardPaste className="h-4 w-4" />
            {batchPasteProgress?.phase === "parse"
              ? "正在解析…"
              : batchGenerating
                ? "正在生成评论…"
                : "解析并填入下方表格"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={batchGenerating || batchPasteProgress != null}
            onClick={() => setClearPasteOpen(true)}
          >
            清空
          </Button>
        </div>
        {batchPasteProgress && (
          <div className="mt-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>
                {batchPasteProgress.phase === "parse"
                  ? "正在解析粘贴内容…"
                  : `正在生成 AI 评论 ${batchPasteProgress.current}/${batchPasteProgress.total}`}
              </span>
              {batchPasteProgress.phase === "generate" &&
                batchPasteProgress.current < batchPasteProgress.total &&
                batchPasteProgress.etaSeconds != null && (
                  <span>预计剩余约 {batchPasteProgress.etaSeconds} 秒</span>
                )}
            </div>
            <Progress
              value={
                batchPasteProgress.total > 0
                  ? (batchPasteProgress.current / batchPasteProgress.total) * 100
                  : 0
              }
              className="h-2"
            />
            {batchPasteProgress.phase === "generate" && batchPasteProgress.total > 0 && (
              <p className="text-[11px] text-muted-foreground">
                剩余时间按已完成的平均耗时估算，仅供参考。
              </p>
            )}
          </div>
        )}
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
          {commentPlatform === "tiktok" && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useAsia}
                onChange={(e) => setUseAsia(e.target.checked)}
                className="rounded border-input"
              />
              <span className="text-sm text-muted-foreground">使用亚洲版 API (tiktokRandomCommentAsia)</span>
            </label>
          )}
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

      <div className="flex-1 overflow-auto min-h-0 flex flex-col gap-2">
        <SectionHeading className="text-base shrink-0">评论任务列表</SectionHeading>
        {loading ? (
          <p className="text-sm text-muted-foreground">加载云手机列表中...</p>
        ) : (
          <TaskTable
            platform={commentPlatform}
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
            onRegenerateRow={
              selectedLibraryId && genPrompt.trim()
                ? handleRegenerateRow
                : undefined
            }
            regeneratingId={regeneratingId}
          />
        )}
      </div>

      <StatusBar
        totalTasks={statusBarTotalTasks}
        selectedTasks={selectedCount}
        devicesOnline={statusBarDevicesOnline}
      />

      <Dialog
        open={ruleDialogOpen}
        onOpenChange={(o) => {
          setRuleDialogOpen(o)
          if (!o) setNewRuleFiles([])
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-primary">新建规则库</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>名称</Label>
              <Input
                value={newRuleName}
                onChange={(e) => setNewRuleName(e.target.value)}
                placeholder="例如：TikTok 游戏推广评论"
                className="bg-background"
              />
            </div>
            <div className="space-y-1.5">
              <Label>规则内容（纯文本，可选）</Label>
              <Textarea
                value={newRuleText}
                onChange={(e) => setNewRuleText(e.target.value)}
                placeholder={
                  "多条规则可用空行分段，或单独一行写 --- 再换行写下一条。\n例如：\n语气积极正面\n---\n不要提及竞品\n---\n长度不超过 80 字"
                }
                className="min-h-[120px] text-sm font-mono bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <FileUp className="h-4 w-4 text-primary" />
                上传规则文件（.md / .py），可选多个
              </Label>
              <input
                ref={ruleFileInputRef}
                type="file"
                accept=".md,.py,text/markdown,text/x-python"
                multiple
                className="hidden"
                onChange={(e) => void handleRuleFilesPicked(e)}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-primary/40 text-primary"
                onClick={() => ruleFileInputRef.current?.click()}
              >
                选择文件
              </Button>
              {newRuleFiles.length > 0 && (
                <ul className="text-xs space-y-1 border rounded-md p-2 bg-muted/30">
                  {newRuleFiles.map((f, i) => (
                    <li key={`${f.name}-${i}`} className="flex justify-between gap-2">
                      <span>
                        <Badge variant="secondary" className="mr-1">
                          {f.type}
                        </Badge>
                        {f.name}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-destructive"
                        onClick={() => setRemoveNewFileIndex(i)}
                      >
                        移除
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Button
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={ruleSaving}
              onClick={() => void handleSaveNewRule()}
            >
              {ruleSaving ? "保存中…" : "保存规则库"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={manageLibDialogOpen} onOpenChange={setManageLibDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
            <DialogTitle className="text-primary">管理规则库</DialogTitle>
            <Button
              type="button"
              size="sm"
              className="gap-1 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => setRuleDialogOpen(true)}
            >
              <Plus className="h-4 w-4" />
              新建规则库
            </Button>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            在此新建规则库、重命名，并编辑文本规则与查看上传文件；可删除单个附件；删除整库请点「删除整库」。
          </p>
          <ScrollArea className="flex-1 max-h-[min(65vh,520px)] pr-3">
            <div className="space-y-4">
              {ruleLibraries.length === 0 ? (
                <p className="text-sm text-muted-foreground">暂无规则库，请先新建。</p>
              ) : (
                ruleLibraries.map((lib) => (
                  <div
                    key={lib.id}
                    className="rounded-lg border border-border bg-muted/20 p-3 space-y-2"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                        <Input
                          className="h-9 max-w-md bg-background"
                          value={libNameDrafts[lib.id] ?? lib.name}
                          onChange={(e) =>
                            setLibNameDrafts((s) => ({ ...s, [lib.id]: e.target.value }))
                          }
                          placeholder="规则库名称"
                          aria-label={`规则库名称 ${lib.name}`}
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="shrink-0"
                          disabled={
                            !(libNameDrafts[lib.id] ?? lib.name).trim() ||
                            (libNameDrafts[lib.id] ?? lib.name).trim() === lib.name
                          }
                          onClick={() => void saveLibraryName(lib.id)}
                        >
                          保存名称
                        </Button>
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="shrink-0 self-start sm:self-center"
                        onClick={() => setDeleteLibraryId(lib.id)}
                      >
                        删除整库
                      </Button>
                    </div>
                    <div className="text-xs font-medium text-muted-foreground">文本规则</div>
                    {(lib.rules.length === 0 && !(ruleDrafts[lib.id]?.length ?? 0)) ? (
                      <p className="text-xs text-muted-foreground">（无）</p>
                    ) : (
                      <div className="space-y-2">
                        {(ruleDrafts[lib.id] ?? lib.rules).map((r, i) => (
                          <Textarea
                            key={`r-${lib.id}-${i}`}
                            className="min-h-[72px] text-xs font-mono bg-background"
                            value={r}
                            onChange={(e) => {
                              const next = [...(ruleDrafts[lib.id] ?? lib.rules)]
                              next[i] = e.target.value
                              setRuleDrafts((s) => ({ ...s, [lib.id]: next }))
                            }}
                          />
                        ))}
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={rulesDraftMatchesServer(
                            ruleDrafts[lib.id] ?? lib.rules,
                            lib.rules,
                          )}
                          onClick={() => void saveLibraryRulesText(lib.id)}
                        >
                          保存文本规则
                        </Button>
                      </div>
                    )}
                    {(lib.files?.length ?? 0) > 0 && (
                      <>
                        <div className="text-xs font-medium text-muted-foreground pt-1">
                          上传的文件
                        </div>
                        {lib.files!.map((f, i) => (
                          <div
                            key={`f-${lib.id}-${i}`}
                            className="flex gap-2 text-xs border rounded-md p-2 bg-background"
                          >
                            <div className="flex-1 min-w-0">
                              <Badge variant="outline">{f.type}</Badge>{" "}
                              <span className="font-mono">{f.name}</span>
                              <pre className="mt-1 max-h-24 overflow-y-auto whitespace-pre-wrap break-words text-muted-foreground">
                                {f.content.length > 800 ? `${f.content.slice(0, 800)}…` : f.content}
                              </pre>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="shrink-0 h-8 w-8 text-destructive"
                              onClick={() =>
                                setDeleteFileTarget({
                                  libId: lib.id,
                                  index: i,
                                  fileName: f.name,
                                })
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

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

      <AlertDialog open={deleteLibraryId != null} onOpenChange={(o) => !o && setDeleteLibraryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除整个规则库？</AlertDialogTitle>
            <AlertDialogDescription>
              将永久删除「
              {deleteLibraryId
                ? ruleLibraries.find((l) => l.id === deleteLibraryId)?.name ?? "该规则库"
                : ""}
              」及其中的文本规则与附件，且无法恢复。确定要继续吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteLibraryId) void executeDeleteLibrary(deleteLibraryId)
              }}
            >
              删除
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteFileTarget != null} onOpenChange={(o) => !o && setDeleteFileTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除该附件？</AlertDialogTitle>
            <AlertDialogDescription>
              将从当前规则库中移除「{deleteFileTarget?.fileName ?? ""}」。此操作不可撤销，确定吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteFileTarget) void executeDeleteFileRow(deleteFileTarget)
              }}
            >
              删除
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={clearPasteOpen} onOpenChange={setClearPasteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>清空批量粘贴与表格？</AlertDialogTitle>
            <AlertDialogDescription>
              将清空上方粘贴框，并把下方任务表重置为一行空任务（若仍有云手机）。未提交的编辑将丢失。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearBatchPaste}>清空</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deviceParseErrorOpen} onOpenChange={setDeviceParseErrorOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>设备解析失败</AlertDialogTitle>
            <AlertDialogDescription className="whitespace-pre-wrap text-left text-foreground">
              {deviceParseErrorText}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setDeviceParseErrorOpen(false)}>我知道了</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={removeNewFileIndex != null} onOpenChange={(o) => !o && setRemoveNewFileIndex(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>从列表中移除该文件？</AlertDialogTitle>
            <AlertDialogDescription>
              将移除「
              {removeNewFileIndex != null ? newRuleFiles[removeNewFileIndex]?.name ?? "" : ""}
              」，尚未保存到规则库。确定吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (removeNewFileIndex == null) return
                const i = removeNewFileIndex
                setNewRuleFiles((prev) => prev.filter((_, j) => j !== i))
                setRemoveNewFileIndex(null)
              }}
            >
              移除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
