/**
 * GeeLark API 服务端调用（与 Python geelark_client 逻辑一致）
 */

const GEELARK_BASE_URL = (process.env.GEELARK_BASE_URL || "https://openapi.geelark.com/open/v1").replace(/\/$/, "");
const GEELARK_BEARER_TOKEN = process.env.GEELARK_BEARER_TOKEN;

function traceId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16).toUpperCase();
  }).replace(/-/g, "");
}

function getHeaders(): Record<string, string> {
  const tid = traceId();
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    traceId: tid,
    ...(GEELARK_BEARER_TOKEN ? { Authorization: `Bearer ${GEELARK_BEARER_TOKEN}` } : {}),
  };
}

export type PhoneItem = {
  id: string;
  serialName?: string;
  serialNo?: string;
  status?: number;
  group?: { id: string; name: string };
  remark?: string;
  proxy?: { type?: string; server?: string; port?: number; username?: string; password?: string };
};

export async function getCloudPhones(params?: {
  page?: number;
  pageSize?: number;
  openStatus?: number;
  ids?: string[];
}): Promise<PhoneItem[]> {
  const res = await fetch(`${GEELARK_BASE_URL}/phone/list`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ page: params?.page ?? 1, pageSize: params?.pageSize ?? 100, ...params }),
  });
  const data = await res.json();
  if (data.code !== 0) throw new Error(data.msg || "Failed to fetch phones");
  return data.data?.items ?? [];
}

export async function phoneStart(ids: string[]): Promise<{ totalAmount: number; successAmount: number; failAmount: number }> {
  const res = await fetch(`${GEELARK_BASE_URL}/phone/start`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ ids }),
  });
  const data = await res.json();
  if (data.code !== 0) throw new Error(data.msg || "Start failed");
  return data.data ?? {};
}

export async function phoneStop(ids: string[]): Promise<{ totalAmount: number; successAmount: number; failAmount: number }> {
  const res = await fetch(`${GEELARK_BASE_URL}/phone/stop`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ ids }),
  });
  const data = await res.json();
  if (data.code !== 0) throw new Error(data.msg || "Stop failed");
  return data.data ?? {};
}

export async function phoneDelete(ids: string[]): Promise<{ totalAmount: number; successAmount: number; failAmount: number }> {
  const res = await fetch(`${GEELARK_BASE_URL}/phone/delete`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ ids }),
  });
  const data = await res.json();
  if (data.code !== 0) throw new Error(data.msg || "Delete failed");
  return data.data ?? {};
}

export async function phoneDetailUpdate(params: { id: string; name?: string; remark?: string; proxyId?: string }): Promise<void> {
  const res = await fetch(`${GEELARK_BASE_URL}/phone/detail/update`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (data.code !== 0) throw new Error(data.msg || "Update failed");
}

export async function proxyList(params: { page: number; pageSize: number; ids?: string[] }): Promise<{
  total: number;
  page: number;
  pageSize: number;
  list: { id: string; serialNo?: number; scheme: string; server: string; port: number; username?: string; password?: string }[];
}> {
  const res = await fetch(`${GEELARK_BASE_URL}/proxy/list`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (data.code !== 0) throw new Error(data.msg || "Proxy list failed");
  return data.data ?? { total: 0, page: 1, pageSize: 10, list: [] };
}

export async function proxyAdd(list: { scheme: string; server: string; port: number; username?: string; password?: string }[]): Promise<{ successAmount: number; failAmount: number }> {
  const res = await fetch(`${GEELARK_BASE_URL}/proxy/add`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ list }),
  });
  const data = await res.json();
  if (data.code !== 0) throw new Error(data.msg || "Proxy add failed");
  return data.data ?? {};
}

export async function proxyUpdate(list: { id: string; scheme: string; server: string; port: number; username?: string; password?: string }[]): Promise<void> {
  const res = await fetch(`${GEELARK_BASE_URL}/proxy/update`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ list }),
  });
  const data = await res.json();
  if (data.code !== 0) throw new Error(data.msg || "Proxy update failed");
}

export async function proxyDelete(ids: string[]): Promise<void> {
  const res = await fetch(`${GEELARK_BASE_URL}/proxy/delete`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ ids }),
  });
  const data = await res.json();
  if (data.code !== 0) throw new Error(data.msg || "Proxy delete failed");
}

export async function taskHistoryRecords(params?: { size?: number; lastId?: string; ids?: string[] }): Promise<{
  total: number;
  items: { id: string; planName?: string; taskType?: number; serialName?: string; envId?: string; scheduleAt?: number; status?: number; failCode?: number; failDesc?: string; cost?: number }[];
}> {
  const res = await fetch(`${GEELARK_BASE_URL}/task/historyRecords`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(params ?? { size: 100 }),
  });
  const data = await res.json();
  if (data.code !== 0) throw new Error(data.msg || "Task history failed");
  return data.data ?? { total: 0, items: [] };
}

export async function taskQuery(ids: string[]): Promise<{ total: number; items: { id: string; status?: number; failCode?: number; failDesc?: string }[] }> {
  const res = await fetch(`${GEELARK_BASE_URL}/task/query`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ ids }),
  });
  const data = await res.json();
  if (data.code !== 0) throw new Error(data.msg || "Task query failed");
  return data.data ?? { total: 0, items: [] };
}

export type TaskDetail = {
  id: string;
  planName?: string;
  taskType?: number;
  serialName?: string;
  envId?: string;
  scheduleAt?: number;
  status?: number;
  failCode?: number;
  failDesc?: string;
  cost?: number;
  resultImages?: string[];
  logs?: string[];
  searchAfter?: number[];
  logContinue?: boolean;
};

export async function taskDetail(id: string, searchAfter?: number[]): Promise<TaskDetail> {
  const res = await fetch(`${GEELARK_BASE_URL}/task/detail`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ id, ...(searchAfter?.length ? { searchAfter } : {}) }),
  });
  const data = await res.json();
  if (data.code !== 0) throw new Error(data.msg || "Task detail failed");
  return data.data ?? {};
}

export async function taskCancel(ids: string[]): Promise<{ successAmount: number; failAmount: number }> {
  const res = await fetch(`${GEELARK_BASE_URL}/task/cancel`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ ids }),
  });
  const data = await res.json();
  if (data.code !== 0) throw new Error(data.msg || "Task cancel failed");
  return data.data ?? {};
}

export async function taskAddWarmup(params: { scheduleAt: number; envId: string; action: string; duration: number; keywords?: string[] }): Promise<{ taskId: string }> {
  const res = await fetch(`${GEELARK_BASE_URL}/task/add`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      taskType: 2,
      list: [{ scheduleAt: params.scheduleAt, envId: params.envId, action: params.action, duration: params.duration, keywords: params.keywords ?? [] }],
    }),
  });
  const data = await res.json();
  if (data.code !== 0) throw new Error(data.msg || "Warmup task failed");
  const taskIds = data.data?.taskIds ?? [];
  return { taskId: Array.isArray(taskIds) ? taskIds[0] ?? "" : "" };
}

export async function tiktokFollow(params: { scheduleAt: number; id: string; followProbability: number; name?: string; remark?: string }): Promise<{ taskId: string }> {
  const res = await fetch(`${GEELARK_BASE_URL}/rpa/task/tiktokRandomFollow`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      scheduleAt: params.scheduleAt,
      id: params.id,
      followProbability: Math.min(100, Math.max(0, params.followProbability)),
      name: params.name ?? "TikTok关注",
      remark: params.remark ?? "",
    }),
  });
  const data = await res.json();
  if (data.code !== 0) throw new Error(data.msg || "Follow task failed");
  return data.data ?? {};
}

export async function scheduleTiktokComment(params: {
  phoneId: string;
  tiktokUrl: string;
  comment: string;
  scheduleAt: number;
  useAsia?: boolean;
}): Promise<{ taskId: string }> {
  const path = params.useAsia ? "rpa/task/tiktokRandomCommentAsia" : "rpa/task/tiktokRandomComment";
  const body = {
    id: params.phoneId,
    scheduleAt: params.scheduleAt,
    useAi: 2,
    comment: (params.comment || "").trim().slice(0, 500),
    links: params.tiktokUrl ? [String(params.tiktokUrl).trim()] : [],
    commentProbability: 100,
    name: "TikTok评论",
  };
  if (!body.comment) throw new Error("评论内容不能为空");
  if (body.links.length === 0) throw new Error("请填写视频链接");
  const res = await fetch(`${GEELARK_BASE_URL}/${path}`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (data.code !== 0) throw new Error(data.msg || data.message || "Schedule failed");
  const out = data.data ?? {};
  return { taskId: out.taskId ?? "" };
}
