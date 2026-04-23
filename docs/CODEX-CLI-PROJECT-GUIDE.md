# GOBS / QAS — OpenAI Codex CLI 项目说明

> **用途**：供 **OpenAI Codex CLI**（及兼容 `AGENTS.md` 约定的编码智能体）在本仓库内高效、安全地开发与改动。  
> **与根目录 `AGENTS.md` 的关系**：根目录 `AGENTS.md` 会被 Codex 按项目级指令合并加载（默认有总字节上限）；**本文件为不限篇幅的完整版**，复杂任务请在会话中显式引用本路径或 `@docs/CODEX-CLI-PROJECT-GUIDE.md`。

---

## 1. 项目是什么

| 项 | 说明 |
|----|------|
| **产品** | **GOBS**：视频创作与分发；本仓库实现 **QAS** —— H5 视频工具套件（编辑、素材、多模态生成与生产流） |
| **远程 Git** | `charlesliu66/gobs`，默认分支 `main` |
| **生产环境** | 腾讯云 CVM，示例 IP `43.134.186.196`（SSH `ubuntu@43.134.186.196`），PM2 + Nginx 反代 |

---

## 2. 仓库结构（必读边界）

```
h5-video-tool/          # 前端：React + Vite，构建产出 dist/
h5-video-tool-api/      # 后端：Node + TypeScript + Express，构建产出 dist/
docs/                   # 任务索引、workflow runs、日报等
PRODUCT.md                # 产品说明与 Changelog（功能变更须同步）
scripts/                  # 含 eval.sh 等辅助脚本
.claude/memory/         # 跨会话记忆与 feedback（教训规则）
```

**不要随意递归展开**（除非当前任务的 `SESSION-ANCHOR` 明确要求）：`node_modules/`、`dist/`、`out/`、`output/`、`.git/`、`backups/`。

---

## 3. 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React + Vite（`h5-video-tool`） |
| 后端 | Node.js + TypeScript + Express（`h5-video-tool-api`，开发常用端口 **3001**） |
| 视频生成 | Compass / VEO、Dreamina CLI、可选 Kling 等 |
| 图像生成 | Compass / Imagen（如 gemini-3.x-flash/pro-image） |
| 部署 | 同机双环境部署：PM2（**`qas-api-staging` / `qas-api-prod`**）+ Nginx，发布顺序固定为 **`staging -> 验证 -> prod`** |

---

## 4. 任务启动时的阅读顺序（减少乱翻代码）

1. `docs/DOCS-INDEX.md` — 文档地图（先搞清楚规则、产品、run 文档分别在哪）。  
2. `docs/TASK-INDEX.md` — 任务总览（若不知当前 run，先看此文件）。  
3. `docs/workflow/runs/<run-id>/SESSION-ANCHOR.md` — **本轮目标与允许改动的文件列表**。  
4. `docs/workflow/runs/<run-id>/planner-spec.md` — 需求、验收标准（AC）、风险与测试矩阵。  
5. `h5-video-tool-api/src/routes/`、`h5-video-tool/src/` — 仅在规格指向时深入。  

`<run-id>` 形如：`YYYY-MM-DD-<feature-name>`。

**必读教训**：`.claude/memory/feedback.md`（行为矫正与历史事故，与 CLAUDE.md 中「第 2 步」对应）。

---

## 5. 常用命令

```bash
# 后端
cd h5-video-tool-api
npm run dev       # 开发，默认 3001
npm run build     # tsc → dist/
npm run start     # node dist/index.js

# 前端
cd h5-video-tool
npm run dev
npm run build     # → dist/
npm run lint

# 类型检查（不产出文件）
cd h5-video-tool-api && npx tsc --noEmit
cd h5-video-tool && npx tsc --noEmit

# 与某次 workflow run 对齐的全量验证（Linux/Git Bash）
bash scripts/eval.sh <run-id>
```

**完成改动后的最低验证**：后端 **`npm run build`**、前端 **`npm run build`** 均须 **零错误**（生产可启动依赖于此）。

---

## 6. 环境与密钥（Secrets）

- **本地/服务器配置**：从 `h5-video-tool-api/.env.example` 复制为 `h5-video-tool-api/.env`，在 `.env` 中填写真实值。  
- **发布机配置**：从 `scripts/deploy.env.example` 复制为 `scripts/.env`，按当前电脑填写发布目录、服务器地址、PM2 名称与版本检查地址。
- **禁止**将真实 `.env`、`*.env`（除已提交的 example）、`h5-video-tool-api/dreamina-login.json` 提交到 Git。  
- **禁止**在源码中硬编码 API Key、密码、Token。  
- **新增环境变量**：必须先出现在 `.env.example` 中并有说明，再在代码中用 `process.env.XXX` 读取。

### 6.1 必须配置（否则服务难以正常启动）

| 变量 | 说明 |
|------|------|
| `JWT_SECRET` | JWT 签名密钥；生产须强随机 |
| `COMPASS_API_URL` | 例如内网 Compass API 基址 |
| `COMPASS_API_KEY` | Compass 主 Key（LLM + Imagen 等） |
| `PORT` | 后端端口，默认 `3001` |

### 6.2 常用可选

| 变量 | 说明 |
|------|------|
| `COMPASS_API_KEY2` | 第二把 Key（如 VEO 专用） |
| `COMPASS_VIDEO_MODEL` | 如 `veo-2` |
| `DREAMINA_BIN` | Windows 下 Dreamina 可执行文件路径 |
| `DREAMINA_MAX_CONCURRENT` | 即梦并发，默认常较小（按账号能力调） |
| `API_DATA_DIR` | 生产数据根路径（可指云盘挂载点） |
| `KLING_API_KEY` | 可灵（若接入） |
| `SUNO_API_KEY` | Suno 音乐；不配置可能回退其他实现 |
| `EDITOR_BEAT_ANALYSIS` | `1` 可启用剪辑相关节拍分析 |
| `SERVER_PASSWORD` | 团队脚本连接服务器用（勿提交） |

---

## 7. 禁区（绝对不能改）

以下文件为**后端底层/类型/资产配置锁定区**，除非用户书面同意并走例外流程，**Codex 不得修改**：

- `h5-video-tool-api/src/services/dreaminaVideo.ts`
- `h5-video-tool-api/src/services/klingVideo.ts`
- `h5-video-tool-api/src/services/veoPython.ts`
- `h5-video-tool-api/src/services/studioPipeline.ts`
- `h5-video-tool-api/src/types/productionTypes.ts`
- `h5-video-tool-api/src/config/productionAssets.ts`

**原因**：连锁影响大，且往往依赖真实外部密钥才能验证；改动极易引发线上事故。

**其他禁止**：

- 修改真实 `.env` 文件内容来「绕过」规范（应改 example + 文档说明）。  
- **`git push --force`**：除非当前 run 的 `release-decision.md` 明确包含 `FORCE PUSH APPROVED`。  
- 在没有 `planner-spec.md` 的情况下宣称完成「规格化功能交付」（团队 4+1 流程要求先有计划）。  
- 在代码中写死密钥或密码。

---

## 8. 团队工作流：4+1 门禁（功能类任务）

每个功能建议按门禁推进；**未满足上一关时不要进入下一关**。

| Gate | 角色 | 典型产出 |
|------|------|----------|
| 1 | Planner | `planner-spec.md`（目标、AC、风险、测试矩阵） |
| 1.5 | Challenger | `challenger-review.md` |
| 2 | Builder | `builder-report.md`（AC 与实现对应 + 自测证据） |
| 3 | Verifier | `verifier-report.md`、`eval-result.json` |
| 5 | Integrator | `release-decision.md`（GO / NO-GO） |

Run 目录：`docs/workflow/runs/YYYY-MM-DD-<feature-name>/`。

---

## 9. 交付与文档：PRODUCT.md

- **任何**用户可见功能变更、重要 Bug 修复、性能调整，均应在 `PRODUCT.md` 的 **Changelog** 中新增条目。  
- 版本号以 `PRODUCT.md` 中 **`NEXT_VERSION`** 注释为权威取号器：先 `grep "NEXT_VERSION" PRODUCT.md`，用该版本写条目，再把标记递增；同日热修复可用 `v0.xx` 字母后缀策略（见 feedback 规则 10）。  
- 同步更新「最后更新」等元数据（若文件中有）。

---

## 10. 三端一统（本地 / GitHub / 服务器）

团队规范已经升级为：**代码 → 提交 → 推送 → 本地构建 → 部署 `staging` → `staging` 验证 → 正式提示 → 部署 `prod` → `prod` 验证**。
服务器上多为 **无 git**，部署靠上传**编译后**的 `api` 与 `frontend` 文件；因此发布机必须以 GitHub 上已经存在的 commit 为准。

### 10.1 强制发布规则

- **默认顺序必须是**：`staging -> 验证 -> prod`
- **禁止**跳过测试环境直接发布正式环境
- **禁止**在不同电脑上用不同 commit 做“验证”和“正式发布”
- **允许例外**：只有用户明确批准“紧急热修直接上正式”时，才允许跳过 `staging` 或缩短正式提示窗口
- **单人多电脑 SOP**：见 `docs/guides/2026-04-23-single-owner-staging-prod-release-runbook.md`

典型服务器布局（示例）：

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

- 正式环境：`http://43.134.186.196`
- 测试环境：`http://43.134.186.196:8080`
- PM2 进程：`qas-api-prod`，入口如 `/home/ubuntu/qas-h5/prod/api/index.js`。
- PM2 进程：`qas-api-staging`，入口如 `/home/ubuntu/qas-h5/staging/api/index.js`。
- 连接方式与密码等：见根目录 `CLAUDE.md` / `AGENTS.md`（不把密码写进本文档）。

### 10.2 推荐发布命令

```bash
# 1. 先保证本地与 GitHub 同步
git push origin main

# 2. 本地检查与构建
cd h5-video-tool-api && npx tsc --noEmit && npm run build
cd ../h5-video-tool && npm run build

# 3. 先发测试环境
python scripts/deploy_all.py --target staging

# 4. 测试通过后，先打开正式环境提示
python scripts/set_deployment_state.py --target prod --phase preparing --updated-by <your-name>

# 5. 等待 3~5 分钟后发正式
python scripts/deploy_all.py --target prod
python scripts/set_deployment_state.py --target prod --phase verifying --updated-by <your-name>

# 6. 正式验证完成后恢复空闲
python scripts/set_deployment_state.py --target prod --phase idle --updated-by <your-name>
```

**注意**：纯本地实验可跳过服务器；若用户明确要求「上生产」，必须完整执行上面的双环境流程，且 **TypeScript 构建通过**。

---

## 11. 行为规则与教训摘要（源自 `.claude/memory/feedback.md`）

以下条目为高频事故预防，**与禁区等同重要**。

1. **底层服务文件**：见第 7 节列表，禁止修改。  
2. **`npm run build`**：前后端构建必须零错误再认为完成。  
3. **密钥**：仅环境变量与 example，禁止进源码。  
4. **无规格不开发**：有流程要求的任务需先有 `planner-spec.md`。  
5. **PRODUCT.md**：每次 relevant 改动更新 Changelog。  
6. **数据清理函数**：**禁止**对任意 `data:` 字符串做全局剥离；必须使用**字段名白名单**，递归时传递 `fieldName`，避免误删用户 `imageDataUrl` 等真实资产。  
7. **鉴权白名单**：若在 `auth.ts` 为某路由放行无 JWT，必须检查**路由处理函数内部**是否仍用 `req.user?.username` 做二次校验，避免 `<video>` 403 黑屏等。  
8. **外部 API**：即梦/Compass/Suno 等需覆盖多场景（成功、并发、限流、超时、重启、鉴权失效），不只 happy path。  
9. **端到端**：跨「生成→存储→鉴权→播放」的改动须验证全链路。  
10. **版本号**：严格按 `NEXT_VERSION` 取号，避免并行开发撞版本。  
11. **跨模块导入**：消费端须枚举源端所有 URL/路径格式或统一到解析注册表，避免只支持一种路径。

（完整条目与案例仍请以 `.claude/memory/feedback.md` 为准。）

---

## 12. Codex CLI 使用提示

- **项目级指令**：Codex CLI 会从 Git 根目录向当前工作目录合并 `AGENTS.md` / `AGENTS.override.md` 等；默认有 **`project_doc_max_bytes`**（常约 32KB）总长度限制，过长内容可能被截断。  
- **建议**：根目录 `AGENTS.md` 保持精炼；**细节与长文以本文件为准**，大任务在提示中 `@docs/CODEX-CLI-PROJECT-GUIDE.md` 或粘贴相关章节。  
- **全局指令**（可选）：用户目录 `~/.codex/AGENTS.md` 可放个人习惯，与仓库规范冲突时以**仓库 + 用户确认的 run 规格**为准。

---

## 13. 相关文件一览

| 文件 | 作用 |
|------|------|
| `CLAUDE.md` | Cursor / Claude Code 侧项目指南（与本项目一致） |
| `AGENTS.md` | 多智能体/Codex 根目录摘要 |
| `docs/CODEX-CLI-PROJECT-GUIDE.md` | **本文**：Codex CLI 完整说明 |
| `PRODUCT.md` | 产品与版本记录 |
| `.claude/memory/feedback.md` | 规则与事故教训 |
| `docs/TASK-INDEX.md` | 任务索引 |

---

*文档随仓库演进更新；若与 `SESSION-ANCHOR` / `planner-spec` 冲突，以当前 run 规格为准。*
