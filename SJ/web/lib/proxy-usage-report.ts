/**
 * 代理与云手机绑定汇总（供 /api/proxies/usage 与本地脚本共用）
 */
import { getCloudPhones, proxyList, type PhoneItem, type ProxyListItem } from "@/lib/geelark"

function proxyMatchKey(scheme: string, server: string, port: number): string {
  const s = String(scheme || "socks5").toLowerCase().trim()
  const h = String(server || "").trim()
  const p = Number(port)
  return `${s}:${h}:${Number.isFinite(p) ? p : 0}`
}

function phoneProxyKey(p: NonNullable<PhoneItem["proxy"]>): string {
  const scheme = p.type || "socks5"
  return proxyMatchKey(scheme, p.server || "", p.port ?? 0)
}

function pushDistinct(out: string[], value: unknown) {
  if (value == null) return
  const t = String(value).trim()
  if (t && !out.includes(t)) out.push(t)
}

function pushTagLikeArray(out: string[], tags: unknown) {
  if (!Array.isArray(tags)) return
  for (const item of tags) {
    if (item == null) continue
    if (typeof item === "string") pushDistinct(out, item)
    else if (typeof item === "object" && item !== null && "name" in item) {
      pushDistinct(out, (item as { name: unknown }).name)
    }
  }
}

function pushStringOrNamedObject(out: string[], val: unknown) {
  if (typeof val === "string") pushDistinct(out, val)
  else if (val && typeof val === "object" && val !== null && "name" in val) {
    pushDistinct(out, (val as { name: unknown }).name)
  }
}

function collectProxyCatalogLabels(pr: ProxyListItem): string[] {
  const raw = pr as ProxyListItem & Record<string, unknown>
  const out: string[] = []

  pushDistinct(out, raw.remark)
  pushDistinct(out, raw.memo)
  pushDistinct(out, raw.note)
  pushDistinct(out, raw.description)
  pushDistinct(out, raw.title)
  pushDistinct(out, raw.alias)
  pushDistinct(out, raw.label)
  pushDistinct(out, raw.displayName)
  pushDistinct(out, raw.name)
  pushDistinct(out, raw.proxyName)
  pushDistinct(out, (raw.group as { name?: string } | undefined)?.name)
  pushDistinct(out, raw.groupName)
  pushDistinct(out, raw.proxyGroupName)
  pushTagLikeArray(out, raw.tags)
  pushTagLikeArray(out, raw.tagList)
  pushTagLikeArray(out, raw.tagNames)
  pushStringOrNamedObject(out, raw.folder)
  pushStringOrNamedObject(out, raw.category)
  pushStringOrNamedObject(out, raw.proxyGroup)
  pushStringOrNamedObject(out, raw.groupInfo)
  if (raw.groupInfo && typeof raw.groupInfo === "object") {
    pushDistinct(out, (raw.groupInfo as { groupName?: string; name?: string }).groupName)
    pushDistinct(out, (raw.groupInfo as { groupName?: string; name?: string }).name)
  }

  return out
}

type PhoneProxyPayload = NonNullable<PhoneItem["proxy"]> &
  Record<string, unknown> & {
    group?: { id?: string; name?: string }
    groupName?: string
    proxyGroupName?: string
    remark?: string
  }

export function collectPhoneSideGroupNames(ph: PhoneItem): string[] {
  const out: string[] = []
  pushDistinct(out, ph.group?.name)
  if (!ph.proxy) return out

  const p = ph.proxy as PhoneProxyPayload
  pushDistinct(out, p.group?.name)
  pushDistinct(out, p.groupName)
  pushDistinct(out, p.proxyGroupName)
  pushDistinct(out, p.remark)
  pushDistinct(out, p.memo)
  pushDistinct(out, p.note)
  pushDistinct(out, p.description)
  pushDistinct(out, p.title)
  pushDistinct(out, p.name)
  pushDistinct(out, p.proxyName)
  pushTagLikeArray(out, p.tags)
  pushTagLikeArray(out, p.tagList)
  pushStringOrNamedObject(out, p.folder)
  pushStringOrNamedObject(out, p.category)
  pushStringOrNamedObject(out, p.proxyGroup)

  return out
}

async function fetchAllProxies(): Promise<ProxyListItem[]> {
  const all: ProxyListItem[] = []
  let page = 1
  const pageSize = 100
  while (true) {
    const data = await proxyList({ page, pageSize })
    if (data.list.length === 0) break
    all.push(...data.list)
    if (data.list.length < pageSize) break
    page++
    if (page > 200) break
  }
  return all
}

export async function fetchAllPhones(): Promise<PhoneItem[]> {
  const all: PhoneItem[] = []
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

export function deviceLabel(ph: PhoneItem): string {
  const name = ph.serialName || ph.remark || ""
  const no = ph.serialNo != null ? String(ph.serialNo) : ""
  if (name && no) return `${name} (${no})`
  return name || no || ph.id
}

function csvEscape(value: string, sep: string): string {
  const s = String(value ?? "")
  if (sep === "\t") {
    return s.replace(/\t/g, " ").replace(/\r?\n/g, " ")
  }
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function rowToDelimitedRow(cells: string[], sep: string): string {
  return cells.map((c) => csvEscape(c, sep)).join(sep)
}

export type ProxyUsageReport = {
  generatedAt: string
  summary: {
    proxyTotal: number
    proxyUsed: number
    proxyUnused: number
    phonesWithProxy: number
    unmatchedBindings: number
  }
  rows: {
    proxyId: string
    serialNo: number | null
    scheme: string
    server: string
    port: number
    username: string
    groupNamesText: string
    address: string
    deviceNames: string[]
    deviceNamesText: string
    status: "已使用" | "未使用"
    deviceCount: number
  }[]
  unmatchedPhones: { deviceId: string; deviceName: string; proxyDisplay: string; proxyGroupName: string }[]
}

/** 一次拉取代理 + 云手机并计算报表（避免重复请求） */
export async function computeProxyUsageFull(): Promise<{ report: ProxyUsageReport; phones: PhoneItem[] }> {
  const [proxies, phones] = await Promise.all([fetchAllProxies(), fetchAllPhones()])

  const keyToProxyIds = new Map<string, string[]>()
  for (const pr of proxies) {
    const k = proxyMatchKey(pr.scheme, pr.server, pr.port)
    const arr = keyToProxyIds.get(k) ?? []
    arr.push(pr.id)
    keyToProxyIds.set(k, arr)
  }

  const namesByProxyId = new Map<string, string[]>()
  const groupNamesByProxyId = new Map<string, Set<string>>()
  for (const pr of proxies) {
    namesByProxyId.set(pr.id, [])
    const gs = new Set<string>()
    groupNamesByProxyId.set(pr.id, gs)
    for (const label of collectProxyCatalogLabels(pr)) gs.add(label)
  }

  const unmatchedPhones: ProxyUsageReport["unmatchedPhones"] = []

  for (const ph of phones) {
    if (!ph.proxy?.server) continue
    const k = phoneProxyKey(ph.proxy)
    const ids = keyToProxyIds.get(k)
    const label = deviceLabel(ph)
    const groupNamesFromPhone = collectPhoneSideGroupNames(ph)
    if (ids?.length) {
      for (const id of ids) {
        const list = namesByProxyId.get(id) ?? []
        if (!list.includes(label)) list.push(label)
        namesByProxyId.set(id, list)
        const gset = groupNamesByProxyId.get(id)
        if (gset) for (const gn of groupNamesFromPhone) gset.add(gn)
      }
    } else {
      unmatchedPhones.push({
        deviceId: ph.id,
        deviceName: label,
        proxyDisplay: [ph.proxy.type, ph.proxy.server, ph.proxy.port].filter(Boolean).join(":"),
        proxyGroupName: groupNamesFromPhone.length ? groupNamesFromPhone.join("；") : "",
      })
    }
  }

  const rows = proxies.map((pr) => {
    const names = namesByProxyId.get(pr.id) ?? []
    const used = names.length > 0
    const gset = groupNamesByProxyId.get(pr.id)
    const groupParts = gset ? Array.from(gset) : []
    const groupNamesText = groupParts.length ? groupParts.join("；") : "—"
    return {
      proxyId: pr.id,
      serialNo: pr.serialNo ?? null,
      scheme: pr.scheme,
      server: pr.server,
      port: pr.port,
      username: pr.username || "",
      groupNamesText,
      address: `${pr.scheme}://${pr.server}:${pr.port}`,
      deviceNames: names,
      deviceNamesText: names.join("；") || "—",
      status: used ? ("已使用" as const) : ("未使用" as const),
      deviceCount: names.length,
    }
  })

  const usedCount = rows.filter((r) => r.deviceCount > 0).length

  const report: ProxyUsageReport = {
    generatedAt: new Date().toISOString(),
    summary: {
      proxyTotal: rows.length,
      proxyUsed: usedCount,
      proxyUnused: rows.length - usedCount,
      phonesWithProxy: phones.filter((p) => p.proxy?.server).length,
      unmatchedBindings: unmatchedPhones.length,
    },
    rows,
    unmatchedPhones,
  }

  return { report, phones }
}

export async function computeUsageReport(): Promise<ProxyUsageReport> {
  const { report } = await computeProxyUsageFull()
  return report
}

/** 设备维度 + 空闲端口汇总（UTF-8 BOM CSV） */
export function reportDevicesAndFreePortsCsv(phones: PhoneItem[], report: ProxyUsageReport): string {
  const sep = ","
  const eol = "\r\n"
  const blocks: string[] = []

  blocks.push(
    rowToDelimitedRow(
      [
        "汇总",
        `代理总数:${report.summary.proxyTotal}`,
        `已占用端口:${report.summary.proxyUsed}`,
        `空闲端口:${report.summary.proxyUnused}`,
        `生成UTC:${report.generatedAt}`,
      ],
      sep,
    ),
  )
  blocks.push("")

  const h1 = ["设备名称", "环境ID", "端口", "代理组", "服务器", "协议", "代理完整地址", "说明"]
  blocks.push(rowToDelimitedRow(h1, sep))
  for (const ph of phones) {
    const p = ph.proxy
    const port = p?.port != null ? String(p.port) : ""
    const server = p?.server ?? ""
    const scheme = p?.type ?? ""
    const groups = collectPhoneSideGroupNames(ph).join("；") || "—"
    const addr = server ? `${scheme}://${server}:${port}` : ""
    const note = p?.server ? (report.unmatchedPhones.some((u) => u.deviceId === ph.id) ? "代理与列表未匹配" : "") : "未配置代理"
    blocks.push(rowToDelimitedRow([deviceLabel(ph), ph.id, port, groups, server, scheme, addr, note || "—"], sep))
  }

  if (report.unmatchedPhones.length > 0) {
    blocks.push("")
    blocks.push("未在代理列表中匹配到的云手机（请核对 IP/端口/协议是否与 proxy/list 一致）")
    blocks.push(rowToDelimitedRow(["环境ID", "设备名称", "代理组(手机侧)", "当前代理(手机侧)"], sep))
    for (const u of report.unmatchedPhones) {
      blocks.push(rowToDelimitedRow([u.deviceId, u.deviceName, u.proxyGroupName || "—", u.proxyDisplay], sep))
    }
  }

  blocks.push("")
  blocks.push("空闲代理端口（未被任何云手机绑定）")
  const h2 = ["端口", "服务器", "协议", "代理组", "代理ID", "完整地址"]
  blocks.push(rowToDelimitedRow(h2, sep))
  const freePorts: number[] = []
  for (const r of report.rows) {
    if (r.status === "未使用") {
      blocks.push(
        rowToDelimitedRow([String(r.port), r.server, r.scheme, r.groupNamesText, r.proxyId, r.address], sep),
      )
      freePorts.push(r.port)
    }
  }
  blocks.push("")
  blocks.push(
    rowToDelimitedRow(
      ["空闲端口一览(逗号分隔)", freePorts.length ? freePorts.sort((a, b) => a - b).join("；") : "无"],
      sep,
    ),
  )

  return "\uFEFF" + blocks.join(eol)
}

export function reportToDelimitedText(report: ProxyUsageReport, sep: string): string {
  const eol = "\r\n"
  const mainHeader = [
    "状态",
    "类型",
    "地址",
    "端口",
    "用户名",
    "代理组",
    "绑定设备名称",
    "设备数",
    "代理ID",
    "代理序号",
    "完整地址",
  ]
  const mainLines = report.rows.map((r) =>
    rowToDelimitedRow(
      [
        r.status,
        r.scheme,
        r.server,
        String(r.port),
        r.username,
        r.groupNamesText,
        r.deviceNamesText,
        String(r.deviceCount),
        r.proxyId,
        r.serialNo != null ? String(r.serialNo) : "",
        r.address,
      ],
      sep,
    ),
  )
  const blocks: string[] = [rowToDelimitedRow(mainHeader, sep), ...mainLines]
  if (report.unmatchedPhones.length > 0) {
    blocks.push("", "未匹配到代理列表的云手机", rowToDelimitedRow(["设备ID", "设备名称", "代理组（手机接口）", "当前代理（手机接口）"], sep))
    for (const u of report.unmatchedPhones) {
      blocks.push(rowToDelimitedRow([u.deviceId, u.deviceName, u.proxyGroupName || "—", u.proxyDisplay], sep))
    }
  }
  blocks.push("", `生成时间_UTC,${report.generatedAt}`)
  const body = blocks.join(eol)
  return sep === "," ? "\uFEFF" + body : body
}
