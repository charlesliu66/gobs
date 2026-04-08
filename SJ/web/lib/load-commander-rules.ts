/**
 * 全局 commander.py（Safety Filter）加载：与规则库合并后一并送入 LLM。
 * 仅应在服务端（Route / Node）中调用。
 */
import fs from "fs"
import path from "path"

export type CommanderLoadResult = { content: string; pathLabel: string }

function tryReadFile(p: string): string | null {
  try {
    if (!fs.existsSync(p)) return null
    const st = fs.statSync(p)
    if (!st.isFile()) return null
    const content = fs.readFileSync(p, "utf8").trim()
    return content.length > 0 ? content : null
  } catch {
    return null
  }
}

/**
 * 从环境变量或常见路径读取 commander.py。
 * - COMMENT_COMMANDER_PY_PATH：绝对或相对路径（相对 process.cwd()）
 * - ./commander.py（cwd 常为 web/ 或仓库根，故多候选）
 */
export function loadCommanderPyGlobal(): CommanderLoadResult | null {
  const envPath = process.env.COMMENT_COMMANDER_PY_PATH?.trim()
  const candidates: string[] = []
  if (envPath) {
    if (path.isAbsolute(envPath)) {
      candidates.push(envPath)
    } else {
      candidates.push(path.join(process.cwd(), envPath))
    }
  }
  candidates.push(
    path.join(process.cwd(), "commander.py"),
    path.join(process.cwd(), "..", "commander.py"),
    path.join(process.cwd(), "web", "commander.py"),
  )

  const seen = new Set<string>()
  for (const p of candidates) {
    const resolved = path.normalize(p)
    if (seen.has(resolved)) continue
    seen.add(resolved)
    const text = tryReadFile(resolved)
    if (text) {
      return { content: text, pathLabel: resolved }
    }
  }
  return null
}

/** 作为单条「规则」拼进提示词，强调 Safety Filter */
export function commanderBlockForPrompt(content: string): string {
  return [
    "【全局 commander.py 安全规则（Safety Filter，必须遵守）】",
    "以下为 Python 源码或注释中的规范：请将其中的禁止项、过滤规则、敏感词/话题限制、语气与长度等要求视为硬约束；生成评论时必须满足，不得输出违规内容。",
    "",
    "```python",
    content,
    "```",
  ].join("\n")
}

/** 将磁盘上的 commander.py 置于规则列表最前（优先级最高） */
export function mergeGlobalCommanderIntoRules(rules: string[]): string[] {
  const g = loadCommanderPyGlobal()
  if (!g) return rules
  return [commanderBlockForPrompt(g.content), ...rules]
}
