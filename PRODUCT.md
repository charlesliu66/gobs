# GOBS / QAS 功能文档 & Changelog

> 本文件记录平台所有功能模块及其用法，并追踪每次发布的变更历史。
> 维护规则：每次功能上线或 bug 修复后，同步更新 Changelog 章节。

---

## 一、功能模块总览

### 1. 视频生成（AI 短视频）

**入口：** 首页「生成」Tab → `/generate`

**功能：**
- 输入文案/脚本，选择时长、画幅比例（9:16 / 16:9 / 1:1），一键调用 AI 生成短视频
- 支持多后端：Compass/VEO（`veo-2`）、Dreamina、Kling
- 生成完成后可在「历史」页面查看和下载
- 支持封面帧截取

**使用方法：**
1. 进入「生成」页面
2. 填写视频脚本（支持分镜描述）
3. 选择时长（5s / 10s 等）和画幅
4. 点击「生成」，等待完成（异步轮询）
5. 完成后在「历史」或「画廊」查看

---

### 2. AI 分镜工作台（Production Wizard）

**入口：** 首页「项目」→ 「创建项目」→ `/studio/projects` → 进入项目 → `/studio/wizard`

**功能（逐 Step）：**

| Step | 名称 | 功能 |
|---|---|---|
| 1 | 脚本设定 | 输入故事弧、风格参考、角色设定 |
| 2 | 制作清单 | AI 自动生成角色定妆、场景美术、道具清单 |
| 3 | 分镜表 | AI 自动生成逐镜分镜，可手动编辑 |
| 4 | 分镜视频 | 每个分镜生成参考视频（支持即梦多模态、文生视频、图生视频）|
| 5 | 导出 | 将所有分镜视频拼接导出 |

**即梦多模态（Dreamina Multimodal）：**
- 最多 9 张参考图（角色定妆 + 场景 + 道具），自动压缩为 JPEG 768px 以内，避免 TOS 上传失败
- 支持并发提交：多个分镜同时进入队列，UI 显示「排队中」（黄色）/ 「生成中」（琥珀色）状态
- 生成完成视频通过服务 URL（`/api/video/file?path=...`）访问，不会在 localStorage 中存储大体积 data URL

---

### 3. 视频剪辑工作台（Editor）

**入口：** 首页「剪辑」→ `/editor`

#### 3.1 项目管理

- 进入 `/editor` 不再自动创建空项目（只有添加素材后才触发自动保存）
- 顶部栏：项目名输入框（编辑后 3 秒自动保存）+ 保存状态指示
- 「管理项目」按钮：打开项目管理弹窗
  - 项目列表按最近修改排序，显示相对时间（"3分钟前"/"昨天"等）
  - 支持行内重命名（点击「重命名」→ 输入 → 回车/保存）
  - 删除前有确认步骤，不会误删
  - 搜索过滤
  - 「+ 新建剪辑」按钮
- 「新建」按钮：快速新建空项目

#### 3.2 素材库

- 支持上传视频文件（最大 2GB，可在设置中调整）
- 悬停视频卡片 300ms 后弹出预览（静音、自动循环）
- 点击素材即可加入时间轴

#### 3.3 时间轴

- 视频轨（V1）：支持多片段排列
- 音频轨（A1 BGM / A2 配音）
- 文字轨（文字版式）
- 音频波形可视化（蓝紫色波形图背景）
- 拖拽边缘 Trim：拖动片段左/右边缘可精调入出点（裁头/去尾）
- 播放速度实时预览（`<video>.playbackRate` 同步）
- 转场：支持「硬切」和「叠化（crossfade）」，导出时使用 FFmpeg xfade 实现
- 撤销/重做（Ctrl+Z / Ctrl+Shift+Z）

#### 3.4 文字版式

预设样式 8 种：
- `intro-minimal`：片头·简洁居中
- `intro-impact`：片头·冲击紫
- `outro-brand`：片尾·品牌黑框
- `outro-follow`：片尾·关注紫
- `sub-bottom`：字幕·底部
- `sub-top`：字幕·顶部黄
- `sub-highlight`：字幕·高亮
- `title-card`：标题·左侧蓝

#### 3.5 配乐（BGM）

- 支持 AI 生成 BGM（Lyria）
- 可调整音量、BPM、风格
- 导出时支持淡入（1s）/ 淡出（可调 0-3s）

#### 3.6 AI 剪辑 Agent

- 在「Agent」面板输入自然语言指令（"帮我把第 2 段移到第 1 段前"）
- Agent 解析意图并操作时间轴

#### 3.7 导出

- 支持 720p / 1080p / 4K
- 支持 fast / balanced / high 质量
- 服务器端 FFmpeg 合成，SSE 实时进度
- 文字叠加：若服务器 FFmpeg 不支持 `drawtext`（缺少 libfreetype），自动跳过文字轨并提示，不会导出失败

---

### 4. 资产库（Asset Library）

**入口：** 顶部导航「素材库」→ `/asset-library`

- 查看所有已上传视频素材
- 支持删除
- 可预览视频

---

### 5. 历史记录（History）

**入口：** 顶部导航「历史」→ `/history`

- 查看所有 AI 生成任务记录
- 支持下载、删除

---

### 6. 画廊（Gallery）

**入口：** 顶部导航「画廊」→ `/gallery`

- 展示已完成视频的卡片网格
- 可播放、下载

---

### 7. 快拍（Quick Film）

**入口：** 首页「快拍」→ `/quick-film`

- 快速创建短视频，简化版工作流

---

### 8. 平台运营中心

- **舆情监测**（`/risk-sentiment`）：监控社媒舆情
- **运营框架**（`/platform-framework`）：平台策略框架
- **学习实验室**（`/platform-learning-lab`）：内容学习库
- **记忆库**（`/platform-memory`）：平台知识记忆

---

### 9. 账号管理

- **账号设置**（`/settings/accounts`）：绑定平台账号
- **用量监控**（`/settings/usage-monitor`）：查看 API 用量

---

## 二、Changelog

### v0.13 — 2026-04-15

**任务状态机标准化（job-status domain）**

**Refactor:**
- **[domain] 统一 `JobStatus` / `JobErrorCode` 枚举**：新增 `src/domain/job-status.ts`，定义 6 种任务状态（`queued/running/succeeded/failed/timeout/canceled`）和 15 种具名错误码
- **[api] `classifyError()` 工具函数**：自动将任意 Error 对象映射到结构化错误码（覆盖 Dreamina 未登录、Compass 429、Kling 401、超时等场景）
- **[api] Dreamina 错误响应加入 `errorCode`**：`/api/video/dreamina/submit` 和 `/task/:submitId` 的所有失败路径均携带 `errorCode`，前端可精确匹配提示文案（如「即梦未登录」vs「内容审核拦截」）
- **[api] Kling 错误响应加入 `errorCode`**：所有可灵路由 catch 块统一使用 `classifyError`，告别 `'未知错误'` 字符串

---

### v0.12 — 2026-04-15

**路径抽象层（storageResolver）**

**Refactor:**
- **[infra] storageResolver 统一路径入口**：新增 `src/infra/storage/resolver.ts`，定义 20+ 种业务路径类型（`db`、`video-output`、`uploads/editor`、`projects`、`character-library`、`.data` 等），所有业务代码通过 `resolvePath(type, ...segments)` 获取绝对路径
- **[fix] 修复 6 处 `process.cwd()` 旁路**：`assetDb.ts`、`localUpload.ts`、`characterLibrary.ts`、`projects.ts`、`assetIngestService.ts`、`gobsAuthStore.ts`、`riskSentimentService.ts` 全部改用 resolver，消除"更换 API_DATA_DIR 后部分路径不跟随"的隐患
- **[infra] 目录自检扩展**：启动时自检目录新增 `db/` 和 `.data/`

---

### v0.11 — 2026-04-15

**基础架构安全加固 & 运维标准化（批次 0-3）**

**安全修复（紧急）：**
- **[infra] Nginx 路径修复**：服务器 Nginx root 统一指向 `/home/ubuntu/qas-h5/frontend`（最新构建产物），消除"用户访问旧版本"问题（原有 3 份副本，Nginx 指向的不是最新版）
- **[infra] API 端口收敛**：`Express.listen` 绑定地址从 `0.0.0.0` 改为 `127.0.0.1`，外网无法绕过 Nginx 直连 3001 端口
- **[infra] 服务器密钥清理**：从服务器 `.env` 移除 `SERVER_PASSWORD`（SSH 登录密码），该字段仅供本地部署脚本使用

**数据安全：**
- **[infra] assets.db 迁移**：SQLite 素材数据库从混在视频输出目录（`output/assets.db`）迁移到专属目录（`api/db/assets.db`），消除误清理导致数据丢失的风险

**版本可追溯性：**
- **[api] `/api/system/version` 接口**：新增无鉴权版本查询接口，返回 `commitSha`、`branch`、`buildTime`，可随时验证线上运行的是哪个 commit
- **[build] build-info.json 注入**：`npm run build` 自动生成 `dist/build-info.json`，记录 git commit / branch / 构建时间

**部署标准化：**
- **[scripts] 统一部署脚本**：新增 `scripts/deploy_all.py` / `deploy_api.py` / `deploy_frontend.py`，一键完成构建产物上传 + pm2 重启 + 版本一致性验证；前端上传目标目录统一，不再出现多副本问题

**启动自检：**
- **[api] env 校验**：服务启动时自动校验必填环境变量（`COMPASS_API_URL`、`COMPASS_API_KEY`），缺失时 10 秒内报错并明确打印缺失字段名，不再静默异常
- **[api] 目录自检**：启动时自动创建 `output/`、`uploads/`、`uploads/editor/`、`db/` 等必要目录，新环境无需手动初始化
- **[docs] `.env.example` 完善**：补充必填/可选/本地专用三类分区注释，新增 `SERVER_*` 字段的安全说明

---

### v0.10 — 2026-04-14

**视频剪辑三类核心问题修复**

**Bug Fix:**
- **[editor] 不再自动创建空项目**：进入 `/editor` 页面时，只有添加了素材（视频片段、音频、字幕）后才触发自动保存，消除每次进入都产生"未命名剪辑项目"的问题
- **[editor] 项目管理弹窗**：顶部栏「管理项目」按钮打开全功能项目管理弹窗，支持：
  - 最近优先排序 + 相对时间显示（"3分钟前"）
  - 行内重命名（后端新增 PATCH 接口）
  - 删除前确认步骤
  - 项目名搜索过滤
  - 移除了原来无确认的「删除」按钮
- **[editor] 导出不再因文字轨报错退出码 8**：FFmpeg `drawtext` 过滤器在服务器 Linux apt 版本中缺少 `libfreetype` 时，导出流程现在会：
  1. 在 Linux 下自动探测并注入 `fontfile=` 参数（使用系统字体）
  2. 若仍不支持 `drawtext`，捕获错误，跳过文字轨，在进度中显示 ⚠️ 提示，导出正常完成（不含文字层）

---

### v0.9 — 2026-04-14

**即梦分镜视频两类 Bug 修复**

**Bug Fix:**
- **[studio] 参考图压缩**：多张参考图提交即梦时，将 PNG（~2-4MB）压缩为 JPEG（max 768px, quality 0.85，~150-250KB），解决 TOS 上传失败（"upload phase, no file upload"）
- **[studio] 分镜视频显示修复**：即梦生成完成后，API 不再在 JSON 响应中返回完整视频 data URL（~100MB）。改为返回服务 URL（`/api/video/file?path=...`），彻底解决轮询超时和 localStorage 配额溢出问题

---

### v0.8 — 2026-04-13

**即梦并发提交 + 排队状态 UX**

**Feature:**
- **[studio] 并发分镜视频提交**：即梦任务在收到 `submit_id` 后立即释放队列槽（原为等待完整轮询），多个分镜可并发提交和轮询
- **[studio] 排队中 / 生成中 状态**：分镜条和「生成分镜视频」按钮新增「排队等待中…」（黄色）和「即梦提交/生成中…」（琥珀色）两种独立状态

---

### v0.7 — 2026-04-12 至 2026-04-13

**剪辑可用性提升（P0-P1 功能）**

**Feature:**
- **[editor] 音频波形可视化**：时间轴音频片段背景显示 FFmpeg showwavespic 生成的波形图
- **[editor] crossfade 转场导出**：使用 FFmpeg xfade filter 实现叠化转场，不再是硬切
- **[editor] 拖拽边缘 Trim**：时间轴片段左右边缘各有 6px Resize Handle，拖拽可精调入出点
- **[editor] 素材悬停预览**：素材库卡片悬停 300ms 弹出视频预览
- **[editor] BGM 淡入淡出**：导出时 BGM 轨自动加淡入（1s）和淡出（可调 0-3s）
- **[editor] 播放速度实时预览**：设置调速后预览视频同步 playbackRate

---

### v0.6 — 2026-04-11 至 2026-04-12

**稳定性修复**

**Bug Fix:**
- 即梦服务端并发槽（同账号限 1 个并发），多用户安全
- 即梦多模态 TOS 上传瞬时失败自动重试（最多 2 次）
- editor 视频文件鉴权旁路导致黑屏问题修复
- `crypto.randomUUID()` 替换为 HTTP 安全的 fallback，兼容非 HTTPS 环境

---

### v0.5 — 更早版本

- 初版 AI 分镜工作台（5-Step 向导）
- 初版剪辑工作台（时间轴、文字版式、BGM、Agent）
- 即梦 CLI 集成、Kling API 集成
- 用量监控、历史记录、画廊

---

*最后更新：2026-04-15*
