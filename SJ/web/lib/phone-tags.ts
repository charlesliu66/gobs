import type { PhoneItem } from "@/lib/geelark"

/** 矩阵中「无标签」列的内部键 */
export const UNTAGGED_COLUMN_KEY = "__untagged__"

function pushDistinct(out: string[], value: unknown) {
  const t = String(value ?? "").trim()
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

/** 从云手机提取用于分组的标签（含 group.name、tags 等） */
export function collectPhoneTagLabels(p: PhoneItem): string[] {
  const out: string[] = []
  const raw = p as PhoneItem & Record<string, unknown>
  pushTagLikeArray(out, raw.tags)
  pushTagLikeArray(out, raw.tagList)
  pushTagLikeArray(out, raw.tagNames)
  pushDistinct(out, p.group?.name)
  return out
}

export function displayTagColumnLabel(tag: string): string {
  return tag === UNTAGGED_COLUMN_KEY ? "未标记" : tag
}

export function buildPhoneTagMatrix(phones: PhoneItem[]) {
  const tagsByPhoneId = new Map<string, string[]>()
  const columnSet = new Set<string>()

  for (const p of phones) {
    const labels = collectPhoneTagLabels(p)
    const cols = labels.length > 0 ? labels : [UNTAGGED_COLUMN_KEY]
    tagsByPhoneId.set(p.id, cols)
    cols.forEach((c) => columnSet.add(c))
  }

  const columns = [...columnSet].sort((a, b) => {
    if (a === UNTAGGED_COLUMN_KEY) return 1
    if (b === UNTAGGED_COLUMN_KEY) return -1
    return a.localeCompare(b, "en")
  })

  const idsByTag = new Map<string, Set<string>>()
  for (const p of phones) {
    const cols = tagsByPhoneId.get(p.id) ?? [UNTAGGED_COLUMN_KEY]
    for (const t of cols) {
      if (!idsByTag.has(t)) idsByTag.set(t, new Set())
      idsByTag.get(t)!.add(p.id)
    }
  }

  return { columns, idsByTag, tagsByPhoneId }
}

export function tagColumnTriState(
  tag: string,
  idsByTag: Map<string, Set<string>>,
  selected: Set<string>,
): boolean | "indeterminate" {
  const ids = idsByTag.get(tag)
  if (!ids || ids.size === 0) return false
  const arr = [...ids]
  let c = 0
  for (const id of arr) {
    if (selected.has(id)) c++
  }
  if (c === 0) return false
  if (c === arr.length) return true
  return "indeterminate"
}
