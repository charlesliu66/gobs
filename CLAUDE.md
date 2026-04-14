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
