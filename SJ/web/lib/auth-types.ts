/** 功能页签权限（与侧栏、API 校验一致） */
export type FeatureCode = "home" | "devices" | "batch_login" | "tasks" | "settings" | "warmup"

export const ALL_FEATURES: FeatureCode[] = [
  "home",
  "devices",
  "batch_login",
  "tasks",
  "settings",
  "warmup",
]

export const FEATURE_LABELS: Record<FeatureCode, string> = {
  home: "批量评论",
  devices: "设备台",
  batch_login: "批量登录账号",
  tasks: "任务日志",
  settings: "代理设置",
  warmup: "批量养号 / 定时",
}

/** 新建子账号时默认勾选：批量评论、设备台、任务日志、批量养号 */
export const DEFAULT_NEW_USER_FEATURES: FeatureCode[] = ["home", "devices", "tasks", "warmup"]

export type AuthUserRecord = {
  id: string
  email: string
  passwordHash: string
  isSuperAdmin: boolean
  features: FeatureCode[]
  /** 可操作的 GeeLark 环境 ID；主账号或非限制时可为空表示「不限制」需配合 isSuperAdmin */
  envIds: string[]
  /** GOBS 同步：按云手机 tag/group 限制；未设置则仅按 envIds；空数组表示无设备 */
  matrixAllowedGroups?: string[]
  /** 改密后递增，用于使旧 JWT 全部失效 */
  credentialVersion?: number
  createdAt: number
  updatedAt: number
}

export type SessionUser = {
  id: string
  email: string
  isSuperAdmin: boolean
  features: FeatureCode[]
  envIds: string[]
  matrixAllowedGroups?: string[]
}

/** 历史「应用」页签权限 apps 已并入 warmup，读 JWT/存储时自动映射 */
export function normalizeStoredFeatures(raw: unknown): FeatureCode[] {
  if (!Array.isArray(raw)) return []
  const allowed = new Set(ALL_FEATURES)
  const out = new Set<FeatureCode>()
  for (const x of raw) {
    if (typeof x !== "string") continue
    if (x === "apps") {
      out.add("warmup")
      continue
    }
    if (allowed.has(x as FeatureCode)) out.add(x as FeatureCode)
  }
  return [...out]
}

export function userToSession(r: AuthUserRecord): SessionUser {
  return {
    id: r.id,
    email: r.email,
    isSuperAdmin: r.isSuperAdmin,
    features: r.isSuperAdmin ? [...ALL_FEATURES] : normalizeStoredFeatures(r.features),
    envIds: r.envIds,
    matrixAllowedGroups: r.matrixAllowedGroups,
  }
}
