/**
 * 在前端根据当前账号可见的云手机列表解析「设备 ID 或名称」。
 * 列表来自 /api/phones（已按权限过滤），未匹配即无权或名称错误。
 */

export type PhoneLike = { id: string; serialName?: string; serialNo?: string }

export type ResolveDeviceResult =
  | { ok: true; id: string; displayName: string }
  | { ok: false; message: string }

/** 未填写设备时：使用列表第一台（列表须非空） */
export function resolveDeviceFromList(
  phones: PhoneLike[],
  deviceIdOrName: string | undefined,
): ResolveDeviceResult {
  if (phones.length === 0) {
    return { ok: false, message: "暂无可用云手机。请确认 GeeLark 已配置，并检查当前账号是否已分配设备。" }
  }
  const key = (deviceIdOrName ?? "").trim()
  if (!key) {
    const d = phones[0]
    return {
      ok: true,
      id: d.id,
      displayName: (d.serialName || String(d.serialNo ?? "") || d.id).trim() || d.id,
    }
  }
  const found = phones.find(
    (p) =>
      p.id === key ||
      (p.serialName && p.serialName.trim() === key) ||
      (p.serialNo != null && String(p.serialNo).trim() === key),
  )
  if (found) {
    return {
      ok: true,
      id: found.id,
      displayName: (found.serialName || String(found.serialNo ?? "") || found.id).trim() || found.id,
    }
  }
  return {
    ok: false,
    message: `未找到设备「${key}」。请核对与设备台中的名称、编号或环境 ID 是否完全一致，并确认该设备已分配给当前账号。`,
  }
}
