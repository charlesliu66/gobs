# GOBS 视频生成 & 视频剪辑 — 架构审查报告

> 审查时间: 2026-04-13
> 审查视角: 使用者体验 + 代码架构
> 审查范围: Studio(视频生成)、ProductionWizard(高级制片)、QuickFilm(一键成片)、EditorWorkbench(剪辑)

---

## 一、当前功能全景

### 视频生成（三条入口）

| 入口 | 路径 | 定位 | 当前状态 |
|------|------|------|----------|
| Studio 创作 | `/studio` | 单段/多段快速生成 | 功能完整但 UI 复杂 |
| 高级制片 | `/studio/production` | 故事→分镜→批量生成 | 功能最全，但 3994 行单文件 |
| 一键成片 | `/quickfilm` | 自动化全流程 | 有框架但体验断裂 |

### 视频剪辑

| 模块 | 路径 | 定位 |
|------|------|------|
| 剪辑工作台 | `/editor` | AI Agent 辅助剪辑 + 时间轴 |

---

## 二、架构级问题

### 🔴 P0: ProductionWizard.tsx 3994 行 — 无法维护

这是整个项目最大的技术债。一个文件包含了：
- 5 步向导的全部 UI
- 角色/场景/道具的 CRUD
- 形象树管理
- 分镜表编辑
- 视频生成轮询
- 图片生成
- 本地存储 + 服务端持久化

**影响**: 改一个小功能要读懂 4000 行上下文，Cursor 也容易改错。

### 🔴 P0: 视频生成三条路径各自为政

- `Studio (TabGenerate)` → 直接调 `/api/video/generate` 或 `/api/video/dreamina/submit`
- `ProductionWizard` → 也调 `/api/video/generate`，但有自己一套轮询逻辑
- `QuickFilm` → 走 `/api/quickfilm/start`，内部调 studioPipeline

三条路径的错误处理、轮询逻辑、状态管理完全独立。结果：
- 修一个 bug 要改三个地方
- 用户在不同入口体验不一致

### 🟡 P1: video.ts 路由文件 1058 行 — 职责过载

一个路由文件承担了：
- Veo 生成
- 可灵生成（同步+异步）
- 即梦生成（同步+异步+全能参考）
- 多镜头拼接
- 文件服务
- TikTok 视频代理
- 历史列表

应该拆分为独立的服务 + 路由。

### 🟡 P1: 剪辑工作台缺乏项目持久化

EditorWorkbench 的时间轴状态通过 `useTimelineState` hook 管理，但：
- 没有项目保存/加载（刷新即丢失）
- 与 Studio 的项目系统（`/api/projects`）没有打通
- 导出后的文件与项目没有关联

### 🟡 P1: 前后端数据目录混乱

AGENTS.md 已记录了"两套数据目录问题"，这个问题在代码中更明显：
- `apiDataDir.ts` 有 `getApiDataDir()` 和 `getDefaultVideoOutputDir()` 两个入口
- Production 的图片存在 `output/production/images`
- 编辑器素材存在 `uploads/editor`
- 视频成品存在 `output/`
- QuickFilm 的 Job 存在 `quickfilm/`
- 没有统一的资产管理层

---

## 三、用户体验问题

### 视频生成

1. **入口困惑**: 用户不知道该用 Studio、高级制片、还是一键成片。三者定位重叠
2. **模型选择复杂**: 即梦三个子模型 + Veo + 可灵，新用户不知道选什么
3. **生成等待黑箱**: 即梦异步任务提交后，轮询状态显示不够友好
4. **多镜头生成是同步阻塞**: `POST /generate-multishot` 串行生成所有镜头，一个 5 镜头视频可能等 10 分钟，期间 HTTP 连接一直挂着
5. **成片管理分散**: 成片在 History、Studio Gallery、Production 各有一份，没有统一视图

### 视频剪辑

1. **素材导入不直观**: 需要先上传到服务端，没有拖拽导入
2. **Agent 对话与时间轴操作割裂**: Agent 返回的剪辑方案需要手动确认，交互步骤多
3. **没有撤销/重做**: 时间轴操作是不可逆的
4. **文字/字幕编辑体验初级**: 只有预设模板，不能自由调整位置和样式
5. **导出缺少进度可视化**: 有 job 状态接口但前端轮询体验不好
6. **音乐功能半成品**: BGM 混音面板存在但 AI 音乐生成（Lyria）集成不完整

---

## 四、建议改造方向

### 第一阶段: 减负 + 统一（2-3 周）

1. **拆分 ProductionWizard.tsx** → 每个 Step 独立组件 + 共享 Context
2. **统一视频生成服务层** → 抽取 `useVideoGeneration` hook，统一轮询/错误处理/状态
3. **拆分 video.ts 路由** → `dreaminaRoutes.ts` / `klingRoutes.ts` / `veoRoutes.ts` / `videoFileRoutes.ts`

### 第二阶段: 体验升级（2-3 周）

4. **剪辑器项目持久化** → 与 projects 系统打通，支持保存/加载/自动保存
5. **多镜头异步化** → 改为 Job Queue，每镜独立任务，前端实时进度
6. **统一成片管理** → 一个 Gallery 聚合所有来源的视频

### 第三阶段: 智能增强（2-3 周）

7. **剪辑器 Agent 强化** → 支持一键应用 Agent 方案，减少手动确认
8. **入口简化** → 合并 Studio + QuickFilm 为统一入口，高级制片作为 Pro 模式
9. **撤销/重做** → 时间轴操作记录栈

---

## 五、文件级改动地图

```
前端 h5-video-tool/src/
├── pages/
│   ├── ProductionWizard.tsx  → 拆为 5+ 个子组件
│   ├── TabGenerate.tsx       → 抽取 useVideoGeneration hook
│   ├── EditorWorkbench.tsx   → 加项目持久化 + 撤销栈
│   └── QuickFilm.tsx         → 与 Studio 流程合并或简化
├── hooks/
│   ├── useVideoGeneration.ts → 新建: 统一生成/轮询/状态
│   └── useUndoRedo.ts        → 新建: 通用撤销重做
├── editor/
│   └── hooks/useTimelineState.ts → 接入项目持久化
└── studio/
    └── (ProductionWizard 拆出的子组件)

后端 h5-video-tool-api/src/
├── routes/
│   ├── video.ts        → 拆分为多个路由文件
│   ├── dreamina.ts     → 新建
│   ├── kling.ts        → 新建
│   └── veo.ts          → 新建
└── services/
    └── videoJobQueue.ts → 新建: 统一任务队列
```
