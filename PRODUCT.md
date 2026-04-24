# GOBS / QAS 功能文档 & Changelog

> 本文件记录平台所有功能模块及其用法，并追踪每次发布的变更历史。
> 维护规则：每次功能上线或 bug 修复后，同步更新 Changelog 章节。

相关治理文档：
- [CHANGELOG.md](./CHANGELOG.md) — 近期版本流水，后续逐步从 PRODUCT.md 拆出。
- [docs/product/user-journeys.md](./docs/product/user-journeys.md) — 一键成片 / 高级制片 / 分发运营三条用户路径。
- [docs/product/status-model.md](./docs/product/status-model.md) — 用户态任务状态口径。
- [docs/product/data-ownership-invariants.md](./docs/product/data-ownership-invariants.md) — 数据归属不变量。

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
| 2 | 制作清单 | AI 自动生成角色定妆、场景美术、道具清单；角色状态衣橱支持自定义 prompt 生成受伤/童年/换装等多状态变体图 |
| 3 | 分镜表 | AI 自动生成逐镜分镜，可手动编辑 |
| 4 | 分镜视频 | 每个分镜生成参考视频（支持即梦多模态、文生视频、图生视频）|
| 5 | 导出 | 放映室连续审片 + 一键导入剪辑工作台 |

**分镜工作台增强功能（v0.42+）：**
- **高级制片分镜导演规则层（v0.129）**：后端新增统一 `productionStoryboardRules` 规则层，收编 `storyboard-studio`、`video-director` 与项目自定义时长约束；`/api/studio/storyboard-table` 生成阶段会自动注入导演规则，auto-refine 阶段也会校正镜头内容与 `durationSec` 的匹配度，减少明显过碎或过长的 narrative shots。
- **高级制片分镜视频归属与导出状态收口（v0.127）**：批量分镜任务的创建、取消、手动轮询和视频文件访问统一校验当前登录账号；即梦孤儿任务恢复不再注册缺失账号/项目/分镜的任务；导出审片页复用分镜页状态模型，展示已完成、排队/生成、待处理统计和平台排队位次，确保视频只回到对应项目对应分镜的历史里。
- **高级制片生图运行时脚本部署补齐（v0.126）**：后端发布会同步上传 Compass/Imagen Python 生图脚本到 prod/staging 运行时 `scripts/` 目录，覆盖角色定妆、形象状态衣橱、场景/道具图、分镜首帧等共用生图链路，避免线上缺少 `imagen_generate.py`。
- **默认路径瘦身、状态导航与主操作增强（v0.125）**：分镜页默认保留生成视频、批量生成缺失视频、状态和预览；首帧生成、AI 审片、快速调整、连续性检查、A/B 对比等收进“高级工具”；分镜列表支持按待处理、未开始、等待提交、平台排队中、生成中、已完成、失败、已取消筛选，并提供上一镜 / 下一镜导航；状态导航上移到编辑区前，生成分镜视频升级为醒目主 CTA，并提示排队位次；从状态导航选中分镜后会直达主操作区。
- **英文界面深层状态收口（v0.120）**：项目列表、命名弹窗、未命名项目治理、同步批量任务、补全缺图、分镜视频生成/取消/检查等状态提示已接入 `productionWizard.*` key，并改用 locale-aware 时间格式。
- 一键生成所有缺失视频（批量提交至自适应队列）
- AI 自动审片：分镜生成时后端自动优化 Prompt 质量（v0.43 起内置于生成流程）；手动审片仍可用于二次检查
- 快速调整面板：运镜/节奏/光影预设按钮，一键修改结构化参数
- 连续播放审片：全屏按序播放所有镜头，键盘快捷键控制
- 版本 A/B 对比：左右分屏同步播放 + 备注标签
- 分镜间一致性检查：AI 检查相邻镜头连贯性，按严重程度分级展示
- 分镜参数折叠：默认收起字段编辑器，只显示摘要行（v0.43）

**导出页体验（v0.30+）：**
- **放映室**：默认视图，分镜视频串联连续播放；胶片条横向导航，绿点/灰点标注生成状态，蓝色 vN 角标显示多版本数量
- **网格视图**：4 列卡片总览，有视频的镜头直接播放（静帧作 poster）
- **在剪辑器中打开**：一键将已生成分镜视频按顺序导入剪辑工作台，继续精修配音/BGM/转场；自动携带分镜元数据（景别/运镜/主体/动作等）和来源项目双向链接；已有关联剪辑项目时弹窗提示去重；导入后自动弹出引导窗口推荐下一步操作
- **增量同步**（v0.46）：剪辑器顶栏「🔄 同步更新」按钮，对比制片端最新选定版本与剪辑器内版本，差异列表支持勾选批量替换；替换时自动调整时长和后续 clip 位移

**即梦多模态（Dreamina Multimodal）：**
- 最多 9 张参考图（角色定妆/状态图 + 场景 + 道具），自动压缩为 JPEG 768px 以内，避免 TOS 上传失败
- **角色状态感知（v0.54）**：分镜引用角色时自动匹配状态图（受伤/战斗/童年等），优先级：分镜手动覆盖 > 角色默认激活状态 > 定稿形象
- 支持并发提交：多个分镜同时进入队列，并发数通过 `DREAMINA_MAX_CONCURRENT` 配置
- **后端智能轮询 + SSE 推送（v0.35a+）**：即梦任务由服务端后台轮询，视频就绪后 SSE 实时通知前端；关闭浏览器也不丢失生成结果
- 并发超限（ret=1310）自动等待 45s 重试，最终失败给出友好中文提示
- 生成完成视频通过服务 URL（`/api/video/file?path=...`）访问，不会在 localStorage 中存储大体积 data URL

---

### 3. 视频剪辑工作台（Editor）

**入口：** 首页「剪辑」→ `/editor`

#### 3.1 项目管理

- **进入 `/editor` 自动打开最近项目**：有已保存项目时自动通过 URL param `?project=xxx` 打开最近编辑的项目；无历史项目时展示空白编辑器
- 顶部栏：项目名输入框（编辑后 3 秒自动保存）+ 保存状态指示
- 「我的项目 (N)」按钮：显示项目数量，打开项目管理弹窗
  - 项目列表按最近修改排序，显示相对时间（"3分钟前"/"昨天"等）
  - 支持行内重命名（点击「重命名」→ 输入 → 回车/保存）
  - 删除前有确认步骤，不会误删
  - 搜索过滤
  - 「+ 新建剪辑」→ 弹出命名对话框
- 「+ 新建」按钮：点击后弹出**命名对话框**，支持默认名称（含日期时间），回车/点「创建」后生效；Esc 取消

#### 3.2 素材库

- 支持上传视频文件（最大 2GB，可在设置中调整）
- **批量上传（v0.57）**：文件选择器支持多选（Ctrl/Shift 多选），也可直接拖拽多个视频文件到素材区域；上传过程中显示批量队列面板（总进度条 + 每个文件的独立状态/进度），逐个顺序上传并实时更新列表
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

- 支持 AI 生成 BGM：Suno API（主引擎）+ Compass/Lyria（备用引擎），自动 fallback
- 生成完成后显示引擎来源 badge（紫色 Suno / 蓝色 Lyria）
- 高级制片导出到剪辑器时，自动预填制片阶段的音乐风格描述（来自 SoundMusicPlan），一键即可生成匹配配乐
- 可调整音量、BPM、风格
- 导出时支持淡入（1s）/ 淡出（可调 0-3s）

#### 3.6 AI 剪辑 Agent

- 在「Agent」面板输入自然语言指令（"帮我把第 2 段移到第 1 段前"）
- Agent 解析意图并操作时间轴
- **智能剪辑能力（v0.31+）：**
  - 行为细化分类：二级行为体系（primary + secondary + intensity + isTurningPoint）
  - 叙事结构排片：三套模板（经典高光 / 角色故事 / 节奏混剪），自动选择
  - 音乐先行节拍分析：BGM 节拍检测（librosa），段落-情绪对齐剪辑
  - 切点质量优化：动作顶点帧检测 + 镜头运动类型识别
  - 内容多样性约束：同类行为 ≤3 连续、快切慢镜 3:1、首尾片段优选规则
  - 画面-音乐情绪对齐：tension + emotionTag 维度，BGM 段落自动匹配画面张力

#### 3.7 导出

- 支持 720p / 1080p / 4K
- 支持 fast / balanced / high 质量
- 服务器端 FFmpeg 合成，SSE 实时进度
- 文字叠加：启动时预检 FFmpeg 是否支持 `drawtext`（结果缓存），不支持时直接跳过文字层并提示，不报错退出；结果缓存至进程生命周期（不重复检测）

#### 3.8 AI 剪辑 Agent 错误处理

- Compass API 不可达时（服务器出网问题），给出明确提示「AI 服务暂时不可达，请稍后重试」而非原始 `Network Error`
- 浏览器端网络请求失败统一翻译为「无法连接到服务器，请检查网络后重试」

---

### 4. 素材库（Asset Library）

**入口：** 顶部导航「素材库」→ `/asset-library`

- **Tab 导航**：最近使用 / 收藏 / 全部素材 / Google Drive 四个 Tab 切换
- 单页画廊布局：6 列真实缩略图网格（图片 `<img>` / 视频首帧 + 播放按钮）
- **AI 智能分类**：上传时自动识别素材类型（角色/武器道具/场景/UI素材/宣传图/视频片段），生成 30 字以内描述
- **左侧栏**：AI 分类虚拟文件夹（按 category 分组显示数量）+ 自定义文件夹（支持创建/重命名/删除）
- **收藏**：素材卡片星标收藏，收藏 Tab 快速查看
- **拖拽整理**：拖拽素材卡片到左侧文件夹即可归档；选中多个素材后也可批量移动
- **图片悬停放大**：鼠标悬停图片素材 400ms 弹出大图预览浮窗
- **视频悬停播放**：鼠标悬停视频素材自动静音播放
- 右侧详情抽屉：大图预览、文件信息、AI 分类/描述、标签、「用于生成」按钮
- 底部上传面板：拖拽上传，完成后自动关闭并刷新
- 搜索 + 筛选：关键词（文件名 + AI 描述）搜索 + 比例/类型/方向/画质 4 个 dropdown
- **Google Drive 集成**：OAuth 连接后可浏览 Drive 文件，按需缓存到服务器使用
- 多账号数据隔离：不同用户的素材互不可见

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

### 7. 一键成片（Quick Film）

**入口：** 首页「快拍」→ `/quick-film`

**功能：**
- 输入故事主题、主角、风格，AI 自动生成完整分镜脚本
- 支持上传角色/场景参考素材，AI 自动匹配到对应镜头
- 用户可逐镜预览和编辑后确认提交
- **串行提交队列（v0.51）**：确认后只提交第一个分镜到即梦，后续分镜排队等待（`awaiting_submit`），前一个完成后自动提交下一个，避免并发超限（ret=1310）
- **批量取消（v0.51）**：批量任务看板支持「取消全部排队」，一键释放即梦并发位
- 支持保存草稿、会话恢复（刷新不丢失）
- 生成结果在「历史 → 批量任务看板」实时查看

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

### 10. 内部开发与发布工具

- **Repo Private Skills**：仓库内置 `gobs-release-guard` 与 `gobs-h5-smoke-test` 两个私有 skill，分别用于发布门禁检查与 H5 冒烟验证。
- **发布门禁脚本**：`gobs-release-guard/scripts/release_guard.ps1` 支持 `preflight / staging-release / prod-release / post-release` 四种模式，用于统一检查 run 资料、git 对齐、版本接口与 staging verified 条件。
- **冒烟验证脚本**：`gobs-h5-smoke-test/scripts/smoke_http.ps1` 支持 `local / staging / prod` 和 `quick / full` 两种深度，用于快速确认页面、接口、环境标识和部署 SHA 是否符合预期。

---

## 二、Changelog

### v0.129 — 2026-04-24

**Repo 私有发布门禁、H5 冒烟技能与高级制片分镜导演规则层文档补齐**

**Internal / Release Ops:**
- **[repo-private skills] 新增 `gobs-release-guard`**：把 GOBS/QAS 的 `preflight / staging-release / prod-release / post-release` 门禁检查固化为仓库私有 skill，统一读取 `AGENTS.md`、`feedback.md`、`TASK-INDEX.md` 与 run 资料，并通过 PowerShell 脚本输出 `GO / NO-GO / GO WITH WARNINGS`。
- **[repo-private skills] 新增 `gobs-h5-smoke-test`**：支持 `local / staging / prod` 三环境的 `quick / full` 冒烟检查，覆盖首页、关键路由、`/api/system/version`、环境标识与 expected commit 比对，便于发布后快速确认线上实际运行的 SHA。
- **[docs] 补齐私有 skill 设计、实施与 run 产物**：新增 design / implementation plan、run anchor、planner、challenger、builder、verifier、release decision 文档，便于后续继续把发布 SOP 自动化沉淀到项目内。

**Backend / Storyboard:**
- **[docs] 补记并校验现有 `productionStoryboardRules` 规则层**（`h5-video-tool-api/src/services/productionStoryboardRules.ts`）：确认当前主干内的高级制片分镜规则层已经统一沉淀镜头类型/构图/时长基线、`4-15s` 平台约束和候选合并/拆分判断口径，并补齐对应 design / implementation / run 文档。
- **[verify] 确认 `/api/studio/storyboard-table` 与 auto-refine 已接入导演规则上下文**（`h5-video-tool-api/src/routes/studio.ts`）：本轮通过构建与规则层自检命令，验证生成阶段会拼接导演规则，refine 阶段也会校正镜头内容与 `durationSec` 的匹配关系，同时保持 shot 数量不变。
- **[verify] 记录发布构建所依赖的类型安全前置条件**：当前主干中的 `videoKling.ts` 响应头守卫与 `googleDriveService.ts` 显式类型补齐已通过本地严格编译，确保这轮发布验证链路稳定可复现。

### v0.127 — 2026-04-23

**高级制片分镜视频归属与导出状态收口**

**Backend / Ownership:**
- **[backend] 批量分镜任务访问改为严格 owner 校验**（`h5-video-tool-api/src/routes/batchJobs.ts`）：创建、取消、手动轮询和 `/api/batch-jobs/video/:id` 播放均要求当前登录账号与任务 `username` 一致；历史缺失 owner 的任务不再被任意账号读取或操作，避免跨账号/跨项目混入。
- **[backend] 即梦恢复与 Quickfilm 链式排队补账号边界**（`batchJobsQueue.ts`, `dreaminaRecovery.ts`）：Quickfilm 自动提交下一镜时必须同账号同项目；孤儿任务恢复缺少账号、项目或分镜索引时只跳过不注册，防止产生无法归属的分镜视频。

**Frontend / UX:**
- **[frontend] 导出审片页复用分镜状态模型**（`StepExportStoryboardOverview.tsx`）：导出页新增已完成、排队/生成、待处理三组汇总卡，网格视图显示每镜状态、平台排队位次或即梦队列位次，和分镜页口径一致。
- **[test] 新增分镜导出状态与 Quickfilm 队列归属回归**：覆盖导出页状态汇总和同账号同项目链式排队判断。

### v0.126 — 2026-04-23

**高级制片生图脚本部署补齐**

**Ops / Backend:**
- **[ops] 后端部署同步上传 Imagen Python 运行时脚本**（`scripts/deploy_api.py`）：发布 `dist/` 后额外把 `h5-video-tool-api/scripts/imagen_generate.py` 放到 `/home/ubuntu/qas-h5/<env>/scripts/`，匹配运行时代码查找路径，统一修复角色定妆、形象状态衣橱、场景/道具图和分镜首帧等 Compass/Imagen 生图入口线上缺脚本报错。
- **[test] 补充部署脚本回归**（`scripts/tests/test_deploy_api.py`）：覆盖运行时脚本远端目录计算和缺失脚本拦截，避免后续发布再次漏发 `imagen_generate.py`。

### v0.125 — 2026-04-23

**高级制片分镜选择后直达主操作**

**Frontend / UX:**
- **[frontend] 分镜导航选择后平滑定位主操作**（`h5-video-tool/src/studio/steps/StepStoryboardWorkspace.tsx`）：从状态导航或“跳到待处理”选中镜头后自动滚动到当前分镜主操作卡片，让用户更快看到“生成分镜视频 / 重新生成分镜视频”。

### v0.124 — 2026-04-23

**高级制片分镜待处理导航**

**Frontend / UX:**
- **[frontend] 分镜状态导航新增待处理视图**（`h5-video-tool/src/studio/steps/StepStoryboardShotStrip.tsx`）：将未生成、失败、已取消镜头聚合为“待处理”，并新增待处理 / 队列中 / 已完成三组汇总卡。
- **[frontend] 新增跳到待处理快捷操作**（`h5-video-tool/src/studio/steps/StepStoryboardShotStrip.tsx`）：用户可一键选中下一条需要生成或重试的镜头，减少在多分镜网格中搜索。

### v0.123 — 2026-04-23

**高级制片分镜操作区可用性增强**

**Frontend / UX:**
- **[frontend] 分镜状态导航上移**（`h5-video-tool/src/studio/steps/StepStoryboardWorkspace.tsx`, `StepStoryboardShotStrip.tsx`）：状态列表从分镜页底部移到平台状态下方、编辑区上方，批量生成、取消排队、同步状态与分镜导航放在同一操作区，减少上下滚动。
- **[frontend] 生成分镜视频主按钮增强**（`h5-video-tool/src/studio/steps/StepStoryboardGenerateActions.tsx`）：当前分镜生成按钮改为大号主 CTA，按钮内展示提交后会显示排队位次、当前队列位次或重新生成说明；已有视频时文案改为“重新生成分镜视频”。

### v0.122 — 2026-04-23

**高级制片分镜状态标签收口**

**Frontend / UX:**
- **[frontend] 分镜条状态文案改为共享用户态 label key**（`h5-video-tool/src/studio/shotUserStatus.ts`, `h5-video-tool/src/studio/steps/StepStoryboardShotStrip.tsx`）：状态筛选和卡片状态不再维护组件内 switch 文案，统一通过 `productionWizard.status.*` key 展示，降低后续跨页面状态口径漂移风险。
- **[test] 补充分镜用户态状态 label key 回归**（`h5-video-tool/tests/shotUserStatus.test.ts`）：验证平台排队等状态返回稳定 i18n key，并与 helper 暴露的 label key 保持一致。

### v0.121 — 2026-04-23

**高级制片默认路径瘦身与分镜状态导航**

**Frontend / UX:**
- **[frontend] 高级制片默认工具收纳**（`h5-video-tool/src/studio/steps/StepStoryboardWorkspace.tsx`, `StepStoryboardGenerateActions.tsx`）：默认主路径只保留生成分镜视频、批量生成缺失视频、任务状态和预览；首帧生成、AI 审片、快速调整、连续播放、A/B 对比和连续性检查进入“高级工具”。
- **[frontend] 分镜状态列表与导航**（`StepStoryboardShotStrip.tsx`, `shotUserStatus.ts`）：分镜条升级为可筛选状态列表，覆盖未开始、等待提交、平台排队中、正在生成、已完成、失败、已取消，并新增上一镜 / 下一镜与 `[` / `]` 快捷键。
- **[frontend] 角色形象变体简化**（`StepDesignCharactersPanel.tsx`, `CharacterLookTreeCanvas.tsx`, `CharacterPortraitEditorModal.tsx`）：形象演化树默认不再展开，主入口改为“编辑形象变体”，树关系作为高级查看能力保留。
- **[docs] 状态模型、数据归属与用户路径治理文档落地**（`docs/product/*.md`, `CHANGELOG.md`）：为后续跨页面状态统一和 PRODUCT / CHANGELOG 拆分建立基线。

### v0.120 — 2026-04-23

**高级制片项目与分镜状态英文收口**

**Frontend / i18n:**
- **[frontend] 高级制片项目弹窗改为 key 驱动**（`h5-video-tool/src/studio/components/ProductionProjectListModal.tsx`, `h5-video-tool/src/i18n/messages.ts`）：已保存项目、搜索、空状态、治理未命名项目、打开/重命名/删除确认与项目更新时间全部跟随 `uiLocale`，时间格式不再硬编码 `zh-CN`。
- **[frontend] 高级制片运行状态提示补齐英文**（`h5-video-tool/src/pages/ProductionWizard.tsx`）：项目加载失败、命名保存、批量任务同步、补全缺图、重试缺图、风格参考、分镜图/视频生成、取消队列、手动检查进度等 toast / error / confirm 文案统一进入 `productionWizard.*` key。
- **[frontend] 英文内容链路减少中文 prompt 前缀**（`h5-video-tool/src/pages/ProductionWizard.tsx`）：分镜视频提交时追加的光影、色调、整体视觉风格前缀改为跟随界面文案 key，避免英文模式下继续注入中文提示头。
- **[test] 高级制片高频 key 加入回归断言**（`h5-video-tool/src/i18n/locale.test.ts`）：覆盖项目列表、命名弹窗、保存项目后生成分镜视频等英文 key。

### v0.119 — 2026-04-23

**高级制片历史图片回显修复**

**Backend / data migration:**
- **[backend] 高级制片图片读取兼容旧产物目录**（`h5-video-tool-api/src/routes/productionPersist.ts`）：`/api/production/image` 现在会在共享数据目录缺图时回退到历史 `prod/api/output/production/images/<user>` 与旧根目录，避免项目 JSON 迁移后历史角色图、场景图、分镜缩略图 404 图裂。
- **[test] 补充历史图片目录回归测试**（`h5-video-tool-api/tests/productionImagePath.test.ts`）：覆盖“新共享目录为空、旧 prod/api 图片存在”的解析场景。
- **[ops] 线上 prod 已把旧目录 83 张高级制片图片复制回 shared-data**：只补缺失文件，不删除旧文件，历史项目刷新后可恢复图片显示。

### v0.118 — 2026-04-23

**Generate Video 英文表单与写稿提示收口**

**Frontend / i18n:**
- **[frontend] Generate Video 主表单改为 key 驱动**（`h5-video-tool/src/pages/TabGenerate.tsx`, `h5-video-tool/src/i18n/messages.ts`）：页面标题、专家/简洁模式、视频创意描述、多镜头时长、短剧摘要、Pipeline 模板、模型/比例/时长/分辨率、Prompt 操作按钮、素材选择区与 Drive 设置引导改为跟随 `uiLocale`。
- **[frontend] Viral Dance 与短剧写稿提示补齐英文**（`h5-video-tool/src/pages/TabGenerate.tsx`）：TikTok 参考视频输入、动作迁移提示、短剧 drama-creator 写稿要点、猫猫后宫提示、Veo 写稿提示均收进 `generate.*` key，英文模式下展开说明不再整块中文。
- **[frontend] Viral Dance 默认 prompt 跟随内容语言**（`h5-video-tool/src/pages/TabGenerate.tsx`）：当用户选择 English 时，自动预填的 Seedance 动作迁移 prompt 与参考视频说明改为英文，避免英文内容链路里直接插入中文模板。
- **[test] Generate Video 高频 key 加入回归断言**（`h5-video-tool/src/i18n/locale.test.ts`）：覆盖素材匹配、TikTok 参考、Drive 设置引导等新增 key。

### v0.117 — 2026-04-23

**英文本地化第二批 key 库收口（Generate / Production Wizard Shell）**

**Frontend / i18n:**
- **[frontend] 高级制片主壳层改为统一 key 驱动**（`h5-video-tool/src/studio/ProductionWizardShell.tsx`, `h5-video-tool/src/pages/ProductionWizard.tsx`, `h5-video-tool/src/i18n/messages.ts`）：项目标题占位、保存状态、项目列表、Studio 返回入口、清空草稿、步骤条、底部上一步/下一步、footer 引导语、模板名称、排队 ETA 与入队 toast 改为跟随 `uiLocale`，减少进入高级制片后又露中文的体感。
- **[frontend] Generate Video 入口补齐第二批可复用 key**（`h5-video-tool/src/pages/TabGenerate.tsx`, `h5-video-tool/src/i18n/messages.ts`）：Seedance 模型选项、Prompt 风格、短剧摘要写入、素材匹配错误、Prompt 润色状态等先收进 `generate.*` namespace，为后续整页替换打基础。
- **[test] 本地化 key 回归测试覆盖 Generate 与 Production Wizard**（`h5-video-tool/src/i18n/locale.test.ts`）：新增关键英文 key lookup 断言，避免新 namespace 在后续拆页面时漂移或漏配。

### v0.116 — 2026-04-23

**高级制片正式环境历史项目自动归位**

**Bug Fix:**
- **[api] 高级制片项目读取补齐旧目录回退与自动迁移**（`h5-video-tool-api/src/routes/productionPersist.ts`）：正式环境现在会优先从新的 `shared-data/output/production/projects` 读取项目；若历史项目仍在旧的 `api/output/production/projects` 目录，会在 `project/load` 与 `project/list` 时自动归位到新目录，避免发布后出现“项目列表为空 / 项目加载 404 / 页面空白”的问题。
- **[frontend] 失效 `projectId` 不再把高级制片锁死**（`h5-video-tool/src/pages/ProductionWizard.tsx`）：如果本地记住的项目 ID 在当前环境里已经不存在，页面会自动清除失效引用并回到可重新选项目的状态，而不是一直卡在“暂停自动保存以避免覆盖云端数据”的错误页。

### v0.115 — 2026-04-23

**英文本地化第一批 key 库收口（Gallery / History / Batch Jobs）**

**Frontend / i18n:**
- **[frontend] 画廊与历史页改为统一 message key 驱动**（`h5-video-tool/src/i18n/messages.ts`, `h5-video-tool/src/pages/Gallery.tsx`, `h5-video-tool/src/components/GalleryView.tsx`, `h5-video-tool/src/pages/History.tsx`）：`My Videos / Server Files / History / Kling Cloud / Local History / Merge Settings` 等高频次级页面壳层、toast、空状态、筛选项、按钮与提示文案统一收进共享 key 库，英文模式下不再整页掉回中文。
- **[frontend] 批量任务看板补齐英文状态与时间格式**（`h5-video-tool/src/components/BatchJobsBoard.tsx`, `h5-video-tool/src/i18n/messages.ts`）：批量任务摘要、状态标签、取消按钮、导入时间轴、下载视频与提交时间改为跟随 `uiLocale`，并统一使用 locale-aware 时间格式。
- **[frontend] 通用错误与输出文件 helper 收口到 locale-aware 工具层**（`h5-video-tool/src/api/client.ts`, `h5-video-tool/src/components/outputGalleryUtils.ts`）：网络错误 / 请求失败兜底文案改为从字典读取，Dreamina 输出文件名、来源标签与保存到本地历史的 prompt fallback 也不再写死中文。
- **[test] 新增输出画廊本地化 helper 回归测试，并清理旧 preset 残留测试**（`h5-video-tool/src/components/outputGalleryUtils.test.ts`, `h5-video-tool/src/i18n/locale.test.ts`, `h5-video-tool/src/i18n/locale.ts`）：覆盖来源标签、Dreamina 文件名展示、fallback prompt 与 locale 归一化，避免新 key 库和现有语言协议再次漂移。

### v0.114 — 2026-04-23

**高级制片英文翻译链路 JSON 容错兜底**

**Bug Fix:**
- **[api] `replyLocale` 英文翻译结果改为容错解析**（`h5-video-tool-api/src/services/replyLocale.ts`）：高级制片在英文输出模式下，结构化内容的翻译结果现在会先尝试提取平衡 JSON，再用 `jsonrepair` 修复尾逗号、代码块包裹和夹带说明文本，避免翻译层自己的 `JSON.parse` 再把接口打成 500。
- **[api] 英文本地化降级为 best-effort**（`h5-video-tool-api/src/services/replyLocale.ts`）：如果模型这轮翻译输出仍然不可修复，接口会保留原始结构化内容继续返回，而不是因为翻译失败阻断 `storyboard-table / production-design` 主链路。
- **[tests] 新增 replyLocale 脏 JSON 回归测试**（`h5-video-tool-api/tests/replyLocale.test.ts`）：覆盖 fenced JSON、尾逗号和 JSON 前后夹带说明文本场景，确保这次线上报错不会再次回归。

### v0.113 — 2026-04-23

**发布门禁自动化与 staging verified 提升机制**

**Ops / Infra:**
- **[scripts] `deploy_all.py` 升级为带门禁的正式发布入口**（`scripts/deploy_all.py`, `scripts/tests/test_deploy_all.py`）：发布脚本现在会自动阻止 release-scope 脏改动、阻止未 push 到 `origin/main` 的 SHA 发布，并在 `prod` 发布前强制校验“当前本地 SHA = staging 线上 SHA = staging 已验证 SHA”；同时 `prod` 发布会自动切换 `preparing -> deploying -> verifying`，并把版本不一致从旧的 warning 提升为硬失败。
- **[scripts] 新增 staging 验证确认脚本**（`scripts/mark_release_ready.py`, `scripts/release_guard.py`, `scripts/tests/test_release_guard.py`）：你在测试环境自测通过后，可以显式把当前 staging 版本标记为“可提升到正式”的 release-ready SHA，后续 prod 只允许提升这个 SHA。
- **[scripts] 后端部署补齐 PM2 online 硬检查**（`scripts/deploy_api.py`, `scripts/tests/test_deploy_api.py`）：如果 PM2 重启后不是 `online` 或根本没找到目标进程，部署会直接失败，不再把“重启了但没起来”误判为成功。
- **[docs] 发布 Runbook 与项目级规则同步更新**（`docs/guides/2026-04-23-single-owner-staging-prod-release-runbook.md`, `AGENTS.md`, `CLAUDE.md`, `docs/CODEX-CLI-PROJECT-GUIDE.md`, `docs/plans/2026-04-23-release-guard-automation-plan.md`）：仓库内现在明确写清 staging 自测、mark ready、一键 prod、紧急 bypass 的边界和操作方式。

### v0.112 — 2026-04-23

**双环境发布规则固化到项目级指令**

**Ops / Governance:**
- **[docs] `AGENTS.md` / `CLAUDE.md` 改成 staging-first 强制口径**：项目级指令现在明确要求所有线上发布必须先发 `staging`、完成验证、再发 `prod`，并补齐双环境目录、双 PM2 进程、正式提示窗口和禁止直发正式的规则。
- **[docs] `docs/CODEX-CLI-PROJECT-GUIDE.md` 补齐长版双环境发布说明**：把单人多电脑发布、`scripts/.env`、推荐命令和例外条件一起写进 Codex 长文档，后续换电脑或换智能体时也会默认遵守同一套流程。

### v0.111 — 2026-04-23

**单人多电脑发布 Runbook 与状态切换脚本**

**Ops / Infra:**
- **[scripts] 新增本地发布状态切换脚本**（`scripts/set_deployment_state.py`, `scripts/tests/test_set_deployment_state.py`）：现在可以在任意已配置发布凭据的电脑上，用命令直接查看或切换 `staging/prod` 的 `idle / preparing / deploying / verifying` 状态，不需要再手工 SSH 改服务器文件。
- **[scripts] 新增每台发布电脑的本地配置样板**（`scripts/deploy.env.example`）：把部署目录、PM2 名称、版本检查地址和服务器连接信息收口成一份可复制样板，方便你在不同电脑上快速准备发布环境，同时继续保持真实凭据不入 Git。
- **[docs] 新增单人多电脑发布 Runbook**（`docs/guides/2026-04-23-single-owner-staging-prod-release-runbook.md`, `docs/DOCS-INDEX.md`）：把“开发 -> 测试环境 -> 正式环境 -> 发布提示 -> 回滚 -> 换电脑重发”的完整流程固定成文档，后续发版不再靠记忆和临时口头约定。

### v0.110 — 2026-04-23

**高级制片制作清单 JSON 解析兜底**

**Bug Fix:**
- **[api] `production-design` 增加解析失败自动重试兜底**（`h5-video-tool-api/src/routes/studio.ts`, `h5-video-tool-api/src/services/productionDesignFallback.ts`）：当高级制片 Step 3「角色·场景·道具」里的制作清单生成因模型返回脏 JSON 失败时，路由层现在会识别 JSON 解析类错误并自动走一轮更严格的 fallback 生成，而不是把底层 `JSON.parse` 异常直接抛回前端红条。
- **[api] 新增 production-design 修复解析器与默认值归一化**（`h5-video-tool-api/src/services/productionDesignFallback.ts`）：支持修复带代码块包裹、尾逗号、前后说明文本的 L2 输出，同时为缺失的 `wardrobe / props / sets / lighting / soundMusic` 字段补齐安全默认值，降低模型偶发格式波动对页面可用性的影响。
- **[tests] 新增 malformed JSON 回归测试**（`h5-video-tool-api/tests/productionDesignFallback.test.ts`）：覆盖 fenced JSON、尾逗号和缺字段场景，确保这类截图里的报错不会因为后续调整再次回归。

### v0.109 — 2026-04-23

**测试 / 正式双环境部署基础能力首批落地**

**Feature / Infra:**
- **[api] 系统版本接口补齐环境信息，并新增部署状态读取能力**（`h5-video-tool-api/src/routes/system.ts`, `h5-video-tool-api/src/services/deploymentState.ts`）：`/api/system/version` 现在会返回当前运行环境，前端可明确区分 `staging/prod`；同时新增 `/api/system/deployment-state`，用于公开读取当前环境的发布提示状态。
- **[api] 管理员可读写部署状态**（`h5-video-tool-api/src/routes/adminSystem.ts`, `h5-video-tool-api/src/index.ts`）：新增 `/api/admin/deployment-state` 的管理员读写接口，用于在正式发布前切换“即将发布 / 发布中 / 验证中 / 空闲”这些状态，不再依赖手工改代码或临时口头通知。
- **[frontend] Layout 新增全局发布公告条与环境版本展示**（`h5-video-tool/src/components/Layout.tsx`, `h5-video-tool/src/utils/deploymentBanner.ts`）：主站会轮询部署状态，在发布窗口顶部显示全局提醒；底部版本文案也会带上环境标签，避免自测时误把测试环境当正式环境。
- **[scripts] 部署脚本改为目标环境化，移除仓库内硬编码正式目录/密码**（`scripts/deploy_config.py`, `scripts/deploy_all.py`, `scripts/deploy_api.py`, `scripts/deploy_frontend.py`, `scripts/tests/test_deploy_config.py`, `h5-video-tool-api/.env.example`）：部署脚本现支持 `--target staging|prod`，远端目录、PM2 名称、版本检查地址和连接凭据统一从本地未提交环境变量读取，为同机双环境部署打基础，也收掉了脚本里硬编码连接信息的安全风险。
- **[tests] 新增部署状态与部署脚本回归测试**（`h5-video-tool-api/tests/deploymentState.test.ts`, `h5-video-tool/tests/deploymentBanner.test.ts`, `scripts/tests/test_deploy_config.py`）：覆盖部署状态默认值、环境识别、banner 文案回退、runtime 版本格式化，以及 `staging/prod` 部署配置解析，避免后续发布能力回退。

### v0.108 — 2026-04-23

**剪辑器 / 高级制片未命名项目治理与草稿转正收口**

**Feature / UX Polish:**
- **[frontend] 剪辑器改为“草稿先行 + 转正强制命名”**（`h5-video-tool/src/editor/hooks/useTimelineState.ts`, `h5-video-tool/src/pages/EditorWorkbench.tsx`, `h5-video-tool/src/utils/projectLifecycle.ts`）：进入剪辑器时不再立刻生成正式“未命名剪辑项目”；只有在素材、时间轴或 Agent 结果形成有效内容时，才会拦一次命名，命名完成后才进入正式项目列表并开始自动保存。
- **[frontend] 剪辑器项目管理新增未命名治理入口**（`h5-video-tool/src/editor/components/EditorProjectManager.tsx`）：项目弹窗现在支持搜索，并新增“治理未命名项目”，会按“空项目删除 / 有内容项目智能重命名”的规则批量收口历史遗留的未命名剪辑项目。
- **[frontend] 高级制片改为“本地草稿优先 + 首次云端保存强制命名”**（`h5-video-tool/src/pages/ProductionWizard.tsx`, `h5-video-tool/src/studio/components/ProductionProjectListModal.tsx`, `h5-video-tool/src/api/production.ts`, `h5-video-tool/src/utils/projectLifecycle.ts`）：高级制片进入页面后先工作在本地草稿态，不会因空标题自动写入服务端；当故事、分镜或参考素材形成有效内容时，系统会要求先命名，命名后才进入服务端项目列表。项目列表也补齐了搜索、重命名、删除和未命名治理入口。
- **[api] 前后端统一新增正式保存守卫**（`h5-video-tool-api/src/routes/editorProjects.ts`, `h5-video-tool-api/src/routes/productionPersist.ts`, `h5-video-tool-api/src/services/projectPersistenceGuards.ts`）：后端现在会拒绝“首次正式保存但仍为空名”的剪辑/制片项目，同时保留已存在旧项目的兼容更新路径，避免历史未命名项目被误伤。
- **[tests] 新增统一项目生命周期回归测试**（`h5-video-tool/tests/projectLifecycle.test.ts`, `h5-video-tool-api/tests/projectPersistenceGuards.test.ts`）：覆盖“有效草稿判定、命名门槛、智能命名建议、未命名治理动作、保存守卫”这些关键规则，防止后续再回退成一进页面就堆未命名项目。

### v0.107 — 2026-04-23

**我的成片服务端文件补回提示词摘要**

**Bug Fix / UX Polish:**
- **[api] 服务端文件列表新增 `promptSummary` 回填**（`h5-video-tool-api/src/routes/video.ts`, `h5-video-tool-api/src/services/outputGalleryService.ts`, `h5-video-tool-api/src/services/batchJobsQueue.ts`, `h5-video-tool-api/src/services/dreaminaRecovery.ts`）：后端现在会先按服务端文件里的 dreamina submitId，回查当前账号名下的 batch-jobs 和 dreamina intents，优先选最完整的提示词摘要随列表返回，避免“明明是自己的成片，列表里却只剩服务端路径”。
- **[frontend] 从服务端文件保存到我的成片时优先落真实提示词**（`h5-video-tool/src/components/GalleryView.tsx`, `h5-video-tool/src/components/outputGalleryUtils.ts`, `h5-video-tool/src/api/video.ts`）：服务端文件卡片直接展示回填出的提示词摘要；点击“保存到我的成片”时会优先写入这份摘要，只有在完全查不到归属 prompt 时才退回 `[服务端成片] path` 占位文案。
- **[tests] 新增 prompt summary 回归测试**（`h5-video-tool-api/tests/outputGalleryService.test.ts`, `h5-video-tool/tests/outputGalleryUtils.test.ts`）：覆盖“同一 submitId 取最高优先级 prompt 摘要”和“保存历史时优先使用 promptSummary”两条规则，防止后续再退回只存路径。

### v0.106 — 2026-04-23

**我的成片即梦回补改为按账号归属补回**

**Bug Fix / Ownership Boundary:**
- **[api] `dreaminaRecentSync` 只回补当前账号有归属证据的 submitId**（`h5-video-tool-api/src/services/dreaminaRecentSync.ts`, `h5-video-tool-api/src/services/dreaminaRecovery.ts`）：服务端文件页的“即梦最近成片回补”不再直接扫共享即梦账号的所有成功任务，而是先从当前 GOBS 用户名对应的 batch-jobs 和 dreamina intents 里提取已知 submitId，再只补回这些明确属于当前账号的即梦成片。
- **[api] 新增 owner-gated 回补测试**（`h5-video-tool-api/tests/dreaminaRecentSync.test.ts`）：覆盖“只允许明确 owned 的 submit key 进入回补候选”的规则，防止后续再次把别人的即梦成片补进当前账号目录。

### v0.105 — 2026-04-23

**我的成片服务端文件支持隐藏、搜索与筛选**

**Feature / UX Polish:**
- **[api] 服务端文件列表新增搜索 / 来源 / 时间 / 视图过滤协议**（`h5-video-tool-api/src/routes/video.ts`, `h5-video-tool-api/src/services/outputGalleryService.ts`, `h5-video-tool/src/api/video.ts`）：`/api/video/output-recent` 现在支持按关键字、来源、近几天和“正常列表 / 已隐藏”视图筛选，并返回当前账号的隐藏计数，前端不再只能被动展示整包目录结果。
- **[api] 新增服务端文件“仅当前账号隐藏 / 恢复显示”能力**（`h5-video-tool-api/src/routes/video.ts`, `h5-video-tool-api/src/services/outputGalleryService.ts`）：隐藏状态按当前 GOBS 用户单独持久化，不删除物理 mp4，也不影响即梦后台；即梦文件按 submit key 生成稳定隐藏键，避免同一成片换路径后又重新冒出来。
- **[frontend] 画廊服务端文件页补齐搜索框、来源/时间/保存状态筛选和已隐藏视图**（`h5-video-tool/src/components/GalleryView.tsx`, `h5-video-tool/src/components/outputGalleryUtils.ts`）：运营同学现在可以更快找到即梦回补片、过滤已保存/未保存片，并在当前账号下隐藏不想再看的服务端文件。
- **[tests] 新增 output gallery 过滤与隐藏回归测试**（`h5-video-tool-api/tests/outputGalleryService.test.ts`, `h5-video-tool/tests/outputGalleryUtils.test.ts`）：覆盖来源判定、隐藏视图、关键词/时间过滤和前端筛选 query 规则，防止后续把这块可用性能力再改回去。

### v0.104 — 2026-04-23

**高级制片分镜平台排位可见化**

**Feature / UX Polish:**
- **[frontend] 分镜操作区、预览面板和顶部摘要统一展示“平台排队第 N 位”**（`h5-video-tool/src/studio/steps/StepStoryboardGenerateActions.tsx`, `StepStoryboardPreviewPanel.tsx`, `StepStoryboardWorkspace.tsx`）：当前镜头处于 `awaiting_submit` 时，用户会直接看到自己在平台共享队列中的具体排位和预计开始时间，不再只看到“前方还有几个”或模糊的“等待调度中”。
- **[frontend] 分镜缩略图条为等待平台调度的镜头新增位次角标**（`h5-video-tool/src/studio/steps/StepStoryboardShotStrip.tsx`）：镜头卡片在平台队列阶段会直接带 `平台#N` 角标，用户扫一眼就能知道哪些镜头还在平台排队。
- **[frontend] 分镜视频状态文案改成“排队会自动继续，完成会自动回写”**（`h5-video-tool/src/studio/steps/StepStoryboardGenerateActions.tsx`, `StepStoryboardPreviewPanel.tsx`）：统一澄清“平台排队 → 已提交即梦 → 正在生成”的阶段，并去掉“请勿关闭本页”这种误导性提示，避免用户误以为离开页面后任务就不会继续。

### v0.103 — 2026-04-23

**剪辑 Agent 英文请求校验兜底**

**Bug Fix / Resilience:**
- **[api] Build 阶段补充精确 ID 参考**（`h5-video-tool-api/src/services/editorAgentService.ts`）：给 Timeline JSON 生成阶段追加 `selectedAssetIds / assets / candidateWindows` 参考块，明确要求逐字复用 `assetId` 和 `candidateWindow.id`，减少英文请求时模型把素材 ID 改写成文件名或描述后被校验清空的情况。
- **[api] 候选窗重建兜底收口 sanitize 全过滤场景**（`h5-video-tool-api/src/services/editorAgentTimelineFallback.ts`, `h5-video-tool-api/src/services/editorAgentService.ts`）：当模型挑出的 clip 在最终校验后全部被过滤时，服务端会自动用候选窗重建 `v1/a1` 时间轴，而不是直接返回 “every candidate clip was filtered out during validation”。
- **[tests] 新增剪辑候选窗 fallback 回归测试**（`h5-video-tool-api/tests/editorAgentTimelineFallback.test.ts`）：覆盖“按候选窗轮转生成片段”和“sanitize 清空后可恢复有效时间轴”两条回归路径。

### v0.102 — 2026-04-22

**高级制片 / 剪辑工作台主壳层英文 UI 收口**

**Feature / UX Polish:**
- **[frontend] 高级制片主路径补齐英文壳层**（`h5-video-tool/src/pages/ProductionWizard.tsx`, `h5-video-tool/src/studio/ProductionWizardShell.tsx`, `h5-video-tool/src/studio/steps/StepInput.tsx`, `StepStoryArc.tsx`, `StepDesignHeader.tsx`, `StepDesignActions.tsx`, `StepStoryboard*.tsx`, `StepExportWorkspace.tsx`）：项目头部、步骤导航、输入与大纲页、设计工作台头部、分镜工作台按钮/状态、分镜预览和导出页签全部接入 `uiLocale`，英文界面下的主流程不再被中文按钮和状态打断。
- **[frontend] 剪辑工作台主壳层与 Agent 面板补齐英文 UI**（`h5-video-tool/src/pages/EditorWorkbench.tsx`, `h5-video-tool/src/editor/components/AgentPanel.tsx`, `AgentMemoryPanel.tsx`, `EditorProjectManager.tsx`, `ImportGuideModal.tsx`, `SyncProductionModal.tsx`）：右侧 Agent、项目弹窗、导入/同步提示、顶部项目操作区和 onboarding 统一支持英文壳层，英文用户可以独立完成“导入 → Agent 沟通 → 预览/编辑”的主路径。
- **[frontend] 新增轻量 `uiText` helper 与共享运行状态英文回退**（`h5-video-tool/src/i18n/uiText.ts`, `h5-video-tool/src/components/RunningStatus.tsx`）：为渐进式英文化提供最小共用 helper，并让 `RunningStatus` 在英文模式下显示英文 inline 状态、关闭中文剧场轮播，避免处理中状态再次掉回中文。

### v0.101 — 2026-04-22

**高级制片分镜视频跨项目历史归位**

**Production Wizard / Storyboard Video Versions:**
- **[api] 保存/加载项目时不再只做“错项目版本清理”，而是先判断每条分镜视频的真实 owner 再归位**（`h5-video-tool-api/src/routes/productionPersist.ts`）：后端现在会优先结合 `batchJobId`、`sourceProjectId / sourceShotIndex`，以及跨项目同 `version.id` 的唯一命中结果，判断该版本真正属于哪个项目、哪个镜头。
- **[api] 错挂到别的项目/镜头下的版本会自动写回对应 owner shot 的历史列表**（`h5-video-tool-api/src/routes/productionPersist.ts`）：只有当目标项目和目标镜头都存在时，版本才会从错误位置移走；这样修复的是“归位”，不是“删历史”。
- **[api] 归位后的项目文件会同步落盘，但不会伪造用户编辑时间**（`h5-video-tool-api/src/routes/productionPersist.ts`）：被修正到的目标项目会一起持久化，侧边项目列表的 `updatedAt` 不会因为系统自修复而被误刷新。

### v0.100 — 2026-04-22

**高级制片分镜视频项目归属隔离与脏版本清理**

**Production Wizard / Storyboard Video Versions:**
- **[frontend] 本地高级制片草稿开始记录所属项目 id，只允许同项目回灌分镜视频版本**（`h5-video-tool/src/pages/ProductionWizard.tsx`, `h5-video-tool/src/studio/productionWizardStorage.ts`）：修复之前全局单份 localStorage 草稿按 `shotIndex` 直接 merge，导致 A 项目的分镜视频被带进 B 项目的问题。
- **[frontend] 项目加载时会按版本归属和 batch-job 归属清理错项目视频版本**（`h5-video-tool/src/pages/ProductionWizard.tsx`, `h5-video-tool/src/studio/productionTypes.ts`, `h5-video-tool/src/studio/productionWizardStorage.ts`）：分镜时间线现在会优先保留属于当前 `projectId + shotIndex` 的版本，把明显来自其他项目的 batch-job 视频和旧缓存版本挡在入口之外。
- **[frontend+api] 新生成的视频版本会写入 `sourceProjectId / sourceShotIndex / batchJobId`，服务端保存与加载时也会做归属校验**（`h5-video-tool/src/pages/ProductionWizard.tsx`, `h5-video-tool-api/src/services/batchJobsQueue.ts`, `h5-video-tool-api/src/routes/productionPersist.ts`）：即使旧客户端或本地脏状态再次把错版本带上来，后端也会尽量在持久化前拦住，不再继续污染项目 JSON。

### v0.99 — 2026-04-22

**高级制片 / 剪辑 Agent / 视频分发主链路补齐语言跟随**

**Core Reply Locale / i18n Follow-up:**
- **[frontend+api] 新增 `replyLocale` 检测与透传链路**（`h5-video-tool/src/i18n/replyLocale.ts`, `h5-video-tool-api/src/services/replyLocale.ts`, `h5-video-tool/src/api/studio.ts`, `h5-video-tool/src/api/editor.ts`, `h5-video-tool/src/api/editorCreative.ts`）：三条主链路现在会优先根据本轮用户输入文本判断回复语言，并以 `contentLocale` 作为兜底，不再只看界面语言。
- **[frontend] 高级制片请求开始显式携带 `replyLocale`**（`h5-video-tool/src/pages/ProductionWizard.tsx`, `h5-video-tool/src/i18n/locale.ts`）：剧本大纲、制片清单、分镜表、角色反解析、风格反解析和提示词组装都会按当前输入语言请求结果，同时修复 `contentLocale` 持久化读取逻辑，避免内容语言被 UI 语言强制覆盖。
- **[api] 高级制片路由层补齐结果本地化**（`h5-video-tool-api/src/routes/studio.ts`）：在不改动底层 `studioPipeline.ts` 的前提下，`story-arc / production-design / storyboard-table / extract-* / assemble-prompts` 会按 `replyLocale` 对结构化结果做后处理翻译，让英文用户能先跑通核心剧本生成链路。
- **[frontend+api] 剪辑 Agent 聊天与 apply 主链路开始跟随用户语言**（`h5-video-tool/src/pages/EditorWorkbench.tsx`, `h5-video-tool-api/src/routes/editorAgent.ts`, `h5-video-tool-api/src/services/editorAgentChat.ts`, `h5-video-tool-api/src/services/editorAgentService.ts`, `h5-video-tool-api/src/services/editorCreativeBrief.ts`）：聊天回复、默认 brief、创意策略、进度文案和剪辑总结现在都会优先使用当前用户消息的语言。
- **[frontend+api] 视频分发 `DEFAULT` 语言改为跟随当前输入内容**（`h5-video-tool/src/pages/TabDistribute.tsx`, `h5-video-tool-api/src/routes/prompt.ts`）：分发文案默认语言不再硬编码为 `EN`，而是根据当前 caption / hashtags / 原始输入自动判断中英文。

### v0.98 — 2026-04-22

**高级制片分镜状态与已生成视频口径重新收口**

**Production Wizard / Storyboard Status:**
- **[frontend] 分镜条、右侧生成操作区、预览面板统一改成“真实视频优先，旧 pending submitId 只作无视频兜底”**（`h5-video-tool/src/studio/steps/StepStoryboardShotStrip.tsx`, `h5-video-tool/src/studio/steps/StepStoryboardGenerateActions.tsx`, `h5-video-tool/src/studio/steps/StepStoryboardPreviewPanel.tsx`, `h5-video-tool/src/studio/steps/StepStoryboardWorkspace.tsx`, `h5-video-tool/src/studio/productionTypes.ts`）：当镜头已经有可播放视频时，不再因为历史残留的 `pendingVideoSubmitId` 被误显示成“生成中”，导出页与分镜页对同一镜头的状态口径重新一致。
- **[frontend] 项目加载后会按当前 batch-jobs 自动清理失效的 `pendingVideoSubmitId`**（`h5-video-tool/src/pages/ProductionWizard.tsx`）：如果后台已经判定任务完成/失败/取消，或该镜头已经有真实视频，前端会主动把旧 submitId 清掉，并触发一次服务器回写，避免刷新后旧状态再次复活。
- **[frontend] 服务端项目与本地缓存合并时，不再把“已有视频镜头”的本地旧 submitId 回灌到最新项目**（`h5-video-tool/src/studio/productionWizardStorage.ts`）：修复刷新/重进高级制片后，已完成镜头又被错误标成后台生成中的根因。

### v0.97 — 2026-04-22

**剪辑 Agent 记忆面板与可控修正上线**

**Editor Agent / Memory / Controls:**
- **[frontend] 右侧 Agent 面板新增 `Agent 记忆` 区块**（`h5-video-tool/src/editor/components/AgentMemoryPanel.tsx`, `h5-video-tool/src/editor/components/AgentPanel.tsx`, `h5-video-tool/src/pages/EditorWorkbench.tsx`）：现在会直接展示当前项目沉淀出的偏好、负向偏好、稳定事实、开放问题，以及跨项目复用的用户级沟通画像，市场同学和剪辑师都能看到系统“记住了什么”。
- **[frontend+api] 支持手动“记住这个偏好 / 不要再这样做”**（`h5-video-tool/src/api/editorMemory.ts`, `h5-video-tool-api/src/routes/editorAgent.ts`, `h5-video-tool-api/src/services/editorMemoryControls.ts`）：用户可以把当前输入草稿直接沉淀为项目记忆，不用再等多轮对话才让系统学会。
- **[frontend+api] 支持删除项目记忆项和减弱用户画像维度**（`h5-video-tool/src/editor/components/AgentMemoryPanel.tsx`, `h5-video-tool-api/tests/editorMemoryControls.test.ts`, `h5-video-tool/tests/agentMemoryPanel.test.tsx`）：错记的偏好可以当场删除，过强的沟通画像也能降成更弱提示，避免错误长期污染后续剪辑。

### v0.96 — 2026-04-22

**剪辑 Agent 记忆压缩与上下文注入落地**

**Editor Agent / Memory / Prompt Assembly:**
- **[api] 新增 `editorMemoryCompression` 压缩服务**（`h5-video-tool-api/src/services/editorMemoryCompression.ts`, `h5-video-tool-api/tests/editorMemoryCompression.test.ts`）：后端现在会把项目记忆拆成稳定事实、偏好、负向偏好、开放问题、决策记录和最近 10 轮原始对话，并把低置信度用户画像降级成 weak hints。
- **[api] 剪辑 Agent 提示词开始注入记忆上下文**（`h5-video-tool-api/src/services/editorAgentService.ts`）：在 Plan 阶段会把项目记忆块和用户级沟通画像块插入到 creative brief 之后、当前时间轴之前，并明确“当前用户请求与最近明确指令高于历史记忆”。
- **[api] `apply` 链路开始透传 `projectMemory`**（`h5-video-tool-api/src/routes/editorAgent.ts`）：前端当前项目里已经沉淀的记忆会真正进入本次剪辑请求，不再只保存在工程 JSON 里而没有参与模型推理。

### v0.95 — 2026-04-22

**视频分发账号支持直达主页链接**

**Feature / UX Upgrade:**
- **[api] GeeLark 账号配置与批次结果开始透传 `profileUrl`**（`h5-video-tool-api/src/services/geelark.ts`）：`/api/geelark/accounts` 和 `/api/geelark/publish` 现在都会把账号配置中的主页地址一起返回，前端无需再自行猜测 handle 或拼接 TikTok 主页 URL。
- **[frontend] 分发账号列表与发布结果卡新增“主页/Profile”入口**（`h5-video-tool/src/pages/TabDistribute.tsx` + `h5-video-tool/src/api/geelark.ts` + `h5-video-tool/src/utils/geelarkPublishBatch.ts` + `h5-video-tool/src/i18n/messages.ts`）：只要账号配置里存在 `profileUrl`，用户就能在勾选账号时或查看最近一次发布结果时一键打开该账号主页，自行查看 profile 信息。
- **[test] 新增 `profileUrl` 透传回归测试**（`h5-video-tool-api/tests/geelarkAccounts.test.ts` + `h5-video-tool/tests/geelarkPublishBatch.test.ts`）：覆盖账号列表和“提交中”批次预览都能保留主页链接，避免后续又把字段丢在后端到前端的链路中。

### v0.94 — 2026-04-22

**剪辑 Agent 记忆系统 P0 首批落地**

**Editor Agent / Memory / Project Persistence:**
- **[api] 新增 `editorAgentMemory` 类型层与默认归一化**（`h5-video-tool-api/src/types/editorAgentMemory.ts`, `h5-video-tool-api/tests/editorAgentMemorySchema.test.ts`）：后端现在有了项目记忆、用户级沟通画像、摘要快照的统一结构，旧项目缺失字段时也会自动补齐为合法 memory。
- **[api] 新增 `editorAgentMemoryStore` 规则层**（`h5-video-tool-api/src/services/editorAgentMemoryStore.ts`, `h5-video-tool-api/tests/editorAgentMemoryStore.test.ts`）：支持原始事件追加、最近 N 轮截断、结构化偏好沉淀，以及把 memory 与剪辑项目 JSON 一起读写。
- **[frontend+api] 剪辑项目开始随工程保存/打开 `memory`**（`h5-video-tool/src/editor/hooks/useTimelineState.ts`, `h5-video-tool/src/api/editor.ts`, `h5-video-tool-api/src/routes/editorProjects.ts`）：同一个项目里的 Agent 对话和结构化记忆不再只存在页面内存里，项目重新打开时可以恢复最近对话。
- **[api] 新增 `editorUserProfileService` 用户级沟通画像服务**（`h5-video-tool-api/src/services/editorUserProfileService.ts`, `h5-video-tool-api/tests/editorUserProfileService.test.ts`）：系统开始按显式表达提取“直接给结果 / 先给方案 / 不要长解释”等沟通信号；重复表达会提高 confidence，最近矛盾表达会降低旧偏好的权重。
- **[agent] 聊天与剪辑请求开始返回最新 `projectMemory` 并增量更新用户画像**（`h5-video-tool-api/src/routes/editorAgent.ts`, `h5-video-tool/src/pages/EditorWorkbench.tsx`, `h5-video-tool/src/api/editorCreative.ts`）：Agent 每次聊天或剪辑后，前端都会拿到更新后的项目记忆并回写到当前工程，为下一批上下文压缩和记忆面板打基础。

### v0.93 — 2026-04-22

**GeeLark 分发代理超时自动回退**

**Bug Fix / Reliability:**
- **[api] GeeLark OpenAPI 请求新增“代理不可达时自动直连重试”**（`h5-video-tool-api/src/services/geelark.ts`）：当 `GEELARK_HTTP_PROXY` 指向的代理连接超时、拒绝连接或网络不可达时，后端会立刻回退为直连 GeeLark，而不是把整次发布卡在“提交中”直到超时失败。
- **[test] 新增 GeeLark 代理连接超时识别回归测试**（`h5-video-tool-api/tests/geelarkAccounts.test.ts`）：覆盖“错误地址命中当前代理 host/port 时才触发回退”的判断，避免把普通 GeeLark 网络错误误判成代理故障。
- **[ops] 云端清理误配的 `GEELARK_HTTP_PROXY`**（服务器 `/home/ubuntu/qas-h5/api/.env` 与 `/home/ubuntu/qas-h5/.env`）：移除不可达的内网代理配置后，服务器本机直连 GeeLark `taskHistory` 已恢复正常。

### v0.92 — 2026-04-22

**视频分发提交期进度可见**

**UX / Bug Fix:**
- **[frontend] 点击发布后立即展示提交中批次卡**（`h5-video-tool/src/pages/TabDistribute.tsx` + `h5-video-tool/src/utils/geelarkPublishBatch.ts`）：在 GeeLark 还未返回 `taskIds` 前，分发页会先按已选账号显示“提交中”状态，不再只剩按钮上的“发布中...”。
- **[frontend] 分发结果面板新增提交阶段提示与状态文案**（`h5-video-tool/src/i18n/messages.ts`）：新增“正在启动设备、上传视频并创建任务”等提示，以及 `提交中` 状态标签，用户能更清楚地区分“请求尚未返回”与“任务已进入逐账号跟踪”。
- **[test] 批次状态测试新增提交中预览覆盖**（`h5-video-tool/tests/geelarkPublishBatch.test.ts`）：覆盖提交期批次预览构造，避免后续再次回退成“点击后完全无进度面板”。

### v0.91 — 2026-04-22

**视频分发发布状态与结果页内可见**

**Feature / UX Upgrade:**
- **[api] GeeLark 发布接口返回批次级账号任务映射**（`h5-video-tool-api/src/services/geelark.ts`）：`/api/geelark/publish` 现在除了 `taskIds` 与 `planName`，还会带回 `batch.items[]`，把每个所选账号与对应 `taskId/envId` 绑定起来，前端不再只能盯住第一个任务。
- **[api] 任务详情统一归一化为前端可直接渲染的数据结构**（`h5-video-tool-api/src/services/geelark.ts`）：`/api/geelark/task/:id` 现在会统一输出 `statusText`、`failDesc`、`resultImages`、`logs` 和可用的 `shareLink`，避免前端继续猜 GeeLark 原始字段。
- **[frontend] 分发页改为页内批次状态面板**（`h5-video-tool/src/pages/TabDistribute.tsx` + `h5-video-tool/src/utils/geelarkPublishBatch.ts` + `h5-video-tool/src/api/geelark.ts`）：发布后当前页会保留最近一次批次结果，逐账号显示提交状态、运行中/成功/失败、失败原因、截图和返回链接，并对未结束任务自动轮询。
- **[frontend] 分发结果文案补齐中英文壳层**（`h5-video-tool/src/i18n/messages.ts`）：新增“最近一次发布结果、刷新中、提交失败、最近日志”等关键状态文案，避免新结果面板出现裸 key 或中文/英文断裂。
- **[test] 新增 GeeLark 批次状态前后端回归测试**（`h5-video-tool-api/tests/geelarkAccounts.test.ts` + `h5-video-tool/tests/geelarkPublishBatch.test.ts`）：覆盖批次映射、任务详情归一化、前端批次初始化、详情合并与待轮询任务筛选，防止后续再次退回到“只跟踪第一个 taskId”。 

### v0.90 — 2026-04-22

**剪辑 Agent 记忆系统设计与实施计划补齐**

**Product Design / Planning:**
- **[docs] 新增剪辑 Agent 记忆系统设计文档**（`docs/plans/2026-04-22-editor-agent-memory-system-design.md`）：明确项目级记忆、用户级沟通画像、上下文保留长度、压缩策略与周期总结闭环，收敛“项目记忆管内容，用户画像管协作方式，周期总结管平台优化”的主设计。
- **[docs] 新增记忆系统实施计划**（`docs/plans/2026-04-22-editor-agent-memory-system-implementation-plan.md`）：按 schema、持久化、压缩、用户可见控制、周期洞察五个方向拆解后续落地步骤，方便直接排期和研发执行。

### v0.89 — 2026-04-22

**语言切换收口为单一下拉框**

**UX / i18n Simplification:**
- **[frontend] 语言切换器改为单一 dropdown，仅保留 `简体中文` / `English` 两项**（`h5-video-tool/src/components/LocalePresetSwitcher.tsx`, `h5-video-tool/src/pages/Login.tsx`, `h5-video-tool/src/components/Layout.tsx`）：登录页和侧边栏不再显示多 preset 按钮，用户只按语言切换，不需要理解 `UI locale / content locale` 组合。
- **[frontend] 英文选择自动联动内容语言**（`h5-video-tool/src/i18n/LocaleContext.tsx`, `h5-video-tool/src/i18n/locale.ts`, `h5-video-tool/src/api/client.ts`）：选择 `English` 后会统一写入 `uiLocale=en`、`contentLocale=en`，旧的 `English UI + 中文内容` 存储也会在读取请求头时自动归一，不再残留隐形混合模式。
- **[test] locale 协议回归测试补充语言映射覆盖**（`h5-video-tool/src/i18n/locale.test.ts`）：新增“两种语言选项映射到固定 ui/content locale 组合”的断言，避免后续又把混合 preset 暴露回前台。

### v0.88 — 2026-04-22

**Asset Library 英文界面补齐**

**Bug Fix / i18n Completion:**
- **[frontend] Asset Library 主链路补齐 locale 壳层**（`h5-video-tool/src/pages/AssetLibraryPage/index.tsx`, `h5-video-tool/src/pages/AssetLibraryPage/AssetGallery.tsx`, `h5-video-tool/src/pages/AssetLibraryPage/AssetCard.tsx`, `h5-video-tool/src/pages/AssetLibraryPage/AssetDetailDrawer.tsx`）：素材中台标题、Tab、筛选、文件夹侧栏、批量操作、卡片悬浮动作和详情抽屉全部接入 UI locale，英文模式下不再出现整页中文操作文案。
- **[frontend] 上传 / Drive / AI 标签评审面板同步国际化**（`h5-video-tool/src/pages/AssetLibraryPage/AssetUploadSheet.tsx`, `h5-video-tool/src/pages/AssetLibraryPage/AssetImportPanel.tsx`, `h5-video-tool/src/pages/AssetLibraryPage/AssetReviewQueue.tsx`, `h5-video-tool/src/pages/AssetLibraryPage/DriveBrowser.tsx`）：上传素材、导入进度、Google Drive 连接与缓存、待确认标签审核全部跟随语言模式切换，避免英文同事进入次级面板后又退回中文。
- **[test] 新增 Asset Library locale helper 回归测试**（`h5-video-tool/src/pages/AssetLibraryPage/localize.ts`, `h5-video-tool/src/pages/AssetLibraryPage/localize.test.ts`）：锁定分类、筛选值、Tab 和标签 key 的中英映射，减少后续继续扩页面时的回退风险。

### v0.87 — 2026-04-22

**剪辑 Agent TikTok 创意 Brief 首版落地**

**Feature / Workflow / Build Stability:**
- **[api] 新增 `editorCreativeBrief` 纯函数层与默认 brief prompt**（`h5-video-tool-api/src/services/editorCreativeBrief.ts`, `h5-video-tool-api/src/routes/editorAgent.ts`, `h5-video-tool-api/tests/editorCreativeBrief.test.ts`）：后端现在支持接收结构化 `creativeBrief`，在没有自然语言指令时自动生成默认 TikTok 剪辑需求，并在流式结果里回传 `creativeStrategy`。
- **[frontend] 剪辑器 Agent 面板升级为 TikTok 创意工作台**（`h5-video-tool/src/editor/components/AgentPanel.tsx`, `h5-video-tool/src/pages/EditorWorkbench.tsx`, `h5-video-tool/src/api/editorCreative.ts`, `h5-video-tool/src/editor/utils/editorCreativeBrief.ts`, `h5-video-tool/tests/editorCreativeBrief.test.ts`）：新增 TikTok 内容 / 买量双模式、卖点与 CTA 表单、推荐 Hook 策略卡；带 brief 的请求会直接进入剪辑链路，不再被误判成聊天。
- **[frontend] 素材库本地化导出补齐，恢复生产构建**（`h5-video-tool/src/pages/AssetLibraryPage/localize.ts`）：补全分类、筛选、Tab 的本地化函数与类型，修复前端 `npm run build` 被 Asset Library 缺失导出阻断的问题。

### v0.86 — 2026-04-22

**高级制片素材库参考图预览修复**

**Bug Fix:**
- **[frontend] 参考图素材选择弹层缩略图统一改走受保护的素材文件 URL**（`h5-video-tool/src/studio/steps/StepInput.tsx`）：不再直接信任列表接口返回的 `thumbnail_url / file_url`，而是统一使用带 token 的素材访问地址，修复“从素材库选择”弹层里图片全部裂图、但素材实际存在的问题。
- **[test] 新增预览 URL 选择回归测试**（`h5-video-tool/tests/stepInput.test.tsx`）：锁定素材卡片预览必须走受保护的文件 URL，避免后续再次回退到裸地址。

### v0.85 — 2026-04-22

**视频分发文案/标签硬过滤收口**

**Bug Fix / Quality Upgrade:**
- **[api] 分发文案结果新增内部工程词硬过滤与路径残留清洗**（`h5-video-tool-api/src/services/promptPolish.ts`）：对 `output`、`admin`、`dreamina`、`服务端成片` 等系统词做统一黑名单过滤，并在 fallback 与提示上下文里同步去脏，避免内部路径/工程词继续混入发布结果。
- **[api] caption 与 hashtags 结果正式拆分**（`h5-video-tool-api/src/services/promptPolish.ts`）：文案结果现在会主动剥离 caption 内联 hashtag，并把可用标签并回 hashtag 组合，同时继续保留 TikTok 流量标签与内容标签，减少“文案里带整串标签、标签框里又是脏词”的怪异结果。
- **[test] 新增系统词污染回归测试**（`h5-video-tool-api/tests/promptCaptionRules.test.ts`）：覆盖内部词标签过滤、caption 内联标签剥离、路径残留清洗，防止后续模型或 prompt 变动把同类脏词再次带回分发页。

### v0.84 — 2026-04-22

**高级制片参考图反解析支持从素材库直接选图**

**Feature / Usability:**
- **[frontend] Step 0 增加“从素材库选择”入口**（`h5-video-tool/src/studio/steps/StepInput.tsx`）：高级制片输入页现在除了本地上传，还能直接打开素材库图片选择层，不用再先去素材库下载再回传。
- **[frontend] 选中素材后复用既有参考图处理链路**（`h5-video-tool/src/studio/steps/StepInput.tsx`）：素材库图片会被转成 `File` 后交给现有 `onStyleRefFileChange`，继续走预览、`production/images` 上传和 `/api/studio/extract-style-reference` 反解析，不新增第二套逻辑。
- **[test] 新增 StepInput 入口回归测试**（`h5-video-tool/tests/stepInput.test.tsx`）：锁定“从素材库选择”入口存在，避免后续 UI 回退。

### v0.83 — 2026-04-22

- 剪辑 Agent 产品规划升级：新增 TikTok 游戏 `Campaign Creative Agent` 设计方案，沉淀市场人优先的 PRD、P0/P1 排期与信息架构，明确从“剪辑执行助手”升级为“brief 到多版本买量/内容素材工厂”的产品方向。

### v0.82 — 2026-04-21

**视频分发文案质量升级为视频感知生成**

**Feature / Quality Upgrade:**
- **[api] 分发文案生成改为优先结合视频关键帧、账号上下文和 Studio 创意**（`h5-video-tool-api/src/services/promptPolish.ts` + `h5-video-tool-api/src/routes/prompt.ts`）：`/api/prompt/generate-caption` 现在会优先解析分发视频本身，抽取关键帧并结合所选平台/地区账号语境生成发布文案，不再主要依赖生产 prompt 直推发布文案。
- **[api] 新增分发文案质量筛选与标签结构化规则**（`h5-video-tool-api/src/services/promptPolish.ts`）：补入低质量 caption 识别、候选打分、TikTok 标签压缩与去噪逻辑，优先保留 hook-first、单语言、4-6 个更像真实发帖的标签组合，避免再回退成半中半英模板句。
- **[frontend] 分发页文案请求补齐视频与账号上下文，并优化发布提示文案**（`h5-video-tool/src/api/promptPolish.ts` + `h5-video-tool/src/pages/TabDistribute.tsx` + `h5-video-tool/src/i18n/messages.ts`）：前端现在会把 `videoPath/videoUrl` 与已选账号信息一并传给后端；页面提示改为强调“3 秒钩子 + 发布即用标签”，占位文案也更贴近 TikTok 爆款内容语感。
- **[test] 新增分发文案质量与请求体回归测试**（`h5-video-tool-api/tests/promptCaptionRules.test.ts` + `h5-video-tool/tests/promptPolish.test.ts`）：覆盖低质 fallback 识别、候选优选、标签结构化，以及前端请求体带视频/账号上下文，避免后续再次退回到 prompt-only 生成。

### v0.81 — 2026-04-21

**一键成片批量任务看板恢复可见**

**Bug Fix:**
- **[api] QuickFilm 创建 batch job 时补齐 `username` 归属**（`h5-video-tool-api/src/routes/quickfilm.ts`）：`/api/quickfilm/:jobId/confirm` 现在无论是立即提交的第一镜，还是后续 `awaiting_submit` 排队镜头，都会把当前登录用户写入 batch job。这样历史页的 `GET /api/batch-jobs` 和 SSE `/api/batch-jobs/stream` 才能正确按用户返回任务，不再出现“即梦后台已在生成，但批量任务看板为空”的错位。
- **[test] 新增 QuickFilm batch job 归属回归测试**（`h5-video-tool-api/tests/quickfilmBatchJobs.test.ts`）：覆盖 `pending` 与 `awaiting_submit` 两类任务都必须保留 `username`，防止后续再次出现任务已入队但看板不可见的问题。

### v0.80 — 2026-04-21

**英文壳层补齐与语言切换器重设计**

**Feature / UX Polish:**
- **[frontend] 视频分发页补齐英文界面壳层与报告弹窗国际化**（`h5-video-tool/src/pages/TabDistribute.tsx` + `h5-video-tool/src/i18n/messages.ts`）：步骤标题、账号筛选、文案生成、发布按钮、运行报告与空状态统一接入 i18n，英文 UI 下不再出现大段中文操作文案。
- **[frontend] 一键成片分镜确认页继续收口英文残留**（`h5-video-tool/src/pages/QuickFilm.tsx`）：补齐 `AI生成 / 已匹配素材 / 手动匹配素材 / 角色 / 场景 / 选择 / 取消` 等高频文案，并统一分镜时长展示，减少英文同事在确认页的理解断层。
- **[frontend] 语言切换入口改为紧凑模式切换器**（`h5-video-tool/src/components/LocalePresetSwitcher.tsx` + `h5-video-tool/src/components/Layout.tsx` + `h5-video-tool/src/pages/Login.tsx`）：去掉“预设按钮 + 原生 select”双层控件，改成单一拨片式语言模式切换，登录页与主站侧边栏视觉保持一致。
- **[test] locale 文案回归测试同步覆盖新切换器文案**（`h5-video-tool/src/i18n/locale.test.ts`）：确保语言模式标题和关键英文文案在后续改动中不会回退。

### v0.79 — 2026-04-21

**视频分发文案鉴权修复与 TikTok 标签收紧**

**Feature / Bug Fix:**
- **[frontend] 分发页文案生成/翻译请求补齐 JWT 鉴权**（`h5-video-tool/src/api/promptPolish.ts`）：`/api/prompt/expand-short-drama`、`/api/prompt/polish`、`/api/prompt/generate-caption`、`/api/prompt/translate-caption` 统一自动携带 `Authorization: Bearer gobs_token`，修复分发页点击生成文案时报“未提供认证 token”的问题。
- **[api] TikTok 文案标签回退逻辑收紧为更适合分发的组合**（`h5-video-tool-api/src/services/promptPolish.ts`）：hashtags 现在会去重、移除 `#shorts`、控制在 6 个以内，并统一补齐更适合 TikTok 的流量标签；fallback 文案改为 hook-first 的短句风格，避免把生产 prompt 直贴到发布页。
- **[test] 新增分发文案鉴权与 TikTok 标签规则回归测试**（`h5-video-tool/tests/promptPolish.test.ts` + `h5-video-tool-api/tests/promptCaptionRules.test.ts`）：覆盖前端请求头携带 JWT、标签归一化、fallback caption/hashtags 行为，避免同类问题回归。

### v0.78 — 2026-04-21

**文档入口整理与三端同步补齐**

**Chore / Docs:**
- **[docs] 补齐统一文档入口**（`docs/DOCS-INDEX.md` + `docs/TASK-INDEX.md` + `docs/plans/README.md`）：明确 `rules / reviews / runs / plans` 四类文档分工，让后续任务先看入口页再进具体方案，减少文档散落和重复维护。
- **[docs] 重要方案文档正式入库**（`docs/i18n-中英文切换设计方案-v2.md` + `docs/plans/2026-04-21-distribute-caption-auth-design.md` + `docs/plans/2026-04-21-distribute-caption-auth.md` + `docs/plans/2026-04-21-i18n-phase0-phase1-implementation-plan.md`）：把当前最活跃的 i18n 与分发鉴权方案沉淀为可检索的长期文档资产。
- **[repo] 本地敏感/一次性文件加入忽略规则**（`.gitignore`）：忽略本地服务器排障脚本、临时 PPT 配置和导出产物，避免敏感信息与测试垃圾继续污染工作区。

### v0.77 — 2026-04-21

**中英文界面切换 Phase 1 上线**

**Feature / Bug Fix:**
- **[frontend] 登录前即可切换界面语言与内容语言预设**（`h5-video-tool/src/pages/Login.tsx` + `h5-video-tool/src/components/LocalePresetSwitcher.tsx`）：登录页新增语言切换入口，支持 `中文界面 + 中文内容`、`English UI + 中文内容`、`English UI + English Content` 三种组合，英文同事无需先登录再找设置。
- **[frontend] 主站侧边栏接入全局 locale 切换与请求头透传**（`h5-video-tool/src/components/Layout.tsx` + `h5-video-tool/src/api/client.ts` + `h5-video-tool/src/i18n/locale.ts` + `h5-video-tool/src/i18n/LocaleContext.tsx`）：前端统一注入 `X-UI-Locale` / `X-Content-Locale`，并在主布局底部提供持续可见的语言切换入口，确保页面壳层与后续内容生成链路有一致的 locale 上下文。
- **[frontend] 新增基础 i18n 字典与 QuickFilm 主流程壳层国际化**（`h5-video-tool/src/i18n/messages.ts` + `h5-video-tool/src/pages/QuickFilm.tsx`）：补齐登录页、侧边导航、一键成片主入口、处理中状态、分镜确认页等高频中文文案的中英映射，降低英文协作同学首次使用门槛。
- **[test] 新增 locale 协议与文案回归测试**（`h5-video-tool/src/i18n/locale.test.ts` + `h5-video-tool/tsconfig.app.json`）：覆盖 locale 归一化、请求头生成、预设匹配、文案 key 查找与中文兜底，避免后续切语言能力回退。

### v0.76 — 2026-04-21

**GeeLark 视频分发自动开关机**

**Feature / Bug Fix:**
- **[distribution] GeeLark 分发账号补齐 5 个已绑定环境**（`config/geelark-accounts.json`）：补入 `web TH tt`、`TH test2`、`Test 3`、`ID test3`、`ID xianyu test`，并统一作为视频分发可选账号源。
- **[api] 视频分发账号权限真正落到 GeeLark 列表与发布接口**（`h5-video-tool-api/src/routes/geelark.ts` + `h5-video-tool-api/src/services/geelark.ts`）：`/api/geelark/accounts` 与 `/api/geelark/publish` 现在都会按 GOBS 当前登录用户的 `publishAccountIds` 过滤，避免设置页分配结果与实际分发脱节。
- **[api] GeeLark 分发改为“发布前自动开机，成功后自动关机”**（`h5-video-tool-api/src/services/geelark.ts`）：发布前会先检查目标云手机状态，只启动关机中的设备并等待其 ready；GeeLark 返回 `taskIds` 后由后端后台轮询任务状态，只有任务成功（`status=3`）才自动关机，失败或取消时保留设备现场用于排查。
- **[test] 新增 GeeLark 分发权限与自动开关机纯逻辑回归测试**（`h5-video-tool-api/tests/geelarkAccounts.test.ts`）：覆盖账号过滤、需启动设备筛选、设备 ready 判定、任务与 env 映射、成功后关机规则。

### v0.75 — 2026-04-21

**我的成片即梦回补补齐后续分页漏片**

**Bug Fix:**
- **[api] `dreaminaRecentSync` 改为直接分页扫描即梦 `list_task` 结果**（`h5-video-tool-api/src/services/dreaminaRecentSync.ts`）：同步服务不再只依赖单次列表结果，而是按 `offset` 连续扫描多页任务；即使前几页都是已经落盘的旧 submit，也会继续往后找缺失成片，修复“即梦后台还有视频，但服务端文件始终拉不到”的问题。
- **[api] 同步层新增独立 wrapper 调用与分页回归测试**（`h5-video-tool-api/src/services/dreaminaRecentSync.ts` + `h5-video-tool-api/tests/dreaminaRecentSync.test.ts`）：在不修改禁改的 `dreaminaVideo.ts` 前提下，回补流程会显式带上 Dreamina wrapper 路径和 `--offset` 参数跑分页；同时新增“第一页全是旧片、第二页才有新片”测试，防止后续再退回只扫第一页的行为。

### v0.74 — 2026-04-21

**即梦后台同步补齐 Linux 运行时兜底**

**Bug Fix:**
- **[api] `dreaminaRecentSync` 自动探测服务器上的 Dreamina CLI 与 wrapper 路径**（`h5-video-tool-api/src/services/dreaminaRecentSync.ts`）：当线上 `qas-api` 进程没有显式注入 `DREAMINA_BIN / DREAMINA_SCRIPTS_DIR` 时，会自动尝试 `/home/ubuntu/.local/bin/dreamina`、`~/.dreamina_cli/dreamina` 和部署目录下的 `.cursor/skills/dreamina-cli-skill/scripts`，避免“同步接口正常返回但实际上没有真正调用即梦后台”的假成功。

### v0.73 — 2026-04-21

**我的成片即梦同步改为后台串行，修复卡顿与重复旧片**

**Bug Fix:**
- **[api] 服务端文件列表改回快速返回，并对即梦落盘结果做去重展示**（`h5-video-tool-api/src/routes/video.ts` + `h5-video-tool-api/src/services/dreaminaRecentSync.ts`）：`GET /api/video/output-recent` 不再在列表接口里同步阻塞调用即梦后台，而是先快速返回当前服务端文件；返回前会按 `dreamina_<submitId前缀>` 合并重复文件，只保留同 submit 的最佳副本，避免列表里出现同一个旧视频多次。
- **[api] 新增按用户串行的即梦后台同步接口**（`POST /api/video/output-recent/sync-dreamina`）：即梦最近成片同步改为单独接口，并加了 per-user 锁；同一用户同一时间只会跑一条同步任务，后续请求只会复用已有同步，不会再因为多次刷新并发写出重复 mp4。
- **[frontend] 我的成片改为“先秒开列表，再后台同步即梦”**（`h5-video-tool/src/components/GalleryView.tsx` + `h5-video-tool/src/api/video.ts`）：进入“服务端文件”页时先快速加载现有列表，再后台发起即梦同步；同步期间页面仍可操作，完成后自动刷新列表并 toast 提示，不再整页长时间卡在“刷新中 / 加载中”。

### v0.72 — 2026-04-21

**我的成片补同步即梦后台最近成片**

**Bug Fix:**
- **[api] `/api/video/output-recent` 增加即梦最近成片回流**（`h5-video-tool-api/src/routes/video.ts` + `h5-video-tool-api/src/services/dreaminaRecentSync.ts`）：返回“服务端文件”列表前，后端会先扫描当前用户 `output/` 已落盘成片，再调用即梦 `list_task` 找出最近 7 天内已完成但本地还没有的成片，逐个复用现有 `pollDreaminaTask + persistVideoUrlToOutput` 逻辑补拉回服务器，随后重新扫描并返回最新列表。
- **[api] 新增即梦回流判重/时间窗 helper 与测试**（`h5-video-tool-api/tests/dreaminaRecentSync.test.ts`）：锁定“只同步最近成功任务、跳过已落盘 submitId、去重并限制单次回流数量”的规则，避免同一批即梦成片重复落盘或把过旧任务重新灌回列表。
- **[frontend] 我的成片读取服务端文件时展示同步结果**（`h5-video-tool/src/api/video.ts` + `h5-video-tool/src/components/GalleryView.tsx`）：如果本次刷新顺手从即梦后台补回了新成片，页面会 toast 提示同步数量，方便用户确认最近几天的成片已经回来。

### v0.71 — 2026-04-21

**导出下载鉴权回跳 + 登录后黑屏遮罩修复**

**Bug Fix:**
- **[frontend] 下载成品前先补拿 file-access-token，并统一记录登录后回跳地址**（`h5-video-tool/src/api/client.ts` + `h5-video-tool/src/api/editor.ts`）：导出下载、编辑器上传和其他 401 场景不再直接硬跳裸 `/login`；会先保存当前业务页面，登录成功后自动回到原页面，避免下载失败把人丢回首页。
- **[frontend] 登录页支持 query/state/sessionStorage 三路回跳恢复**（`h5-video-tool/src/pages/Login.tsx`）：无论是路由守卫跳转、接口 401 跳转，还是下载链路触发的重新登录，登录成功后都会恢复到原来的页面，而不是固定落到首页。
- **[frontend] 主布局路由切换时强制收起全局任务面板遮罩**（`h5-video-tool/src/hooks/useGlobalJobs.ts` + `h5-video-tool/src/components/Layout.tsx`）：重新登录回到主站后，会自动清掉全局队列浮层和遮罩，避免页面出现整屏变暗、按钮点不动的“黑屏假死”。

### v0.70 — 2026-04-21

**剪辑器连续播放边界抖动修复**

**Bug Fix:**
- **[frontend] 预览播放器按“当前渲染 clip”处理结束事件**（`h5-video-tool/src/pages/EditorWorkbench.tsx`）：连续播放切到下一镜时，不再依赖可能已经切换到下一段的全局 `activeVideoClipRef`，而是把 `onCanPlay / onTimeUpdate / onEnded` 和当前这支 `<video>` 对应的 clip 绑定，避免片尾迟到事件把时间轴错误写回上一镜。
- **[frontend] 新增旧事件防串扰保护**（`EditorWorkbench.tsx`）：当镜头刚切换到下一段时，上一段 `<video>` 的迟到 `timeupdate/ended` 事件会被直接忽略，不再出现像“镜10结束后还黏在镜10，必须手动拖到镜11”这样的边界抖动问题。

### v0.69 — 2026-04-21

**导出成品下载恢复稳定直链**

**Bug Fix:**
- **[frontend] 下载成品优先走带 `fat/token` 的直链下载**（`h5-video-tool/src/api/client.ts`）：导出完成后的「下载成品」不再先把整个 MP4 拉成 Blob 再立即释放临时 URL，而是优先复用现有文件访问 token 体系触发浏览器原生下载；对大文件和不同浏览器的兼容性更稳。
- **[api] 导出下载路由接入媒体 token 解析**（`h5-video-tool-api/src/routes/editorExport.ts`）：`/api/editor/export/download/:filename` 现在和视频/图片预览链路一致，支持通过 `fat` 或 `token` 识别当前用户，保证直链下载仍然只允许访问本人导出的成品。
- **[api] 鉴权中间件放行导出下载 GET 请求**（`h5-video-tool-api/src/middleware/auth.ts`）：浏览器原生下载请求不会携带 `Authorization` 头，本次改为在路由层完成二次校验，避免“导出成功但点击下载报错”的断链问题。

### v0.68 — 2026-04-21

**批量任务鉴权补齐 + SSE 自动重连 + 真实版本展示**

**Bug Fix / UX:**
- **[frontend] `batch-jobs` 成片链接统一补 FAT/JWT 鉴权**（`BatchJobsBoard.tsx` + `History.tsx`）：批量任务看板里的视频预览、下载，以及历史页“导入到剪辑器”现在都会把相对媒体地址转成真实 API URL，并自动附带 file-access-token 或 JWT 旁路，不再因为裸 `/api/batch-jobs/video/:id` 链接而在真实浏览器场景下出现 401。
- **[frontend] `batch-jobs` SSE 断线自动重连**（`useGlobalJobs.ts` + `BatchJobsBoard.tsx`）：任务流和看板流在网络抖动、Nginx reload 或后端短暂重启后，会按指数退避自动恢复连接；看板右上角同步显示“实时同步 / 重连中”，避免长任务过程中静默失联。
- **[frontend] 剪辑器回跳制片项目改到真实路由**（`EditorWorkbench.tsx`）：顶部“来自制片项目”入口从旧的 `/studio/wizard?project=...` 修正为当前实际使用的 `/studio/production?projectId=...`，恢复“制片 -> 剪辑 -> 回看制片”的闭环。
- **[frontend] 侧边栏版本号改为读取运行中版本**（`Layout.tsx`）：不再硬编码 `GOBS v0.1`，而是在界面底部展示 `/api/system/version` 返回的真实 `branch@commit`，便于用户和开发确认当前线上正在运行的构建。

### v0.67 — 2026-04-21

**导出成品下载恢复稳定直链**

**Bug Fix:**
- **[frontend] 下载成品优先走带 `fat/token` 的直链下载**（`h5-video-tool/src/api/client.ts`）：导出完成后的「下载成品」不再先把整个 MP4 拉成 Blob 再立即释放临时 URL，而是优先复用现有文件访问 token 体系触发浏览器原生下载；对大文件和不同浏览器的兼容性更稳。
- **[api] 导出下载路由接入媒体 token 解析**（`h5-video-tool-api/src/routes/editorExport.ts`）：`/api/editor/export/download/:filename` 现在和视频/图片预览链路一致，支持通过 `fat` 或 `token` 识别当前用户，保证直链下载仍然只允许访问本人导出的成品。
- **[api] 鉴权中间件放行导出下载 GET 请求**（`h5-video-tool-api/src/middleware/auth.ts`）：浏览器原生下载请求不会携带 `Authorization` 头，本次改为在路由层完成二次校验，避免“导出成功但点击下载报错”的断链问题。

### v0.66 — 2026-04-21

**高级制片导入连续播放 + 一键配乐可靠性修复**

**Bug Fix:**
- **[frontend] 导入分镜后时间轴连续播放恢复**（`EditorWorkbench.tsx`）：预览播放器在片段自然 `ended` 时，若时间轴上还有下一段视频，会自动跳到下一段并继续播放，不再因为制片镜头“规划时长”和实际视频时长存在轻微偏差而停在第一段结尾。
- **[frontend] 导入引导弹窗的「一键生成配乐」真正开跑**（`EditorWorkbench.tsx` + `BgmMixPanel.tsx`）：从高级制片导入剪辑器后，弹窗里的配乐入口现在会同步左下 BGM 面板 prompt，并直接触发智能配乐流程，不再只是写一条日志。
- **[api] 配乐 prompt 润色增加本地兜底**（`editorMusicPromptPolish.ts`）：当模型返回空内容、JSON 格式异常、字段名不规范或润色请求本身失败时，服务端会按用户描述自动生成可用的英文器乐 prompt/negativePrompt，避免“模型返回无法解析为配乐 JSON”直接中断自动配乐。

### v0.65 — 2026-04-21

**即梦全平台 FIFO 调度器 + 可取消排队 + 多用户可见队列位**

v0.64 解决了单用户视角的状态可见性，但多用户同时使用即梦时仍会出现任务丢失、无法取消、看不到平台排队位置的问题。本版把调度权收归后端，前端统一消费全局队列状态：

**核心变更：**
- **[api] 新增 `dreaminaScheduler`**：全平台 FIFO 调度，按 `createdAt` 排序提交 awaiting_submit 任务；1310 并发限制自动留在队列里等待下次 tick，不再把错误直接抛给前端
- **[api] 新增 `POST /api/batch-jobs/enqueue`**：高级制片镜头先落盘为 `awaiting_submit`，刷新页面也不会丢任务
- **[api] cancelJob 升级为三档语义**：awaiting_submit 无损移除、pending/queuing 停止继续跟进、processing 明确提示积分通常无法追回
- **[api] SSE 新增 `queue-snapshot` 广播**：跨用户共享平台活跃数 / 排队数 / 平均耗时，不暴露用户隐私
- **[frontend] 删除前端本地 Dreamina 排队逻辑**：移除 `dreaminaQueueRef`、`waitForAnyJobCompletion`、1310 本地重试，统一改走后端 enqueue
- **[frontend] 分镜五态统一**：等待调度 / 即梦排队 / 即梦生成 / 已取消 / 生成失败
- **[frontend] 新增取消入口**：操作区支持“取消排队 / 放弃本次生成”，缩略图 hover 支持单镜快捷取消，工作区工具栏支持“取消本项目排队”
- **[frontend] 顶部平台状态条**：显示当前平台空闲 / 使用中 / 繁忙，以及平均耗时

**Acceptance：** 多用户并发零任务丢失；取消请求即时返回；刷新后队列状态与视频回填持续可恢复。

### v0.64.2 — 2026-04-20（hotfix）

**修复 v0.64 前端 recovery effect 误把"已提交即梦"当作"本地提交中" + 暴露即梦队列位置**

v0.64 上线后用户反馈：同时点镜 10/11 生成，镜 10 显示"即梦生成"、镜 11 显示"即梦排队"（符合预期，反映即梦服务端 GPU 调度顺序），**但镜 7/8 一直卡在金色"提交中"且"手动检查进度"按钮消失**。排查发现 `ProductionWizard` 刷新恢复 effect 错把「有 `pendingVideoSubmitId` 的 shot」强行写入 `shotBusyMap='video'`，而 `shotBusyMap='video'` 语义应严格限定为「本会话正在调 `/api/video/submit` 的那几秒」。混用导致：

1. ShotStrip 里 `isThisShotBusy==='video'` 优先级高于 `jobStatus`，SSE 推来的"即梦排队/即梦生成"徽标被覆盖，**永远只看到"提交中"**。
2. `StepStoryboardGenerateActions` 的「手动检查进度」按钮条件 `hasPendingBackend = pendingVideoSubmitId && !isSubmitting` 因 `shotBusyMap='video'` 导致 `isSubmitting=true`，按钮消失，用户没法主动触发一次 poll。

**修复（一次性到位）：**
- **[frontend] `ProductionWizard.tsx` recovery effect**：不再给带 `pendingVideoSubmitId` 的 shot 写 `shotBusyMap='video'`。保留「shot 同时有 `pendingVideoSubmitId` 和已成片视频」时清 stale pending 的兜底逻辑（这部分是对的）。刷新后该 shot 由 ShotStrip 默认分支 + SSE `jobStatus` 共同渲染：后端立刻能推到 queuing/processing/failed 时显示对应的蓝/绿/红徽标。
- **[frontend] `StepStoryboardGenerateActions.tsx`**：
  - `hasPendingBackend` 从 `pendingVideoSubmitId && !isSubmitting` 改为 `!!pendingVideoSubmitId`，并把「手动检查进度」按钮条件显式改为 `hasPendingBackend && shotMediaBusy !== 'video'`（即：只在真·HTTP submit 进行中才屏蔽；已提交即梦就随时能点）。
  - 按钮文案/主按钮 label 区分开「正在调 submit」「本地队列排队」「已提交即梦」三种状态。
- **[frontend] `ProductionWizard.tsx` 新增 `shotJobQueueInfoMap`**：从 `useGlobalJobs` 里挑每个 shot 最新一条 active job 的 `queueInfo`（后端本来就传了，来自 Dreamina `query_result.py` 的 `queue_info.queue_idx/queue_length`），透传到 ShotStrip。
- **[frontend] `StepStoryboardShotStrip.tsx`**：徽标 tooltip 展示「即梦队列 #N/M」，用户 hover 到蓝色"即梦排队"徽标即可看到即梦服务端真实的队列位置，不再猜"是不是卡住了"。

**原理背景（为什么会有"即梦生成"vs"即梦排队"两种态）：**
- 后端 `pollDreaminaTask` 调 `query_result.py` 拿回即梦侧的 `gen_status`：
  - `generate` → 即梦 GPU 正在渲染这一帧 → job.status = `processing` → 前端绿色"即梦生成"
  - `queue`/`wait` 等 → 在即梦账号的 GPU 队列中排队 → job.status = `queuing` → 前端蓝色"即梦排队"
- 同时提交两个任务时，即梦账号的服务端并发槽位（通常 1-2 个）决定了谁先被 GPU 接走。先点击不保证先被调度，这是即梦的调度逻辑，不是我们后端在排队。

**效果：**
- 镜 7/8 刷新后不再卡"提交中"，会按 SSE 立即切到"即梦排队"（蓝）或"即梦生成"（绿），确实失败才显示红叉。
- 「手动检查进度」按钮在"已提交即梦"态始终可用。
- 鼠标悬停蓝色徽标能看到「即梦队列 #3/12」这样的真实位置。

---

### v0.64.1 — 2026-04-20（hotfix）

**修复 v0.64 副作用：瞬时 CLI 错误被误判为"生成失败"**

v0.64 上线后发现 3 个仍在即梦 querying 的 submitId（镜 7 `d5bfc8cb`/`8031c5a6`、镜 8 `c65c6c38`）被 poller 标记为 `failed`，前端随即展示红叉"生成失败"，比"提交中"还糟。根因：`pollDreaminaTask` 把两类**瞬时/外部错误**当成了 dreamina 本身的 `fail`：
1. `query_result.py` wrapper 调用失败（CLI 抖动、"did not return parseable JSON"、"exit code 1"） → 返回 `phase: 'failed'`；
2. 即梦 `genStatus === 'success'` 但下载成片 URL 失败 → 返回 `phase: 'failed'`；
3. `MAX_JOB_AGE_MS = 4h` 硬性超时，实际即梦单任务排队+生成有时会超过 4 小时。

**修复：**
- **[api] `dreaminaVideo.ts → pollDreaminaTask`**：`DreaminaTaskStatusResult` 新增 `transientError?: string` 字段；上面两种情况改为返回 `{ phase: 'querying', transientError }`，把 job 状态留在 `queuing/processing`，下一次 tick 继续重试，而不是直接失败。
- **[api] `batchJobsQueue.ts → pollSingleJob`**：收到 `transientError` 时仅 `console.warn` 记录，不再进入 failed 分支、不再 `writeBackFailedToProject`。
- **[api] `batchJobsQueue.ts`**：`MAX_JOB_AGE_MS` 从 4h → **12h**，避免跑得慢的即梦任务被误超时。
- **[ops] jobs.json 修复**：把 3 个被误伤的 submitId 从 `failed` 重置为 `queuing` + 清 `failReason`，让 poller 接管。部署后 `d5bfc8cb` 首轮就返回 `done`（即梦早已完成，只是之前下载一次失败就把 job 标死了），另外 2 个回到 `queuing` 继续等。

**效果：**
- 即梦真失败（`fail` 状态）→ 依旧红叉，保持 v0.64 的交互。
- CLI 抖动/下载抖动 → 现在只打 warn，shot 保持"即梦排队/即梦生成"，下次 tick 会自愈，用户看到的状态始终真实。

---

### v0.64 — 2026-04-20

**高级制片 生成状态可见性一次性到位（提交中 → 四态 + 运维按钮 + 提速轮询）**

用户反馈：镜 7 即梦还在跑，H5 却一直显示"提交中"；镜 9 手动点了生成看不出是已入队还是没有提交。根因是 **"提交中"这三个字同时承担了"后端未注册"+"即梦排队"+"即梦生成"+"刚失败"四种语义**，用户无法分辨，体验灾难。本版一次性重构：

**Feature / 核心改造：**
- **[frontend] 分镜缩略图 4 态 + 红色失败徽标**（`StepStoryboardShotStrip.tsx`）：新增 `shotJobStatusMap` prop，消费 `useGlobalJobs` 实时 SSE，把 shot 徽标从"提交中 / 即梦生成"两态拆成 **生成失败 ✕（红）/ 提交中（黄转）/ 即梦排队（蓝脉冲）/ 即梦生成（绿转）** 四态；失败态显示红叉并附原因 tooltip，用户一眼就知道该点重试还是等。已有视频的 shot 永远不展示失败徽标（避免"最近一次失败"误导）。
- **[frontend] ProductionWizard 派生 shotJobStatusMap**：`useMemo` 按 projectId 过滤 SSE jobs，同 shot 多条 job 按 done > processing > queuing > failed 的优先级挑最有信号的那条；全 done 则不展示任何 overlay，跟之前行为一致。
- **[frontend] 顶部"同步即梦状态"按钮**（`StepStoryboardWorkspace.tsx`）：工具栏右侧新增一键兜底按钮，点击后调 `/api/batch-jobs/sync-now`，对当前用户所有 `pending/queuing/processing` 的 batch-job 并发（5）poll 一次，并顺带触发孤儿 submitId 扫描，完成后 toast "X 条已完成 / Y 条失败 / 兜底恢复 Z 条"。
- **[api] pollSingleJob failed 分支自动清 `pendingVideoSubmitId`**（`batchJobsQueue.ts` → 新增 `writeBackFailedToProject`）：即梦报失败/我们轮询失败时，只要 production.json 里 shot.pendingVideoSubmitId 仍指向这个 job 的 submitId，就清掉 pending 并写入 `shot.lastVideoError = { submitId, jobId, reason, at }`，让前端自动切到"失败，可重试"态，不再永远卡"提交中"。幂等保护：shot 已有视频或 pending 已被新 submit 覆盖时不动。
- **[api] production 轮询提速**（`batchJobsQueue.ts`）：主 tick 30s → 20s；production 退避从 45/90/180s 改为 **20/45/90s**；**彻底去除 `PRODUCTION_DELAY_MS` 45 秒首轮冷启动延时**，新 job 在下一个 tick（≤20s）立即 poll。端到端延迟从最坏 180s 压缩到 20s。
- **[api] 孤儿 submitId 扫描器提速**（`dreaminaRecovery.ts`）：`SCAN_INTERVAL_MS` 120s → **45s**，submit 响应丢失（1310、网络抖动）的 submitId 最慢 45s 就能被 scanner 捞回并绑回 shotIndex。
- **[api] 新增运维接口 `POST /api/batch-jobs/sync-now`**（`routes/batchJobs.ts`）：返回 `{ polled, results[], scan }`，专供"同步即梦状态"按钮使用；并发上限 5 避免对 dreamina CLI 压力过大。

**ProductionShot 数据结构新增：**
- `ProductionShot.lastVideoError?: { submitId?, jobId?, reason, at }` —— 记录该镜最近一次失败的原因，UI 用于展示可重试卡片。成功拿到视频后前端/后端都不强清（保留为历史可供查询）。

**运维一次性修复：**
- 清理 `d5bfc8cb3b69d3dc`（镜 7 的另一个 submitId）在 jobs.json 里被误标为 `failed` 的状态 → 重置为 `queuing`，让 poller 继续跟进。

**效果：**
1. 镜 7/8/9 等即梦尚在 `querying` 的分镜现在会显示 **"即梦排队"** 或 **"即梦生成"** 而不是一律"提交中"。
2. 任何 batch-job `failed` 后 shot 立刻从"提交中"变红叉"生成失败"，不再需要刷新或清 localStorage。
3. 用户不确定状态时点"同步即梦状态"按钮 10 秒内就能看到最新结果，再也不用靠 F5。

**三端一统：** 本地 `tsc --noEmit`（前后端均通过）→ `npm run build` → `git push origin main` → SFTP 上传 `dist/` → `pm2 restart qas-api`。

### v0.63 — 2026-04-20

**剪辑器一次性到位优化（speed 统一 + 上传体验 + Agent 上下文 + BGM 容灾 + 导出预检）**

按"不要折中版本、一次性到位"的标准，系统性修掉上一轮 review 遗留的 P1/P2 及其衍生问题。

**Feature / 核心改造：**
- **[frontend] 倍速(speed)时间轴统一**（`editor/types/timeline.ts` + 全部调用点）：新增 `clipSpeed()` / `timelineDurationOf()` / `toSourceSec()` / `toTimelineOffset()` 四个公共帮助函数，所有 VideoClip / AudioClip 的「源秒 ↔ 时间轴秒」换算全部走这套。修复 `speed≠1` 时预览、分割、trim、BGM 对齐、Agent 交付表、时间轴渲染宽度、音频镜像轨时长各算各的导致的错位；`AudioClip` 新增可选 `speed`，`syncSourceAudioClipsFromVideo` 会把视频倍速同步到镜像音频轨。
- **[frontend] 分片上传并发 3 片**（`api/editor.ts` → `uploadEditorAssetChunked`）：改用固定 3 worker 的工作池并发上传分片，大文件上传速度成倍提升；保留原有"单片失败重试 2 次 + 指数退避"和 `expectedTotalSize` 总大小校验。
- **[frontend] 上传前置大小校验 + 友好 413**（`api/editor.ts`）：`uploadEditorAsset` / `uploadEditorAssetChunked` 在请求发出前读取 `getEditorUploadConfig().maxBytes`，超限直接抛"该文件 XX MB，超过上限 XXX MB"，不再让用户等服务器 413 才知道被拒。
- **[api] 素材 SHA256 去重**（`editorAssets.ts`）：`StoredEditorAsset` 新增 `sha256` 字段；单文件与分片合并两条上传路径落盘后均会流式计算哈希，同用户 `(sha256, size)` 命中则删除新文件、直接复用旧素材并返回 `deduped:true`，重复上传不再占磁盘。
- **[api] 上传上限统一**（`localUpload.ts`）：默认 `EDITOR_UPLOAD_MAX_MB` 从 500 提到 2048，与 `editorAssets.ts` 对齐，消除"制片侧能传、剪辑侧传不进"的割裂。
- **[api] 导出磁盘空间预检**（`ffmpegExport.ts`）：`runFfmpegExport` 开始前按「时长 × 分辨率 × 3 倍安全系数」估算所需空间，用 `fs.promises.statfs` 分别检查输出目录和 `os.tmpdir()` 两个分区剩余空间，不足则立刻以友好错误中止，避免转码到 95% 才因写盘失败前功尽弃。
- **[api] apply-sync 源文件存在性校验**（`editorProjects.ts`）：同步新版本前对 `version.videoPath` 做 `fs.existsSync` 检查，文件缺失 / stat 失败的 shot 不写入素材库，响应体新增 `skipped: [{shotIndex, reason}]`，避免把已被 GC 的源路径写进 clip 导致时间轴大面积黑屏；`oldDur / durDelta / maxEnd` 也改为按 `speed` 折算真实时间轴时长。
- **[api] Agent 轨合并「空填满、有则留」**（`editorAgentService.ts`）：在上一轮只保留 `mix` 的基础上进一步细化：`a2`（BGM）/ `t1`（文字）/ `subtitles` 三条轨现在按「当前工程为空才由 Agent 填充，已有内容则保留」策略合并，兼顾「首次生成自动配字幕/BGM」和「手动调过之后不再被覆盖」两种诉求。
- **[api] Agent Plan Prompt 上下文增强**（`editorAgentService.ts` → `buildPlanSystemPrompt`）：系统 Prompt 固定注入三段新上下文——`## 素材内容总览`（contentManifest）、`## BGM 节拍结构`（启用 `EDITOR_BEAT_ANALYSIS` 时提供精确节拍时间点）、`## 当前工程已有片段`（从 VideoClip 抽取 `shotIndex / characters / note / sourceStart~sourceEnd` 形成 Markdown 表）。Agent 不再需要完全重建时间轴，改动可以对齐用户已有的分镜号/角色/备注。
- **[frontend+api] BGM 生成「重试 / 切引擎 / 跳过」三按钮**（`BgmMixPanel.tsx` + `editorMusic.ts` + `api/editor.ts`）：`POST /api/editor/music/generate` 新增可选 `provider: 'auto'|'suno'|'lyria'`，显式指定 `suno` 时若无 API Key 立即 400、失败也不再自动降级；前端配乐失败后在面板里显示红色失败卡片，提供「重试 / 切 Lyria↔Suno / 跳过」三个恢复动作，用户无需刷新或翻日志。
- **[frontend] Undo/Redo 自动钳制 currentTime**（`useTimelineState.ts`）：监听 `durationSec` 变化，若 `currentTime` 超过新时长自动 clamp 回边界，修复撤销删除片段后播放头停在空白区域导致画面黑屏的问题。
- **[frontend] getActiveTextClips 稳定排序**（`timeline.ts`）：文字片段先按 `timelineStart` 再按 `id` 排序，修复「同一时刻多条字幕随 React 重渲染偶发交换顺序」的显示闪烁。

**Bug fix:**
- 修复倍速片段拖拽 trim 时像素距离没乘以 speed，视觉上拖 10px 实际改动 20px 源时长的错位。
- 修复 apply-sync 计算 `durDelta` 忘记除 `speed`，同步倍速片段后续 clip 会被额外平移。
- 修复 `AssetImportPanel.tsx` 中 `ImportJob` 漏 `skipped: 0` 导致的前端构建报错（顺带修好）。

**三端一统：** 本地 `tsc --noEmit` 通过 → `git push origin main` → SFTP 上传 `dist/` → `pm2 restart qas-api`。


### v0.62 — 2026-04-20

**即梦孤儿任务自动恢复**

当即梦后台已经开了任务但前端/后端因网络抖动、CLI 超时或服务重启等原因没拿到 `submit_id` 时，之前会变成永远飞不回 H5 的"孤儿任务"。本版加入完整恢复链路：

- **[api] 提交意图预登记**：`/api/video/dreamina/submit` 在进入 CLI 前先把提交意图（`projectId + shotIndex + 最终 prompt + submittedAt`）持久化到 `<API_DATA_DIR>/output/batch-jobs/dreamina-intents.json`。拿到 `submit_id` 后立即标 resolved；任意失败路径也保留 intent 为 pending，以便后台兜底。
- **[api] 后台 scanner**：服务启动后每 2 分钟自动跑一次 `runRecoveryScan()`——调用 `list_task.py --limit 50` 拉即梦账号近 50 条任务，对每个 pending intent 按 (1) prompt fingerprint 精确匹配、(2) prompt 前缀双向包含、(3) 时间窗 + 任务类型兜底 的顺序反查候选 submit_id；命中后自动 `addJob` 注册进 batch-jobs 队列，现有 poller 会把成片落盘并经 SSE 推回 H5。pending 超过 30 分钟标 expired 不再扫。
- **[api] 诊断/手动接口**：新增 `GET /api/video/dreamina/recover/pending` 查看待恢复 intent、`POST /api/video/dreamina/recover/scan` 立即触发一次扫描。
- **[frontend] submit body 字段补全**：`ProductionWizard` 的即梦提交 body 新增 `projectId / shotIndex / shotDescription`，给后端 intent 登记提供必要锚点。
- **[infra]** `h5-video-tool-api/src/services/dreaminaRecovery.ts`（新文件，~300 行）+ `dreaminaVideo.ts` 导出 `listDreaminaTasks()` + `index.ts` 启动时 `startRecoveryScanner()`。

### v0.61 — 2026-04-20

**全局生成队列看板 + 版本历史时间线**

- **[frontend] 全局生成队列看板**：新增 useGlobalJobs hook 通过 SSE 实时订阅所有 batch-jobs 状态，在 Layout 右下角添加浮动触发按钮（显示进行中任务数量徽标），点击展开 GlobalJobsPanel 面板，分「进行中」和「最近完成」两组展示任务列表，支持按来源（高级制片/一键成片）分类显示
- **[frontend] 版本历史时间线**：新增 VersionTimeline 可视化时间轴组件，替换 StepStoryboardPreviewPanel 中的简单版本列表，以垂直时间线形式展示每个视频版本的生成时间、来源类型（批量生成/即梦生成/手动上传）、持久化状态，支持折叠/展开、一键保留当前版本


### v0.60 — 2026-04-20

**高级制片全链路体检：P0 阻断修复 + P1 体验强化**

**Bug Fix (P0 阻断点):**
- **[frontend] A/B 对比视频 URL 错位**：`StepStoryboardAbCompare.resolveUrl` 误把 `videoPath` 拼成 `/api/batch-jobs/video/<id>`；统一改走 `getVideoFileUrl`，并补上 `<video onError/onLoadStart>` 失败反馈（P0-1）
- **[frontend] AI 审片切镜数据串位**：`useProductionShotReview` 切换分镜时不再残留旧评审结果，`handleApplySuggestion` 校验 `reviewedShotIdx === selectedShotIdx` 才允许写回，避免"A 镜头建议落到 B 镜头"（P0-2 / P0-3）
- **[api] batch-jobs 列表/SSE 跨用户泄漏**：`GET /api/batch-jobs` 和 SSE 流统一按 `req.user.username` 过滤，`GET /api/batch-jobs/video/:id` 新增所有权校验（P0-4 / P1-3）
- **[api] /api/video/file 无 JWT 旁路**：新增 `fileAccessToken`（FAT，HMAC 签名短期 token），`/api/video/file` 与 `/api/batch-jobs/video/:id` 必须带 JWT 或 FAT，登录接口返回 FAT（P0-5）
- **[api] Dreamina 提交与 batch-job 注册原子化**：注册失败 3 次指数退避重试，仍失败时清楚提示"请手动点「检查进度」"；production 轮询从 10 min/5 min 死等改为 45s/90s/180s 指数退避（P0-6 / P1-2）
- **[api] asset-library 上传新增 fileFilter**：只允许 image/video/audio MIME 或白名单扩展名，阻断非预期文件类型（P0-7）
- **[api] localUpload 用户隔离**：上传目录改为 `uploads/<username>/`，移除全局 `uploadRegistry`；所有接口强制 JWT 校验（P0-8）
- **[frontend] 生成分镜表覆盖已有媒资**：`handleL3` 二次生成前弹确认，并按 `shotIndex` 合并保留 `previewStill*/previewVideo*/pendingVideoSubmitId` 等媒资字段（P0-9）

**Feature / 优化 (P1):**
- **[api] Compass LLM 429/5xx 退避与 Key 轮换**：`promptPolish.postCompassChatCompletions` 支持 429/5xx 重试、尊重 `Retry-After`，并在重试时自动切换到 `COMPASS_API_KEY2`（P1-11）
- **[api] editorExport 反解补齐 /api/production/image 路径**：导出时的封面/首帧图也能被正确映射到本地文件（P1-12）
- **[api] editorAssets 分片上传硬化**：`chunkUpload` 新增 `EDITOR_CHUNK_MAX_MB` 单片上限（默认 20 MB），校验 `totalChunks ≤ 推导上限`、`chunkIndex < totalChunks`；组装改为流式 pipe + 装配前总字节预检（P1-8 / P1-9）
- **[api] sha256 流式计算**：`assetIngestService.sha256File` 不再 `readFileSync` 整个大视频，改为 `createReadStream` 分块 update（P1-10）
- **[frontend] 风格参考图改存服务端 URL**：立项上传 styleRef 后并行 `uploadProductionImage` 拿回 `/api/production/image?path=...`，替换 `meta.styleRefImageDataUrl`，草稿 JSON 不再携带 MB 级 data: URL（P1-14）
- **[api] videoMultishot Dreamina 并发闸门**：`runMultishotJob` 每一镜进入 Dreamina CLI 前 `acquireDreaminaSlot()`，与 `/dreamina/submit` 共用同一信号量，避免超配（P1-1）
- **[api] videoMultishot 重启恢复**：新增 `recoverMultishotJobsOnBoot()`，启动时把残留 pending/running 任务落为 error，附带"服务重启"原因（P1-6）
- **[frontend] 连续播放器 onError 可见**：`StepStoryboardContinuousPlay` 的 `play().catch` 不再静默，展示"当前分镜加载失败（code X），可跳过"（P1-4）
- **[frontend] 本域 /api/ 视频 URL 统一基址**：`resolveProductionShotPreviewVideoSrc` 对 `/api/...` 也拼上 `VITE_API_BASE_URL`（P1-5）
- **[frontend] 资产导入进度含 skipped**：ImportJob 暴露 `skipped`，进度条改为 (processed+failed+skipped)/total，UI 多出"跳过"统计（P1-7）
- **[frontend] CharacterLookTree 失败层暴露 job.error**：`title` 展示后端错误原因，便于排障（P1-15）
- **[api] editorExport 缺失片段容错**：单个素材找不到时跳过而非整条失败，至少还有一段可用即可导出（P1-18）
- **[api] editorExport /export/:jobId 明确提示**：服务重启导致 job 丢失时返回 `EXPORT_JOB_NOT_FOUND` 和友好文案，提示用户去「历史导出」查看产物（P1-17）
- **[api] productionPersist 注释修正**：把"去掉所有 data: URL"的错误注释修正为"仅白名单 previewStillDataUrl"，防止未来误伤 imageDataUrl / previewVideoUrl（P1-13）

**Skipped / 后续优化（本轮未动）:**
- P1-16：制片批量生图 CONCURRENCY=1 是刻意设置，需配套压测再放宽
- P1-19：AI 审片版本历史属于新功能拓展

**Changed:**
- 登录响应体新增 `fileAccessToken` 字段
- `.env.example` 建议新增 `FILE_ACCESS_TOKEN_SECRET`、`EDITOR_CHUNK_MAX_MB`

---

### v0.59 — 2026-04-17

**三大核心功能 UX 全面优化（高级制片 + 视频剪辑 + 素材库）**

**Feature:**
- **[frontend] App.tsx 路由懒加载**：所有页面组件改为 React.lazy + Suspense 动态导入，首屏加载体积大幅减少
- **[frontend] 全局 Error Boundary**：新增 AppErrorBoundary 包裹整个路由，子组件渲染崩溃时展示友好错误页而非白屏
- **[frontend] 素材库删除功能**：素材卡片 hover 显示删除按钮，批量选中后支持批量删除；AssetGallery 新增浮动操作栏（移动到文件夹 / 批量删除 / 取消选择）
- **[api] 素材软删除 API**：新增 DELETE /assets/:id 单个软删除 + POST /assets/batch-delete 批量软删除（单次最多 200）；ssets 表新增 deleted_at 列，所有查询自动过滤已删除素材
- **[frontend] 素材库 → 高级制片/视频生成深度链接**：素材详情抽屉新增「用于高级制片」按钮跳转 /studio/production?assetId=...；Studio 和 ProductionWizard 自动接收素材并设为参考图
- **[frontend] 素材中台 → 即梦多模态引用打通**：DreaminaMultimodalRefs 新增「从素材库选择」按钮，打开 AssetPicker 选择素材后自动转换为多模态引用项
- **[frontend] 素材中台 → 剪辑器素材库打通**：MediaLibrary 添加素材时自动记录使用日志（
ecordUsage），支持视频和图片两种类型
- **[frontend] 高级制片术语优化**：「服化道」改为「角色场景」、「故事弧」改为「故事构思」、「Seedance 块」改为「AI 视频描述」等，降低专业门槛
- **[frontend] 剪辑器引导弹窗**：首次进入剪辑工作台弹出 onboarding 引导；视频源切换时新增 CSS 淡入动画
- **[frontend] BGM 生成 UI 重构**：快捷风格按钮替换为「情绪分类」（Mood Categories）选择器，更直观
- **[frontend] 高级制片导出页 Tab 化**：导出工作区拆分为「审片与剪辑」和「AI 视频描述」两个 Tab，各司其职
- **[frontend] 素材上传后自动滚顶 + 新素材高亮**：上传完成后页面自动滚到顶部，新上传素材 3 秒高亮闪烁提示
- **[api] 素材匹配增强**：matchAssetsForShot 同时搜索 legacy JSON 资产和 SQLite 素材中台数据，提升匹配覆盖率
- **[frontend] React key 警告修复**：AssetDetailDrawer 和 TemplateMarket 中修复非唯一 key 导致的 console 警告
- **[frontend] Layout 可访问性**：侧边栏按钮新增 ria-label，backdrop 新增 
ole="presentation"
- **[frontend] 导出提示优化**：Mock 模式导出完成提示改为「导出完成！文件正在后台处理中，请稍后在历史记录查看」
- **[frontend] 高级制片导出去重增强**：「在剪辑器中打开」优先使用 sourceProductionProjectId 进行项目去重匹配
- **[frontend] 制片向导步骤可达性**：根据项目完成度动态计算最大可达步骤，未解锁步骤显示禁用态

### v0.58 - 2026-04-17

**Editor Agent intelligence upgrade: multi-model Plan -> Build pipeline with three-level fallback**

**Feature:**
- **[api] Plan -> Build two-stage architecture**: Split the previous single LLM call into a Plan stage for natural-language reasoning and a Build stage for TimelineProject JSON generation. The Plan stage uses DeepSeek-R1, while the Build stage uses GPT-4.1.
- **[api] Three-level fallback**: If the Build model fails to produce valid JSON, the API retries with GPT-4o, then falls back to a simplified prompt generation path.
- **[api] Per-call model override**: `compassChatCompletionWithUsage` now accepts a `model` parameter, with `EDITOR_AGENT_PLAN_MODEL`, `EDITOR_AGENT_BUILD_MODEL`, and `EDITOR_AGENT_FALLBACK_MODEL` environment variables.
- **[api] Prompt and candidate-window reduction**: The Plan prompt was reduced from 3000+ tokens to about 500 tokens, the Build prompt to about 300 tokens, and the candidate window to top 20.
- **[frontend] Quick command templates**: The Agent panel shows first-use presets such as battle remix, character showcase, TikTok teaser, and high-energy remix with music.

**Benchmark:**
- Previous approach: gemini-2.5-flash single call, 15.1s / 4388 tokens / higher JSON failure rate.
- New approach: DeepSeek-R1 Plan + GPT-4.1 Build, about 8s / about 2500 tokens / much lower failure rate after fallback.

---

### v0.57 — 2026-04-17

**剪辑工作台：视频素材批量上传 + 拖拽上传**

**Feature:**
- **[editor] 批量视频上传**：文件选择器支持多选（`<input multiple>`），一次选择多个视频文件后逐个顺序上传；上传过程中显示批量队列面板，包含总进度条、每个文件的独立状态图标（待上传/上传中/完成/失败）和实时进度百分比
- **[editor] 拖拽上传**：素材列表区域支持 Drag & Drop，拖入视频文件时显示蓝色虚线覆盖提示「松开鼠标上传视频」；自动过滤非视频文件，仅处理视频格式
- **[editor] 空态引导优化**：素材库为空时显示虚线拖拽区域，引导用户拖拽文件或点击按钮上传
- **[editor] 文件大小校验增强**：批量上传时逐个校验文件大小，超限文件跳过并提示具体文件名和大小，不影响其余文件上传

---

### v0.56 — 2026-04-17

**素材库 ↔ 高级制片 数据打通**

**Bug Fix:**
- **[frontend] 素材中台「用于生成」无法供高级制片使用**：素材详情抽屉新增「用于高级制片」按钮，直接跳转 `/studio/production?assetId=...`；原「用于生成」按钮更名为「用于视频生成」以区分两个入口
- **[frontend] 高级制片「从素材库选择」看不到素材**：`CharacterWardrobePanel` 原来调用旧 `/api/assets` 索引（JSON 文件），与新素材中台 `/api/asset-library` 是两套数据互不相通。已改为使用 `listAssets()` 从新素材中台加载图片类型素材，缩略图和选择逻辑同步适配 `buildAssetFileUrl`

---

### v0.55 — 2026-04-16

**百老汇筑梦师 — Loading 体验全量接入**

**Feature:**
- **[frontend] Loading 组件体系重新主题化**（`src/components/loading/`）：将地牢主题全面替换为「百老汇筑梦师」剧院隐喻。7 个剧院空间（编剧室/排练厅/精修室/首演台/巡演厅/大厅/道具间）、11 个幕后角色（联合编剧/摄影师/灯光师/舞台监督/制片人/剪辑师/作曲家/化妆师/道具师/经纪人/引座员）、三段递进文案链、剧院主题彩蛋（聚光灯拖动/幕布拉开/掌声触发/灵感骰子）
- **[frontend] `TheaterLoadingScreen` 全屏剧院 Loading 组件**：替代 `DungeonLoadingScreen`，剧院金+深红配色体系、聚光灯扫过舞台进度条、场景标识徽章
- **[frontend] `RunningStatus` 组件升级**：新增可选 `scene` prop，传入剧院场景后 >3s 自动升级为卡片式角色文案轮播，不传时保持原有行为（完全向后兼容）
- **[frontend] 10+ 个等待场景全量接入剧院体验**：
  - 高优先级：StepVideo（视频生成→排练厅）、QuickFilm（一键成片→编剧室/首演台）、StepDesignHeader（补全缺图→道具间）
  - 中优先级：BgmMixPanel（BGM→精修室）、History（视频合并→精修室）、ExportPanel（导出→首演台）、CharacterWardrobePanel（定妆图→道具间）
  - 轻优先级：TabGenerate（Prompt 润色→编剧室）、TabDistribute（文案生成→巡演厅）、AssetImportPanel（素材上传→道具间）、ProjectList（项目加载→大厅）、MultiShotPromptInput（分镜帧→排练厅）
- **[api] Loading 资产生成脚本升级**（`scripts/generate-loading-assets.ts`）：Prompt 全面改为剧院主题（编剧室桌面/排练厅舞台/精修室混音台/首演大幕/巡演办公室/剧院大厅/道具间），SUNO 音效改为剧院环境音（打字机声/舞台回响/设备嗡鸣/首演序曲/爵士钢琴/手工氛围），场景从 5→7 个

---

### v0.54 — 2026-04-16

**高级制片：角色状态变体优化 — 形象演化 & 状态衣橱功能打通**

**Feature:**
- **[frontend] 状态衣橱 statePrompt 编辑**：每个角色状态新增"差异描述"文本框（`statePrompt`），AI 生图时以此为核心差异描述（而非仅用 label），大幅提升受伤/童年/换装等状态图生成质量
- **[frontend] 预设模板增强**：预设从纯 label 升级为 `StatePresetItem`（含 label + statePrompt），新增"年龄变化"预设组（童年/青年/中年/老年），每个预设自带详细差异描述
- **[frontend] 自定义状态 UX 重构**："+ 自定义"面板同时输入名称和差异描述，添加后自动展开编辑面板；状态卡片显示 prompt 摘要预览，无描述的显示"+ 添加描述"引导
- **[frontend] 分镜角色状态图接入**：`buildShotMultimodalRefPack` 及其异步版改用 `getCharacterShotImage()`，按优先级选取状态图（分镜手动覆盖 > 角色默认激活状态 > lookTree 定稿图），分镜侧栏缩略图和多模态引用面板同步切换
- **[frontend] 统一状态模型**："+ 添加状态"按钮从在 lookTree 上创建子节点改为在 `states[]` 上创建 `CharacterState`，消除两套并行数据结构的概念混乱
- **[api] 形象库 lookTree 持久化**：`/api/character-library/save` 和 import 接口扩展 `lookTree` + `activeLookId` 字段，跨项目导入时自动恢复形象演化树

**Bugfix:**
- **[api] 状态衣橱 AI 生图报 base64 padding 错误**：当 `baseImageDataUrl` 经过 `uploadProductionImage` 后变为 HTTP URL 时，`dataUrlToRawBase64()` 原样传给 Python 脚本导致 `binascii.Error: Incorrect padding`。新增 `resolveToRawBase64()` 异步函数，自动检测并 fetch HTTP URL 转为 base64，覆盖 `/frames`（首镜 + 非首镜）和 `/portrait` 路由

---

### v0.53 — 2026-04-16

**素材库性能优化：缩略图 + ReviewQueue 分页 + 错误标签清理**

**Feature:**
- **[api] 缩略图服务** (`assetThumbnailService.ts`)：上传时自动生成 300×300 JPEG 缩略图（图片用 sharp、视频用 ffmpeg 取首帧），存放于原文件同目录 `.thumbs/` 子文件夹
- **[api] `GET /assets/:id/thumb`** 端点：专门服务缩略图，支持 token query 认证，24h 浏览器缓存；缩略图不存在时触发异步生成并回退原文件
- **[api] `POST /generate-thumbnails`** 端点：一键批量为所有存量素材补生成缩略图
- **[api] `GET /pending-tags`** 端点：分页返回待确认标签（替代原来一次拉 100 条全量方案）
- **[api] 全部 asset 列表 API** 返回 `thumbnail_url` 字段（assets/search/favorites/recent）
- **[frontend] AssetCard** 网格视图使用缩略图渲染，视频素材仅 hover 时加载原始视频流
- **[frontend] ReviewQueue** 分页化（每页 20 条），不再一次加载所有素材筛选 pending
- **[data] 清理 28 个 ai_tag_error 错误标签**，从错误信息中恢复 9 个素材的 AI 分类

---

### v0.52 — 2026-04-16

**H5 地牢主题 Loading 体验组件 & 资产生成工具**

**Feature:**
- **[frontend] Loading 组件体系新建**（`src/components/loading/`）：统一等待管理器 `useLoadingOrchestrator` Hook + 全屏主题化展示组件 `DungeonLoadingScreen`，支持 5 个场景（地牢入口/酒馆/铁匠铺/结算台/断线重连）、时长分级自动升级（0-1s/1-3s/3-8s/8-15s/15s+）、非线性进度条、角色化文案三段递进（守门人/酒馆老板/铁匠/结算吏/旁白）、彩蛋系统（敲门回嘴/火把点亮/今日命签/安抚礼包）
- **[api] Loading 资产生成脚本**（`scripts/generate-loading-assets.ts`）：调用 Compass/Imagen 批量生成场景背景图（16:9，支持游戏原画画风参考锁定）+ 调用 SUNO 批量生成场景环境音效（纯器乐 MP3），已存在资产自动跳过，支持 `--images-only` / `--audio-only` 参数
- **[frontend] shimmer 动画关键帧**：`index.css` 新增进度条光泽流动动画

**资产清单（output/loading-assets/）：**
- 5 张 16:9 场景背景图（Imagen + Gold And Glory 原画画风参考）
- 10 首场景环境音效（SUNO V4.5 纯器乐，每场景 2 首备选）

---

### v0.51 — 2026-04-16

**一键成片串行提交队列 + 批量取消**

**Feature:**
- **[api] QuickFilm 串行提交队列**：`POST /quickfilm/:jobId/confirm` 改为只提交第一个分镜到即梦，其余分镜以 `awaiting_submit` 状态存入 `batchJobsQueue`。当前一个任务完成或失败时，队列自动提交下一个。避免多分镜同时提交触发即梦并发超限（ret=1310 ExceedConcurrencyLimit）
- **[api] `batchJobsQueue` 增强**：新增 `awaiting_submit` 状态和 `submitParams` 字段；新增 `submitNextQuickfilmShot()` 自动提交逻辑，由 `pollSingleJob` 在任务终态时触发；新增服务器重启恢复机制（poller tick 检测到无活跃任务但有 awaiting_submit 时自动续接）
- **[api] 批量取消接口**：新增 `DELETE /api/batch-jobs/project/:projectId`，一次取消项目内所有未完成任务（pending / queuing / processing / awaiting_submit）
- **[frontend] 批量任务看板增强**：新增「取消全部排队」按钮；状态汇总行新增「待提交 N」计数；`awaiting_submit` 状态显示为「🕐 排队待提交」并支持单独取消

**设计对齐：** 复用高级制片（ProductionWizard）的串行提交思路——前一个完成才放行下一个。高级制片靠前端 Promise 链 + SSE 慢速模式实现；一键成片靠后端 batchJobsQueue 事件驱动实现，适配无前端长连接的场景。

---

### v0.50 — 2026-04-16

**P1-G 外部依赖状态机标准化（第一阶段）**

**Feature:**
- **[api] `domain/job-status.ts` 增强**：新增 7 个服务适配函数 `fromBatchJobStatus`、`fromDreaminaPhase`、`fromKlingPhase`、`fromQuickFilmStatus`、`fromDreaminaHttpStatus`、`fromEditorExportStatus`、`fromRemixStatus`，将各服务原生状态映射到统一枚举 `queued | running | succeeded | failed | timeout | canceled`。新增 `isTerminalStatus()` 判断终态工具函数
- **[api] Batch Jobs SSE 推送附加 `unifiedStatus`**：`GET /api/batch-jobs/stream` 和 `GET /api/batch-jobs` 响应中附加 `unifiedStatus` 字段（向后兼容，不改变原有 `status` 字段），前端可渐进式迁移
- **[frontend] `types/jobStatus.ts` 新建**：前端统一任务状态类型定义，与后端 `domain/job-status.ts` 对齐，提供 `toUnifiedStatus()` 通用适配函数和 `isTerminalStatus()` 工具函数
- **[frontend] `BatchJobDto.unifiedStatus` 可选字段**：前端类型定义中添加后端自动附加的统一状态字段

**状态映射对照表：**
| 原生状态 | 统一状态 |
|---|---|
| `pending` / `awaiting_submit` / `queued` | `queued` |
| `running` / `processing` / `queuing` / `querying` / `rendering` | `running` |
| `done` / `completed` / `succeeded` / `success` | `succeeded` |
| `failed` / `error` | `failed` |
| `cancelled` / `canceled` | `canceled` |

---

### v0.49 — 2026-04-16

**巨石文件拆分第二阶段 — LLM 解析函数提取 + 前端 hooks 拆分**

**Refactor:**
- **[api] `riskSentimentParsing.ts` 新建**（747 行）：从 `riskSentimentService.ts` 提取 28 个 LLM 解析/归一化/快照补全函数，包括 `parseJsonRelaxed`、`extractJsonObject`、`normalizePct3`、`deriveOverviewScoreFromPcts`、`parseKeywordMatrix`、`normalizeCreators`、`rehydrateSnapshot` 等。主文件从 1744 行降至 1051 行（减少 693 行），跳过 Apify 采集相关函数
- **[frontend] `useProductionShotReview.ts` 新建**（116 行）：AI 审片 + 分镜间一致性检查 hook，封装 `handleAiReview`、`handleApplySuggestion`、`handleApplyAllAndRegenerate`、`handleContinuityCheck` 四个回调及相关 state
- **[frontend] `useProductionShotVersions.ts` 新建**（106 行）：分镜视频版本管理 hook，封装 `shotVideoVersions`、`selectShotVideoVersion`、`keepOnlyShotVideoVersion` 等版本选择/清理逻辑。`ProductionWizard.tsx` 从 1981 行降至 1851 行

**后端文件拆分进度（riskSentimentService.ts）：**
- `riskSentimentTypes.ts` → 140 行（类型定义，Phase 1）
- `riskSentimentParsing.ts` → 747 行（解析/归一化，Phase 2）
- `riskSentimentService.ts` → 1051 行（业务逻辑 + Apify 采集）
- 原始行数：1889 行 → 拆分后主文件：1051 行（减少 44%）

---

### v0.48 — 2026-04-16

**素材库 AI 一键整理 + 文件夹视图 + 性能优化**

**Feature:**
- **[asset-library] AI 一键整理**：顶部新增「🪄 AI 一键整理」按钮，一键完成未分类素材 AI 打标 + 按分类/文件名自动创建文件夹 + 归档素材
- **[asset-library] 文件夹网格视图**：全部素材 Tab 默认先展示文件夹卡片（类似 Finder），点击进入查看文件夹内容，未归入的素材显示在下方"未整理素材"区域
- **[asset-library] IntersectionObserver 懒加载**：素材卡片只在进入视口 200px 范围内才开始加载图片/视频，大幅减少首屏请求量
- **[asset-library] 文件夹导入**：上传面板新增「选择文件夹」按钮，支持 webkitdirectory 整个文件夹导入 + 拖拽文件夹自动递归扫描
- **[api] POST /auto-organize**：后端自动整理接口，策略 A（AI 分类）+ 策略 B（文件名前缀）叠加

---

### v0.48a — 2026-04-16

**AI 剪辑智能优化 · 方向7 用户反馈学习（基础版）**

**Feature:**
- **[api] `userPreferenceService.ts` 新建**：轻量级用户偏好画像服务——导出时收集行为统计（片段 activity 类型、平均时长、数量），使用 EMA（指数移动平均，α=0.3）平滑更新，避免单次导出覆盖历史偏好
- **[api] `POST /api/editor/preference/report`**：接收前端导出时的行为报告，更新用户偏好 JSON 文件（按用户名隔离存储）
- **[api] `GET /api/editor/preference`**：查看当前用户偏好画像（调试用）
- **[api] `buildPreferencePromptSnippet`**：根据用户历史偏好生成 LLM prompt 片段（如"偏好的内容类型：击杀瞬间、团战"、"平均片段时长 2.1秒（偏好快切）"），自动注入剪辑 Agent 排片时的 system prompt
- **[editor-agent] 偏好注入**：`editorAgentService.ts` 的 `buildSystemPrompt` 新增 `userPreferenceSnippet` 参数，排片调用时自动加载当前用户偏好；`runEditorAgentApply` 通过 `options.username` 传入用户身份
- **[frontend] 导出行为静默上报**：`ExportPanel` 导出成功后 fire-and-forget 调用 preference/report，收集视频轨 clips 的 activity、时长、meta 数据

**设计要点：**
- 偏好数据为纯 JSON 文件（`{DATA_DIR}/.data/preferences/{username}.json`），不依赖数据库
- LLM prompt 中明确标注"用户当前指令优先级高于历史偏好"，避免偏好干扰显式需求
- 首次导出即建立画像，无需用户额外操作

---

### v0.47 — 2026-04-16

**素材库智能优化（Phase 0-4 全量）**

**Feature:**
- **[asset-library] AI 智能分类**：上传时自动识别 7 大类别（角色/武器道具/场景/UI素材/宣传图/视频片段/未分类）+ 30 字描述，结果存入 assets 表 `ai_category` / `ai_description`
- **[asset-library] Tab 导航**：新增「最近使用」「收藏」Tab，加上原有「全部素材」和「Google Drive」
- **[asset-library] 收藏系统**：素材卡片星标收藏/取消收藏，`asset_favorites` 表持久化
- **[asset-library] 最近使用**：`asset_usage_log` 记录使用历史，最近使用 Tab 展示
- **[asset-library] AI 分类虚拟文件夹**：左侧栏按 ai_category 分组，显示各类别数量，点击筛选
- **[asset-library] 自定义文件夹 CRUD**：侧栏创建/重命名/删除文件夹，支持 3 级嵌套
- **[asset-library] 拖拽归档**：素材卡片支持 HTML5 原生拖拽到文件夹；选中多个后可批量移动
- **[asset-library] 图片悬停放大**：鼠标悬停图片 400ms 弹出 360px 大图预览浮窗（fixed 定位）
- **[asset-library] 搜索增强**：搜索范围扩展到 ai_description + ai_category
- **[asset-library] Google Drive 集成**：OAuth 2.0 连接、文件浏览、按需缓存、缩略图代理

**Schema 变更：**
- `assets` 表新增 `ai_category TEXT`、`ai_description TEXT`、`folder_id TEXT`
- 新增 `asset_folders`、`asset_favorites`、`asset_usage_log` 三张表

---

### v0.47a — 2026-04-16

**巨石文件拆分第一阶段：riskSentimentService 类型提取**

**Refactor:**
- **[api] `riskSentimentTypes.ts` 新建**：从 `riskSentimentService.ts`（1744行）提取全部类型定义（`RiskVideo`、`RiskCreator`、`CommentTask`、`RiskSnapshot`、`RiskStrategyBlock` 等 12 个类型，128行），主文件通过 `export type` 重导出，消费方零改动
- 主文件行数 1744 → 1626（-118行），后续阶段将继续提取 Apify 数据采集和 LLM 解析函数

---

### v0.46 — 2026-04-16

**高级制片 → 剪辑器 增量同步（Phase 3）**

**Feature:**
- **[editor] 同步更新按钮**：从制片导入的剪辑项目顶栏新增「🔄 同步更新」按钮，点击对比制片端最新选定视频版本与剪辑器内版本
- **[editor] SyncProductionModal 差异展示**：弹窗式差异列表，逐镜显示「有新版本 / 无变化」状态，支持勾选批量替换或全选
- **[api] POST /sync-production**：后端对比制片项目 `selectedPreviewVideoVersionId` 与剪辑器 clip `meta.productionVersionId`，返回逐镜差异
- **[api] PATCH /apply-sync**：后端执行替换——更新素材 URL、clip sourceEnd、meta.productionVersionId、meta.syncedAt，并自动位移后续 clip 适配时长变化
- **[editor] 时长变化自动处理**：同步替换时若新视频时长与旧版不同，自动调整当前 clip 的 sourceEnd 并位移后续所有 clip 的 timelineStart，保持时间轴连续性
- **[editor] 同步后自动刷新**：替换完成后自动重新加载编辑器项目，确保 UI 与持久化数据一致

**新增文件：**
- `h5-video-tool/src/editor/components/SyncProductionModal.tsx` — 同步差异弹窗组件

---

### v0.46a — 2026-04-16

**镜头版本历史完整实现（版本切换 API + 版本清理 + 上限提示）**

**Feature:**
- **[api] PATCH `/api/production/project/:id/shots/:shotIndex/version`**：镜头版本切换即时持久化接口——切换版本时不再等待 auto-save（3s 防抖），而是立即将 `selectedPreviewVideoVersionId` 写入服务端 JSON，消除「切版本 → 刷新 → 版本回退」问题
- **[api] DELETE `/api/production/project/:id/shots/:shotIndex/versions`**：版本清理接口——保留指定版本，删除该镜头其他版本的视频文件并更新项目 JSON；路径穿越防护确保只能删除 `API_DATA_DIR` 下的文件
- **[frontend] `apiPatch` 通用请求函数**：`api/client.ts` 新增 PATCH HTTP 方法支持
- **[frontend] 版本切换即时同步**：`selectShotVideoVersion` 回调在更新本地 state 的同时 fire-and-forget 调用 PATCH API
- **[frontend] 版本清理调用后端**：「仅保留当前」按钮触发时同步调用 DELETE API 清理服务器上的旧版本视频文件
- **[frontend] 版本上限提示**：当某镜头视频版本 >= 5 个时，版本列表上方显示黄色提示「版本已达 N 个，建议清理旧版本以节省磁盘空间」

---

### v0.45 — 2026-04-16

**高级制片 → 剪辑器 体验串接优化（Phase 1）**

**Feature:**
- **[editor] 导入引导弹窗**：从高级制片导入剪辑器后，自动弹出引导窗口，显示导入分镜数和总时长，推荐「一键生成配乐」和「先预览一遍」两个下一步操作；同一项目仅显示一次（localStorage 记录）
- **[editor] 来源制片项目标识**：从制片导入的剪辑项目，顶部栏显示「📎 来自「项目名」→」标签，点击可跳回制片工作台
- **[editor] 去重检查**：点击「在剪辑器中打开」时，如果已存在同名关联剪辑项目，弹出确认对话框——可选择打开已有项目或创建新项目，避免重复创建
- **[studio→editor] 分镜元数据传递**：导入剪辑器时，每个 VideoClip 的 `meta` 字段自动填充分镜结构化信息（景别、运镜、主体、动作、场景、情绪、光影、台词），为 AI Agent 智能剪辑提供上下文
- **[type] VideoClip 扩展**：前后端 `VideoClip` 接口新增 `meta?: Record<string, unknown>` 字段
- **[type] TimelineProject 扩展**：前后端 `TimelineProject` 接口新增 `sourceProductionProjectId` 和 `sourceProductionTitle` 字段，支持双向链接
- **[studio] 分镜描述截断**：导入时 note 截断长度从 60 字符提升到 120 字符，保留更多分镜描述信息

**新增文件：**
- `h5-video-tool/src/editor/components/ImportGuideModal.tsx` — 制片导入引导弹窗组件

---

### v0.44 — 2026-04-16

**前端设计系统建立 & UI 全面升级**

**Feature:**
- **[design] DESIGN.md 设计系统**：创建融合 Framer（工具精度）+ RunwayML（电影质感）的 GOBS 专属设计规范，涵盖色彩 Token、排版层级、组件样式、深度系统、响应式行为共 9 章节
- **[design] Cyan 双色系**：新增 `--color-accent: #22d3ee` 作为第二色彩维度，贯穿 Hero 光晕、快捷入口、用户头像渐变、NEW 标签等，视觉层次从单色升级为双色系
- **[css] Token 双源冲突修复**：删除 `@theme` 块中与 `:root` 重复且不一致的变量定义，统一为单一来源
- **[css] 背景氛围升级**：body 背景从两层渐变升级为三层径向渐变（主色左上 22% + cyan 右上 12% + 底部微光 8%），深空舞台感
- **[css] 组件类库扩充**：新增 `.btn-primary`（药丸+光晕）、`.btn-secondary`（毛玻璃）、`.btn-ghost`、`.chip` / `.chip-cyan`（标签药丸）、`.video-card`（零阴影内容卡片）、`.section-overline`（uppercase 引导词）
- **[css] 动画体系**：新增 `animate-fade-in-up`（弹出感）、`animate-glow-pulse`（光晕呼吸）、`.stagger-children`（子元素错开入场）、`.nav-stagger`（侧栏导航入场），统一弹性缓动 `cubic-bezier(0.16, 1, 0.3, 1)`
- **[layout] 侧栏重设计**：导航分组加 section-overline 标签（"创作"/"后期 & 素材"/"分发 & 工具"）；Active 项左侧 3px 发光指示条 + 光晕阴影；图标统一 18px/1.8 stroke
- **[layout] 用户区升级**：渐变头像圈（primary→cyan）显示首字母 + 用户信息 + 图标工具栏（设置/监控/退出），退出按钮 hover 变红
- **[home] 首页升级**：Hero 三层光晕（含呼吸动效）；快捷入口 emoji 替换为 5 个统一 SVG 图标，"视频分发"用 cyan accent 色差异化
- **[studio] 页面 Header 升级**：毛玻璃 backdrop-blur + `.page-title` / `.page-subtitle` 排版类 + Tab 指示器改为绝对定位圆角小条

---

### v0.43a — 2026-04-16

**剪辑工作台——导出修复 & 播放连续性修复**

**Fix:**
- **[backend] 导出素材找不到 prod_shot_* 修复**：`editorExport.ts` 新增 `resolveLocalPathFromUrl()` 函数，支持从 `/api/video/file?path=xxx`、`/api/batch-jobs/video/<jobId>`、`/api/editor/assets/files/<id>` 三种 URL 格式反解本地文件路径，解决高级制片分镜导入剪辑器后导出报错「素材文件不存在」
- **[frontend] 导出请求携带 assets 映射**：`ExportPanel` 新增 `assets` prop，导出时一并发送给后端，使后端能通过 URL 定位非本地上传的素材文件
- **[backend] 导出接口 schema 扩展**：`EditorExportRequestBody` 新增可选 `assets` 字段，向后兼容
- **[frontend] 分镜间播放中断修复**：剪辑工作台播放多段分镜时，切换视频源导致 `play()` 被 AbortError 中断会误设 `isPlaying=false`；现忽略 AbortError 并新增 `onCanPlay` 回调，视频加载就绪后自动恢复播放
- **[backend] 导出缺失 BGM 修复**：BGM 文件存储在 `uploads/editor/music/` 下，但导出时未搜索该目录；新增 `uploads/editor/music/` 到搜索路径，并支持 `/api/editor/music/files/<id>` URL 反解

---

### v0.43 — 2026-04-16

**高级制片——分镜编辑体验 & 版本持久化修复**

**Feature:**
- **[frontend] 分镜参数折叠**：`StepStoryboardFieldsEditor` 默认折叠，只显示摘要行（参考图 + 主体 · 景别 · 运镜 · 时长），点击「展开编辑」才显示完整字段表单，大幅减少视觉噪音
- **[backend] AI 审片融入分镜生成**：`/api/studio/storyboard-table` 路由新增 `autoRefineShots()` 后处理——单次 LLM 调用批量审查并优化所有镜头的 `structuredStill` / `structuredMotion` 字段，生成时即完成质量把控，无需额外手动审片步骤

**Fix:**
- **[backend] 视频版本丢失修复**：`productionPersist.ts` `/project/save` 接口改为保存前先读取现有文件，对每个 shot 的 `previewVideoVersions` 做 union merge by id，防止前端自动保存覆盖后端 `writeBackToProject` 已写入的视频版本

---

### v0.42 — 2026-04-15

**配乐逻辑修复：Suno 优先 + 内容感知配乐 + 高级制片预填**

**Fix:**
- **[backend] Suno API callBackUrl 400 修复**：`sunoMusic.ts` 中移除空字符串 `callBackUrl` 字段（Suno API 拒绝空值），Suno 现在可正常调用
- **[backend] 服务器 SUNO_API_KEY 配置**：部署环境 `.env` 补充 `SUNO_API_KEY`，一键配乐现在真正优先走 Suno API
- **[editor] Agent 自动配乐日志硬编码修复**：`EditorWorkbench.runAutoBgmFromAgentMessage` 中"Lyria"硬编码改为动态读取 `res.provider`，日志正确显示实际引擎（Suno/Lyria）

**Feature:**
- **[editor] 内容感知配乐**：一键智能配乐时自动从时间轴视频片段的 note 字段提取内容摘要（分镜描述、场景说明），拼入 polish 请求；后端 `editorMusicPromptPolish` 增强为理解"视频内容"上下文，生成的 BGM 风格匹配实际画面内容
- **[studio → editor] 高级制片配乐预填**：从高级制片导出到剪辑器时，自动从 `SoundMusicPlan.music[].mood` 提取配乐风格描述，写入 `TimelineProject.mix.bgmPromptHint`；BgmMixPanel 首次加载时预填该提示词，显示紫色"来自制片规划"标签
- **[editor] `TimelineMix` 类型扩展**：新增 `bgmPromptHint?: string` 字段，承载来自上游（高级制片）的配乐风格提示

---

### v0.42a — 2026-04-15

**高级制片——分镜工作台体验优化（6 项新功能）**

**Feature:**
- **[P0] 批量生成所有缺失视频**：ShotStrip 上方新增「一键生成所有缺失视频」按钮，自动遍历所有尚无视频的分镜并通过自适应队列串行提交。核心 `handleGenerateShotVideo` 重构为参数化 `generateVideoForShotIdx(idx)` 供单镜/批量共用。
- **[P0] AI 审片助手（评论生成 + 编辑生成）**：后端新增 `POST /api/studio/shot-review`（Compass LLM 文本审片），分析单镜结构化 Prompt 的完整性与一致性，输出综合评分（1-10）和逐字段改进建议。前端展示建议卡片，每条可「采纳」一键修改对应字段，支持「全部采纳并重新生成」完成闭环。
- **[P1] 快速调整面板**：分镜编辑区新增运镜（固定/缓推/手持/航拍/环绕）、节奏（极慢~极速）、光影（明亮~霓虹）、一键氛围（更戏剧化/更安静/更快节奏）预设按钮，直接映射到 `structuredStill` / `structuredMotion` 字段。
- **[P1] 连续播放审片模式**：工具栏新增「连续播放」按钮，全屏 overlay 自动按序播放所有有视频的分镜，支持键盘快捷键（← → 切镜 / 空格暂停 / Esc 退出）和底部缩略图导航，统计总时长与缺失镜头数。
- **[P2] 版本 A/B 对比**：当本镜有 ≥2 个版本时显示「版本 A/B 对比」按钮，全屏左右分屏选择不同版本同步播放，支持为每个版本添加备注标签。
- **[P2] 分镜间一致性检查**：后端新增 `POST /api/studio/continuity-check`（Compass LLM），检查相邻镜头的色调/角色外观/场景过渡/动作连贯/光线一致性，按 warning/error 分级。前端展示问题列表，支持跳转到问题镜头。

**新增文件：**
- `h5-video-tool-api/src/routes/shotReview.ts` — 后端 AI 审片 + 一致性检查路由
- `h5-video-tool/src/api/shotReview.ts` — 前端 API 客户端
- `h5-video-tool/src/studio/steps/StepStoryboardAiReview.tsx` — AI 审片面板组件
- `h5-video-tool/src/studio/steps/StepStoryboardQuickAdjust.tsx` — 快速调整面板组件
- `h5-video-tool/src/studio/steps/StepStoryboardContinuousPlay.tsx` — 连续播放 overlay 组件
- `h5-video-tool/src/studio/steps/StepStoryboardAbCompare.tsx` — A/B 版本对比 overlay 组件
- `h5-video-tool/src/studio/steps/StepStoryboardContinuityCheck.tsx` — 一致性检查面板组件

---

### v0.41 — 2026-04-15

**高级制片——自适应视频生成队列 + 后端信号量泄漏修复**

**Feature:**
- **[前端] `ProductionWizard.tsx` 自适应队列**：连续点击多个分镜「生成视频」时，前端串行队列自动调度。默认快速模式（拿到 submitId 即放行下一个），如果即梦返回并发限制（ret=1310），自动切换为慢速模式——等前一个视频完全生成完毕再提交下一个，连续 2 次成功后自动恢复快速模式。
- **[前端] 排队状态可视化**：Shot Strip 缩略条区分三种状态（排队中/提交中/即梦生成中），按钮显示"排队等待中…（前方 N 个）"。

**Fix:**
- **[后端] `videoDreamina.ts` 信号量泄漏修复**：production 源任务提交成功后立即释放 Dreamina 信号量 slot（之前 slot 被 hold 到前端轮询完成，但 production 任务已改为后端 batch-job 轮询，导致 slot 永不释放，5 分钟超时后才回收）。新增 `source` 请求参数区分来源。
- **[前端] `VideoGenerateRequest` 新增 `source` 字段**：production 模式提交时携带 `source: 'production'`，后端据此决定是否立即释放信号量。

---

### v0.40 — 2026-04-15

**高级制片——视频风格约束修复**

**Fix:**
- **[前端] `productionAssets.ts` `buildProductionShotVideoStoryboardText`**：补入原本遗漏的 `sp_lighting`（光影）和 `sp_style`（色调/风格）字段，确保视频 Prompt 携带每镜的光影与风格描述。新增可选参数 `globalStyleRef`，可在 Prompt 末尾追加全局风格约束。
- **[前端] `ProductionWizard.tsx` `handleGenerateShotVideo`**：在所有模式（multimodal / text2video / image2video）提交即梦之前，统一检查并追加缺失的 `sp_lighting`、`sp_style`、`styleRefSummary`（全局视觉风格描述），避免即梦因缺少色调指令而生成与项目风格不符（如黑白项目出彩色）的视频。

---

### v0.39 — 2026-04-15

**剪辑 Agent JSON 解析鲁棒性增强**

**Fix:**
- **[api] `editorAgentService.ts` extractJson 重写**：从仅匹配第一个 code block 改为三层提取策略——扫描所有 `` ```json ``` `` code block 取最长 → 花括号配对找最外层 `{…}` → 原文兜底，解决模型输出带额外解释文字时提取失败的问题。
- **[api] 新增 `repairJson` 修复层**：自动处理 LLM 常见 JSON 缺陷（尾逗号、`//` 行注释、token 截断导致的未闭合括号），首次 parse 失败后自动修复重试。
- **[api] Compass API 调用加 `response_format: { type: 'json_object' }`**：从 API 层约束 Gemini 输出纯 JSON，大幅降低非法 JSON 概率。
- **[api] `promptPolish.ts`**：`compassChatCompletionWithUsage` 新增可选 `responseFormat` 参数，支持调用方指定输出格式约束。
- **[api] 错误信息增强**：修复仍然失败时，错误消息包含模型原始输出前 300 字符片段，便于快速定位问题。

**Root Cause：** Compass Gemini 模型偶尔在 JSON 外包裹 Markdown 说明文字或 code block 格式不标准，原 `extractJson` 仅匹配第一个 `` ``` `` 对无法应对所有变体，导致 `JSON.parse` 失败抛出"模型返回不是合法 JSON"。

---

### v0.38 — 2026-04-15

**即梦 ret=1310 ExceedConcurrencyLimit 自动重试 + 友好提示**

**Fix:**
- **[api] `videoDreamina.ts` 自动重试**：多模态和非多模态路径均新增 1310 重试机制——首次收到 `ExceedConcurrencyLimit` 时自动等待 45s 后重试一次（不释放并发槽），透明解决"服务重启后旧任务残留"场景；重试仍失败则释放槽并抛出用户友好错误。
- **[api] 友好错误文案**：最终失败改为抛 `"即梦账号当前有生成任务排队中，请 2-3 分钟后重试"`，不再暴露原始 `ret=1310, logid=...` 给用户。
- **[frontend] `useVideoGeneration.ts` 兜底**：`normalizeError` 补充 `ret=1310 / ExceedConcurrencyLimit` 识别，即使后端未处理也能显示中文提示。

**Root Cause：** 服务器重启后内存信号量重置为"空闲"，但即梦账号上仍有上一次 session 留下的任务在跑，提交新任务即被即梦拒绝；之前代码直接将原始 API 错误透传前端显示。

---

### v0.37 — 2026-04-15

**高级制片 · 放映室审片体验优化**

- **[studio] 分镜视频切换自动连播**：放映室（ScreeningRoomPlayer）切到下一分镜后视频自动开始播放，无需手动点击
  - 新增 `onCanPlay` 回调，在视频数据就绪时触发 `play()`，取代旧的 `useEffect` 方式（旧方案在 `key` 切换重建 `<video>` 后时机过早导致不生效）
  - 添加 `autoPlay` 属性作为双保险
  - 播放链路：`onEnded` → `goNext` → `key` 变化重建 `<video>` → 新源加载 → `onCanPlay` → 自动播放

---

### v0.36 — 2026-04-15

**AI 剪辑智能优化 · 第三批（方向6 画面-音乐情绪对齐）**

- **[editor-agent] 情绪张力维度（方向6）**：
  - `VisionFrameScore` 新增 `tension`（情绪张力 0–10，与剪辑价值 score 分离）和 `emotionTag`（calm/tense/triumphant/sad/exciting）
  - Gemini 打分 prompt 更新，每帧同时输出 tension + emotionTag
  - 内容地图（Content Manifest）现在显示情绪分布统计（如 `exciting×5 / tense×3 | 平均张力：6.2/10`）
- **[editor-agent] BGM 段落 × 画面情绪对齐规则**：
  - drop（high energy）段 → 优先 tension ≥ 7、emotionTag=exciting/triumphant 的画面
  - build（mid energy）段 → 优先 tension 4-6、emotionTag=tense 的画面
  - intro/outro（low energy）段 → 优先 tension ≤ 3、emotionTag=calm/sad 的画面
  - 无 BGM 时按叙事模板段落位置推断张力期望
  - 强制约束：同一 BGM 段落内画面张力变化幅度 ≤ 5

---

### v0.35 — 2026-04-15

**AI 剪辑智能优化 · 第二批（方向2 叙事结构 + 方向4 切点质量）**

- **[editor-agent] 两阶段叙事结构排片（方向2）**：
  - 新增三套叙事模板：`经典高光`（混剪爽点）/ `角色故事`（角色宣传）/ `节奏混剪`（BGM 先行）
  - 系统根据用户意图自动选模板（有 BGM → 节奏混剪；战斗类 → 经典高光；其他 → 角色故事）
  - 新增 `buildContentManifest()` 将视觉评分组织为「内容地图」，按 钩子/动作顶点/战斗高光/铺垫/平静 五类分组，带时间戳标注
  - LLM prompt 注入叙事模板 + 内容地图，引导 AI 按开场→铺垫→高潮→收尾结构排片，告别「高分片段堆砌」
- **[editor-agent] 切点质量优化（方向4）**：
  - `VisionFrameScore` 新增 `isActionPeak`（动作顶点帧，如击杀瞬间/技能命中）和 `cameraMotion`（镜头运动类型：static/pan/zoom/shake）
  - Gemini 打分 prompt 更新，现在返回两个新字段
  - System prompt 注入切点规则：动作顶点优先切入、动接动原则、连续静态镜头须插入运动镜头

---

### v0.35a — 2026-04-15

**高级制片 · 视频生成架构升级：后端轮询 + SSE 推送**

核心变更：即梦视频生成从「前端 10 分钟死轮询」迁移至「后端智能轮询 + SSE 实时通知」，彻底解决长时间生成导致的视频丢失。

- **[arch] 后端智能轮询**：production 来源的 batch-job 提交后前 10 分钟不轮询，之后每 5 分钟自动检查一次即梦状态；4 小时 TTL 防僵尸任务
- **[feat] 自动回写项目 JSON**：视频落盘后自动更新服务端项目文件的 `previewVideoVersions`，关闭浏览器也不丢失
- **[feat] SSE 实时推送**：视频就绪后通过 batch-jobs SSE 通道推送到前端，自动填入分镜预览并 toast 提示
- **[feat] 手动检查进度**：分镜面板新增「手动检查进度」按钮，用户可随时立即查询即梦状态（`POST /api/batch-jobs/:id/poll-now`）
- **[fix] batch-jobs video 鉴权放行**：`GET /api/batch-jobs/video/:id` 加入免鉴权白名单，`<video>` 标签可直接播放

---

### v0.34 — 2026-04-15

**高级制片 · 分镜视频丢失修复 & 持久化健壮性提升**

- **[fix] 分镜视频轮询超时**：`submitAsync` 的 10 分钟超时不再包含后端信号量排队等待时间，每个即梦任务拥有独立完整的轮询窗口（修复 `DREAMINA_MAX_CONCURRENT=1` 时后排任务超时丢失视频的问题）
- **[fix] 后端视频下载 fallback**：`persistVideoUrlToOutput` 落盘失败时，若原始即梦 URL 为 HTTPS，直接返回给前端作为播放 fallback，不再返回空 videoUrl 导致轮询死循环
- **[fix] 刷新保护 — 合并 localStorage 视频数据**：页面加载从服务端读取项目时，自动合并 localStorage 中已保存但服务端尚未同步的视频版本，防止 3 秒防抖窗口内刷新导致视频丢失
- **[fix] 切换视频版本同步顶层字段**：`selectShotVideoVersion` 现在同步更新 `previewVideoPath`/`previewVideoUrl`，修复切换版本后分镜整合页显示「尚未生成视频」的问题
- **[opt] 视频保存立即同步**：分镜视频保存后立即上传服务端（绕过 3 秒防抖），大幅缩小刷新数据丢失窗口

---

### v0.33 — 2026-04-15

**架构优化任务全部完成（TASK-01 ~ TASK-06）**

**已归档完成的架构任务：**
- **[arch] TASK-01 ProductionWizard 拆分**：从 3994 行巨石文件拆分为多个 Step 子组件（StepExportWorkspace、StepStoryboardWorkspace 等）
- **[arch] TASK-02 统一视频生成服务层**：消除前端三处重复的生成逻辑，统一通过 hook 调用
- **[arch] TASK-03 剪辑器持久化 + 撤销**：刷新不丢失项目，支持 Ctrl+Z 撤销操作
- **[arch] TASK-04 多镜头异步化**：分镜视频生成从同步阻塞改为 Job 队列，支持并发提交
- **[arch] TASK-05 多用户数据隔离**：所有用户数据按 username 分目录存储，localStorage 隔离
- **[arch] TASK-06 即梦登录态检测**：生成前检测 CLI 登录状态，防止"假完成"静默失败

---

### v0.32 — 2026-04-15

**高级制片导出页 · P1 版本角标 + P2 在剪辑器中打开**

**Feature:**
- **[studio] 胶片条版本角标**：分镜有多次生成版本（v2、v3…）时，胶片条缩略图左上角显示「vN」蓝色角标
- **[studio] 在剪辑器中打开**：导出页新增主操作按钮，一键将所有已生成分镜视频按顺序导入剪辑工作台
  - 自动构建 TimelineProject：每个分镜视频作为 VideoClip 按 shotIndex 顺序排列，自动同步 A1 原声轨
  - 项目名称自动命名为「{制片项目名}-剪辑」，保存后跳转 `/editor?project=<id>`

---

### v0.31 — 2026-04-15

**AI 剪辑智能优化（方向1+5+3 首批落地）**

**方向 1 · 行为细化分类（Behavior Taxonomy 二级体系）：**
- `gameTaxonomy.ts` 新增 `ActivityGroup` 接口，支持 `activityGroups`（一级+二级）配置。只需在 `config/game-taxonomy.json` 加入 `activityGroups` 字段即可启用
- `frameVisionRank.ts` 扩展 `VisionFrameScore`：新增 `activitySecondary`（二级行为细分）、`intensity`（low/mid/high 强度）、`isTurningPoint`（叙事转折点 flag）
- Gemini prompt 自动根据是否配置 `activityGroups` 切换输出格式（单标签 → 结构化三字段）
- `editorAgentService.ts` 中 `buildIntentPriorityWindows` 利用新字段加权：`isTurningPoint=true` +1.5分、`intensity=high` +0.5分，转折点帧优先进入候选

**方向 5 · 内容多样性约束：**
- LLM 排片 prompt 新增强制多样性规则：同类行为连续不超过3次、战斗段必须穿插缓冲片段、首片段优选钩子/转折点、末片段优选最高分、快切与慢镜比例约 3:1

**方向 3 · 音乐先行 · 节拍分析（基础版）：**
- 新建 `scripts/beat_analysis.py`（依赖 `librosa`）：输入音频路径，输出 BPM、节拍时间点数组、能量段落（intro/build/drop/outro）
- 新建 `src/services/musicBeatAnalysis.ts`：调用 Python 脚本，返回 `BeatInfo`；Python 或 librosa 不可用时自动降级（返回 null，不影响正常剪辑）
- `editorAgentService.ts` 集成：当 `EDITOR_BEAT_ANALYSIS=1` 且项目有 BGM audio 轨时，自动分析 BGM 并在 LLM prompt 中注入节拍约束（段落时间分配、切点对齐建议、drop 段快切规则）

**启用音乐先行功能：** 在 `.env` 中加 `EDITOR_BEAT_ANALYSIS=1`，并在剪辑器里为时间轴添加 BGM 音频轨，再触发 AI 剪辑即可。

---

### v0.30 — 2026-04-15

**高级制片导出页 · 放映室连续播放器（P0）**

**Feature:**
- **[studio] ScreeningRoomPlayer 组件**：导出页新增放映室视图，将所有分镜视频按顺序串联连续播放
  - 主播放区（16:9）：有视频的镜头自动播放，结束后自动切下一镜；无视频镜头显示静帧，停留 2 秒自动跳下一镜
  - 顶部覆盖层：显示「镜N / 共N镜」 + 上一镜/下一镜按钮
  - 底部覆盖层：当前镜头描述文字
  - 胶片条（filmstrip）：横向滚动缩略图，点击跳转，当前镜高亮蓝框，绿点/灰点标注视频生成状态
  - 实时进度统计：「已生成视频（N/N）」
- **[studio] 放映室 ↔ 网格视图切换**：右上角按钮在两种视图间切换，默认进入放映室

---

### v0.29 — 2026-04-15

**「我的成片」页面 UX 全面精简**

**UX:**
- **[gallery] 移除顶部说明段落**：删除约 4 行"此处只收录…即梦 App 不同步"说明文字，首屏直接呈现内容。
- **[gallery] Tab 标签优化**：`本机历史 (N)` → `我的成片 (N)`；`服务端 output 成片` → `服务端文件`；每个 Tab 新增悬浮 `?` tooltip 取代内联说明段落。
- **[gallery] 删除服务端 tab 内两块说明 Block**：移除"和「本机历史」的区别"4 条 bullet 与 VITE_API_BASE_URL 说明段落。
- **[gallery] 空状态改为简洁 CTA**：`我的成片` 空状态 → 大图标 + 一句话 + 两个行动按钮；`服务端文件` 空状态 → 图标 + 刷新/返回按钮，无技术文字。
- **[gallery] 文件名可读化**：服务端文件卡片不再展示原始 hash 路径，改为格式化名称（即梦成片显示"即梦成片 · 月/日 时:分"）。
- **[gallery] 按钮文案**：`加入本机历史` → `保存到我的成片`；删除按钮改用 Trash 图标。

---

### v0.28 — 2026-04-15

**高级制片导出页分镜卡片 UI 优化**

**Feature:**
- **[studio] 导出分镜卡片重构**：统一卡片为「媒体区（上）+ 描述（下）」两层结构，消除有/无视频时卡片高度不一致的问题
  - 已生成视频：直接在媒体区显示 `<video>` 播放器，静帧作为 `poster` 封面（点击播放前展示），不再叠加额外的图片层
  - 未生成视频：媒体区显示静帧图，右下角附「尚未生成视频」小角标，比原来整行提示文字更轻量
  - 所有卡片等高，4 列网格布局整齐对齐

---

### v0.27 — 2026-04-15

**素材库 UI 重设计 + 中文文件名编码修复 + 多账号数据隔离**

**Feature / Fix:**
- **[asset-library] 单页画廊布局**：废弃 4-Tab 结构，进入即显示全部素材真实缩略图网格（6 列正方形裁切）；图片 `<img>` 渲染，视频 `<video>` 展示首帧 + 播放按钮。
- **[asset-library] 右侧详情抽屉**：点卡片滑入，显示大图预览、文件信息、完整 AI 标签，底部「用于生成」按钮。
- **[asset-library] 底部上传面板**：点「上传素材」从底部滑入，完成后自动关闭并刷新画廊。
- **[asset-library] 内嵌搜索 + 筛选**：搜索框 + 比例/类型/方向/画质 4 个 dropdown 常驻顶部。
- **[asset-library/api] 后端响应规范化**：`GET /assets` 与 `GET /search` 返回 `assets` 字段（含完整 `tags` 数组）。
- **[asset-library/encoding] 中文文件名乱码修复**：Multer 在 Node/Windows 下将 UTF-8 文件名错误识别为 Latin-1，新增 `decodeFilename` 工具（`latin1 → utf8`）在入库前修正；`fixGarbledFilenames()` 在服务启动时一次性迁移历史脏数据。
- **[asset-library] 导入白屏 Bug 修复**：前端 `getJobStatus` 响应归一化（`id→jobId`、`failed/interrupted→error`），`AssetImportPanel` 加防御性 `?? ''` 防 jobId 为 undefined 时崩溃。
- **[auth/logout] 登出清理业务数据**：退出时额外清除 `gobs_last_project_id`、`h5-production-project-v1`（防止高级制片报「项目加载失败」）、`production_compass_api_key`（安全）、`quickfilm_active_job`、`gobs_multishot_job_id`。
- **[history] 本机视频历史按账号分桶**：key 改为 `h5-video-history-{username}`，不同账号的本机历史互不可见。
- **[history] 云端列表星标/隐藏偏好按账号分桶**：key 加 username 后缀，账号间偏好独立。

---

### v0.26 — 2026-04-15

**修复：角色/场景图片图裂 + 分镜视频无法播放**

**Root Cause 分析：**
- **图裂**：`stripBase64` 函数原本用于防止大体积 base64 撑大项目 JSON，但采用了「一刀切」策略，把所有 `data:` URL 字符串都删除，包括 `imageDataUrl`（角色/场景头像）。这些是用户的真实数据，不应被删。
- **视频黑屏**：`/api/video/file` 在 auth 中间件中已对 `<video>` 标签放行（无需 Bearer），但路由内部仍用 `req.user?.username` 做用户目录鉴权。无 JWT 访问时 `req.user` 为 undefined → `username='_default'` → 与实际目录 `admin` 不匹配 → 403 Forbidden。
- **图片文件缺失**：角色图片文件位于 `/home/ubuntu/gobs-data/output/production/images/admin/`（之前用 `API_DATA_DIR=/home/ubuntu/gobs-data` 上传），但当前 API 默认读取 `process.cwd()/output/...` 即 `/home/ubuntu/qas-h5/api/output/...`（无 `API_DATA_DIR` 配置）。

**Fix:**
- **[api] `productionPersist.ts`**：`stripBase64` 改为字段名感知版本，仅删除 `previewStillDataUrl`（分镜静帧预览，~2MB/镜，属可再生成缓存），保留 `imageDataUrl`（角色/场景图）、`videoUrl`（视频版本 URL）等所有用户资产字段。
- **[api] `video.ts`**：`/api/video/file` 无 JWT 时（`<video>` 标签直接访问），跳过用户目录限制，只校验路径在 `outputDir` 根目录下（防目录穿越），修复公开视频播放 403。
- **[server] 图片文件恢复**：将 `/home/ubuntu/gobs-data/output/production/images/admin/` 的所有图片复制到 `/home/ubuntu/qas-h5/api/output/production/images/admin/`，恢复角色/场景/道具图片访问。

---

### v0.25 — 2026-04-15

**即梦排队分镜显示统一为「生成中」**

**Fix / UX:**
- **[frontend] Shot Strip & 按钮**：等待提交的分镜（H5 内部排队中）统一显示为「生成中」旋转动画和文案，不再显示黄色脉冲「排队中」，避免与即梦后台状态产生歧义。
- **[api] DREAMINA_MAX_CONCURRENT 默认值改回 1**：即梦账号实际并发能力因账号类型而异，保守默认 1 以避免 ret=1310；需要更高并发时在 `.env` 中手动设置 `DREAMINA_MAX_CONCURRENT=N`。

---

### v0.24 — 2026-04-15

**即梦视频并发数提升（1 → 5）**

**Feature:**
- **[api] DREAMINA_MAX_CONCURRENT 计数信号量**：将原先串行单槽（1 并发）替换为可配置的计数信号量（默认 5 个并发槽），允许同时向即梦提交多个视频生成任务，与即梦高级会员账号的实际能力对齐。
- **[api] ret=1310 错误专项警告**：当即梦返回 `ExceedConcurrencyLimit (ret=1310)` 时，立即释放槽位并在 pm2 日志中打印提示（建议降低 `DREAMINA_MAX_CONCURRENT`），不再让槽位永久阻塞。
- **[api] 安全超时延长**：每槽位安全超时从 3 分钟延长至 5 分钟，适应并发场景下部分任务耗时较长的情况。
- **[infra] .env.example 新增 `DREAMINA_MAX_CONCURRENT` 说明**，方便按账号实际并发能力调整。

**根本原因：** 原实现基于"免费账号只允许 1 并发"的保守假设（注释 `ret=1310`），高级会员实际支持更高并发，导致 H5 点击多个「生成分镜视频」后，后续任务全部卡在服务端 `await`，即梦后台只有 1 个任务在跑。

---

### v0.23 — 2026-04-15

**配乐引擎来源可视化**

**UX:**
- **[BgmMixPanel] 引擎 badge**：配乐生成完成后，标题旁显示彩色小标签——`🎵 Suno`（紫色）或 `🎵 Lyria`（蓝色），鼠标悬浮显示说明文字（"主引擎"/"备用引擎"）
- **[BgmMixPanel] 日志可读性提升**：完成日志从"配乐已铺满（N 段）"改为"✅ 配乐完成（引擎：Suno · 时长：Xs · N 首）"，明确包含引擎名
- **[BgmMixPanel] 去除硬编码"Lyria"**：时长提示从"需 N 段 Lyria 配乐"改为"约需 N 首配乐"，对引擎中立
- **[BgmMixPanel] 超时上限调整**：前端等待超时从 160s 提升至 210s，与 Suno 最长生成时间匹配

---

### v0.22 — 2026-04-15

**音乐生成双引擎：Suno API（主）+ Lyria（backup）**

**Feature:**
- **[backend] 新增 `sunoMusic.ts` 服务**：对接 sunoapi.org Suno API，全异步流程（提交任务 → 6s 间隔轮询 → 下载 MP3），最大等待 3.5 分钟，每次固定返回 2 首器乐曲目
- **[backend] `editorMusic.ts` 双引擎路由**：配置 `SUNO_API_KEY` 时默认调用 Suno；敏感词错误（400）直接返回，其余 Suno 错误（配额耗尽 429、Key 无效 401、网络超时等）自动 fallback 到 Lyria；MP3/WAV 双格式文件服务
- **[backend] 响应新增字段**：`provider: 'suno' | 'lyria'`，告知前端实际使用引擎；Suno 模式下每首 `durationSec` 使用真实时长（非固定 32.8s）
- **[frontend] API 类型扩展**：`GenerateEditorMusicBody` 新增 `style`/`title` 字段（Suno customMode），`GenerateEditorMusicResponse` 新增 `provider` 字段
- **[config] `.env.example` 补充**：新增 `SUNO_API_KEY`、`SUNO_MODEL`（默认 `V4_5ALL`）、`SUNO_API_BASE_URL` 三个配置项说明

**使用说明：**
在 `h5-video-tool-api/.env` 中添加 `SUNO_API_KEY=sk-xxx` 后重启即生效；不配置或 Suno 失败时系统透明降级到 Lyria，功能不中断。

---

### v0.21 — 2026-04-15

**素材导入白屏 Bug 修复**

**Fix:**
- **[asset-library/import] 批量导入白屏修复**：修复批量导入图片后页面直接白屏的问题。根因：后端 `GET /import/:jobId` 返回 DB 行字段为 `id`，前端轮询后调用 `job.jobId.slice(0,8)` 时 `jobId` 为 `undefined` 导致 `TypeError`，React 组件树崩溃。
- **[asset-library/import] 轮询永不停止修复**：后端 job status 存在 `'failed'` / `'interrupted'` 两个终态，但前端仅检查 `'done'` / `'error'`，导致轮询内存泄漏。现在 `getJobStatus` API 函数统一归一化：`failed`/`interrupted` → `error`。
- **[asset-library/import] 防御性检查**：`job.jobId` 渲染处增加空值保护 `(job.jobId ?? '')` 防止后续潜在崩溃。

---

### v0.20 — 2026-04-15

**导出历史管理面板**

**Feature:**
- **[editor/export] 历史导出面板**：导出按钮右侧新增"⏱ 历史"图标按钮，点击弹出面板，列出该账号在服务器上保存的所有导出视频（最新在前），显示导出时间和文件大小。
- **[editor/export] 刷新不再丢失**：面板从服务器文件系统实时扫描，不依赖内存状态。刷新页面、重新打开编辑器后，历史导出文件依然可见，无需重新导出。
- **[editor/export] 历史下载**：面板内每条记录均携带 JWT 鉴权头下载（复用 `apiDownload`），无 401 问题。
- **[editor/export] 历史删除**：每条记录可单独删除（二次确认），清理不再需要的导出文件，避免服务器空间无限累积。
- **[editor/export] 自动刷新列表**：当前会话导出完成后，面板列表自动追加新文件，无需手动刷新。

**API（后端）:**
- `GET /api/editor/export/files` — 列出当前用户所有 `.mp4/.mov` 导出文件（含文件大小、创建时间、下载 URL），按时间倒序
- `DELETE /api/editor/export/files/:filename` — 删除指定导出文件

---

### v0.19 — 2026-04-15

**导出下载鉴权修复**

**Bug Fix:**
- **[editor/export] 下载成品 401 "需要获得授权"**：导出完成后的「⬇ 下载成品」按钮原为 `<a href>` 直接导航，浏览器不携带 `Authorization` 头，后端鉴权中间件返回 401。改为通过 `fetch` + JWT 头请求，将响应转为 Blob URL 再触发浏览器保存对话框。
- **[frontend/client] 新增 `apiDownload` 工具函数**：在 `client.ts` 中统一封装带鉴权的文件下载能力，便于后续其他需要认证下载的场景复用。

---

### v0.18 — 2026-04-15

**高级制片分镜视频恢复轮询修复**

**Bug Fix:**
- **[frontend] 分镜视频刷新后不再回填**：恢复轮询的 `useEffect(deps=[])` 在组件挂载时立即执行，但服务端项目异步加载尚未完成，`project.shots` 为空，导致 `pendingVideoSubmitId` 永远无法被检测到。昨天提交的即梦任务刷新页面后不会自动续接轮询，视频生成结果丢失。
- **[frontend] 修复方案**：将 `useEffect` 依赖改为 `[isServerBootstrapping]`，等待服务端项目加载完成（`isServerBootstrapping=false`）后再执行恢复轮询；新增 `hasResumedPollingRef` 防止因后续 `project` 变化重复触发。

**根本原因：** React 两个 `useEffect(deps=[])` 同时在 mount 执行，但服务端项目加载是异步的，恢复轮询总先于项目数据可用而运行。

---

### v0.17 — 2026-04-15

**剪辑体验三项优化 & 错误信息改善**

**Feature / UX:**
- **[editor] 进入自动打开最近项目**：首次加载 `/editor` 时，若有已保存项目，自动通过 URL param `?project=xxx` 打开最近编辑的项目，不再每次都展示空白"未命名剪辑项目"；URL 同步更新，刷新保持项目不丢
- **[editor] 新建项目命名弹窗**：点击「+ 新建」或项目管理器中的「新建剪辑」时，弹出命名对话框（默认名含日期时间，如 `剪辑-0415-1030`），支持回车确认 / Esc 取消，项目从创建起就有语义化名称
- **[editor] 顶栏 UI 优化**：「管理项目」改为「我的项目 (N)」显示实际数量；「+ 新建」使用主色调突出显示

**Bug Fix:**
- **[editor/export] drawtext 预检**：导出前先通过 `ffmpeg -filters` 检测 drawtext 是否可用（结果缓存），服务器 FFmpeg 缺少 libfreetype 时直接跳过文字层，不再在运行时报错后才降级，消除偶发的"导出失败：FFmpeg 退出码 8"
- **[api] Compass 网络错误提示**：Compass API 连接失败经 3 次重试仍不可达时，错误消息从裸露的 `"Network Error"` 改为「AI 服务暂时不可达（已重试 3 次），请稍后重试。如持续出现，请检查服务器出网配置或 COMPASS_API_URL」
- **[frontend] fetch 网络错误统一处理**：`apiGet` / `apiPost` 新增 `wrapFetchError()` 捕获 `fetch()` 本身抛出的浏览器网络异常（`Failed to fetch / NetworkError / Load failed`），统一转为「无法连接到服务器，请检查网络后重试」

---

### v0.17a — 2026-04-15

**服务器环境变量修复（Windows 路径 → Linux 路径）**

**Bug Fix:**
- **[infra] `PYTHON_EXE` 路径修正**：服务器 `.env` 中 `PYTHON_EXE` 被错误设置为 Windows 路径（`C:/Users/wei.liu/...`），导致「生成分镜视频」时报 `spawn ENOENT`。已改为 `/usr/bin/python3`（Ubuntu 实际路径）
- **[infra] `DREAMINA_BIN` 路径修正**：Windows 路径 → `/home/ubuntu/.local/bin/dreamina`
- **[infra] `YT_DLP_PATH` 路径修正**：Windows 路径 → `/home/ubuntu/.local/bin/yt-dlp`

**根本原因：** 本地 `.env`（含 Windows 路径）在某次部署时被整体覆盖到服务器，服务器需要的是 Linux 绝对路径。服务器 `.env` 已直接修复，未改动代码。

---

### v0.16 — 2026-04-15

**高级制片项目加载性能优化**

**Bug Fix / Perf:**
- **[api] 保存前 strip base64**：`/api/production/project/save` 在写磁盘前递归将所有 `data:` URL 替换为 `null`，防止未完成上传的临时 base64 图片（每张 ~2MB）撑大项目 JSON（原 18MB → 预计 <1MB）
- **[api] sidecar `.meta.json`**：每次保存时同步写一份仅含 `{id, title, updatedAt, step}` 的轻量 sidecar 文件（~100 字节），`/project/list` 优先读 sidecar，不再解析全量 JSON，项目列表加载从秒级降至毫秒级；无 sidecar 的旧项目自动回退解析全量 JSON（向后兼容）
- **[api] 删除时同步清理 sidecar**：`DELETE /api/production/project` 连同 `.meta.json` 一并删除

**根本原因说明：**
自动保存（3s 防抖）在图片上传完成前触发，导致 base64 被写入磁盘；`/project/list` 逐个解析全量 JSON 获取元信息。本次修复在服务端兜底，不依赖前端上传时序。

---

### v0.16a — 2026-04-15

**仓库瘦身 & .gitignore 安全修复**

**Chore:**
- **[repo] 删除历史部署包**：清理 `deploy-full-20260413-1620/`、`deploy/cloud-baseline/`、10 个 `gobs-*.tar.gz`、2 个 `.zip` 等共 ~30MB 归档，仓库体积显著缩减
- **[repo] 删除临时调试文件**：`debug_path.mjs`、`final_test.sh`、`test_api.sh`、`tmp_flash_image_test.png`、`gobs_ppt*.py`、空占位文件 `claude`、旧版 `.cmd` 启动脚本
- **[repo] 删除可再生成产物**：`h5-video-tool/dist/`、`h5-video-tool-api/dist/`、`out/` 等编译输出目录
- **[frontend] 删除死代码页面**：`TabMaterials.tsx`（全项目无路由/无引用）
- **[security] 补全 `.gitignore`**：新增 `*.db`/`*.db-shm`/`*.db-wal`、`dreamina-login.json`、`editor-projects/`、`uploads/`、`.claude/settings.local.json` 等规则，防止数据库文件和登录凭证意外进入 Git 历史

---

### v0.15 — 2026-04-15

**前端状态管理升级（React Query）**

**Feature:**
- **[frontend] React Query 基础设施**：安装 `@tanstack/react-query`，在 `main.tsx` 挂载 `QueryClientProvider`（`staleTime=10s`、`retry=1`、`refetchOnWindowFocus=false`）
- **[frontend] `useVideoTaskQuery` hook**：新增 `useDreaminaTaskQuery(submitId)` 和 `useKlingTaskQuery(taskId)`，使用 React Query 的 `refetchInterval` 实现非阻塞视频任务轮询；任务完成/失败后自动停止轮询
- **[frontend] 类型扩展**：`DreaminaTaskPollResponse` 和 `KlingTaskStatusResponse` 均新增可选 `errorCode` 字段，与后端批次 5 的错误码对齐

**背景说明（批次 7 现状）：**
剪辑器撤销/重做（`useUndoRedo`，depth=50）和自动保存（3s 防抖，通过 `/api/editor/projects`）已在此前版本实现，本批次确认并完善了相关基础设施。

---

### v0.14 — 2026-04-15

**巨石文件拆分（批次 6）**

**Refactor:**
- **[api] `videoMultishot.ts` 独立路由**：将 `video.ts` 中的多镜头任务系统（类型定义、250+ 行任务引擎、ffmpeg 拼接、`/generate-multishot`、`/multishot-job/:jobId` 路由）提取到独立文件，`video.ts` 行数从 647 行降至 ~400 行
- **[api] multishot 路径规范化**：`MULTISHOT_JOBS_ROOT` 改用 `resolvePath('multishot-jobs')` 而非 `path.join(getApiDataDir(), 'multishot-jobs')`，与 storageResolver 对齐
- **[api] `/generate` 错误响应加入 `errorCode`**：Dreamina 未登录时附带 `errorCode: DREAMINA_NOT_LOGGED_IN`
- **[frontend] 合并 `useVideoGenerate` → `useVideoGeneration`**：删除双轨 hook，统一使用 `useVideoGeneration`；向后兼容地导出 `generateMultishot`、`loading`、`error`、`clearError`、`setError`、`useMock` 等属性

---

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

*Last updated: 2026-04-24 (v0.129)*
