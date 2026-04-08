/**
 * 可选：当云手机「无等待/进行中任务」且处于待机时自动关机。
 * 需设置 AUTO_SHUTDOWN_IDLE_PHONES=1（默认关闭，避免误关需手动操作的设备）。
 *
 * 与「养号任务完成后关机」互补：养号走 task 追踪；本策略覆盖「无任务空转」场景。
 */

import { getCloudPhones, phoneStop, taskHistoryRecords } from "@/lib/geelark"
import { loadWarmupState, pushWarmupLog, saveWarmupState } from "@/lib/warmup-state"

function isIdleShutdownEnabled(): boolean {
  const v = process.env.AUTO_SHUTDOWN_IDLE_PHONES?.trim().toLowerCase()
  return v === "1" || v === "true" || v === "yes"
}

async function fetchAllPhones(): Promise<Awaited<ReturnType<typeof getCloudPhones>>> {
  const all: Awaited<ReturnType<typeof getCloudPhones>> = []
  let page = 1
  const pageSize = 100
  while (true) {
    const batch = await getCloudPhones({ page, pageSize })
    all.push(...batch)
    if (batch.length < pageSize) break
    page++
    if (page > 200) break
  }
  return all
}

/** 任务状态：等待(1)、进行中(2) 视为「设备仍被任务占用」 */
function isActiveTaskStatus(s?: number): boolean {
  return s === 1 || s === 2
}

export async function processIdleShutdownTick(): Promise<{ stopped: number }> {
  if (!isIdleShutdownEnabled()) return { stopped: 0 }

  let stopped = 0
  const blob = await loadWarmupState()

  try {
    const hist = await taskHistoryRecords({ size: 300 })
    const activeEnvIds = new Set<string>()
    for (const t of hist.items ?? []) {
      if (t.envId && isActiveTaskStatus(t.status)) activeEnvIds.add(t.envId)
    }

    const phones = await fetchAllPhones()
    const toStop: string[] = []

    for (const p of phones) {
      const ps = p.status ?? 2
      if (ps === 2) continue
      if (ps === 1) continue
      if (p.rpaStatus === 1) continue
      if (activeEnvIds.has(p.id)) continue
      toStop.push(p.id)
    }

    if (toStop.length === 0) {
      return { stopped: 0 }
    }

    for (let i = 0; i < toStop.length; i += 30) {
      const chunk = toStop.slice(i, i + 30)
      try {
        await phoneStop(chunk)
        stopped += chunk.length
        pushWarmupLog(blob, "info", `空闲无任务自动关机：${chunk.length} 台（AUTO_SHUTDOWN_IDLE_PHONES）`)
      } catch (e) {
        pushWarmupLog(blob, "warn", `空闲关机批次失败（${chunk.length} 台）：${e instanceof Error ? e.message : String(e)}`)
      }
    }

    await saveWarmupState(blob)
  } catch (e) {
    pushWarmupLog(blob, "warn", `空闲关机检查失败：${e instanceof Error ? e.message : String(e)}`)
    await saveWarmupState(blob)
  }

  return { stopped }
}
