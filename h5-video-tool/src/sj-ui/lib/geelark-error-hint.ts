/**
 * 将 GeeLark OpenAPI 常见英文错误转为带操作提示的文案（保留原始信息）
 */
export function geelarkErrorHint(raw: string | undefined | null): string {
  const s = String(raw ?? "").trim()
  if (!s) return "未知错误"
  if (s.includes("GeeLark 账户余额不足") || s.includes("GEELARK_BEARER_TOKEN")) return s
  const low = s.toLowerCase()
  if (low.includes("balance not enough") || (low.includes("balance") && low.includes("not enough"))) {
    return `${s}（GeeLark 账户余额不足，请到 GeeLark 控制台充值或购买点数后再创建任务）`
  }
  if (low.includes("token") && (low.includes("invalid") || low.includes("expired"))) {
    return `${s}（请检查 GEELARK_BEARER_TOKEN 是否有效）`
  }
  return s
}
