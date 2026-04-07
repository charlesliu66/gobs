# H5 剪辑工作台（强 Agent + MP4 导出 + 画幅可选）Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在现有 `h5-video-tool` / `h5-video-tool-api` 上新增类剪映四区布局的剪辑工作台：素材打标、AI BGM、Agent 驱动混剪、与预览一致的一键导出 MP4；用户以对话为主、自定义尽量少。

**Architecture:** 前端维护可序列化的「时间轴 JSON + 画幅」状态，预览用 Web 技术栈渲染；导出由后端异步任务调用 FFmpeg（或云转码）合成。打标、BGM、LLM 决策通过可替换的 provider 接入。强 Agent 通过「生成/修订时间轴 revision」减少手动操作。

**Tech Stack:** React + Vite（`h5-video-tool`）；Node/Express（`h5-video-tool-api`）；FFmpeg CLI 或等价；对象存储/本地临时文件（按现有部署选择）；TypeScript 类型共享优先用 `packages/` 或前后端重复类型 + 注释同步（若尚无 monorepo 共享包则以后抽取）。

**设计依据:** `docs/plans/2026-03-31-h5-editor-agent-export-design.md`

---

## Phase 0：契约与类型（阻塞后续）

### Task 0.1: 冻结时间轴与工程类型

**Files:**
- Create: `h5-video-tool/src/editor/types/timeline.ts`（或 `src/features/editor/` 下）
- Create: `h5-video-tool-api/src/editor/timelineSchema.ts`（或与前端同名结构）

**Step 1:** 定义 `AspectRatioPreset`（如 `9:16` | `16:9` | `1:1` | `4:3`）、`resolutionForPreset()` 映射（导出用）。

**Step 2:** 定义 `TimelineProject`、`Track`、`VideoClip`、`AudioClip`、`MediaAsset`、`AgentRevision`（与设计文档 §4 对齐）。

**Step 3:** 导出 JSON Schema 或 Zod schema（若项目已用 Zod 则优先 Zod）供 API 校验。

**Step 4:** 在 `docs/plans/2026-03-31-h5-editor-agent-export-design.md` 末尾追加「字段表」链接或内嵌简要字段说明（可选，避免重复维护则只引用 TS 文件）。

**Step 5:** Commit（若仓库已初始化 git）。

---

### Task 0.2: 导出 API 契约（先 Mock）

**Files:**
- Create: `h5-video-tool-api/src/routes/editorExport.ts`
- Modify: `h5-video-tool-api/src/index.ts`（挂载路由）

**Step 1:** `POST /api/editor/export` 接收 `{ project, timeline, aspectRatio }`，返回 `{ jobId }`。

**Step 2:** `GET /api/editor/export/:jobId` 返回 `{ status, progress?, downloadUrl? , error? }`。

**Step 3:** Mock 实现：`status` 从 `queued` → `done`，`downloadUrl` 指向占位静态文件或空，便于前端联调。

**Step 4:** 用 `curl` 或现有 API 测试脚本验证两接口（记录在计划执行备注中）。

---

## Phase 1：前端壳（四区 + 画幅选择）

### Task 1.1: 路由与空壳页面

**Files:**
- Modify: `h5-video-tool/src/App.tsx`
- Create: `h5-video-tool/src/pages/EditorWorkbench.tsx`
- Create: `h5-video-tool/src/editor/layout/EditorShell.tsx`（CSS Grid：左/中/右/下）

**Step 1:** 增加路由 `/editor`（若项目使用 `react-router`，否则用条件渲染 + `searchParams` 与现有模式一致）。

**Step 2:** `EditorShell` 四区占位：左「素材」、中上「预览」、右「Agent」、下「时间轴」，暗色主题与 `Layout.tsx` 变量对齐。

**Step 3:** 顶栏或预览旁增加 **画幅选择**（`AspectRatioPreset`），写入 React state 并 localStorage 可选持久化。

**Step 4:** 从 `Studio` 或主导航增加入口链接到 `/editor`。

---

### Task 1.2: 时间轴状态与播放头（仅 UI）

**Files:**
- Create: `h5-video-tool/src/editor/hooks/useTimelineState.ts`
- Create: `h5-video-tool/src/editor/components/TimelinePanel.tsx`

**Step 1:** 用 Mock `TimelineProject` 渲染一条视频轨 + 一条音频轨占位块。

**Step 2:** 播放头拖拽、当前时间 state、`duration` 从 clip 推算。

**Step 3:** 预览区用单个 `<video>` 或双缓冲占位，与 `currentTime` 同步（可先单 clip）。

---

## Phase 2：素材上传与打标（后端任务 + 前端列表）

### Task 2.1: 上传与 asset 记录

**Files:**
- Create: `h5-video-tool-api/src/routes/editorAssets.ts`
- Create: `h5-video-tool-api/src/services/editorAssetStore.ts`（内存或 SQLite/JSON 文件视项目约束）

**Step 1:** `POST /api/editor/assets/upload` multipart → 存磁盘或对象存储路径，返回 `assetId`、`url`。

**Step 2:** 前端左侧 `MediaLibrary` 调用上传并刷新列表。

**Step 3:** `GET /api/editor/assets` 列表返回缩略图 URL（可先返回原视频 URL，缩略图后续加）。

---

### Task 2.2: 打标任务（Mock → 真实 provider）

**Files:**
- Create: `h5-video-tool-api/src/services/taggingProvider.ts`（接口 + Mock）
- Modify: `h5-video-tool-api/src/routes/editorAssets.ts`

**Step 1:** 上传完成后入队 `taggingJob`（内存队列即可）。

**Step 2:** Mock：返回固定标签数组；异步延迟 1–2s 更新 `asset.tags`。

**Step 3:** `GET /api/editor/assets/:id` 含 `tags`、`taggingStatus`。

**Step 4:** 前端素材卡片展示标签；Agent 侧栏后续用同一 API 检索。

---

## Phase 3：BGM 与 Agent 修订时间轴

### Task 3.1: BGM 生成接口（Mock）

**Files:**
- Create: `h5-video-tool-api/src/routes/editorBgm.ts`
- Create: `h5-video-tool-api/src/services/bgmProvider.ts`

**Step 1:** `POST /api/editor/bgm` body：`{ durationSec, style, mood }` → 返回 `{ audioUrl, durationSec, beats?: number[] }`（Mock 可用静音 MP3 或短循环）。

**Step 2:** 前端 Agent 面板或独立「生成 BGM」按钮调用并落到音频轨。

---

### Task 3.2: Agent 应用时间轴（LLM → JSON）

**Files:**
- Create: `h5-video-tool-api/src/routes/editorAgent.ts`
- Create: `h5-video-tool-api/src/services/editorAgentService.ts`
- Modify: `h5-video-tool/src/editor/components/AgentPanel.tsx`

**Step 1:** `POST /api/editor/agent/apply`：`{ userMessage, context: { assets[], currentTimeline?, aspectRatio } }` → 返回 `{ revision, timelinePatch 或 full timeline }`。

**Step 2:** 先用 Mock：根据标签拼一条简单时间轴（顺序铺视频 + BGM）。

**Step 3:** 接入现有 LLM 调用模式（参考 `h5-video-tool-api/src/routes/prompt.ts`），**强制模型输出符合 schema 的 JSON**，失败则重试或降级 Mock。

**Step 4:** 前端收到后更新 `useTimelineState`，并追加一条「已应用修订」日志。

---

## Phase 4：导出 FFmpeg 真实链路

### Task 4.1: 合成服务

**Files:**
- Create: `h5-video-tool-api/src/services/ffmpegRender.ts`
- Modify: `h5-video-tool-api/src/routes/editorExport.ts`

**Step 1:** 部署环境安装 `ffmpeg` 并在 README 注明。

**Step 2:** 根据 `TimelineProject` 生成 concat/filter 脚本或临时 filter_complex；视频按 `aspectRatio` scale/crop/pad。

**Step 3:** 音频混合、响度简单归一（可选 `loudnorm` 后期）。

**Step 4:** 输出 MP4 到 `uploads/exports/` 或配置的目录，`downloadUrl` 通过现有静态文件服务或签名 URL 暴露。

**Step 5:** 任务队列与错误信息写入 `GET /api/editor/export/:jobId`。

---

### Task 4.2: 前端一键导出

**Files:**
- Create: `h5-video-tool/src/api/editor.ts`
- Modify: `h5-video-tool/src/pages/EditorWorkbench.tsx` 或 `EditorShell.tsx`

**Step 1:** 「导出 MP4」按钮：提交当前时间轴 + 画幅。

**Step 2:** 轮询 job 至 `done`，提供下载链接；失败展示 `error`。

---

## Phase 5：强 Agent 体验打磨

### Task 5.1: 预设指令与少步操作

**Files:**
- Modify: `h5-video-tool/src/editor/components/AgentPanel.tsx`

**Step 1:** 快捷按钮：「按 BGM 自动混剪」「仅替换 BGM」「缩短到 X 秒」等，映射为固定 `userMessage` 模板。

**Step 2:** 首次进入向导：选画幅 → 上传素材 → 一句话描述 → 自动触发打标完成后 Agent 初剪（可分段）。

---

### Task 5.2: 撤销 / 修订历史（最小）

**Files:**
- Modify: `h5-video-tool/src/editor/hooks/useTimelineState.ts`
- Modify: `h5-video-tool-api/src/services/editorAgentService.ts`（可选持久化 revision）

**Step 1:** 前端保留最近 N 版 `TimelineProject` 栈，支持撤销。

---

## 测试与验收

| 验收项 | 说明 |
|--------|------|
| 画幅 | 切换 9:16/16:9 后预览与导出分辨率一致 |
| 导出 | 一键得到可播放 MP4，音画大致同步 |
| Agent | 对话可更新时间轴；无对话时可用快捷指令完成初剪 |
| 打标 | 素材展示标签；Agent 检索可用（可先 Mock） |

---

## 执行方式说明

本仓库可能未初始化 git；若无法 commit，以「完成任务 + 本地验证命令记录」为准。

**Plan 已保存至:** `docs/plans/2026-03-31-h5-editor-implementation-plan.md`

**两种执行方式：**

1. **Subagent-Driven（本会话）** — 每任务派生子代理并在任务间审查，迭代快。  
2. **Parallel Session（新会话）** — 新会话加载 `executing-plans`，批量执行并设检查点。

需要我从 **Phase 0 Task 0.1** 开始在当前仓库直接开工时，直接说「按计划在本会话实现」即可。
