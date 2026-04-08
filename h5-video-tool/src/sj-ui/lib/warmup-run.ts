import {
  getCloudPhones,
  phoneStart,
  phoneStop,
  taskAddWarmup,
  taskDetail,
  taskHistoryRecords,
  taskQuery,
} from "@/lib/geelark"
import { recordTaskAttribution } from "@/lib/task-attribution-store"
import { geelarkErrorHint } from "@/lib/geelark-error-hint"
import { isQuietHoursRestrictedPhone } from "@/lib/quiet-hours-phone"
import { loadWarmupState, pushWarmupLog, saveWarmupState, type WarmupStateBlob } from "@/lib/warmup-state"
import { randomIntInclusive, randomUnixInWindow, todayYmdInTimeZone, wallTimeToUnixSeconds } from "@/lib/warmup-time"

const DEFAULT_ACTION = "browse video"

export type WarmupOneResult = {
  envId: string
  ok: boolean
  taskId?: string
  duration?: number
  scheduleAt?: number
  logs: string[]
  error?: string
}

function rndDuration(min: number, max: number): number {
  return randomIntInclusive(Math.min(min, max), Math.max(min, max))
}

function chunkIds<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

/**
 * 单台：必要时开机 → 创建养号任务 → 登记关机追踪
 */
export async function runWarmupForEnv(params: {
  envId: string
  action?: string
  durationMin: number
  durationMax: number
  keywords: string[]
  /** 关机追踪写入（默认 true） */
  registerShutdown?: boolean
  blob?: WarmupStateBlob
  /** 记入任务归属；定时任务未传时用 __cron__ */
  creatorUserId?: string
}): Promise<WarmupOneResult> {
  const action = params.action || DEFAULT_ACTION
  const logs: string[] = []
  const { envId } = params
  const blob = params.blob ?? (await loadWarmupState())

  try {
    const items = await getCloudPhones({ ids: [envId], pageSize: 10 })
    const phone = items[0]
    if (!phone) {
      return { envId, ok: false, logs, error: "云手机不存在或不可见" }
    }

    if (isQuietHoursRestrictedPhone(phone)) {
      return {
        envId,
        ok: false,
        logs,
        error: "夜间静默时段（21:00–09:00）禁止养号与开机，请 9:00 后再试",
      }
    }

    const st = phone.status ?? 2
    let bootDelaySec = 75
    if (st === 2) {
      await phoneStart([envId])
      logs.push("已发送开机指令")
      bootDelaySec = 130
    } else {
      logs.push("设备已开机，直接调度养号")
    }

    const duration = rndDuration(params.durationMin, params.durationMax)
    const scheduleAt = Math.floor(Date.now() / 1000) + bootDelaySec + randomIntInclusive(0, 45)

    const { taskId } = await taskAddWarmup({
      scheduleAt,
      envId,
      action,
      duration,
      keywords: params.keywords ?? [],
    })

    if (taskId) {
      await recordTaskAttribution(taskId, params.creatorUserId ?? "__cron__")
    }

    if (params.registerShutdown !== false && taskId) {
      blob.shutdownTasks = blob.shutdownTasks ?? {}
      blob.shutdownTasks[taskId] = envId
      await saveWarmupState(blob)
    }

    logs.push(`养号任务已创建，约 ${duration} 分钟后结束（任务 ID: ${taskId || "—"}）`)
    return { envId, ok: true, taskId, duration, scheduleAt, logs }
  } catch (e) {
    const msg = geelarkErrorHint(e instanceof Error ? e.message : String(e))
    return { envId, ok: false, logs, error: msg }
  }
}

/** 定时派发：每分钟调用一次 */
export async function processWarmupDispatchTick(): Promise<{ dispatched: number; skipped: number }> {
  const blob = await loadWarmupState()
  let dispatched = 0
  let skipped = 0
  const nowSec = Math.floor(Date.now() / 1000)

  for (const sch of blob.schedules) {
    if (!sch.enabled || !sch.envIds?.length) continue

    const tz = sch.timeZone || "UTC"
    const dateStr = todayYmdInTimeZone(tz)

    let winStart: number
    let winEnd: number
    try {
      winStart = wallTimeToUnixSeconds(dateStr, sch.windowStart, tz)
      winEnd = wallTimeToUnixSeconds(dateStr, sch.windowEnd, tz)
    } catch {
      pushWarmupLog(blob, "warn", `[${sch.id}] 时区或时间窗口解析失败`)
      skipped++
      continue
    }

    if (winEnd <= winStart) {
      pushWarmupLog(blob, "warn", `[${sch.name || sch.id}] 时间窗口无效（结束需晚于开始）`)
      skipped++
      continue
    }

    for (const envId of sch.envIds) {
      const key = `${sch.id}::${envId}::${dateStr}`
      const state = blob.dispatch[key] ?? {}

      if (state.dispatched) continue

      if (nowSec > winEnd) {
        if (!state.skipped) {
          state.skipped = true
          state.skipReason = "已过当日时间窗口，未派发"
          blob.dispatch[key] = state
          pushWarmupLog(
            blob,
            "warn",
            `跳过定时养号：${sch.name || sch.id} / 设备 ${envId} / ${dateStr} — ${state.skipReason}`,
          )
          skipped++
        }
        continue
      }

      if (nowSec < winStart) {
        blob.dispatch[key] = state
        continue
      }

      if (!state.plannedScheduleAt) {
        state.plannedScheduleAt = randomUnixInWindow(winStart, winEnd, nowSec)
        blob.dispatch[key] = state
        pushWarmupLog(
          blob,
          "info",
          `计划养号：${sch.name || sch.id} / ${envId} / ${dateStr} @ ${state.plannedScheduleAt}（随机开始）`,
        )
      }

      if (state.plannedScheduleAt != null && nowSec >= state.plannedScheduleAt) {
        const res = await runWarmupForEnv({
          envId,
          action: sch.action || DEFAULT_ACTION,
          durationMin: sch.durationMin,
          durationMax: sch.durationMax,
          keywords: sch.keywords ?? [],
          blob,
          creatorUserId: "__cron__",
        })
        if (res.ok) {
          state.dispatched = true
          state.taskId = res.taskId
          dispatched++
          pushWarmupLog(blob, "info", `已派发定时养号：${envId} 任务 ${res.taskId ?? "—"}`)
        } else {
          state.skipped = true
          state.skipReason = res.error || "派发失败"
          pushWarmupLog(blob, "warn", `跳过定时养号：${envId} — ${state.skipReason}`)
          skipped++
        }
        blob.dispatch[key] = state
      }
    }
  }

  await saveWarmupState(blob)
  return { dispatched, skipped }
}

/** 养号任务完成后关机（多路查询状态：仅靠 task/query 在部分场景无记录，需 history + detail） */
export async function processWarmupShutdownTick(): Promise<{ stopped: number }> {
  const blob = await loadWarmupState()
  const ids = Object.keys(blob.shutdownTasks ?? {})
  if (ids.length === 0) return { stopped: 0 }

  const statusById = new Map<string, number | undefined>()

  try {
    const hist = await taskHistoryRecords({ size: Math.min(200, Math.max(ids.length * 2, 50)), ids })
    for (const it of hist.items ?? []) {
      if (it?.id && ids.includes(it.id)) statusById.set(it.id, it.status)
    }
  } catch {
    /* 部分环境 history 不支持 ids，忽略 */
  }

  for (const part of chunkIds(ids, 50)) {
    try {
      const q = await taskQuery(part)
      for (const it of q.items ?? []) {
        statusById.set(it.id, it.status)
      }
    } catch {
      /* ignore */
    }
  }

  for (const tid of ids) {
    if (statusById.get(tid) !== undefined) continue
    try {
      const d = await taskDetail(tid)
      statusById.set(tid, d.status)
    } catch {
      /* 任务尚未入库或已过期 */
    }
  }

  let stopped = 0
  try {
    for (const tid of ids) {
      const envId = blob.shutdownTasks[tid]
      if (!envId) continue
      const st = statusById.get(tid)
      if (st === 3) {
        try {
          await phoneStop([envId])
          pushWarmupLog(blob, "info", `养号任务完成，已关机：${envId}（任务 ${tid}）`)
          stopped++
        } catch (e) {
          pushWarmupLog(blob, "warn", `养号完成但关机失败 ${envId}：${e instanceof Error ? e.message : String(e)}`)
        }
        delete blob.shutdownTasks[tid]
      } else if (st === 4 || st === 7) {
        delete blob.shutdownTasks[tid]
        pushWarmupLog(blob, "info", `养号任务结束（${st === 7 ? "已取消" : "失败"}），不再追踪关机：${tid}`)
      }
    }
  } catch (e) {
    pushWarmupLog(blob, "warn", `养号关机流程异常：${e instanceof Error ? e.message : String(e)}`)
  }

  await saveWarmupState(blob)
  return { stopped }
}
