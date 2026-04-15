# Harness Enhancement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 建立三层开发能力增强：完整的 CLAUDE.md 项目指令、半自动化 eval 验证脚本、以及 SESSION-ANCHOR 为核心的 context 管理策略。

**Architecture:** 五个独立产物依次交付：CLAUDE.md（AI 指令主文件）→ memory 文件（跨会话记忆）→ eval.sh（机械检查脚本）→ SESSION-ANCHOR 模板（运行时锚点）→ 强化 verifier 提示词（将脚本结果接入 AI 判断）。

**Tech Stack:** Bash shell, JSON, Markdown, TypeScript (for build verification), Node.js/npm

---

### Task 1: 创建 CLAUDE.md（根目录）

**Files:**
- Create: `CLAUDE.md`

**Step 1: 写入 CLAUDE.md 完整内容**

创建 `/c/Users/wei.liu/Desktop/cursor_try/QAS/CLAUDE.md`，内容如下：

```markdown
# CLAUDE.md — GOBS / QAS 项目智能体运行指南

> 兼容 Claude Code · Cursor · OpenClaw。首次读完后无需再追问项目背景。

---

## 项目概述

- **平台**: GOBS（视频创作分发平台）/ QAS（H5 视频工具套件）
- **服务器**: `43.134.186.196`（腾讯云，SSH root@43.134.186.196）
- **Git 仓库**: `charlesliu66/gobs`（main 分支）

---

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Next.js / React + Vite（`h5-video-tool/`） |
| 后端 | Node.js + TypeScript + Express（`h5-video-tool-api/`） |
| 视频生成 | Compass/VEO、Dreamina CLI、Kling API |
| 图像生成 | Compass/Imagen（gemini-3.x-flash/pro-image） |
| 部署 | 腾讯云 CVM，PM2 进程管理，Nginx 反代 |

---

## 关键文件地图

开始任务前按顺序读这些文件，不要随机探索：

```
docs/TASK-INDEX.md                    # 当前优化任务优先级总览
docs/workflow/runs/<run-id>/SESSION-ANCHOR.md  # 本轮目标锚点（先读！）
docs/workflow/runs/<run-id>/planner-spec.md    # 详细规格
h5-video-tool-api/src/routes/         # 后端 API 路由
h5-video-tool-api/src/services/       # 视频/图像生成服务层
h5-video-tool/src/                    # 前端源码
```

**禁止随意展开的目录**（除非 SESSION-ANCHOR 明确列出）：
- `node_modules/`、`dist/`、`out/`、`output/`
- `.git/`、`backups/`

---

## 开发命令

```bash
# 后端
cd h5-video-tool-api
npm run dev      # 开发模式（ts-node，port 3001）
npm run build    # 生产构建（tsc）
npm run start    # 生产启动（node dist/index.js）

# 前端
cd h5-video-tool
npm run dev      # Vite dev server
npm run build    # 生产构建（dist/）
npm run lint     # ESLint 检查

# 全量验证脚本
bash scripts/eval.sh <run-id>
```

---

## 环境变量说明

文件位置：`h5-video-tool-api/.env`（从 `.env.example` 复制）

### 必须配置（否则服务启动失败）

| 变量 | 说明 |
|---|---|
| `JWT_SECRET` | JWT 签名密钥，生产环境必须改为强随机字符串 |
| `COMPASS_API_URL` | Compass 内网地址（`http://compass.llm.shopee.io/compass-api/v1`） |
| `COMPASS_API_KEY` | Compass 主 Key（LLM + Imagen） |
| `PORT` | 后端端口，默认 3001 |

### 常用可选配置

| 变量 | 说明 |
|---|---|
| `COMPASS_API_KEY2` | 第二把 Key（VEO 专用） |
| `COMPASS_VIDEO_MODEL` | 默认 `veo-2` |
| `DREAMINA_BIN` | Windows 下 dreamina 可执行文件完整路径 |
| `API_DATA_DIR` | 生产数据根目录（挂载云硬盘时设为挂载点） |
| `KLING_API_KEY` | 可灵视频生成（可选） |

### 绝对不能提交到 Git

- `.env`（真实密钥）
- `*.env`（除 `*.env.example`）
- `h5-video-tool-api/dreamina-login.json`

---

## 4+1 工作流规则（强制）

每个功能必须经过以下 5 个门禁，**未过关不能进入下一关**：

| Gate | 角色 | 产物 | 通过条件 |
|---|---|---|---|
| 1 | Planner | `planner-spec.md` | 目标、AC、风险、测试矩阵齐全 |
| 1.5 | Challenger | `challenger-review.md` | must-fix 清零 |
| 2 | Builder | `builder-report.md` | 所有 AC 映射到实现 + 自测证据 |
| 3 | Verifier | `verifier-report.md` + `eval-result.json` | 六类验证覆盖，P0/P1 清零 |
| 5 | Integrator | `release-decision.md` | GO/NO-GO 明确 |

**Run 目录**: `docs/workflow/runs/YYYY-MM-DD-<feature-name>/`

---

## 禁区（绝对不能改）

### 禁止修改的文件
- `h5-video-tool-api/src/services/dreaminaVideo.ts`
- `h5-video-tool-api/src/services/klingVideo.ts`
- `h5-video-tool-api/src/services/veoPython.ts`
- `h5-video-tool-api/src/services/studioPipeline.ts`
- `h5-video-tool-api/src/types/productionTypes.ts`
- `h5-video-tool-api/src/config/productionAssets.ts`
- `.env`（真实密钥文件）
- 任何 `.env.example` 中未出现的环境变量

### 禁止的操作
- `git push --force`（除非 Integrator 明确授权）
- 跳过 Gate（Builder 不能在没有 `planner-spec.md` 的情况下开始）
- 直接改后端底层服务（见上方禁止文件）
- 在代码中硬编码 API Key 或密码

---

## Context 加载顺序

每轮任务开始时，AI 按此顺序加载，**不主动展开其他文件**：

```
1. CLAUDE.md（本文件）
2. docs/TASK-INDEX.md
3. docs/workflow/runs/<run-id>/SESSION-ANCHOR.md  ← 本轮锚点
4. docs/workflow/runs/<run-id>/planner-spec.md
5. SESSION-ANCHOR 中列出的源码文件（仅列出的）
```

如果不知道当前 `<run-id>`，先读 `docs/TASK-INDEX.md` 确认当前任务。

---

## 跨会话 Memory 约定

路径：`.claude/memory/`

| 文件 | 内容 |
|---|---|
| `MEMORY.md` | 索引（≤200 行），每条一行 |
| `project.md` | 项目背景常量（技术栈、仓库、服务器） |
| `feedback.md` | AI 行为矫正记录（教训 + 规则） |

**格式**（每条 memory 文件头部）：
```yaml
---
name: 记忆名称
description: 一行描述（用于判断相关性）
type: user | feedback | project | reference
---
```

Memory 记录**不**应包含：代码模式、git 历史、正在进行的任务详情。
```

**Step 2: 验证文件存在**

```bash
ls -la /c/Users/wei.liu/Desktop/cursor_try/QAS/CLAUDE.md
```
Expected: 文件存在，大小 > 2000 bytes

**Step 3: Commit**

```bash
cd /c/Users/wei.liu/Desktop/cursor_try/QAS
git add CLAUDE.md
git commit -m "feat: add CLAUDE.md multi-tool agent harness instructions"
```

---

### Task 2: 创建跨会话 Memory 文件

**Files:**
- Create: `.claude/memory/MEMORY.md`
- Create: `.claude/memory/project.md`
- Create: `.claude/memory/feedback.md`

**Step 1: 写入 project.md**

创建 `.claude/memory/project.md`：

```markdown
---
name: QAS/GOBS 项目背景
description: 项目技术栈、服务器、仓库等背景常量
type: project
---

GOBS 是视频创作分发平台，QAS 是其 H5 视频工具套件。

**Why:** 每次新对话都需要重新介绍项目背景，浪费 context。
**How to apply:** 每次新对话直接引用这些常量，无需重复介绍。

## 基本信息
- 服务器: 43.134.186.196（腾讯云 CVM，SSH root@43.134.186.196）
- Git 仓库: charlesliu66/gobs（main 分支）
- 本地工作目录: C:\Users\wei.liu\Desktop\cursor_try\QAS

## 技术栈
- 前端: h5-video-tool/（Next.js/React + Vite，npm run build → dist/）
- 后端: h5-video-tool-api/（Node.js + TypeScript + Express，port 3001）
- 视频: Compass/VEO2、Dreamina CLI（即梦）、Kling API
- 图像: Compass/Imagen（gemini-3.x-flash/pro-image-preview）
- 部署: PM2 + Nginx，腾讯云 CVM

## 工作流
- 4+1 门禁式工作流，见 docs/workflow/README.md
- 任务总览: docs/TASK-INDEX.md
- 当前 6 个优化任务: TASK-01 到 TASK-06（P0: 01/02/05，P1: 03/04/06）
```

**Step 2: 写入 feedback.md**

创建 `.claude/memory/feedback.md`：

```markdown
---
name: AI 行为规则与教训
description: 从实际开发中积累的 AI 行为矫正规则，避免重蹈覆辙
type: feedback
---

## 规则 1: 禁止修改后端底层服务文件

不能改 dreaminaVideo.ts、klingVideo.ts、veoPython.ts、studioPipeline.ts、productionTypes.ts、productionAssets.ts。

**Why:** 这些文件是稳定的底层实现，改动会引发连锁故障，且很难在没有真实 API 密钥的情况下验证。
**How to apply:** 任何任务开始前先确认改动范围不涉及上述文件。如果需求必须改这些文件，先停下来询问用户。

## 规则 2: npm run build 必须零错误

每个任务完成后必须跑 `npm run build`（后端）和 `npm run build`（前端）。

**Why:** TypeScript 编译错误在生产环境会导致服务启动失败。
**How to apply:** 在 builder-report.md 中必须包含 build 成功的截图或输出摘要。

## 规则 3: 不硬编码 API Key

任何 API Key、密码、Token 都只能放在 .env 文件中，绝不能出现在源码里。

**Why:** 硬编码密钥一旦提交会永久留在 git 历史中，即使后续删除也会被扫描工具检出。
**How to apply:** 遇到需要密钥的地方，先检查 .env.example，按格式添加占位符，在代码中用 process.env.XXX 读取。

## 规则 4: 不在没有 planner-spec 的情况下开始 build

4+1 工作流中，Gate 1（Planner）必须先过。

**Why:** 没有明确 AC 的 build 容易跑偏，验证时无法对照。
**How to apply:** 每次新任务开始前检查 docs/workflow/runs/<run-id>/planner-spec.md 是否存在。
```

**Step 3: 写入 MEMORY.md 索引**

创建 `.claude/memory/MEMORY.md`：

```markdown
# Memory Index

- [QAS/GOBS 项目背景](project.md) — 技术栈、服务器、仓库、工作流等背景常量
- [AI 行为规则与教训](feedback.md) — 禁止修改的文件、build 规则、安全约束
```

**Step 4: 验证**

```bash
ls -la /c/Users/wei.liu/Desktop/cursor_try/QAS/.claude/memory/
```
Expected: 三个文件都存在

**Step 5: Commit**

```bash
cd /c/Users/wei.liu/Desktop/cursor_try/QAS
git add .claude/memory/
git commit -m "feat: initialize cross-session memory files (project + feedback)"
```

---

### Task 3: 创建 scripts/eval.sh

**Files:**
- Create: `scripts/eval.sh`

**Step 1: 写入 eval.sh**

创建 `scripts/eval.sh`（注意：使用 Unix 换行符，chmod +x）：

```bash
#!/usr/bin/env bash
# eval.sh — 半自动化验证脚本
# 用法: bash scripts/eval.sh <run-id>
# 退出码: 0=PASS, 1=P0_FAIL, 2=P1_WARN

set -euo pipefail

RUN_ID="${1:-unknown}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RUN_DIR="$REPO_ROOT/docs/workflow/runs/$RUN_ID"
OUT_FILE="$RUN_DIR/eval-result.json"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

mkdir -p "$RUN_DIR"

# ── 初始化结果对象 ──────────────────────────────────────────
backend_build_status="skip"
backend_build_error=""
frontend_build_status="skip"
frontend_build_error=""
typescript_status="skip"
typescript_errors="[]"
api_health_status="skip"
api_health_code=0
verdict="PASS"

echo "=== eval.sh: $RUN_ID ==="
echo "Output: $OUT_FILE"
echo ""

# ── 1. 后端 build ────────────────────────────────────────────
echo "[1/4] Backend build..."
API_DIR="$REPO_ROOT/h5-video-tool-api"
if [ -d "$API_DIR" ]; then
  cd "$API_DIR"
  if npm run build 2>&1; then
    backend_build_status="pass"
    echo "  ✓ Backend build passed"
  else
    backend_build_status="fail"
    backend_build_error="npm run build failed"
    verdict="P0_FAIL"
    echo "  ✗ Backend build FAILED"
  fi
  cd "$REPO_ROOT"
else
  backend_build_status="skip"
  echo "  - h5-video-tool-api/ not found, skipped"
fi

# ── 2. 前端 build ────────────────────────────────────────────
echo "[2/4] Frontend build..."
H5_DIR="$REPO_ROOT/h5-video-tool"
if [ -d "$H5_DIR" ]; then
  cd "$H5_DIR"
  if npm run build 2>&1; then
    frontend_build_status="pass"
    echo "  ✓ Frontend build passed"
  else
    frontend_build_status="fail"
    frontend_build_error="npm run build failed"
    [ "$verdict" != "P0_FAIL" ] && verdict="P1_WARN"
    echo "  ✗ Frontend build FAILED"
  fi
  cd "$REPO_ROOT"
else
  frontend_build_status="skip"
  echo "  - h5-video-tool/ not found, skipped"
fi

# ── 3. TypeScript 严格检查（后端）────────────────────────────
echo "[3/4] TypeScript check..."
if [ -d "$API_DIR" ] && [ -f "$API_DIR/tsconfig.json" ]; then
  cd "$API_DIR"
  TS_OUT=$(npx tsc --noEmit 2>&1 || true)
  if [ -z "$TS_OUT" ]; then
    typescript_status="pass"
    echo "  ✓ TypeScript: zero errors"
  else
    typescript_status="fail"
    # 转义为 JSON 字符串（基础处理）
    TS_FIRST=$(echo "$TS_OUT" | head -5 | sed 's/"/\\"/g' | tr '\n' '|')
    typescript_errors="[\"${TS_FIRST}\"]"
    [ "$verdict" = "PASS" ] && verdict="P1_WARN"
    echo "  ✗ TypeScript errors found"
    echo "$TS_OUT" | head -10
  fi
  cd "$REPO_ROOT"
else
  typescript_status="skip"
  echo "  - tsconfig.json not found, skipped"
fi

# ── 4. API 健康检查（仅在后端 build 通过时执行）────────────────
echo "[4/4] API health check..."
API_PORT="${PORT:-3001}"
HEALTH_URL="http://localhost:$API_PORT/api/health"

if [ "$backend_build_status" = "pass" ]; then
  # 尝试连接（服务可能未运行，不阻断整体流程）
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 "$HEALTH_URL" 2>/dev/null || echo "000")
  api_health_code=$HTTP_CODE
  if [ "$HTTP_CODE" = "200" ]; then
    api_health_status="pass"
    echo "  ✓ API health: 200 OK"
  elif [ "$HTTP_CODE" = "000" ]; then
    api_health_status="skip"
    echo "  - API not running (service not started), skipped"
  else
    api_health_status="fail"
    [ "$verdict" = "PASS" ] && verdict="P1_WARN"
    echo "  ✗ API health returned $HTTP_CODE"
  fi
else
  api_health_status="skip"
  echo "  - Backend build failed, skipping health check"
fi

# ── 写入 JSON 报告 ───────────────────────────────────────────
cat > "$OUT_FILE" <<EOF
{
  "run_id": "$RUN_ID",
  "timestamp": "$TIMESTAMP",
  "checks": {
    "backend_build": { "status": "$backend_build_status", "error": "$backend_build_error" },
    "frontend_build": { "status": "$frontend_build_status", "error": "$frontend_build_error" },
    "typescript": { "status": "$typescript_status", "errors": $typescript_errors },
    "api_health": { "status": "$api_health_status", "code": $api_health_code },
    "smoke_tests": []
  },
  "verdict": "$verdict"
}
EOF

echo ""
echo "=== VERDICT: $verdict ==="
echo "Report written to: $OUT_FILE"

# 退出码
if [ "$verdict" = "P0_FAIL" ]; then
  exit 1
elif [ "$verdict" = "P1_WARN" ]; then
  exit 2
else
  exit 0
fi
```

**Step 2: 赋予执行权限**

```bash
chmod +x /c/Users/wei.liu/Desktop/cursor_try/QAS/scripts/eval.sh
```

**Step 3: 冒烟测试（无 run-id 参数，测试脚本语法）**

```bash
cd /c/Users/wei.liu/Desktop/cursor_try/QAS
bash -n scripts/eval.sh
```
Expected: 无输出（语法正确）

**Step 4: 运行一次真实验证（用 test-run 作为 run-id）**

```bash
cd /c/Users/wei.liu/Desktop/cursor_try/QAS
bash scripts/eval.sh test-run 2>&1 | tail -20
```
Expected: 看到 `=== VERDICT: PASS ===` 或 `P1_WARN`（取决于本地 build 状态），并生成 `docs/workflow/runs/test-run/eval-result.json`

**Step 5: 验证 JSON 输出格式**

```bash
cat /c/Users/wei.liu/Desktop/cursor_try/QAS/docs/workflow/runs/test-run/eval-result.json
```
Expected: 合法 JSON，包含 `run_id`、`timestamp`、`checks`、`verdict` 字段

**Step 6: Commit**

```bash
cd /c/Users/wei.liu/Desktop/cursor_try/QAS
git add scripts/eval.sh
git commit -m "feat: add eval.sh semi-automated verification script"
```

---

### Task 4: 创建 SESSION-ANCHOR 模板

**Files:**
- Modify: `docs/workflow/runs/RUN_TEMPLATE.md`（添加 SESSION-ANCHOR 说明）
- Create: `docs/workflow/runs/SESSION-ANCHOR-template.md`

**Step 1: 写入 SESSION-ANCHOR 模板**

创建 `docs/workflow/runs/SESSION-ANCHOR-template.md`：

```markdown
# SESSION-ANCHOR — <run-id>

> 每轮对话开始时 AI 必须先读这个文件，然后只读"允许读取"列表中的文件。

## 本轮目标（一句话）

[从 planner-spec.md 的 Goal 字段复制]

## 验收标准 ID

- AC-1: [描述]
- AC-2: [描述]
- AC-3: [描述]

## 本轮禁区（绝对不能改）

- [文件或目录]
- [文件或目录]

## 允许读取的文件（按需展开，其他不看）

```
docs/workflow/runs/<run-id>/planner-spec.md
h5-video-tool-api/src/routes/[相关路由].ts
h5-video-tool/src/[相关组件].tsx
```

## 当前进度

- [ ] AC-1: 未开始
- [ ] AC-2: 未开始
- [ ] AC-3: 未开始

---

> **使用说明**：
> 1. Planner 创建 run 文件夹后立即填写本文件
> 2. Builder 每轮开始时先读本文件，更新"当前进度"
> 3. Verifier 在验证前读本文件，确认 AC 覆盖完整
> 4. Integrator 在写 release-decision 前检查所有 AC 是否已勾选
```

**Step 2: 更新 RUN_TEMPLATE.md，加入 SESSION-ANCHOR 要求**

在 `docs/workflow/runs/RUN_TEMPLATE.md` 末尾添加：

```markdown

## SESSION-ANCHOR（必备，新增）

每个 run 目录还需要包含：

- `SESSION-ANCHOR.md` — 从 `SESSION-ANCHOR-template.md` 复制并填写

此文件是 AI 每轮开始时的第一个读取目标，用于防止目标漂移和无关文件占据 context。
```

**Step 3: 验证**

```bash
ls /c/Users/wei.liu/Desktop/cursor_try/QAS/docs/workflow/runs/SESSION-ANCHOR-template.md
```
Expected: 文件存在

**Step 4: Commit**

```bash
cd /c/Users/wei.liu/Desktop/cursor_try/QAS
git add docs/workflow/runs/SESSION-ANCHOR-template.md docs/workflow/runs/RUN_TEMPLATE.md
git commit -m "feat: add SESSION-ANCHOR template for context anchoring"
```

---

### Task 5: 强化 Verifier 提示词

**Files:**
- Modify: `docs/workflow/prompts/verifier.md`

**Step 1: 读取当前 verifier.md**

先读 `docs/workflow/prompts/verifier.md` 确认当前内容。

**Step 2: 在文件末尾追加强化规则**

在 `docs/workflow/prompts/verifier.md` 末尾添加：

```markdown

---

## 强化规则（v2，2026-04-13）

### 必须先执行的机械检查

在开始任何业务验证之前，先做以下操作：

1. **读取 eval-result.json**
   - 路径: `docs/workflow/runs/<run-id>/eval-result.json`
   - 如果文件不存在，先运行: `bash scripts/eval.sh <run-id>`
   - 将 `verdict` 字段值记录到 VerifierReport Section 1

2. **根据 eval verdict 决定后续步骤**

   | verdict | 含义 | 你的行动 |
   |---|---|---|
   | `PASS` | 机械检查全通过 | 正常进行业务验证 |
   | `P1_WARN` | 有警告但不阻断 | 将警告列入 Section 4，继续业务验证 |
   | `P0_FAIL` | 严重失败 | 立即写 P0 缺陷（D-001），NO-GO，停止验证 |

3. **在 VerifierReport Section 1 中增加一行**

   ```
   - Eval script result: <verdict>（from eval-result.json）
   - Eval timestamp: <timestamp>
   ```

### 不需要重复验证的项目

如果 eval-result.json 中某项 status 为 `pass`，VerifierReport 中直接写 `Pass (confirmed by eval.sh)`，不需要手动重跑。
```

**Step 3: 验证修改**

```bash
tail -40 /c/Users/wei.liu/Desktop/cursor_try/QAS/docs/workflow/prompts/verifier.md
```
Expected: 看到新增的"强化规则（v2）"内容

**Step 4: Commit**

```bash
cd /c/Users/wei.liu/Desktop/cursor_try/QAS
git add docs/workflow/prompts/verifier.md
git commit -m "feat: strengthen verifier prompt to integrate eval.sh results"
```

---

### Task 6: 端对端验证（验收检查）

**Files:** 无新文件，仅验证

**Step 1: 确认所有产物存在**

```bash
cd /c/Users/wei.liu/Desktop/cursor_try/QAS
ls -la CLAUDE.md
ls -la .claude/memory/MEMORY.md .claude/memory/project.md .claude/memory/feedback.md
ls -la scripts/eval.sh
ls -la docs/workflow/runs/SESSION-ANCHOR-template.md
```
Expected: 所有文件存在

**Step 2: 验证 CLAUDE.md 包含所有必要区块**

```bash
grep -n "^## " CLAUDE.md
```
Expected: 输出包含以下区块（顺序不限）：
```
## 项目概述
## 技术栈
## 关键文件地图
## 开发命令
## 环境变量说明
## 4+1 工作流规则（强制）
## 禁区（绝对不能改）
## Context 加载顺序
## 跨会话 Memory 约定
```

**Step 3: 验证 eval.sh 脚本语法**

```bash
bash -n scripts/eval.sh
echo "exit: $?"
```
Expected: `exit: 0`

**Step 4: 验证 verifier.md 包含新规则**

```bash
grep -n "eval-result.json" docs/workflow/prompts/verifier.md
```
Expected: 至少 2 行匹配

**Step 5: 最终 git log 确认**

```bash
git log --oneline -6
```
Expected: 看到 5 条新 commit（CLAUDE.md、memory、eval.sh、SESSION-ANCHOR、verifier）

**Step 6: 保存项目记忆**

将以下内容写入 `.claude/memory/project.md`（追加到末尾）：

```markdown

## Harness Enhancement（2026-04-13 完成）
- CLAUDE.md: 根目录，多工具兼容智能体指令
- scripts/eval.sh: 半自动化验证脚本，输出 eval-result.json
- SESSION-ANCHOR: 每个 workflow run 的 context 锚点模板
- memory/: 跨会话记忆文件（project.md + feedback.md）
- verifier.md: 强化为先读 eval-result.json 再做业务验证
```

---

## 验收标准总览

| AC | 描述 | 验证方法 |
|---|---|---|
| AC-1 | 新对话不需要追问项目背景 | 新会话首读 CLAUDE.md 后可直接工作 |
| AC-2 | AI 不改禁区文件 | CLAUDE.md 禁区区块明确列出 |
| AC-3 | 4+1 工作流规则可见 | `grep "Gate" CLAUDE.md` |
| AC-4 | 环境变量区分必须/可选 | CLAUDE.md 环境变量区块有两个表格 |
| AC-5 | build 失败时 exit 1 | `bash scripts/eval.sh test-run; echo $?` |
| AC-6 | eval-result.json 格式固定 | 运行后检查 JSON 结构 |
| AC-7 | Verifier 必须先读 eval-result.json | `grep "eval-result.json" docs/workflow/prompts/verifier.md` |
| AC-8 | 每个 run 包含 SESSION-ANCHOR | SESSION-ANCHOR-template.md 已写入 RUN_TEMPLATE |
| AC-9 | CLAUDE.md 有 Context 加载顺序 | `grep "Context 加载顺序" CLAUDE.md` |
| AC-10 | memory/ 有 project.md + feedback.md | `ls .claude/memory/` |
