/**
 * SeaTalk Open Platform — 共享能力（取 token、群信息等）
 * 需在环境变量中配置 SEATALK_APP_ID、SEATALK_APP_SECRET。
 *
 * Get Group Info 需在开放平台为应用开启 Bot、上线，并授予 Get Group Info 权限与可用范围。
 *
 * @see https://openapi.seatalk.io
 */

const BASE = "https://openapi.seatalk.io"
export const SEATALK_AUTH_URL = `${BASE}/auth/app_access_token`

type TokenCache = { token: string; expireAtSec: number }
let tokenCache: TokenCache | null = null

/** 获取 app_access_token（带内存缓存，临近过期会刷新） */
export async function getAppAccessToken(): Promise<string> {
  const appId = process.env.SEATALK_APP_ID?.trim()
  const appSecret = process.env.SEATALK_APP_SECRET?.trim()
  if (!appId || !appSecret) {
    throw new Error("缺少 SEATALK_APP_ID / SEATALK_APP_SECRET")
  }

  const now = Math.floor(Date.now() / 1000)
  if (tokenCache && tokenCache.expireAtSec > now + 120) {
    return tokenCache.token
  }

  const res = await fetch(SEATALK_AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
  })
  const data = (await res.json().catch(() => ({}))) as {
    code?: number
    app_access_token?: string
    expire?: number
    msg?: string
  }
  if (data.code !== 0 || !data.app_access_token) {
    throw new Error(`SeaTalk 取 token 失败: ${data.msg ?? res.status} ${JSON.stringify(data).slice(0, 200)}`)
  }
  const expireAtSec = typeof data.expire === "number" ? data.expire : now + 7000
  tokenCache = { token: data.app_access_token, expireAtSec }
  return data.app_access_token
}

/** Get Group Info 响应中的 group 对象（节选文档字段） */
export type SeatalkGroupInfoGroup = {
  group_name?: string
  group_settings?: {
    chat_history_for_new_members?: string
    can_notify_with_at_all?: boolean
    can_view_member_list?: boolean
  }
  group_user_total?: number
  group_bot_total?: number
  group_system_account_total?: number
  group_user_list?: {
    seatalk_id?: string
    employee_code?: string
    email?: string
  }[]
  group_bot_list?: string[]
  group_system_account_list?: string[]
}

export type SeatalkGroupInfoResponse = {
  code: number
  next_cursor?: string
  group?: SeatalkGroupInfoGroup
  msg?: string
  message?: string
}

/**
 * GET /messaging/v2/group_chat/info
 * 查询机器人已加入的群信息（含成员分页列表）。
 */
export async function getGroupChatInfo(params: {
  groupId: string
  pageSize?: number
  cursor?: string
}): Promise<SeatalkGroupInfoResponse> {
  const token = await getAppAccessToken()
  const url = new URL(`${BASE}/messaging/v2/group_chat/info`)
  url.searchParams.set("group_id", params.groupId)
  if (params.pageSize != null) {
    const n = Math.min(100, Math.max(1, Math.floor(params.pageSize)))
    url.searchParams.set("page_size", String(n))
  }
  if (params.cursor) {
    url.searchParams.set("cursor", params.cursor)
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  })

  const data = (await res.json().catch(() => ({}))) as SeatalkGroupInfoResponse
  if (!res.ok && data.code == null) {
    throw new Error(`SeaTalk Get Group Info HTTP ${res.status}: ${JSON.stringify(data).slice(0, 300)}`)
  }
  return data
}
