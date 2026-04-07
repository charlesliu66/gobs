# Studio「制片工程」流水线 — 设计文档

> **For Claude:** 后续实现可配合 `superpowers:writing-plans` 拆任务、`executing-plans` 分步落地。

**Goal:** 在现有 `h5-video-tool` / `h5-video-tool-api` 上，用可版本化的「制片工程」JSON 串联故事开发 → 专业分镜 → Prompt 与平台适配 → 服化道/声画建议 → **分步触发的工具生成**，最终成片；第一期**不要求**全自动一键成片，**允许**「分镜表 + 分步点按钮生成」。

**Architecture:** 三层数据（故事 L1 / 制作 L2 / 镜头 L3）为单一真相源；前端以向导或 Tab 分步展示与编辑；后端以独立 API 或编排服务生成各层 JSON；生成任务为队列/步骤式，用户逐步点击触发（角色图 → 场景图 → 分镜视频 → 拼接）。

**Tech Stack:** React + Vite（`h5-video-tool`）；Node/Express（`h5-video-tool-api`）；现有 `promptPolish`、`storyboard`、`video`（含多镜与 ffmpeg 拼接）复用并扩展；类型与校验优先 TypeScript +（可选）Zod。

---

## 1. 范围与第一期原则

### 1.1 包含

- 故事结构（三幕/五幕等可配置模板）、情绪曲线、节奏、角色动机、场景规划（L1）。
- 专业分镜表：每镜多字段 + 结构化分镜 Prompt（8 子项）+ 视频运动 Prompt（5 子项）+ Seedance/目标平台兼容载荷（L3）。
- Prompt 优化：角色参考图视觉特征抽取、角色一致性表述模板（可称「Nano Banana 风格」占位）、平台语法（@引用、镜头语言）映射层。
- 服化道、灯光/色调、音效与音乐建议（L2）。
- **分步生成**：基于参考图与文案生成角色多状态、场景变体、按镜生成视频、再拼接；**不要求**第一期一键跑通全流程。

### 1.2 第一期不包含（可列 backlog）

- 全自动调度器（无人值守一键成片）。
- 完整节点画布（React Flow）；列表/向导优先。
- 多用户协作、服务端工程版本库（可先 localStorage/IndexedDB 草稿）。

---

## 2. 数据模型总览

所有产出收敛为一份 **`ProductionProject`**（名称可调整），建议版本字段 `schemaVersion: '1.0.0'`。

```
ProductionProject
├── meta（标题、风格参考摘要、创建时间、目标平台枚举）
├── story（L1）
├── productionDesign（L2）
├── shots[]（L3，与镜号 1..N 对应）
├── assets（引用：角色图 URL/id、场景图、每镜首尾帧等）
├── promptsDerived（可选缓存：组装后的平台 payload，避免重复计算）
└── generationJobs（分步任务状态：pending / running / done / error）
```

---

## 3. L1 — 故事层（字段列表示意）

| 字段 id | 说明 | 类型示意 |
|--------|------|----------|
| `structureTemplate` | 结构模板 | `'three_act' \| 'five_act' \| 'save_the_cat' \| ...` |
| `logline` | 一句话故事 | string |
| `synopsis` | 故事梗概（可与用户输入对齐） | string |
| `acts` | 幕列表 | `{ index: number; title: string; summary: string; beatIds: string[] }[]` |
| `beats` | 节拍点 | `{ id: string; label: string; storyPercent: number; description: string }[]` |
| `emotionCurve` | 情绪曲线采样 | `{ t: number; emotion: number; note?: string }[]`（t 可为 0–1 或幕内进度） |
| `pacingNotes` | 节奏把控说明 | string |
| `characters` | 角色动机与关系 | `{ name: string; goal: string; conflict: string; arc?: string }[]` |
| `scenePlan` | 场景规划（粗粒度） | `{ id: string; name: string; purpose: string; relatedBeatIds?: string[] }[]` |

---

## 4. L2 — 制作层（服化道 / 灯光 / 音效）

| 字段 id | 说明 | 类型示意 |
|--------|------|----------|
| `wardrobe` | 服装清单 | `{ character: string; item: string; notes?: string }[]` |
| `props` | 道具清单 | `{ name: string; sceneRef?: string; notes?: string }[]` |
| `sets` | 场景美术/陈设 | `{ sceneId: string; description: string; palette?: string }[]` |
| `lighting` | 灯光方案 | `{ sceneId?: string; key: string; fill?: string; mood: string }[]` |
| `colorGrading` | 色调分级 | string 或 `{ shadow: string; midtone: string; highlight: string; lutRef?: string }` |
| `soundMusic` | 音效与音乐建议 | `{ sfx: { moment: string; idea: string }[]; music: { segment: string; mood: string; bpm?: number }[] }` |

---

## 5. L3 — 镜头层（每镜 `ProductionShot`）

### 5.1 分镜表「15 字段」列表示意

以下为专业分镜常见维度，实施时可合并或改名，但**前后端与导出需统一同一套键名**。

| # | 字段 id | 说明 |
|---|---------|------|
| 1 | `shotIndex` | 镜号（1-based） |
| 2 | `durationSec` | 时长（秒） |
| 3 | `sceneRef` | 关联 L1/L2 场景 id |
| 4 | `shotScale` | 景别（特写/近景/中景/全景等） |
| 5 | `cameraMove` | 运镜（推/拉/摇/跟等） |
| 6 | `lensFeel` | 镜头质感（焦段/景深倾向，可选） |
| 7 | `subject` | 画面主体 |
| 8 | `action` | 主要动作/事件 |
| 9 | `composition` | 构图说明 |
| 10 | `lighting` | 本镜光线（可引用 L2 或覆盖） |
| 11 | `emotion` | 情绪（表演/观众情绪） |
| 12 | `continuity` | 与上一镜衔接说明 |
| 13 | `dialogue` | 对白/旁白（可选） |
| 14 | `audioCue` | 声音提示（可选） |
| 15 | `notes` | 导演/制片备注 |

### 5.2 结构化分镜 Prompt（8 子项）— 示意键名

用于组装「出图 / 一致性」侧提示，具体文案由模板引擎拼接。

| 子项 id | 说明 |
|---------|------|
| `sp_subject` | 主体与状态 |
| `sp_environment` | 环境/空间 |
| `sp_style` | 风格与参考 |
| `sp_lighting` | 光线与氛围 |
| `sp_camera` | 机位与景别 |
| `sp_composition` | 构图 |
| `sp_continuity` | 连续性约束 |
| `sp_negative` | 负向/规避 |

### 5.3 视频运动 Prompt（5 子项）— 示意键名

用于图生视频/尾帧约束等。

| 子项 id | 说明 |
|---------|------|
| `mp_motion` | 主体运动方式 |
| `mp_camera` | 摄影机运动 |
| `mp_tempo` | 节奏与时长感 |
| `mp_transition` | 与前后镜衔接 |
| `mp_audio` | 声音与氛围（若模型支持） |

### 5.4 平台载荷

| 字段 id | 说明 |
|---------|------|
| `seedancePayload` | 符合 Seedance/内部规范的片段对象（文本 + @引用占位解析后结果） |
| `klingPayload` | 可灵侧：prompt + image_list 等（与现有 `KlingVideoOptions` 对齐） |
| `exportLocale` | `'seedance' \| 'kling' \| 'veo' \| ...` |

---

## 6. Prompt 优化与角色一致性

| 概念 | 说明 |
|------|------|
| `characterVisualProfile` | 自角色设计图经 vision 抽取：体态、发色、服装特征、标志性道具等（结构化列表） |
| `consistencyPromptTemplate` | 「Nano Banana 风格」等：可配置模板 id + 填充字段，不写死在 UI |
| `platformSyntax` | 将 L3 + assets 转为带 `@img1` / 镜头语言的最终字符串；与现有素材顺序规则对齐 |

---

## 7. 资源与生成任务（分步）

| 资产类型 | 说明 |
|----------|------|
| `characterRefs[]` | 用户上传或生成的角色参考（多状态可多条） |
| `sceneRefs[]` | 场景参考图 |
| `shotFrames` | 每镜 `first` / `last` / `middle`（与现 `ShotFramePreview` 概念兼容） |
| `clipVideoUrls[]` | 每镜生成的视频片段 URL 或本地路径 |
| `finalVideoUrl` | 拼接后成片 |

**第一期交互**：在 UI 上为「生成角色变体」「生成场景」「生成本镜视频」「拼接成片」分别提供按钮；各步写入 `generationJobs`，展示状态与错误信息，支持重试单步。

---

## 8. API 草图（后端）

以下为逻辑名，路由前缀可与现有 `/api` 统一。

| 方法 | 路径示意 | 作用 |
|------|----------|------|
| POST | `/api/studio/story-arc` | 输入设定 + 梗概 + 模板 → L1 |
| POST | `/api/studio/production-design` | L1 + 修订 → L2 |
| POST | `/api/studio/storyboard-table` | L1+L2 + 用户约束 → `shots[]`（L3） |
| POST | `/api/studio/extract-character-visuals` | 图 → `characterVisualProfile` |
| POST | `/api/studio/assemble-prompts` | L3 + 模板 id → 8+5 子项填充与平台 payload |
| POST | `/api/studio/jobs/...` | 各分步生成任务（可映射现有 image/video 路由） |

---

## 9. 前端信息架构（第一期）

- **入口**：Studio 下「高级制片」或独立路由，与现有「创作」Tab 并存。
- **步骤建议**：① 输入与 L1 生成/编辑 → ② L2 清单确认 → ③ L3 分镜表（表格 + 折叠行编辑）→ ④ 分步生成区（按钮 + 任务列表）→ ⑤ 成片预览与导出。
- **持久化**：优先浏览器 `IndexedDB` 或 `localStorage` 草稿（注意配额）；与后端对齐后再上「工程 id」。

---

## 10. 与现有代码的映射

| 现有能力 | 复用方式 |
|----------|----------|
| `CreateFlowContext` / `ShotItem` | L3 可渐进扩展或并行 `ProductionShot`，再迁移 |
| `promptPolish` | L1/L2/L3 的 LLM 调用可共用模型与错误处理 |
| `MultiShotPromptInput` / `generateFrames` | 分镜首尾帧与连续性 |
| `generate-multishot` / ffmpeg concat | 分镜视频 + 成片拼接 |
| `EditorWorkbench` | 可选：精细剪辑成片 |

---

## 11. 风险与依赖

- **模型能力**：vision 抽取、长 JSON 输出需校验与降级（截断重试）。
- **配额与成本**：分步生成便于用户控制调用次数；全自动留待后期。
- **平台差异**：Seedance / 可灵 / Veo 字段不同，`platformPayload` 层需单测或可配置映射。

---

## 12. 下一步

- 使用 **`writing-plans`** 生成 `Implementation Plan`：先 `ProductionProject` 类型与 Zod、再最小向导 UI、再逐个 API stub、最后接入现有 video 拼接。
- 评审本字段表命名后冻结 `schemaVersion`，避免前后端分叉。
