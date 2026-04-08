/**
 * 拉取 GeeLark 近期任务列表，对比上次 status，向 SeaTalk 推送状态变化。
 * 「已取消(7)」不在此推送：用户在本站取消时由 /api/tasks/cancel 发通知，避免重复。
 */

import { taskHistoryRecords } from "@/lib/geelark"
import { notifySeatalkAsync } from "@/lib/seatalk-notify"
import { processIdleShutdownTick } from "@/lib/idle-phone-shutdown"
import { processWarmupShutdownTick } from "@/lib/warmup-run"
import { loadTaskStatusSnapshot, saveTaskStatusSnapshot, type TaskStateMap } from "@/lib/seatalk-task-state"
import { GEE_TASK_STATUS } from "@/lib/task-status-labels"

function label(s?: number) {
  if (s == null) return "—"
  return GEE_TASK_STATUS[s] ?? String(s)
}

export async function runSeatalkTaskSync(): Promise<{
  processed: number
  notified: number
  errors: string[]
  warmupShutdown?: { stopped: number }
  idleShutdown?: { stopped: number }
}> {
  const errors: string[] = []
  let notified = 0

  const prev = await loadTaskStatusSnapshot()
  const next: TaskStateMap = { ...prev }

  let items: Awaited<ReturnType<typeof taskHistoryRecords>>["items"] = []
  try {
    const data = await taskHistoryRecords({ size: 150 })
    items = data.items ?? []
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e))
    let warmupStopped = 0
    try {
      warmupStopped = (await processWarmupShutdownTick()).stopped
    } catch (w) {
      errors.push(`warmup-shutdown: ${w instanceof Error ? w.message : String(w)}`)
    }
    let idleStopped = 0
    try {
      idleStopped = (await processIdleShutdownTick()).stopped
    } catch (w) {
      errors.push(`idle-shutdown: ${w instanceof Error ? w.message : String(w)}`)
    }
    return {
      processed: 0,
      notified: 0,
      errors,
      warmupShutdown: { stopped: warmupStopped },
      idleShutdown: { stopped: idleStopped },
    }
  }

  for (const t of items) {
    const id = t.id
    const cur = t.status ?? 0
    const was = prev[id]

    if (was === undefined) {
      next[id] = cur
      continue
    }
    if (was === cur) continue

    const name = t.planName ?? "任务"
    const sn = t.serialName ?? ""

    if (cur === 2) {
      notifySeatalkAsync(
        `【TikTok矩阵】任务启动\n${name}\n设备：${sn || "—"}\nID：${id}\n状态：${label(was)} → 进行中`,
      )
      notified++
    } else if (cur === 3) {
      notifySeatalkAsync(
        `【TikTok矩阵】任务完成\n${name}\n设备：${sn || "—"}\nID：${id}\n状态：${label(was)} → 已完成`,
      )
      notified++
    } else if (cur === 4) {
      notifySeatalkAsync(
        `【TikTok矩阵】任务失败\n${name}\n设备：${sn || "—"}\nID：${id}\n状态：${label(was)} → 失败${t.failDesc ? `\n原因：${t.failDesc}` : ""}`,
      )
      notified++
    }

    next[id] = cur
  }

  await saveTaskStatusSnapshot(next)

  let warmupStopped = 0
  try {
    warmupStopped = (await processWarmupShutdownTick()).stopped
  } catch (e) {
    errors.push(`warmup-shutdown: ${e instanceof Error ? e.message : String(e)}`)
  }

  let idleStopped = 0
  try {
    idleStopped = (await processIdleShutdownTick()).stopped
  } catch (e) {
    errors.push(`idle-shutdown: ${e instanceof Error ? e.message : String(e)}`)
  }

  return {
    processed: items.length,
    notified,
    errors,
    warmupShutdown: { stopped: warmupStopped },
    idleShutdown: { stopped: idleStopped },
  }
}
