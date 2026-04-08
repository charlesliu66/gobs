/**
 * SeaTalk 通知（可选）
 *
 * 1) Webhook：SEATALK_WEBHOOK_URL（及可选 SEATALK_WEBHOOK_TOKEN）
 * 2) Open API：SEATALK_APP_ID + SEATALK_APP_SECRET +（SEATALK_EMPLOYEE_CODE 单聊 owner 优先，否则 SEATALK_GROUP_ID 发群）
 *
 * 若同时配置 Webhook，优先走 Webhook；若只需 Open API，请勿填写 SEATALK_WEBHOOK_URL。
 */

import { getAppAccessToken } from "@/lib/seatalk-openapi"

const GROUP_MSG_URL = "https://openapi.seatalk.io/messaging/v2/group_chat"
const SINGLE_MSG_URL = "https://openapi.seatalk.io/messaging/v2/single_chat"

export type SeatalkNotifyResult =
  | { ok: true }
  | { ok: false; skipped: true; reason: string }
  | { ok: false; error: string }

function textMessagePayload(content: string) {
  const plain = process.env.SEATALK_MESSAGE_PLAIN === "1"
  return {
    tag: "text" as const,
    text: {
      format: plain ? 2 : 1,
      content,
    },
  }
}

async function notifyViaWebhook(text: string): Promise<void> {
  const url = process.env.SEATALK_WEBHOOK_URL!.trim()
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }
  const token = process.env.SEATALK_WEBHOOK_TOKEN?.trim()
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ text }),
  })
  if (!res.ok) {
    const snippet = await res.text().catch(() => "")
    throw new Error(`SeaTalk webhook HTTP ${res.status} ${snippet.slice(0, 200)}`)
  }
}

async function notifyViaOpenApi(text: string): Promise<void> {
  const groupId = process.env.SEATALK_GROUP_ID?.trim()
  const employeeCode = process.env.SEATALK_EMPLOYEE_CODE?.trim()

  // 优先单聊 owner；只有未配置 employee_code 时才发群
  const useSingle = !!employeeCode

  if (!useSingle && !groupId) {
    throw new Error(
      "已配置 App ID/Secret，但未设置 SEATALK_EMPLOYEE_CODE（单聊 owner，推荐）或 SEATALK_GROUP_ID（群）",
    )
  }

  const token = await getAppAccessToken()
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  }

  const url = useSingle ? SINGLE_MSG_URL : GROUP_MSG_URL
  const body = useSingle
    ? JSON.stringify({
        employee_code: employeeCode,
        message: textMessagePayload(text),
        usable_platform: "all",
      })
    : JSON.stringify({
        group_id: groupId,
        message: textMessagePayload(text),
      })

  const res = await fetch(url, {
    method: "POST",
    headers,
    body,
  })

  const raw = await res.text().catch(() => "")
  let data: { code?: number; msg?: string; message?: string } = {}
  try {
    if (raw) data = JSON.parse(raw) as typeof data
  } catch {
    /* ignore */
  }

  if (!res.ok) {
    throw new Error(`SeaTalk HTTP ${res.status} ${raw.slice(0, 400)}`)
  }
  if (data.code != null && data.code !== 0) {
    throw new Error(
      `SeaTalk API code=${data.code} ${data.msg ?? data.message ?? raw.slice(0, 300)}`,
    )
  }
}

export async function notifySeatalk(text: string): Promise<SeatalkNotifyResult> {
  const webhook = process.env.SEATALK_WEBHOOK_URL?.trim()
  const appId = process.env.SEATALK_APP_ID?.trim()
  const appSecret = process.env.SEATALK_APP_SECRET?.trim()

  if (!webhook && (!appId || !appSecret)) {
    const reason =
      "未配置 SeaTalk：请设置 SEATALK_WEBHOOK_URL，或同时设置 SEATALK_APP_ID + SEATALK_APP_SECRET（线上 Vercel 也需配置相同变量）"
    console.warn("[seatalk-notify]", reason)
    return { ok: false, skipped: true, reason }
  }

  try {
    if (webhook) {
      await notifyViaWebhook(text)
    } else {
      await notifyViaOpenApi(text)
    }
    return { ok: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error("[seatalk-notify]", msg)
    return { ok: false, error: msg }
  }
}

/** 不阻塞主逻辑；失败 / 跳过会打日志 */
export function notifySeatalkAsync(text: string): void {
  void notifySeatalk(text).then((r) => {
    if (r.ok) return
    if ("skipped" in r && r.skipped) {
      console.warn("[seatalk-notify] 跳过:", r.reason)
    } else if ("error" in r) {
      console.error("[seatalk-notify]", r.error)
    }
  })
}

/** 用于 /api/seatalk/status：不发起网络请求，仅描述配置是否齐全 */
export function getSeatalkConfigSnapshot(): {
  webhook: boolean
  openApi: boolean
  groupId: boolean
  employeeCode: boolean
  /** Open API 实际发消息目标：单聊 owner 优先于群 */
  openApiTarget: "single" | "group" | null
  ready: boolean
  mode: "webhook" | "openapi" | "none"
  hint: string
} {
  const webhook = !!process.env.SEATALK_WEBHOOK_URL?.trim()
  const openApi = !!(process.env.SEATALK_APP_ID?.trim() && process.env.SEATALK_APP_SECRET?.trim())
  const groupId = !!process.env.SEATALK_GROUP_ID?.trim()
  const employeeCode = !!process.env.SEATALK_EMPLOYEE_CODE?.trim()

  let mode: "webhook" | "openapi" | "none" = "none"
  if (webhook) mode = "webhook"
  else if (openApi) mode = "openapi"

  const openApiTarget: "single" | "group" | null =
    openApi && employeeCode ? "single" : openApi && groupId ? "group" : null

  const ready =
    webhook || (openApi && (groupId || employeeCode))

  let hint = ""
  if (!ready) {
    hint =
      "未就绪：配置 Webhook URL，或配置 App ID/Secret +（推荐 SEATALK_EMPLOYEE_CODE 单聊 owner，或 SEATALK_GROUP_ID 发群）。KV 仅用于任务状态缓存，不能替代 SeaTalk 凭证。"
  } else if (mode === "openapi" && !groupId && !employeeCode) {
    hint = "已配置 App ID/Secret，但缺少 SEATALK_EMPLOYEE_CODE 或 SEATALK_GROUP_ID，无法发消息。"
  } else if (mode === "openapi" && openApiTarget === "single" && groupId) {
    hint = "Open API 将发到单聊（SEATALK_EMPLOYEE_CODE）；已忽略 SEATALK_GROUP_ID。"
  }

  return { webhook, openApi, groupId, employeeCode, openApiTarget, ready, mode, hint }
}
