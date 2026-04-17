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
| 2 | 制作清单 | AI 自动生成角色定妆、场景美术、道具清单；角色状态衣橱支持自定义 prompt 生成受伤/童年/换装等多状态变体图 |
| 3 | 分镜表 | AI 自动生成逐镜分镜，可手动编辑 |
| 4 | 分镜视频 | 每个分镜生成参考视频（支持即梦多模态、文生视频、图生视频）|
| 5 | 导出 | 放映室连续审片 + 一键导入剪辑工作台 |

**分镜工作台增强功能（v0.42+）：**
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

## 二、Changelog

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

*最后更新：2026-04-17（v0.57）*
