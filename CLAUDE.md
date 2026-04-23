# CLAUDE.md — GOBS / QAS 项目智能体运行指南

> 兼容 Claude Code · Cursor · OpenClaw。首次读完后无需再追问项目背景。

---

## 项目概述

- **平台**: GOBS（视频创作分发平台）/ QAS（H5 视频工具套件）
- **服务器**: `43.134.186.196`（腾讯云，SSH ubuntu@43.134.186.196）
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

## 三端一统（强制）

**每次修改完成后，必须保证本地、GitHub、云端服务器三端同步，缺一不可。**
**从现在开始，任何面向线上环境的发布都必须遵守 `staging -> 验证 -> prod`，禁止跳过测试环境直接发正式。**

```
本地代码 → git commit → git push → 本地编译 → 部署 staging → staging 验证通过 → 正式环境发布提示 → 部署 prod → prod 验证 → 恢复 idle
```

- **唯一允许发布的代码来源**：已经 `git push origin main` 的 commit
- **默认发布顺序**：先 `staging`，验收通过后再 `prod`
- **例外条件**：只有用户明确批准“紧急热修直接上正式”时，才允许跳过 `staging` 或缩短正式提示窗口
- **详细 SOP**：见 `docs/guides/2026-04-23-single-owner-staging-prod-release-runbook.md`

### 服务器连接方式

- **Host**: `43.134.186.196`
- **User**: `ubuntu`
- **Auth**: 密码认证（密码在 `h5-video-tool-api/.env` 的 `SERVER_PASSWORD` 字段）
- **SSH 工具**: 本机用 `paramiko`（Python）连接，无需 sshpass/plink

### 服务器目录结构

```
/home/ubuntu/qas-h5/
├── prod/
│   ├── api/
│   ├── frontend/
│   ├── shared-data/
│   └── .env
├── staging/
│   ├── api/
│   ├── frontend/
│   ├── shared-data/
│   └── .env
├── backups/
└── scripts/
```

- 正式环境入口：`http://43.134.186.196`
- 测试环境入口：`http://43.134.186.196:8080`
- PM2 进程名：`qas-api-prod`，运行 `/home/ubuntu/qas-h5/prod/api/index.js`
- PM2 进程名：`qas-api-staging`，运行 `/home/ubuntu/qas-h5/staging/api/index.js`
- 服务器**无 git**，通过 SFTP 上传编译产物部署

### 标准八步部署流程

```bash
# 1. 本地 TypeScript 编译检查
cd h5-video-tool-api && npx tsc --noEmit
cd h5-video-tool && npx tsc --noEmit   # 或 npm run build

# 2. 更新 PRODUCT.md（功能文档 & Changelog）
#    - 在"功能模块总览"章节更新对应功能描述
#    - 在"Changelog"顶部新增版本条目（格式：v0.x — YYYY-MM-DD）
#    - 更新文件末尾的"最后更新"时间

# 3. 提交并推送 GitHub
git add <修改的文件> PRODUCT.md
git commit -m "feat/fix: ..."
git push origin main

# 4. 本地构建产物
cd h5-video-tool-api && npm run build   # → dist/
cd h5-video-tool && npm run build       # → dist/

# 5. 先部署测试环境并完成验收
python scripts/deploy_all.py --target staging
#    打开 http://43.134.186.196:8080 自测
#    确认环境标识、版本号、关键链路、数据隔离都正常

# 6. staging 自测通过后，显式标记“这个 SHA 可以提升到 prod”
python scripts/mark_release_ready.py --updated-by <your-name>

# 7. 发布正式环境（脚本会自动做 release guard checks，并自动切换 preparing -> deploying -> verifying）
python scripts/deploy_all.py --target prod --updated-by <your-name>

# 8. 正式环境验证通过后恢复 idle
python scripts/set_deployment_state.py --target prod --phase idle --updated-by <your-name>
#    紧急热修 / 紧急回滚且已获明确批准时，才允许额外带 --emergency-bypass
```

### 违禁情形

- 不得只改本地、不提交
- 不得只 push GitHub、不部署服务器
- 不得跳过 TypeScript 编译检查直接部署
- 不得跳过 `staging` 验证直接发 `prod`
- 不得在 `staging` 自测后漏掉 `mark_release_ready.py` 直接发 `prod`
- 不得在正式发布前省略发布提示（除非用户明确批准紧急热修）
- 不得在未获明确批准时使用 `--emergency-bypass`
- **不得跳过 PRODUCT.md 更新**（功能文档必须与代码同步）
- 不得在不同电脑上发布不同 commit 且不核对 SHA
- AI 完成每个任务后必须主动执行上述八步，不等用户催

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
- `scripts/.env`（发布机本地配置）
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

> Gate 4（Fix Loop）已并入 Gate 3 的 P0/P1 缺陷修复循环中，编号 5 保留以维持历史兼容。

**Run 目录**: `docs/workflow/runs/YYYY-MM-DD-<feature-name>/`
（`<run-id>` 即本目录名，格式 `YYYY-MM-DD-<feature-name>`，下同。）

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
- 任何 `.env.example` 中未声明的环境变量（新增变量必须先在 `.env.example` 中声明，再在代码中通过 `process.env.XXX` 引用）

### 禁止的操作
- `git push --force`（授权须体现在当前 run 的 `release-decision.md` 中，明确写出 "FORCE PUSH APPROVED"）
- 跳过 Gate（Builder 不能在没有 `planner-spec.md` 的情况下开始）
- 直接改后端底层服务（见上方禁止文件）
- 在代码中硬编码 API Key 或密码

---

## Context 加载顺序

每轮任务开始时，AI 按此顺序加载，**不主动展开其他文件**：

```
1. CLAUDE.md（本文件）                              ← Cursor 自动注入
2. .claude/memory/feedback.md                      ← 行为规则与教训，必读，用于自检
3. docs/TASK-INDEX.md
4. docs/workflow/runs/<run-id>/SESSION-ANCHOR.md   ← 本轮锚点
5. docs/workflow/runs/<run-id>/planner-spec.md
6. SESSION-ANCHOR 中列出的源码文件（仅列出的）
```

> **第 2 步是强制的**：`feedback.md` 记录了历次真实 Bug 的根因与规则，每次任务开始必须读完再动手，用于自检「这次改动是否触犯了已知规则」。

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
